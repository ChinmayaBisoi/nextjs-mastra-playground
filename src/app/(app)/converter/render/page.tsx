"use client";

import React, { useState, useEffect, useRef } from "react";
import { CanvasRenderer } from "@/components/slide-renderer/canvas-renderer";
import type { SlideJson } from "@/data/slide-converter";
import { Loader2, Upload, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SlideRenderPage() {
  const [slides, setSlides] = useState<SlideJson[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pptx")) {
      setError("Please upload a .pptx file");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pptx/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      setSlides(data.slides);
      setFolderName(data.folderName);
      setCurrentSlideIndex(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
      console.error("Error uploading file:", err);
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const currentSlide = slides[currentSlideIndex];
  const canGoPrevious = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;

  const goToPrevious = () => {
    if (canGoPrevious) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const clearUpload = () => {
    setSlides([]);
    setFolderName(null);
    setCurrentSlideIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const mediaBasePath = "/api/slide-media";

  useEffect(() => {
    console.log(currentSlide);
  }, [currentSlide]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Slide Viewer</h1>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pptx"
              onChange={handleFileUpload}
              className="hidden"
              id="pptx-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PPTX
                </>
              )}
            </Button>
            {folderName && (
              <Button onClick={clearUpload} variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {loading && slides.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading slide...</p>
          </div>
        </div>
      ) : slides.length === 0 ? (
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="flex flex-col items-center gap-6 p-12 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/50 max-w-md w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">
                  Upload PPTX File
                </h2>
                <p className="text-muted-foreground mb-6">
                  Upload a PowerPoint presentation file to view and edit slides
                </p>
              </div>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              size="lg"
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose PPTX File
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Supported format: .pptx
            </p>
          </div>
        </div>
      ) : currentSlide ? (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-semibold">
                  Slide {currentSlide.slideNumber} of {slides.length}
                </h2>
                <p className="text-muted-foreground">
                  Layout: {currentSlide.layout.reference} | Elements:{" "}
                  {currentSlide.elements.length}
                </p>
              </div>
              {slides.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={goToPrevious}
                    disabled={!canGoPrevious}
                    variant="outline"
                    size="icon"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                    {currentSlideIndex + 1} / {slides.length}
                  </span>
                  <Button
                    onClick={goToNext}
                    disabled={!canGoNext}
                    variant="outline"
                    size="icon"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center bg-gray-100 p-4 rounded-lg mb-6">
            <CanvasRenderer
              slideData={currentSlide}
              mediaBasePath={mediaBasePath}
              folder={folderName || "cream"}
              onElementMove={(elementId, newX, newY) => {
                // Update the slide data when element is moved
                const updatedSlides = [...slides];
                const updatedSlide = { ...currentSlide };
                updatedSlide.elements = currentSlide.elements.map((el) =>
                  el.id === elementId
                    ? { ...el, position: { x: newX, y: newY } }
                    : el
                );
                updatedSlides[currentSlideIndex] = updatedSlide;
                setSlides(updatedSlides);
              }}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Slide Info</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Background:</span>{" "}
                {currentSlide.background.type === "solid"
                  ? currentSlide.background.color
                  : currentSlide.background.type}
              </div>
              <div>
                <span className="font-medium">Elements:</span>{" "}
                {currentSlide.elements.length}
              </div>
              <div>
                <span className="font-medium">Images:</span>{" "}
                {currentSlide.elements.filter((e) => e.type === "image").length}
              </div>
              <div>
                <span className="font-medium">Text:</span>{" "}
                {currentSlide.elements.filter((e) => e.type === "text").length}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">No slide data available</p>
        </div>
      )}
    </div>
  );
}
