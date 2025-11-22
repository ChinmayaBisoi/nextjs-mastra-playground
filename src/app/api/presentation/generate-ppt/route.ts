import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import PptxGenJS from "pptxgenjs";

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

    const { presentationId, outline } = await req.json();

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

    // Generate PPT file using the same logic as the tool
    const pres = new PptxGenJS();
    if (title) {
      pres.title = title;
    }

    const primaryColor = "363636";
    const fontFamily = "Calibri";

    for (const slide of slidesData.slides) {
      const pptxSlide = pres.addSlide();

      switch (slide.layout) {
        case "title":
          pptxSlide.addText(slide.title, {
            x: 0.5,
            y: 2,
            w: 9,
            h: 1.5,
            fontSize: 44,
            bold: true,
            color: primaryColor,
            fontFace: fontFamily,
            align: "center",
          });
          break;

        case "content":
          slide.content.forEach((item, index) => {
            pptxSlide.addText(item, {
              x: 0.5,
              y: 0.5 + index * 0.8,
              w: 9,
              h: 0.7,
              fontSize: 18,
              bullet: true,
              color: "363636",
              fontFace: fontFamily,
            });
          });
          break;

        case "titleContent":
        default:
          pptxSlide.addText(slide.title, {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.8,
            fontSize: 32,
            bold: true,
            color: primaryColor,
            fontFace: fontFamily,
          });

          slide.content.forEach((item, index) => {
            pptxSlide.addText(item, {
              x: 0.7,
              y: 1.3 + index * 0.7,
              w: 8.6,
              h: 0.6,
              fontSize: 16,
              bullet: true,
              color: "363636",
              fontFace: fontFamily,
              lineSpacing: 28,
            });
          });
          break;

        case "imageText":
          pptxSlide.addText(slide.title, {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.8,
            fontSize: 32,
            bold: true,
            color: primaryColor,
            fontFace: fontFamily,
          });
          slide.content.forEach((item, index) => {
            pptxSlide.addText(item, {
              x: 0.7,
              y: 1.3 + index * 0.7,
              w: 4.5,
              h: 0.6,
              fontSize: 16,
              bullet: true,
              color: "363636",
              fontFace: fontFamily,
            });
          });
          break;
      }

      if (slide.notes) {
        pptxSlide.addNotes(slide.notes);
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
        pptFileUrl: result.filename, // Store filename, could store full URL if uploading to storage
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
