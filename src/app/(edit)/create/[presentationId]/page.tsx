"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Type,
  Square,
  Circle,
  MessageSquare,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import SidebarLayout from "@/components/layouts/sidebar-layout";

type TextElement = {
  id: string;
  type: "text";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  align: "left" | "center" | "right";
  zIndex: number;
};

type ShapeElement = {
  id: string;
  type: "shape";
  shapeType: "rectangle" | "circle";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  zIndex: number;
};

type SlideElement = TextElement | ShapeElement;

type Slide = {
  id: string;
  background: string;
  elements: SlideElement[];
};

type Comment = {
  id: number;
  author: string;
  content: string;
  timestamp: string;
  slideIndex: number;
};

type Collaborator = {
  id: number;
  name: string;
  color: string;
  active: boolean;
};

type FileWithName = File & {
  name: string;
};

export default function GoogleSlidesEditor() {
  const [file, setFile] = useState<FileWithName | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState("");
  const [selectedElement, setSelectedElement] = useState<SlideElement | null>(
    null
  );
  const [history, setHistory] = useState<Slide[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [collaborators] = useState<Collaborator[]>([
    { id: 1, name: "You", color: "#3b82f6", active: true },
    { id: 2, name: "Sarah K.", color: "#10b981", active: true },
    { id: 3, name: "Mike R.", color: "#f59e0b", active: false },
  ]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];

    if (!uploadedFile) return;

    const validTypes = [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!validTypes.includes(uploadedFile.type)) {
      setError("Please upload a valid PowerPoint file (.ppt or .pptx)");
      return;
    }

    setError("");
    setFile(uploadedFile as FileWithName);

    try {
      const initialSlides: Slide[] = Array.from({ length: 3 }, (_, i) => ({
        id: `slide-${i}`,
        background: "#ffffff",
        elements: [
          {
            id: `${i}-title`,
            type: "text",
            content: `Slide ${i + 1}`,
            x: 100,
            y: 100,
            width: 600,
            height: 80,
            fontSize: 48,
            color: "#000000",
            fontWeight: "bold",
            align: "left",
            zIndex: 1,
          },
          {
            id: `${i}-subtitle`,
            type: "text",
            content: "Click to add text",
            x: 100,
            y: 200,
            width: 600,
            height: 60,
            fontSize: 24,
            color: "#666666",
            fontWeight: "normal",
            align: "left",
            zIndex: 2,
          },
        ],
      }));

      setSlides(initialSlides);
      setCurrentSlide(0);
      addToHistory(initialSlides);
    } catch {
      setError("Failed to process PowerPoint file");
    }
  };

  const addToHistory = useCallback(
    (newSlides: Slide[]) => {
      setHistory((prevHistory) => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newSlides)));
        const newIndex = newHistory.length - 1;
        setTimeout(() => setHistoryIndex(newIndex), 0);
        return newHistory;
      });
    },
    [historyIndex]
  );

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSlides(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSlides(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const updateSlides = useCallback(
    (updatedSlides: Slide[]) => {
      setSlides(updatedSlides);
      addToHistory(updatedSlides);
    },
    [addToHistory]
  );

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
    setSelectedElement(null);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
    setSelectedElement(null);
  };

  const handleReset = () => {
    setFile(null);
    setSlides([]);
    setCurrentSlide(0);
    setError("");
    setSelectedElement(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const addTextElement = () => {
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      type: "text",
      content: "New Text",
      x: 300,
      y: 250,
      width: 400,
      height: 60,
      fontSize: 24,
      color: "#000000",
      fontWeight: "normal",
      align: "left",
      zIndex: slides[currentSlide].elements.length + 1,
    };

    const updatedSlides = [...slides];
    updatedSlides[currentSlide].elements.push(newElement);
    updateSlides(updatedSlides);
  };

  const addShapeElement = (shapeType: "rectangle" | "circle") => {
    const newElement: ShapeElement = {
      id: `shape-${Date.now()}`,
      type: "shape",
      shapeType,
      x: 300,
      y: 250,
      width: 200,
      height: 200,
      color: "#3b82f6",
      borderColor: "#1e40af",
      borderWidth: 2,
      zIndex: slides[currentSlide].elements.length + 1,
    };

    const updatedSlides = [...slides];
    updatedSlides[currentSlide].elements.push(newElement);
    updateSlides(updatedSlides);
  };

  const updateElement = useCallback(
    (elementId: string, updates: Partial<SlideElement>) => {
      const updatedSlides = [...slides];
      const elementIndex = updatedSlides[currentSlide].elements.findIndex(
        (el) => el.id === elementId
      );

      if (elementIndex !== -1) {
        const updatedElement = {
          ...updatedSlides[currentSlide].elements[elementIndex],
          ...updates,
        } as SlideElement;
        updatedSlides[currentSlide].elements[elementIndex] = updatedElement;
        updateSlides(updatedSlides);

        if (selectedElement?.id === elementId) {
          setSelectedElement(updatedElement);
        }
      }
    },
    [slides, currentSlide, selectedElement, updateSlides]
  );

  const deleteElement = (elementId: string) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlide].elements = updatedSlides[
      currentSlide
    ].elements.filter((el) => el.id !== elementId);
    updateSlides(updatedSlides);
    setSelectedElement(null);
  };

  const addNewSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      background: "#ffffff",
      elements: [
        {
          id: `title-${Date.now()}`,
          type: "text",
          content: "New Slide",
          x: 100,
          y: 100,
          width: 600,
          height: 80,
          fontSize: 48,
          color: "#000000",
          fontWeight: "bold",
          align: "left",
          zIndex: 1,
        } as TextElement,
      ],
    };

    const updatedSlides = [...slides, newSlide];
    updateSlides(updatedSlides);
    setCurrentSlide(slides.length);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) return;

    const updatedSlides = slides.filter((_, index) => index !== currentSlide);
    updateSlides(updatedSlides);
    setCurrentSlide(Math.max(0, currentSlide - 1));
  };

  const updateSlideBackground = (color: string) => {
    const updatedSlides = [...slides];
    updatedSlides[currentSlide].background = color;
    updateSlides(updatedSlides);
  };

  const handleMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    if ((e.target as HTMLElement).contentEditable === "true") return;

    setSelectedElement(element);
    setIsDragging(true);

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - element.x,
      y: e.clientY - rect.top - element.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !selectedElement || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragStart.x;
      const newY = e.clientY - rect.top - dragStart.y;

      updateElement(selectedElement.id, { x: newX, y: newY });
    },
    [isDragging, selectedElement, dragStart, updateElement]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const addComment = () => {
    const newComment = {
      id: Date.now(),
      author: "You",
      content: "New comment",
      timestamp: new Date().toLocaleTimeString(),
      slideIndex: currentSlide,
    };
    setComments([...comments, newComment]);
  };

  const exportPresentation = () => {
    const dataStr = JSON.stringify(slides, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "presentation-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Canvas resize logic with aspect ratio
  useEffect(() => {
    const calculateCanvasSize = () => {
      if (!canvasContainerRef.current) return;

      const container = canvasContainerRef.current;
      const containerWidth = container.clientWidth - 64; // Account for padding (32px each side)
      const containerHeight = container.clientHeight - 64; // Account for padding (32px top/bottom)

      const aspectRatio = 16 / 9;
      let width = containerWidth;
      let height = width / aspectRatio;

      if (height > containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
      }

      // Ensure minimum size
      const minWidth = 640;
      const minHeight = 360;

      if (width < minWidth) {
        width = minWidth;
        height = width / aspectRatio;
      }

      if (height < minHeight) {
        height = minHeight;
        width = height * aspectRatio;
      }

      setCanvasSize({ width, height });
    };

    // Initial calculation
    calculateCanvasSize();

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      calculateCanvasSize();
    });

    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener("resize", calculateCanvasSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateCanvasSize);
    };
  }, [slides.length]); // Recalculate when slides change

  // Show properties panel when element is selected - handled in setSelectedElement calls

  if (!file) {
    return (
      <>
        <BreadcrumbHeader title="Create" href="/create" />
        <PageLayout
          title="Slides Editor"
          description="Create and collaborate on presentations"
        >
          <div className="bg-card rounded-xl shadow-lg p-12 border">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-16 cursor-pointer hover:border-primary hover:bg-accent transition-all">
              <Upload className="w-16 h-16 text-muted-foreground mb-4" />
              <span className="text-xl font-semibold mb-2">
                Upload PowerPoint or start blank
              </span>
              <span className="text-sm text-muted-foreground">
                Supports .ppt and .pptx files
              </span>
              <input
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {error && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
                {error}
              </div>
            )}
          </div>
        </PageLayout>
      </>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className="h-screen flex flex-col">
      <BreadcrumbHeader hideSidebarTrigger title="Create" href="/create" />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Top Toolbar */}
        <div className="bg-card border-b border-border px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <input
                  type="text"
                  value={file.name}
                  onChange={(e) => {
                    if (file) {
                      const newFile = Object.assign(file, {
                        name: e.target.value,
                      });
                      setFile(newFile);
                    }
                  }}
                  className="font-semibold bg-transparent border-none outline-none"
                />
                <p className="text-xs text-muted-foreground">
                  Last edited just now
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Collaborators */}
              <div className="flex items-center gap-2 mr-4">
                {collaborators.map((collab) => (
                  <div key={collab.id} className="relative" title={collab.name}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: collab.color }}
                    >
                      {collab.name[0]}
                    </div>
                    {collab.active && (
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-card"></div>
                    )}
                  </div>
                ))}
                <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowComments(!showComments)}
                className="p-2 hover:bg-accent rounded-lg"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                onClick={exportPresentation}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Export
              </button>
              <button
                onClick={handleReset}
                className="p-2 hover:bg-accent rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Secondary Toolbar */}
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-2 hover:bg-accent rounded disabled:opacity-30"
                  title="Undo"
                >
                  <Undo className="w-5 h-5" />
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 hover:bg-accent rounded disabled:opacity-30"
                  title="Redo"
                >
                  <Redo className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-border mx-2"></div>

                <button
                  onClick={addTextElement}
                  className="px-3 py-2 hover:bg-accent rounded flex items-center gap-2"
                >
                  <Type className="w-5 h-5" />
                  Text
                </button>
                <button
                  onClick={() => addShapeElement("rectangle")}
                  className="p-2 hover:bg-accent rounded"
                  title="Rectangle"
                >
                  <Square className="w-5 h-5" />
                </button>
                <button
                  onClick={() => addShapeElement("circle")}
                  className="p-2 hover:bg-accent rounded"
                  title="Circle"
                >
                  <Circle className="w-5 h-5" />
                </button>

                {selectedElement?.type === "text" && (
                  <>
                    <div className="w-px h-6 bg-border mx-2"></div>
                    <button className="p-2 hover:bg-accent rounded">
                      <Bold className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-accent rounded">
                      <Italic className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-accent rounded">
                      <Underline className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        updateElement(selectedElement.id, { align: "left" })
                      }
                      className="p-2 hover:bg-accent rounded"
                    >
                      <AlignLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        updateElement(selectedElement.id, { align: "center" })
                      }
                      className="p-2 hover:bg-accent rounded"
                    >
                      <AlignCenter className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        updateElement(selectedElement.id, { align: "right" })
                      }
                      className="p-2 hover:bg-accent rounded"
                    >
                      <AlignRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          {selectedElement && (
            <div className="bg-muted/30 border-b border-border px-4 py-2 shrink-0">
              <div className="flex items-center gap-4">
                {selectedElement.type === "text" && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Font:
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="96"
                        value={selectedElement.fontSize}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            fontSize: parseInt(e.target.value),
                          })
                        }
                        className="w-24 h-1"
                      />
                      <span className="text-xs text-foreground w-8">
                        {selectedElement.fontSize}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Color:
                      </label>
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            color: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded cursor-pointer border border-border"
                      />
                    </div>
                  </>
                )}

                {selectedElement.type === "shape" && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Fill:
                      </label>
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            color: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded cursor-pointer border border-border"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Border:
                      </label>
                      <input
                        type="color"
                        value={selectedElement.borderColor}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            borderColor: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded cursor-pointer border border-border"
                      />
                    </div>
                  </>
                )}

                <div className="w-px h-6 bg-border mx-2"></div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Slide BG:
                  </label>
                  <input
                    type="color"
                    value={currentSlideData?.background}
                    onChange={(e) => updateSlideBackground(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>

                <div className="flex-1"></div>

                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Slides */}
            <div className="w-64 bg-card border-r border-border overflow-y-auto p-4 shrink-0">
              <div className="space-y-3">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => {
                      setCurrentSlide(index);
                      setSelectedElement(null);
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      currentSlide === index
                        ? "border-primary shadow-lg"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className="aspect-video text-xs p-2"
                      style={{ backgroundColor: slide.background || "#ffffff" }}
                    >
                      <div className="text-gray-900 font-semibold">
                        {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addNewSlide}
                  className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary hover:bg-accent transition-all"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Main Canvas */}
            <div
              ref={canvasContainerRef}
              className="flex-1 p-8 overflow-auto flex items-center justify-center"
            >
              <div className="w-full flex items-center justify-center">
                <div
                  className="rounded-lg shadow-2xl overflow-hidden border border-border"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <div
                    ref={canvasRef}
                    className="relative cursor-default"
                    style={{
                      width: `${canvasSize.width || 1280}px`,
                      height: `${canvasSize.height || 720}px`,
                      backgroundColor:
                        currentSlideData?.background || "#ffffff",
                    }}
                    onClick={() => {
                      setSelectedElement(null);
                    }}
                  >
                    {currentSlideData?.elements
                      .sort(
                        (a: SlideElement, b: SlideElement) =>
                          a.zIndex - b.zIndex
                      )
                      .map((element: SlideElement) => (
                        <div
                          key={element.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleMouseDown(e, element);
                          }}
                          className={`absolute ${
                            selectedElement?.id === element.id
                              ? "ring-2 ring-blue-500"
                              : ""
                          }`}
                          style={{
                            left: `${element.x}px`,
                            top: `${element.y}px`,
                            width: element.width
                              ? `${element.width}px`
                              : "auto",
                            height: element.height
                              ? `${element.height}px`
                              : "auto",
                            cursor: "move",
                          }}
                        >
                          {element.type === "text" ? (
                            <div
                              contentEditable={
                                selectedElement?.id === element.id
                              }
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                updateElement(element.id, {
                                  content: (e.target as HTMLElement).innerText,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: `${element.fontSize}px`,
                                color: element.color,
                                fontWeight: element.fontWeight,
                                textAlign: element.align,
                                width: "100%",
                                height: "100%",
                                outline: "none",
                                padding: "8px",
                              }}
                              className="cursor-text"
                            >
                              {element.content}
                            </div>
                          ) : element.type === "shape" ? (
                            element.shapeType === "rectangle" ? (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: element.color,
                                  border: `${element.borderWidth}px solid ${element.borderColor}`,
                                  borderRadius: "8px",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: element.color,
                                  border: `${element.borderWidth}px solid ${element.borderColor}`,
                                  borderRadius: "50%",
                                }}
                              />
                            )
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={handlePrevSlide}
                    disabled={currentSlide === 0}
                    className="p-2 bg-card rounded-full shadow hover:shadow-lg disabled:opacity-30 transition-all border border-border"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <span className="font-medium">
                    {currentSlide + 1} / {slides.length}
                  </span>

                  <button
                    onClick={handleNextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className="p-2 bg-card rounded-full shadow hover:shadow-lg disabled:opacity-30 transition-all border border-border"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
