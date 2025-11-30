"use client";

import React, { useState, useEffect } from "react";
import { CanvasRenderer } from "@/components/slide-renderer/canvas-renderer";
import type { SlideJson } from "@/data/slide-converter";
import { Loader2 } from "lucide-react";

export default function SlideRenderPage() {
  const [slideData, setSlideData] = useState<SlideJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSlide() {
      try {
        setLoading(true);
        // Load slide1.json from the output directory
        const response = await fetch("/api/slide-data?slide=1");

        if (!response.ok) {
          throw new Error(`Failed to load slide: ${response.statusText}`);
        }

        const data: SlideJson = await response.json();
        setSlideData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load slide");
        console.error("Error loading slide:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSlide();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading slide...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!slideData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No slide data available</p>
      </div>
    );
  }

  // Media base path
  const mediaBasePath = "/api/slide-media";

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Slide {slideData.slideNumber}
        </h1>
        <p className="text-muted-foreground">
          Layout: {slideData.layout.reference} | Elements:{" "}
          {slideData.elements.length}
        </p>
      </div>

      <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
        <CanvasRenderer slideData={slideData} mediaBasePath={mediaBasePath} />
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Slide Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Background:</span>{" "}
            {slideData.background.type === "solid"
              ? slideData.background.color
              : slideData.background.type}
          </div>
          <div>
            <span className="font-medium">Elements:</span>{" "}
            {slideData.elements.length}
          </div>
          <div>
            <span className="font-medium">Images:</span>{" "}
            {slideData.elements.filter((e) => e.type === "image").length}
          </div>
          <div>
            <span className="font-medium">Text:</span>{" "}
            {slideData.elements.filter((e) => e.type === "text").length}
          </div>
        </div>
      </div>
    </div>
  );
}
