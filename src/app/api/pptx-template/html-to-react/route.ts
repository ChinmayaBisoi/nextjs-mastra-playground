import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reactGeneratorAgent } from "@/mastra/agents/react-generator-agent";
import { mastra } from "@/mastra";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { html } = body;

    if (!html || !html.trim()) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("react-generator-agent");
    if (!agent) {
      return NextResponse.json(
        { error: "React generator agent not found" },
        { status: 500 }
      );
    }

    const response = await agent.generate([
      {
        role: "user",
        content: `HTML INPUT:\n${html}`,
      },
    ]);

    let reactComponent = response.text || response.object?.react_component || "";

    if (!reactComponent) {
      return NextResponse.json(
        { error: "Failed to generate React component" },
        { status: 500 }
      );
    }

    // Clean up React component
    reactComponent = reactComponent
      .replace(/```tsx/g, "")
      .replace(/```typescript/g, "")
      .replace(/```javascript/g, "")
      .replace(/```/g, "")
      .trim();

    // Filter out import/export statements
    const lines = reactComponent.split("\n");
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith("import ") &&
        !trimmed.startsWith("export ") &&
        trimmed !== "use client"
      );
    });

    reactComponent = filteredLines.join("\n").trim();

    return NextResponse.json({
      success: true,
      react_component: reactComponent,
      message: "React component generated successfully",
    });
  } catch (error) {
    console.error("Error converting HTML to React:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

