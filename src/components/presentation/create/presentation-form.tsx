"use client";

import { PresentationInput } from "@/components/presentation-input";
import { SlideCountSelector } from "@/components/presentation/create/slide-count-selector";
import { WebSearchToggle } from "@/components/presentation/create/web-search-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PresentationFormInput = {
  description: string;
  slideCount: number;
  webSearchEnabled: boolean;
};

type Slide = {
  title: string;
  content: string[];
  layout: "title" | "content" | "titleContent" | "imageText";
  notes?: string;
};

type Outline = {
  slides: Slide[];
};

export function PresentationForm() {
  const router = useRouter();
  const [slideCount, setSlideCount] = useState(8);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [outlineJson, setOutlineJson] = useState("");
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  const handleDescriptionSubmit = async (value: string) => {
    if (!value.trim()) {
      toast.error("Please enter a valid description");
      return;
    }

    setIsGenerating(true);
    setStreamedText("");
    setOutline(null);
    setOutlineJson("");

    try {
      const response = await fetch("/api/presentation/create-outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: value,
          slideCount,
          webSearchEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate outline");
      }

      // Get presentation ID from headers
      const presId = response.headers.get("X-Presentation-Id");
      if (presId) {
        setPresentationId(presId);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        setStreamedText(accumulatedText);

        // Try to extract presentation ID and outline from the stream
        // The outline should be in JSON format
        try {
          const jsonMatch = accumulatedText.match(/\{[\s\S]*"slides"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.slides && Array.isArray(parsed.slides)) {
              setOutline(parsed);
              setOutlineJson(JSON.stringify(parsed, null, 2));
            }
          }
        } catch (e) {
          // Continue streaming even if JSON parsing fails
        }
      }

      // After stream completes, fetch the presentation from database to get the saved outline
      if (presId) {
        try {
          const presResponse = await fetch(`/api/presentation/${presId}`);
          if (presResponse.ok) {
            const presentation = await presResponse.json();
            if (presentation.outline) {
              setOutline(presentation.outline);
              setOutlineJson(JSON.stringify(presentation.outline, null, 2));
            }
          }
        } catch (e) {
          console.error("Failed to fetch presentation:", e);
          // Fallback: try to parse from streamed text
          try {
            const jsonMatch = accumulatedText.match(
              /\{[\s\S]*"slides"[\s\S]*\}/
            );
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.slides && Array.isArray(parsed.slides)) {
                setOutline(parsed);
                setOutlineJson(JSON.stringify(parsed, null, 2));
              }
            }
          } catch (parseError) {
            console.error("Failed to parse outline from stream:", parseError);
          }
        }
      } else {
        // Fallback: try to parse from streamed text if no presentation ID
        try {
          const jsonMatch = accumulatedText.match(/\{[\s\S]*"slides"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.slides && Array.isArray(parsed.slides)) {
              setOutline(parsed);
              setOutlineJson(JSON.stringify(parsed, null, 2));
            }
          }
        } catch (e) {
          console.error("Failed to parse outline:", e);
        }
      }

      toast.success("Outline generated successfully!");
    } catch (error) {
      console.error("Error generating outline:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate outline"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOutlineChange = (value: string) => {
    setOutlineJson(value);
    try {
      const parsed = JSON.parse(value);
      if (parsed.slides && Array.isArray(parsed.slides)) {
        setOutline(parsed);
      }
    } catch (e) {
      // Invalid JSON, but allow editing
    }
  };

  const handleDownloadPPT = async () => {
    if (!presentationId && !outline) {
      toast.error("Please generate an outline first");
      return;
    }

    setIsGeneratingPPT(true);

    try {
      let outlineToUse = outline;

      // If outline was edited, parse it
      if (outlineJson) {
        try {
          outlineToUse = JSON.parse(outlineJson);
        } catch (e) {
          toast.error("Invalid outline JSON");
          setIsGeneratingPPT(false);
          return;
        }
      }

      const response = await fetch("/api/presentation/generate-ppt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presentationId,
          outline: outlineToUse,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate PPT");
      }

      const result = await response.json();

      // Download the PPT file
      const binaryString = atob(result.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || "presentation.pptx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PPT generated and downloaded successfully!");
    } catch (error) {
      console.error("Error generating PPT:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PPT"
      );
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const handleGeneratePPT = () => {
    if (!presentationId) {
      toast.error("Please generate an outline first");
      return;
    }

    router.push(`/create/${presentationId}`);
  };

  return (
    <div className="space-y-8">
      {/* Description Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Describe Your Presentation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us what you want to create and we&apos;ll help you build it
          </p>
        </div>
        <PresentationInput
          onSubmit={handleDescriptionSubmit}
          placeholder="What can I build for you today?"
          disabled={isGenerating}
        />
      </div>

      <Separator />

      {/* Configuration Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your presentation settings
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SlideCountSelector value={slideCount} onChange={setSlideCount} />
          <WebSearchToggle
            checked={webSearchEnabled}
            onCheckedChange={setWebSearchEnabled}
          />
        </div>
      </div>

      {/* Streaming Output Section */}
      {isGenerating && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Generating Outline...</h2>
            </div>
            <div className="p-4 bg-muted rounded-lg min-h-[200px] max-h-[400px] overflow-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {streamedText || "Generating..."}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* Outline Editing Section */}
      {(outline || outlineJson) && !isGenerating && (
        <>
          <Separator />
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Edit Outline</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review and edit the outline before generating your presentation
              </p>
            </div>
            <Textarea
              value={outlineJson || JSON.stringify(outline || {}, null, 2)}
              onChange={(e) => handleOutlineChange(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Outline JSON will appear here..."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                onClick={handleDownloadPPT}
                disabled={isGeneratingPPT}
                variant="outline"
                className="w-full"
              >
                {isGeneratingPPT ? "Generating..." : "Download PPT"}
              </Button>
              <Button
                onClick={handleGeneratePPT}
                disabled={isGeneratingPPT || !presentationId}
                className="w-full"
              >
                Generate PPT
              </Button>
            </div>
          </div>
        </>
      )}

      <Separator />
    </div>
  );
}
