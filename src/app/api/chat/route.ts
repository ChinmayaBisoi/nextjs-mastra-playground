import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
import { toAISdkFormat } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";
import { auth } from "@clerk/nextjs/server";

const weatherAgent = mastra.getAgent("weatherAgent");

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();

    const stream = await weatherAgent.stream(messages, {
      memory: {
        thread: userId,
        resource: "weather-chat",
      },
    });

    return createUIMessageStreamResponse({
      stream: toAISdkFormat(stream, { from: "agent" }),
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error T-T" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memory = await weatherAgent.getMemory();
    const response = await memory?.query({
      threadId: userId,
      resourceId: "weather-chat",
    });

    const uiMessages = convertMessages(response?.uiMessages ?? []).to(
      "AIV5.UI"
    );
    return NextResponse.json(uiMessages);
  } catch (error: unknown) {
    // Thread doesn't exist yet, return empty messages
    if (error instanceof Error && error.message?.includes("No thread found")) {
      return NextResponse.json([]);
    }
    // Re-throw other errors
    throw error;
  }
}
