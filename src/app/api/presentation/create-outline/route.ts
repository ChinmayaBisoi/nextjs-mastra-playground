import { mastra } from "@/mastra";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { toAISdkFormat } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { Prisma } from "@prisma/client";
import { TemplateData } from "@/types/parse";

const pptAgent = mastra.getAgent("pptOutlineAgent");

const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  layout: z.enum(["title", "content", "titleContent", "imageText"]),
  notes: z.string().optional(),
});

const outlineSchema = z.object({
  slides: z.array(slideSchema),
});

function getOutlinePrompt(
  description: string,
  slideCount: number,
  webSearchEnabled: boolean,
  templateData?: TemplateData
) {
  // Build available layouts info if template is provided
  let layoutInfo = "";
  if (templateData?.templateSpec?.layouts) {
    const layoutNames = templateData.templateSpec.layouts
      .map((l) => l.layoutName)
      .filter((name) => name && name !== "Unnamed Layout")
      .slice(0, 10); // Limit to 10 layouts for prompt brevity

    if (layoutNames.length > 0) {
      layoutInfo = `\n- The presentation will use a custom template with these available layouts: ${layoutNames.join(", ")}`;
    }
  }

  const prompt = `Create a ${slideCount}-slide presentation about: "${description}"

Requirements:
- Generate exactly ${slideCount} slides
- First slide should use "title" layout with the presentation title
- All other slides should use "titleContent" layout
- Each slide should have a compelling title (5-8 words)
- Each slide should have 3-7 bullet points
- Content should be professional, clear, and engaging
- Ensure logical flow and narrative progression${layoutInfo}
${webSearchEnabled ? "- Use web search to gather current information about the topic" : ""}

Return the presentation outline as structured JSON with the slides array in this exact format:
{
  "slides": [
    {
      "title": "Slide Title Here",
      "content": ["First bullet point", "Second bullet point"],
      "layout": "titleContent",
      "notes": "Optional speaker notes"
    }
  ]
}`;

  return prompt;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { description, slideCount, webSearchEnabled, templateData } =
      await req.json();

    if (!description || !slideCount) {
      return NextResponse.json(
        { error: "Description and slideCount are required" },
        { status: 400 }
      );
    }

    // Create Presentation record with optional template data
    const presentation = await prisma.presentation.create({
      data: {
        userId,
        description,
        slideCount: parseInt(slideCount),
        webSearchEnabled: webSearchEnabled || false,
        status: "DRAFT",
      },
    });

    // Create prompt for the agent (pass template data for context)
    const prompt = getOutlinePrompt(
      description,
      slideCount,
      webSearchEnabled,
      templateData as TemplateData | undefined
    );

    // Generate structured output first (for database)
    const generateResponse = await pptAgent.generate(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        structuredOutput: {
          schema: outlineSchema,
        },
      }
    );

    let structuredData: z.infer<typeof outlineSchema> | null = null;
    if (generateResponse.object) {
      structuredData = generateResponse.object;
    } else if (generateResponse.text) {
      // Fallback: try to parse JSON from text response
      try {
        const jsonMatch = generateResponse.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = outlineSchema.parse(JSON.parse(jsonMatch[0]));
        }
      } catch (e) {
        console.error("Failed to parse JSON from response:", e);
      }
    }

    // Save structured data to database
    if (structuredData) {
      await prisma.presentation.update({
        where: { id: presentation.id },
        data: {
          outline: structuredData as Prisma.InputJsonValue,
          status: "OUTLINE_GENERATED",
        },
      });
    }

    // Stream a formatted version of the outline for display
    const stream = await pptAgent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Return streaming response with presentation ID in header
    const response = createUIMessageStreamResponse({
      stream: toAISdkFormat(stream, { from: "agent" }),
    });

    // Add presentation ID to response headers
    response.headers.set("X-Presentation-Id", presentation.id);

    return response;
  } catch (error: unknown) {
    console.error("Error creating outline:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
