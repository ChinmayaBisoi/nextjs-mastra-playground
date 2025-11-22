"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Slide = {
  title: string;
  content: string[];
  layout: "title" | "content" | "titleContent" | "imageText";
  notes?: string;
};

type SlideEditorProps = {
  slides: Slide[];
  onSlidesChange: (slides: Slide[]) => void;
  currentSlideIndex: number;
  onSlideIndexChange: (index: number) => void;
  isStreaming?: boolean;
  hideThumbnails?: boolean;
  hideNavigation?: boolean;
};

export function SlideEditor({
  slides,
  onSlidesChange,
  currentSlideIndex,
  onSlideIndexChange,
  isStreaming = false,
  hideThumbnails = false,
  hideNavigation = false,
}: SlideEditorProps) {
  const [editingField, setEditingField] = useState<{
    slideIndex: number;
    type: "title" | "content" | null;
    contentIndex?: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const handleStartEdit = (
    slideIndex: number,
    type: "title" | "content",
    contentIndex?: number
  ) => {
    const slide = slides[slideIndex];
    if (type === "title") {
      setEditValue(slide.title);
    } else if (type === "content" && contentIndex !== undefined) {
      setEditValue(slide.content[contentIndex] || "");
    }
    setEditingField({ slideIndex, type, contentIndex });
  };

  const handleSaveEdit = () => {
    if (!editingField) return;

    const newSlides = [...slides];
    const slide = { ...newSlides[editingField.slideIndex] };

    if (editingField.type === "title") {
      slide.title = editValue;
    } else if (
      editingField.type === "content" &&
      editingField.contentIndex !== undefined
    ) {
      const newContent = [...slide.content];
      newContent[editingField.contentIndex] = editValue;
      slide.content = newContent;
    }

    newSlides[editingField.slideIndex] = slide;
    onSlidesChange(newSlides);
    setEditingField(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleAddContentItem = (slideIndex: number) => {
    const newSlides = [...slides];
    const slide = { ...newSlides[slideIndex] };
    slide.content = [...slide.content, "New bullet point"];
    newSlides[slideIndex] = slide;
    onSlidesChange(newSlides);
    handleStartEdit(slideIndex, "content", slide.content.length - 1);
  };

  const handleRemoveContentItem = (slideIndex: number, contentIndex: number) => {
    const newSlides = [...slides];
    const slide = { ...newSlides[slideIndex] };
    slide.content = slide.content.filter((_, i) => i !== contentIndex);
    newSlides[slideIndex] = slide;
    onSlidesChange(newSlides);
  };

  const handleLayoutChange = (slideIndex: number, layout: Slide["layout"]) => {
    const newSlides = [...slides];
    const slide = { ...newSlides[slideIndex] };
    slide.layout = layout;
    newSlides[slideIndex] = slide;
    onSlidesChange(newSlides);
  };

  const handleDeleteSlide = (slideIndex: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== slideIndex);
    onSlidesChange(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      onSlideIndexChange(newSlides.length - 1);
    }
  };

  const renderSlide = (slide: Slide, index: number) => {
    const isEditing = editingField?.slideIndex === index;
    const isCurrentSlide = index === currentSlideIndex;

    return (
      <div
        key={index}
        className={cn(
          "relative bg-slide-background rounded-lg shadow-lg overflow-hidden",
          "aspect-video w-full",
          isCurrentSlide && "ring-2 ring-primary"
        )}
        style={{ aspectRatio: "16/9" }}
      >
        <div className="absolute inset-0 p-8 flex flex-col">
          {slide.layout === "title" && (
            <div className="flex-1 flex items-center justify-center">
              {isEditing && editingField?.type === "title" ? (
                <Input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="text-4xl font-bold text-center border-2 border-primary"
                />
              ) : (
                <h1
                  onClick={() => handleStartEdit(index, "title")}
                  className="text-4xl font-bold text-center cursor-text hover:bg-slide-hover rounded px-2 py-1 text-slide-text"
                >
                  {slide.title || "Click to edit title"}
                </h1>
              )}
            </div>
          )}

          {slide.layout === "content" && (
            <div className="flex-1 flex flex-col justify-center space-y-3">
              {slide.content.map((item, contentIndex) => (
                <div key={contentIndex} className="flex items-start gap-2">
                  <span className="text-2xl mt-1">•</span>
                  {isEditing &&
                  editingField?.type === "content" &&
                  editingField?.contentIndex === contentIndex ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={handleKeyDown}
                      className="flex-1 text-lg border-2 border-primary"
                    />
                  ) : (
                    <p
                      onClick={() => handleStartEdit(index, "content", contentIndex)}
                      className="flex-1 text-lg cursor-text hover:bg-slide-hover rounded px-2 py-1 text-slide-text"
                    >
                      {item || "Click to edit"}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContentItem(index, contentIndex)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddContentItem(index)}
                className="mt-2 w-fit"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add bullet
              </Button>
            </div>
          )}

          {slide.layout === "titleContent" && (
            <>
              <div className="mb-6">
                {isEditing && editingField?.type === "title" ? (
                  <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="text-3xl font-bold border-2 border-primary"
                  />
                ) : (
                  <h2
                    onClick={() => handleStartEdit(index, "title")}
                    className="text-3xl font-bold cursor-text hover:bg-slide-hover rounded px-2 py-1 text-slide-text"
                  >
                    {slide.title || "Click to edit title"}
                  </h2>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {slide.content.map((item, contentIndex) => (
                  <div key={contentIndex} className="flex items-start gap-2">
                    <span className="text-xl mt-1">•</span>
                    {isEditing &&
                    editingField?.type === "content" &&
                    editingField?.contentIndex === contentIndex ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-base border-2 border-primary"
                      />
                    ) : (
                      <p
                        onClick={() =>
                          handleStartEdit(index, "content", contentIndex)
                        }
                        className="flex-1 text-base cursor-text hover:bg-slide-hover rounded px-2 py-1 text-slide-text"
                      >
                        {item || "Click to edit"}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContentItem(index, contentIndex)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddContentItem(index)}
                  className="mt-2 w-fit"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add bullet
                </Button>
              </div>
            </>
          )}

          {slide.layout === "imageText" && (
            <>
              <div className="mb-4">
                {isEditing && editingField?.type === "title" ? (
                  <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="text-3xl font-bold border-2 border-primary"
                  />
                ) : (
                  <h2
                    onClick={() => handleStartEdit(index, "title")}
                    className="text-3xl font-bold cursor-text hover:bg-slide-hover rounded px-2 py-1 text-slide-text"
                  >
                    {slide.title || "Click to edit title"}
                  </h2>
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-slide-placeholder rounded-lg flex items-center justify-center">
                  <span className="text-slide-placeholder-text text-sm">Image placeholder</span>
                </div>
                <div className="space-y-2">
                  {slide.content.map((item, contentIndex) => (
                    <div key={contentIndex} className="flex items-start gap-2">
                      <span className="text-xl mt-1">•</span>
                      {isEditing &&
                      editingField?.type === "content" &&
                      editingField?.contentIndex === contentIndex ? (
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="flex-1 text-base border-2 border-primary"
                        />
                      ) : (
                        <p
                          onClick={() =>
                            handleStartEdit(index, "content", contentIndex)
                          }
                          className="flex-1 text-base cursor-text hover:bg-slide-hover rounded px-2 py-1 text-slide-text"
                        >
                          {item || "Click to edit"}
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveContentItem(index, contentIndex)
                        }
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddContentItem(index)}
                    className="mt-2 w-fit"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add bullet
                  </Button>
                </div>
              </div>
            </>
          )}

          {isCurrentSlide && (
            <div className="absolute top-2 right-2 flex gap-2">
              <Select
                value={slide.layout}
                onValueChange={(value) =>
                  handleLayoutChange(index, value as Slide["layout"])
                }
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="titleContent">Title + Content</SelectItem>
                  <SelectItem value="imageText">Image + Text</SelectItem>
                </SelectContent>
              </Select>
              {slides.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSlide(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground">No slides available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Slide Canvas */}
      <div className={cn("flex gap-4", hideThumbnails && "flex-col")}>
        {/* Thumbnail Sidebar */}
        {!hideThumbnails && (
          <div className="flex flex-col gap-2 w-32 flex-shrink-0">
            {slides.map((slide, index) => (
              <button
                key={index}
                onClick={() => onSlideIndexChange(index)}
                className={cn(
                  "relative aspect-video bg-slide-background rounded border-2 p-1 transition-all",
                  index === currentSlideIndex
                    ? "border-primary shadow-md"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="text-xs font-semibold truncate text-slide-text">
                  {slide.title || `Slide ${index + 1}`}
                </div>
                <div className="text-[8px] text-slide-text-muted mt-1">
                  {slide.layout}
                </div>
                {isStreaming && index === slides.length - 1 && (
                  <div className="absolute inset-0 bg-blue-500/20 animate-pulse rounded" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main Slide Display */}
        <div className={cn(hideThumbnails ? "w-full" : "flex-1")}>
          {renderSlide(currentSlide, currentSlideIndex)}
        </div>
      </div>

      {/* Navigation Controls */}
      {!hideNavigation && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSlideIndexChange(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onSlideIndexChange(
                  Math.min(slides.length - 1, currentSlideIndex + 1)
                )
              }
              disabled={currentSlideIndex === slides.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Slide {currentSlideIndex + 1} of {slides.length}
          </div>
        </div>
      )}
    </div>
  );
}

