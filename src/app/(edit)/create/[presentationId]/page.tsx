"use client";
import BreadcrumbHeader from "@/components/breadcrumb-header";
import PageLayout from "@/components/layouts/page-layout";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Circle,
  FileText,
  Italic,
  Plus,
  Redo,
  Square,
  Trash2,
  Type,
  Undo,
  Upload,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import PptxGenJS from "pptxgenjs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type OutlineSlide = {
  title: string;
  content: string[];
  layout: "title" | "content" | "titleContent" | "imageText";
  notes?: string;
};

type Presentation = {
  id: string;
  description: string;
  slideCount: number;
  outline: {
    slides: OutlineSlide[];
  } | null;
  status: string;
};

type StreamMessage =
  | {
      type: "progress";
      current: number;
      total: number;
      message: string;
    }
  | {
      type: "slide";
      slideIndex: number;
      slide: OutlineSlide;
    }
  | {
      type: "complete";
      presentationId: string;
    }
  | {
      type: "error";
      error: string;
    };

export default function GoogleSlidesEditor() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params?.presentationId as string;

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

  // New state for presentation and generation
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const hasStartedGenerationRef = useRef(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save slides to database (debounced)
  const saveSlidesToDB = useCallback(
    async (slidesToSave: Slide[]) => {
      if (!presentationId) return;

      try {
        await fetch(`/api/presentation/${presentationId}/slides`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slides: slidesToSave }),
        });
      } catch (err) {
        console.error("Failed to save slides:", err);
      }
    },
    [presentationId]
  );

  // Debounced save function
  const debouncedSave = useCallback(
    (slidesToSave: Slide[]) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveSlidesToDB(slidesToSave);
      }, 1000); // 1 second debounce
    },
    [saveSlidesToDB]
  );

  // Convert outline slide to editor Slide format
  const convertOutlineSlideToEditorSlide = (
    outlineSlide: OutlineSlide,
    index: number
  ): Slide => {
    const elements: SlideElement[] = [];
    let zIndex = 1;

    // Add title element
    if (outlineSlide.title) {
      const titleElement: TextElement = {
        id: `slide-${index}-title`,
        type: "text",
        content: outlineSlide.title,
        x: 100,
        y: 100,
        width: 1080,
        height: 80,
        fontSize: outlineSlide.layout === "title" ? 56 : 40,
        color: "#000000",
        fontWeight: "bold",
        align: outlineSlide.layout === "title" ? "center" : "left",
        zIndex: zIndex++,
      };
      elements.push(titleElement);
    }

    // Add content elements (bullet points)
    if (outlineSlide.content && outlineSlide.content.length > 0) {
      const startY = outlineSlide.layout === "title" ? 250 : 200;
      const spacing = 60;
      const fontSize = 24;
      const lineHeight = 32;

      outlineSlide.content.forEach((contentItem, contentIndex) => {
        const contentElement: TextElement = {
          id: `slide-${index}-content-${contentIndex}`,
          type: "text",
          content: contentItem,
          x: 150,
          y: startY + contentIndex * spacing,
          width: 980,
          height: lineHeight,
          fontSize,
          color: "#333333",
          fontWeight: "normal",
          align: "left",
          zIndex: zIndex++,
        };
        elements.push(contentElement);
      });
    }

    return {
      id: `slide-${index}`,
      background: "#ffffff",
      elements,
    };
  };

  // addToHistory needs to be defined early for use in handleStreamMessage
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

  // Handle stream messages
  const handleStreamMessage = useCallback(
    (message: StreamMessage) => {
      switch (message.type) {
        case "progress":
          setGenerationProgress({
            current: message.current,
            total: message.total,
            message: message.message,
          });
          break;

        case "slide":
          // Convert and add slide - update in real-time
          const editorSlide = convertOutlineSlideToEditorSlide(
            message.slide,
            message.slideIndex
          );
          setSlides((prev) => {
            const newSlides = [...prev];
            // Ensure array is large enough
            while (newSlides.length <= message.slideIndex) {
              newSlides.push({
                id: `slide-${newSlides.length}`,
                background: "#ffffff",
                elements: [],
              });
            }
            // Update the slide at the specific index
            newSlides[message.slideIndex] = editorSlide;
            // Force React to re-render by creating a new array reference
            return [...newSlides];
          });
          // Auto-navigate to newly created slide (only for first slide)
          setCurrentSlide((prev) => {
            if (message.slideIndex === 0 && prev !== 0) {
              return 0;
            }
            return prev;
          });
          // Auto-scroll to newly created slide in sidebar
          setTimeout(() => {
            const slideElement = document.querySelector(
              `[data-slide-index="${message.slideIndex}"]`
            );
            if (slideElement) {
              slideElement.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }
          }, 100);
          break;

        case "complete":
          setIsGenerating(false);
          setGenerationProgress((prev) => ({
            ...prev,
            message: "Generation complete!",
          }));
          // Initialize history with final slides after a short delay to ensure state is updated
          setTimeout(() => {
            setSlides((currentSlides) => {
              if (currentSlides.length > 0) {
                addToHistory(currentSlides);
              }
              return currentSlides;
            });
          }, 100);
          break;

        case "error":
          setError(message.error);
          setIsGenerating(false);
          break;
      }
    },
    [addToHistory]
  );

  // Start streaming PPT generation
  const startStreamingGeneration = useCallback(
    async (pres: Presentation) => {
      if (!pres.outline) {
        setError("No outline available for generation");
        return;
      }

      try {
        setIsGenerating(true);
        setIsLoading(false); // Stop showing loading state, start showing generation
        setGenerationProgress({
          current: 0,
          total: pres.outline.slides.length,
          message: "Starting generation...",
        });
        setError("");

        // Create abort controller for cleanup
        const abortController = new AbortController();
        streamAbortControllerRef.current = abortController;

        const response = await fetch("/api/presentation/generate-ppt-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            presentationId: pres.id,
            outline: pres.outline,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to start generation");
        }

        // Parse streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream finished");
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete messages (SSE format: "data: {...}\n\n")
          // Split by double newlines to get complete SSE messages
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || ""; // Keep incomplete message in buffer

          for (const part of parts) {
            if (!part.trim()) continue;

            // Handle SSE format: "data: {...}"
            const lines = part.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr) {
                    const parsed: StreamMessage = JSON.parse(jsonStr);
                    console.log(
                      "Received stream message:",
                      parsed.type,
                      parsed
                    );
                    // Process immediately for real-time updates
                    handleStreamMessage(parsed);
                  }
                } catch (parseError) {
                  console.warn(
                    "Failed to parse stream message:",
                    line,
                    parseError
                  );
                }
              } else if (line.trim().startsWith("{")) {
                // Try parsing as direct JSON (fallback)
                try {
                  const parsed: StreamMessage = JSON.parse(line.trim());
                  console.log(
                    "Received stream message (direct JSON):",
                    parsed.type
                  );
                  handleStreamMessage(parsed);
                } catch (parseError) {
                  console.warn(
                    "Failed to parse stream message:",
                    line,
                    parseError
                  );
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User navigated away, ignore
          return;
        }
        console.error("Error generating slides:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate slides"
        );
        setIsGenerating(false);
        setIsLoading(false);
      }
    },
    [handleStreamMessage]
  );

  // Handler to manually start slide generation
  const handleStartGeneration = useCallback(() => {
    if (presentation && !hasStartedGenerationRef.current) {
      hasStartedGenerationRef.current = true;
      startStreamingGeneration(presentation);
    }
  }, [presentation, startStreamingGeneration]);

  // Fetch presentation data and slides
  useEffect(() => {
    // Reset ref when presentationId changes
    hasStartedGenerationRef.current = false;

    const fetchPresentationAndSlides = async () => {
      if (!presentationId) return;

      try {
        setIsLoading(true);

        // Fetch presentation data
        const presResponse = await fetch(`/api/presentation/${presentationId}`);

        if (!presResponse.ok) {
          throw new Error("Failed to fetch presentation");
        }

        const data = await presResponse.json();
        setPresentation(data);

        // Set file name from presentation description
        if (data.description) {
          const fileWithName = {
            name: data.description,
          } as FileWithName;
          setFile(fileWithName);
        }

        // Check if outline exists
        if (!data.outline) {
          setError("No outline found for this presentation");
          setIsLoading(false);
          return;
        }

        // Fetch existing slides
        const slidesResponse = await fetch(
          `/api/presentation/${presentationId}/slides`
        );

        if (slidesResponse.ok) {
          const existingSlides = await slidesResponse.json();

          if (existingSlides && existingSlides.length > 0) {
            // Load existing slides from database
            const loadedSlides = existingSlides.map(
              (dbSlide: { data: Slide }) => dbSlide.data
            );
            setSlides(loadedSlides);
            setCurrentSlide(0);
            addToHistory(loadedSlides);
            setIsLoading(false);
            return;
          }
        }

        // No slides exist - show generation button (don't auto-start)
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching presentation:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load presentation"
        );
        setIsLoading(false);
        hasStartedGenerationRef.current = false;
      }
    };

    fetchPresentationAndSlides();

    // Cleanup on unmount
    return () => {
      if (streamAbortControllerRef.current) {
        streamAbortControllerRef.current.abort();
      }
      hasStartedGenerationRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationId]); // addToHistory intentionally excluded to prevent infinite loop

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
      // Auto-save to database with debounce
      debouncedSave(updatedSlides);
    },
    [addToHistory, debouncedSave]
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

  const exportPresentation = async () => {
    try {
      const pres = new PptxGenJS();
      pres.layout = "LAYOUT_WIDE"; // 16:9 aspect ratio

      // Set presentation title from file name
      if (file?.name) {
        pres.title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      }

      // Canvas dimensions in pixels (1280x720 for 16:9)
      const canvasWidthPx = 1280;
      const canvasHeightPx = 720;

      // PPTX uses inches, and standard slide is 10" x 7.5" for 16:9
      const slideWidthInches = 10;
      const slideHeightInches = 7.5;

      // Conversion factors
      const pxToInchesX = slideWidthInches / canvasWidthPx;
      const pxToInchesY = slideHeightInches / canvasHeightPx;

      // Process each slide
      for (const slide of slides) {
        const pptxSlide = pres.addSlide();

        // Set slide background color
        if (slide.background && slide.background !== "#ffffff") {
          const bgColor = slide.background.replace("#", "");
          pptxSlide.background = { fill: bgColor };
        }

        // Sort elements by zIndex to maintain layering
        const sortedElements = [...slide.elements].sort(
          (a, b) => a.zIndex - b.zIndex
        );

        // Add each element to the slide
        for (const element of sortedElements) {
          if (element.type === "text") {
            const textElement = element as TextElement;

            // Convert pixel positions to inches
            const x = textElement.x * pxToInchesX;
            const y = textElement.y * pxToInchesY;
            const w = textElement.width * pxToInchesX;
            const h = textElement.height * pxToInchesY;

            // Convert font size from px to points (1px ≈ 0.75pt)
            const fontSizePt = textElement.fontSize * 0.75;

            // Convert hex color to RGB (remove # if present)
            const color = textElement.color.replace("#", "");

            pptxSlide.addText(textElement.content, {
              x,
              y,
              w,
              h,
              fontSize: fontSizePt,
              color,
              bold:
                textElement.fontWeight === "bold" ||
                textElement.fontWeight === "700",
              align:
                textElement.align === "left"
                  ? "left"
                  : textElement.align === "center"
                    ? "center"
                    : "right",
            });
          } else if (element.type === "shape") {
            const shapeElement = element as ShapeElement;

            // Convert pixel positions to inches
            const x = shapeElement.x * pxToInchesX;
            const y = shapeElement.y * pxToInchesY;
            const w = shapeElement.width * pxToInchesX;
            const h = shapeElement.height * pxToInchesY;

            // Convert colors
            const fillColor = shapeElement.color.replace("#", "");
            const lineColor = shapeElement.borderColor.replace("#", "");
            const lineWidth = shapeElement.borderWidth * pxToInchesX;

            if (shapeElement.shapeType === "rectangle") {
              pptxSlide.addShape(pres.ShapeType.rect, {
                x,
                y,
                w,
                h,
                fill: { color: fillColor },
                line: { color: lineColor, width: lineWidth },
              });
            } else if (shapeElement.shapeType === "circle") {
              pptxSlide.addShape(pres.ShapeType.ellipse, {
                x,
                y,
                w,
                h,
                fill: { color: fillColor },
                line: { color: lineColor, width: lineWidth },
              });
            }
          }
        }
      }

      // Generate and download the PPTX file
      const fileName = file?.name
        ? file.name.replace(/\.[^/.]+$/, "") + ".pptx"
        : "presentation.pptx";

      // Generate base64 buffer
      const base64Buffer = (await pres.write({
        outputType: "base64",
      })) as string;

      // Convert base64 to blob and download
      const byteCharacters = atob(base64Buffer);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting presentation:", error);
      setError("Failed to export presentation as PPTX");
    }
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

  // Show loading state
  if (isLoading) {
    return (
      <>
        <BreadcrumbHeader title="Create" href="/create" />
        <PageLayout
          title="Slides Editor"
          description="Create and collaborate on presentations"
        >
          <div className="bg-card rounded-xl shadow-lg p-12 border flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading presentation...</p>
          </div>
        </PageLayout>
      </>
    );
  }

  // Show error state
  if (error && !isGenerating && slides.length === 0) {
    return (
      <>
        <BreadcrumbHeader title="Create" href="/create" />
        <PageLayout
          title="Slides Editor"
          description="Create and collaborate on presentations"
        >
          <div className="bg-card rounded-xl shadow-lg p-12 border">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
              {error}
            </div>
          </div>
        </PageLayout>
      </>
    );
  }

  // Show generating state (only if no slides yet and still generating)
  // Once slides start appearing, show the editor even if still generating
  if (isGenerating && slides.length === 0 && !error) {
    return (
      <>
        <BreadcrumbHeader title="Create" href="/create" />
        <PageLayout
          title="Slides Editor"
          description="Create and collaborate on presentations"
        >
          <div className="bg-card rounded-xl shadow-lg p-12 border flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold mb-2">
              {generationProgress.message || "Generating slides..."}
            </p>
            {generationProgress.total > 0 && (
              <p className="text-sm text-muted-foreground">
                {generationProgress.current} / {generationProgress.total} slides
              </p>
            )}
          </div>
        </PageLayout>
      </>
    );
  }

  // Show generate slides button when presentation exists but no slides yet
  if (presentation && slides.length === 0 && !isGenerating) {
    return (
      <>
        <BreadcrumbHeader title="Create" href="/create" />
        <PageLayout
          title="Slides Editor"
          description="Create and collaborate on presentations"
        >
          <div className="bg-card rounded-xl shadow-lg p-12 border">
            <div className="flex flex-col items-center justify-center p-16">
              <FileText className="w-16 h-16 text-primary mb-4" />
              <h2 className="text-2xl font-semibold mb-2">
                {presentation.description}
              </h2>
              <p className="text-muted-foreground mb-2">
                {presentation.slideCount} slides outlined
              </p>
              {presentation.outline && (
                <p className="text-sm text-muted-foreground mb-6">
                  Outline ready • Click below to generate slides
                </p>
              )}
              <button
                onClick={handleStartGeneration}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg text-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Generate Slides
              </button>
            </div>

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

  if (!file && slides.length === 0) {
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-1 flex-col min-h-0 bg-background">
        {/* Compact Single-Row Toolbar */}
        <div className="bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5 gap-3">
            {/* Left Section - Navigation & Title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => router.push("/create")}
                className="p-1.5 hover:bg-accent rounded transition-colors shrink-0"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border"></div>
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <input
                type="text"
                value={
                  file?.name || presentation?.description || "Presentation"
                }
                onChange={(e) => {
                  if (file) {
                    const newFile = Object.assign(file, {
                      name: e.target.value,
                    });
                    setFile(newFile);
                  }
                }}
                className="font-medium bg-transparent border-none outline-none text-sm min-w-0 max-w-[220px] truncate"
                placeholder="Presentation name"
                title={
                  file?.name || presentation?.description || "Presentation"
                }
              />
              {isGenerating && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {generationProgress.current}/{generationProgress.total}
                  </span>
                </div>
              )}
            </div>

            {/* Middle Section - Editing Tools */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-1.5 hover:bg-accent rounded disabled:opacity-30 transition-colors"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 hover:bg-accent rounded disabled:opacity-30 transition-colors"
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-border mx-1"></div>

              <button
                onClick={addTextElement}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                title="Add Text"
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                onClick={() => addShapeElement("rectangle")}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                title="Rectangle"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => addShapeElement("circle")}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                title="Circle"
              >
                <Circle className="w-4 h-4" />
              </button>

              {selectedElement?.type === "text" && (
                <>
                  <div className="w-px h-4 bg-border mx-1"></div>
                  <button
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      updateElement(selectedElement.id, { align: "left" })
                    }
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      updateElement(selectedElement.id, { align: "center" })
                    }
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      updateElement(selectedElement.id, { align: "right" })
                    }
                    className="p-1.5 hover:bg-accent rounded transition-colors"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {selectedElement && (
                <>
                  {selectedElement.type === "text" && (
                    <>
                      <div className="flex items-center gap-0.5 bg-muted rounded px-1">
                        <button
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              fontSize: Math.max(
                                12,
                                selectedElement.fontSize - 2
                              ),
                            })
                          }
                          className="p-0.5 hover:bg-accent rounded transition-colors"
                          title="Decrease font size"
                        >
                          <span className="text-sm font-medium">−</span>
                        </button>
                        <input
                          type="number"
                          min="12"
                          max="96"
                          value={selectedElement.fontSize}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              fontSize: Math.max(
                                12,
                                Math.min(96, parseInt(e.target.value) || 12)
                              ),
                            })
                          }
                          className="w-10 bg-transparent border-none outline-none text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          px
                        </span>
                        <button
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              fontSize: Math.min(
                                96,
                                selectedElement.fontSize + 2
                              ),
                            })
                          }
                          className="p-0.5 hover:bg-accent rounded transition-colors"
                          title="Increase font size"
                        >
                          <span className="text-sm font-medium">+</span>
                        </button>
                      </div>
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            color: e.target.value,
                          })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-border"
                        title="Text color"
                      />
                    </>
                  )}
                  {selectedElement.type === "shape" && (
                    <>
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            color: e.target.value,
                          })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-border"
                        title="Fill color"
                      />
                      <input
                        type="color"
                        value={selectedElement.borderColor}
                        onChange={(e) =>
                          updateElement(selectedElement.id, {
                            borderColor: e.target.value,
                          })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-border"
                        title="Border color"
                      />
                    </>
                  )}
                  <button
                    onClick={() => deleteElement(selectedElement.id)}
                    className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                    title="Delete element"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-border mx-1"></div>
                </>
              )}
              <button
                onClick={exportPresentation}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors font-medium"
              >
                Export
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area with Sidebar and Canvas */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar - Slides */}
          <div className="w-64 bg-card border-r border-border overflow-y-auto p-3 shrink-0">
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  data-slide-index={index}
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
                    className="aspect-video relative"
                    style={{
                      backgroundColor: slide.background || "#ffffff",
                    }}
                  >
                    {/* Slide number badge */}
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium z-10">
                      {index + 1}
                    </div>

                    {/* Render slide elements at scale */}
                    <div className="w-full h-full relative overflow-hidden">
                      {slide.elements.map((element) => {
                        // Scale factor for thumbnail (aspect-video gives us ~16:9)
                        const scaleX = 100 / (canvasSize.width || 1280); // percentage
                        const scaleY = 100 / (canvasSize.height || 720); // percentage

                        return (
                          <div
                            key={element.id}
                            className="absolute"
                            style={{
                              left: `${element.x * scaleX}%`,
                              top: `${element.y * scaleY}%`,
                              width: element.width
                                ? `${element.width * scaleX}%`
                                : "auto",
                              height: element.height
                                ? `${element.height * scaleY}%`
                                : "auto",
                              fontSize:
                                element.type === "text"
                                  ? `${Math.max(4, element.fontSize * scaleX * 0.6)}px`
                                  : undefined,
                              color:
                                element.type === "text"
                                  ? element.color
                                  : undefined,
                              fontWeight:
                                element.type === "text"
                                  ? element.fontWeight
                                  : undefined,
                              textAlign:
                                element.type === "text"
                                  ? element.align
                                  : undefined,
                              backgroundColor:
                                element.type === "shape"
                                  ? element.color
                                  : undefined,
                              border:
                                element.type === "shape"
                                  ? `${Math.max(0.5, (element.borderWidth || 0) * scaleX)}px solid ${element.borderColor}`
                                  : undefined,
                              borderRadius:
                                element.type === "shape" &&
                                element.shapeType === "rectangle"
                                  ? "2px"
                                  : element.type === "shape" &&
                                      element.shapeType === "circle"
                                    ? "50%"
                                    : undefined,
                              overflow: "hidden",
                              whiteSpace:
                                element.type === "text" ? "nowrap" : undefined,
                              textOverflow:
                                element.type === "text"
                                  ? "ellipsis"
                                  : undefined,
                            }}
                          >
                            {element.type === "text" && element.content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {isGenerating && index === slides.length - 1 && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && generationProgress.total > slides.length && (
                <div className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/50">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-2" />
                  <span className="text-xs text-muted-foreground">
                    Generating...
                  </span>
                </div>
              )}
              {!isGenerating && (
                <button
                  onClick={addNewSlide}
                  className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary hover:bg-accent transition-all"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Main Canvas */}
          <div
            ref={canvasContainerRef}
            className="flex-1 overflow-auto min-h-0"
          >
            <div className="w-full h-full flex items-center justify-center p-4">
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
                    backgroundColor: currentSlideData?.background || "#ffffff",
                  }}
                  onClick={() => {
                    setSelectedElement(null);
                  }}
                >
                  {currentSlideData?.elements
                    .sort(
                      (a: SlideElement, b: SlideElement) => a.zIndex - b.zIndex
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
                          width: element.width ? `${element.width}px` : "auto",
                          height: element.height
                            ? `${element.height}px`
                            : "auto",
                          cursor: "move",
                        }}
                      >
                        {element.type === "text" ? (
                          <div
                            contentEditable={selectedElement?.id === element.id}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
