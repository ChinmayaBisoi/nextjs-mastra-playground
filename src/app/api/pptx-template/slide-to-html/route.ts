import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { htmlGeneratorAgent } from "@/mastra/agents/html-generator-agent";
import { mastra } from "@/mastra";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { xml, fonts } = body;

    if (!xml) {
      return NextResponse.json(
        { error: "XML content is required" },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("html-generator-agent");
    if (!agent) {
      return NextResponse.json(
        { error: "HTML generator agent not found" },
        { status: 500 }
      );
    }

    // Build prompt with XML and optional fonts
    const fontsText = fonts && fonts.length > 0
      ? `\nFONTS (Normalized root families used in this slide, use where it is required): ${fonts.join(", ")}`
      : "";

    const userPrompt = `OXML: \n\n${xml}${fontsText}`;

    const response = await agent.generate([
      {
        role: "user",
        content: userPrompt,
      },
    ]);

    const html = response.text || response.object?.html || "";

    if (!html) {
      return NextResponse.json(
        { error: "Failed to generate HTML" },
        { status: 500 }
      );
    }

    // Clean up HTML (remove markdown code blocks if present)
    const cleanHtml = html
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({
      success: true,
      html: cleanHtml,
    });
  } catch (error) {
    console.error("Error converting slide to HTML:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

