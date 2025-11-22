"use client";

import { PresentationInput } from "@/components/presentation-input";
import { SlideCountSelector } from "@/components/presentation/create/slide-count-selector";
import { WebSearchToggle } from "@/components/presentation/create/web-search-toggle";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";

type PresentationFormInput = {
  description: string;
  slideCount: number;
  webSearchEnabled: boolean;
};

export function PresentationForm() {
  const [slideCount, setSlideCount] = useState(8);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const handleSubmit = (formData: PresentationFormInput) => {
    console.log("Presentation Form Data:", formData);
  };

  const handleDescriptionSubmit = (value: string) => {
    if (!value.trim()) {
      toast.error("Please enter a valid description");
      return;
    }

    handleSubmit({ description: value, slideCount, webSearchEnabled });
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
    </div>
  );
}
