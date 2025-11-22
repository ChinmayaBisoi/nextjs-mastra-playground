"use client";

import { useState } from "react";
import { PresentationInput } from "@/components/presentation-input";
import { SlideCountSelector } from "@/components/presentation/create/slide-count-selector";
import { WebSearchToggle } from "@/components/presentation/create/web-search-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function PresentationForm() {
  const [description, setDescription] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const handleSubmit = () => {
    const formData = {
      description,
      slideCount,
      webSearchEnabled,
    };
    console.log("Presentation Form Data:", formData);
  };

  const handleDescriptionSubmit = (value: string) => {
    setDescription(value);
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

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!description.trim()}
          className="min-w-[200px]"
        >
          Generate Presentation
        </Button>
      </div>
    </div>
  );
}
