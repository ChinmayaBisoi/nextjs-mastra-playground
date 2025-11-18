"use client";

import "@/app/globals.css";
import { useEffect, useState } from "react";
import { DefaultChatTransport, type UIMessage, type ToolUIPart } from "ai";
import { useChat } from "@ai-sdk/react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

function Chat() {
  const [input, setInput] = useState<string>("");

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) {
          console.error("Failed to fetch messages:", res.statusText);
          return;
        }
        const data = (await res.json()) as UIMessage[];
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [setMessages]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="w-full p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message: UIMessage) => (
              <div key={message.id}>
                {message.parts?.map((part, i: number) => {
                  if (part.type === "text") {
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                      </Message>
                    );
                  }

                  if (
                    part.type === "tool-call" ||
                    part.type === "tool-result" ||
                    part.type === "tool-error" ||
                    (typeof part.type === "string" &&
                      part.type.startsWith("tool-"))
                  ) {
                    const toolPart = part as ToolUIPart;
                    return (
                      <Tool key={`${message.id}-${i}`}>
                        <ToolHeader
                          type={toolPart.type}
                          state={toolPart.state || "output-available"}
                          className="cursor-pointer"
                        />
                        <ToolContent>
                          <ToolInput input={toolPart.input || {}} />
                          <ToolOutput
                            output={toolPart.output}
                            errorText={toolPart.errorText}
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }

                  return null;
                })}
              </div>
            ))}
            <ConversationScrollButton />
          </ConversationContent>
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-20">
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              className="md:leading-10"
              value={input}
              placeholder="Type your message..."
              disabled={status !== "ready"}
            />
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}

export default Chat;
