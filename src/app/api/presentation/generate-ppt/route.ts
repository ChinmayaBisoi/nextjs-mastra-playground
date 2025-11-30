import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import PptxGenJS from "pptxgenjs";
import { TemplateData, TemplateSpec, ThemeOverrides } from "@/types/parse";
import { assignLayoutsToSlides } from "@/mastra/tools/layout-assignment-engine";
import {
  renderSlideWithLayout,
  resolveTheme,
} from "@/mastra/tools/layout-renderer";

const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  layout: z.enum(["title", "content", "titleContent", "imageText"]),
  notes: z.string().optional(),
});

const outlineSchema = z.object({
  slides: z.array(slideSchema),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { presentationId, outline, themeOverrides } = await req.json();

    if (!presentationId) {
      return NextResponse.json(
        { error: "presentationId is required" },
        { status: 400 }
      );
    }

    // Fetch presentation and verify ownership
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    if (presentation.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - not your presentation" },
        { status: 403 }
      );
    }

    // Use provided outline or existing outline from database
    let slidesData: z.infer<typeof outlineSchema> | null = null;

    if (outline) {
      // Validate and use provided outline
      slidesData = outlineSchema.parse(outline);
      // Update presentation with new outline
      await prisma.presentation.update({
        where: { id: presentationId },
        data: {
          outline: outline as Prisma.InputJsonValue,
        },
      });
    } else if (presentation.outline) {
      // Use existing outline from database
      slidesData = outlineSchema.parse(presentation.outline);
    } else {
      return NextResponse.json(
        { error: "No outline available. Please generate an outline first." },
        { status: 400 }
      );
    }

    if (!slidesData || !slidesData.slides || slidesData.slides.length === 0) {
      return NextResponse.json(
        { error: "Invalid outline data" },
        { status: 400 }
      );
    }

    // Get presentation title from first slide or description
    const title =
      slidesData.slides[0]?.title || presentation.description || "Presentation";

    // Extract template data from presentation (stored during outline creation)
    const storedTemplateData = presentation.templateData as TemplateData | null;
    const templateSpec: TemplateSpec | undefined =
      storedTemplateData?.templateSpec;

    // Merge theme overrides: request overrides > stored overrides > template theme
    const finalThemeOverrides: ThemeOverrides | undefined =
      themeOverrides || storedTemplateData?.themeOverrides;

    // If we have theme overrides, update them in the database
    if (themeOverrides && storedTemplateData) {
      await prisma.presentation.update({
        where: { id: presentationId },
        data: {
          templateData: {
            ...storedTemplateData,
            themeOverrides,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // Generate PPT file
    const pres = new PptxGenJS();
    if (title) {
      pres.title = title;
    }

    // Resolve theme from template and overrides
    const resolvedTheme = resolveTheme(templateSpec, finalThemeOverrides);

    // If template is provided, use layout assignment algorithm
    if (templateSpec && templateSpec.layouts.length > 0) {
      // Assign layouts to slides with max 2 repetitions
      const layoutAssignments = assignLayoutsToSlides(
        slidesData.slides,
        templateSpec,
        2 // maxRepetitions
      );

      // Render each slide using assigned layout
      for (const [index, slide] of slidesData.slides.entries()) {
        const pptxSlide = pres.addSlide();
        const assignedLayoutId = layoutAssignments[index];
        const layout = templateSpec.layouts.find(
          (l) => l.layoutId === assignedLayoutId
        );

        renderSlideWithLayout(pptxSlide, slide, layout, resolvedTheme);
      }
    } else {
      // No template - use default rendering
      for (const slide of slidesData.slides) {
        const pptxSlide = pres.addSlide();
        renderSlideWithLayout(pptxSlide, slide, undefined, resolvedTheme);
      }
    }

    const base64Buffer = (await pres.write({
      outputType: "base64",
    })) as string;

    const result = {
      buffer: base64Buffer,
      filename: title
        ? `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pptx`
        : "presentation.pptx",
      slideCount: slidesData.slides.length,
    };

    // Update presentation status
    await prisma.presentation.update({
      where: { id: presentationId },
      data: {
        status: "PPT_GENERATED",
        pptFileUrl: result.filename,
      },
    });

    // Return PPT file as base64
    return NextResponse.json({
      buffer: result.buffer,
      filename: result.filename,
      slideCount: result.slideCount,
      presentationId: presentation.id,
    });
  } catch (error: unknown) {
    console.error("Error generating PPT:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid outline format", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
