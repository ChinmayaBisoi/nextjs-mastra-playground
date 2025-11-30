"use client";

import { PresentationInput } from "@/components/presentation-input";
import { SlideCountSelector } from "@/components/presentation/create/slide-count-selector";
import { WebSearchToggle } from "@/components/presentation/create/web-search-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TemplateData, TemplateSpec, ThemeOverrides } from "@/types/parse";
import { Upload, X, FileText, Palette } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [slideCount, setSlideCount] = useState(8);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [outlineJson, setOutlineJson] = useState("");
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  // Template state
  const [templateSpec, setTemplateSpec] = useState<TemplateSpec | null>(null);
  const [isParsingTemplate, setIsParsingTemplate] = useState(false);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);

  // Theme overrides state
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides>({});
  const [showThemeCustomization, setShowThemeCustomization] = useState(false);

  const handleTemplateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pptx")) {
      toast.error("Please upload a .pptx file");
      return;
    }

    setIsParsingTemplate(true);
    setTemplateFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse template");
      }

      const spec: TemplateSpec = await response.json();
      setTemplateSpec(spec);

      // Initialize theme overrides from template theme
      if (spec.theme) {
        setThemeOverrides({
          primaryColor: spec.theme.primaryColor,
          accentColors: spec.theme.accentColors,
          fontFamilies: spec.theme.fontFamilies,
        });
      }

      toast.success(`Template loaded: ${spec.layouts.length} layouts found`);
    } catch (error) {
      console.error("Error parsing template:", error);
      toast.error("Failed to parse template file");
      setTemplateFileName(null);
      setTemplateSpec(null);
    } finally {
      setIsParsingTemplate(false);
    }
  };

  const handleRemoveTemplate = () => {
    setTemplateSpec(null);
    setTemplateFileName(null);
    setThemeOverrides({});
    setShowThemeCustomization(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleThemeColorChange = (key: keyof ThemeOverrides, value: string) => {
    setThemeOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAccentColorChange = (index: number, value: string) => {
    setThemeOverrides((prev) => {
      const newAccents = [...(prev.accentColors || [])];
      newAccents[index] = value;
      return {
        ...prev,
        accentColors: newAccents,
      };
    });
  };

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
      // Build template data if template is uploaded
      const templateData: TemplateData | undefined = templateSpec
        ? {
            templateSpec,
            themeOverrides:
              Object.keys(themeOverrides).length > 0
                ? themeOverrides
                : undefined,
          }
        : undefined;

      const response = await fetch("/api/presentation/create-outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: value,
          slideCount,
          webSearchEnabled,
          templateData,
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
        try {
          const jsonMatch = accumulatedText.match(/\{[\s\S]*"slides"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.slides && Array.isArray(parsed.slides)) {
              setOutline(parsed);
              setOutlineJson(JSON.stringify(parsed, null, 2));
            }
          }
        } catch {
          // Continue streaming even if JSON parsing fails
        }
      }

      // After stream completes, fetch the presentation from database
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
        } catch {
          console.error("Failed to parse outline");
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
    } catch {
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
        } catch {
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
          themeOverrides:
            Object.keys(themeOverrides).length > 0 ? themeOverrides : undefined,
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

      <Separator />

      {/* Template Upload Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Choose a template </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a .pptx template to use its layouts and theme
          </p>
        </div>

        <div className="space-y-4">
          {/* Upload Button / Template Display */}
          {!templateSpec ? (
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pptx"
                onChange={handleTemplateUpload}
                className="hidden"
                id="template-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingTemplate}
                className="w-full md:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isParsingTemplate ? "Parsing..." : "Upload Template"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{templateFileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {templateSpec.layouts.length} layouts available
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowThemeCustomization(!showThemeCustomization)
                  }
                >
                  <Palette className="w-4 h-4 mr-1" />
                  Theme
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveTemplate}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Layout Preview */}
          {templateSpec && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Available Layouts:
              </Label>
              <div className="flex flex-wrap gap-2">
                {templateSpec.layouts.slice(0, 8).map((layout) => (
                  <span
                    key={layout.layoutId}
                    className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground"
                  >
                    {layout.layoutName || "Unnamed"}
                  </span>
                ))}
                {templateSpec.layouts.length > 8 && (
                  <span className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground">
                    +{templateSpec.layouts.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Theme Customization */}
          {templateSpec && showThemeCustomization && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Theme Customization
              </h3>
              <p className="text-sm text-muted-foreground">
                Customize colors while keeping the template layouts
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={
                        themeOverrides.primaryColor ||
                        templateSpec.theme?.primaryColor ||
                        "#252525"
                      }
                      onChange={(e) =>
                        handleThemeColorChange("primaryColor", e.target.value)
                      }
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={
                        themeOverrides.primaryColor ||
                        templateSpec.theme?.primaryColor ||
                        "#252525"
                      }
                      onChange={(e) =>
                        handleThemeColorChange("primaryColor", e.target.value)
                      }
                      className="flex-1 font-mono text-sm"
                      placeholder="#252525"
                    />
                  </div>
                </div>

                {/* Accent Colors */}
                {(
                  themeOverrides.accentColors ||
                  templateSpec.theme?.accentColors ||
                  []
                )
                  .slice(0, 3)
                  .map((color, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`accentColor-${index}`}>
                        Accent Color {index + 1}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`accentColor-${index}`}
                          type="color"
                          value={color || "#4472C4"}
                          onChange={(e) =>
                            handleAccentColorChange(index, e.target.value)
                          }
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={color || "#4472C4"}
                          onChange={(e) =>
                            handleAccentColorChange(index, e.target.value)
                          }
                          className="flex-1 font-mono text-sm"
                          placeholder="#4472C4"
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Font Families */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="majorFont">Heading Font</Label>
                  <Input
                    id="majorFont"
                    type="text"
                    value={
                      themeOverrides.fontFamilies?.major ||
                      templateSpec.theme?.fontFamilies?.major ||
                      "Calibri"
                    }
                    onChange={(e) =>
                      setThemeOverrides((prev) => ({
                        ...prev,
                        fontFamilies: {
                          ...prev.fontFamilies,
                          major: e.target.value,
                        },
                      }))
                    }
                    placeholder="Calibri"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minorFont">Body Font</Label>
                  <Input
                    id="minorFont"
                    type="text"
                    value={
                      themeOverrides.fontFamilies?.minor ||
                      templateSpec.theme?.fontFamilies?.minor ||
                      "Calibri"
                    }
                    onChange={(e) =>
                      setThemeOverrides((prev) => ({
                        ...prev,
                        fontFamilies: {
                          ...prev.fontFamilies,
                          minor: e.target.value,
                        },
                      }))
                    }
                    placeholder="Calibri"
                  />
                </div>
              </div>
            </div>
          )}
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
