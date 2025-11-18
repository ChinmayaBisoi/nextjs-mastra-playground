import { mastra } from "@/mastra";
import { NextResponse } from "next/server";
import { toAISdkFormat } from "@mastra/ai-sdk";
import { convertMessages } from "@mastra/core/agent";
import { createUIMessageStreamResponse } from "ai";

const weatherAgent = mastra.getAgent("weatherAgent");

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await weatherAgent.stream(messages, {
    memory: {
      thread: "example-user-id",
      resource: "weather-chat",
    },
  });

  return createUIMessageStreamResponse({
    stream: toAISdkFormat(stream, { from: "agent" }),
  });
}

export async function GET() {
  try {
    const memory = await weatherAgent.getMemory();
    const response = await memory?.query({
      threadId: "example-user-id",
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
