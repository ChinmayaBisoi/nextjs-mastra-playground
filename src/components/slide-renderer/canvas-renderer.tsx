"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import type {
  SlideJson,
  ImageElement,
  TextElement,
  SlideElement,
} from "@/data/slide-converter";

interface CanvasRendererProps {
  slideData: SlideJson;
  mediaBasePath: string;
  slideWidth?: number; // in EMUs
  slideHeight?: number; // in EMUs
  folder?: string; // folder name for media (default: "cream")
  onElementMove?: (elementId: number, newX: number, newY: number) => void;
}

// Standard PowerPoint slide size: 18288000 x 10287000 EMUs (16:9)
const STANDARD_SLIDE_WIDTH_EMU = 18288000;
const STANDARD_SLIDE_HEIGHT_EMU = 10287000;

// Convert EMU to pixels (assuming 96 DPI: 1 inch = 914400 EMUs = 96 pixels)
function emuToPixels(emu: number): number {
  return (emu / 914400) * 96;
}

// Convert pixels to EMU
function pixelsToEmu(pixels: number): number {
  return (pixels / 96) * 914400;
}

export function CanvasRenderer({
  slideData,
  mediaBasePath,
  slideWidth = STANDARD_SLIDE_WIDTH_EMU,
  slideHeight = STANDARD_SLIDE_HEIGHT_EMU,
  folder = "cream",
  onElementMove,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [hoveredElementId, setHoveredElementId] = useState<number | null>(null);
  const [draggedElementId, setDraggedElementId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null
  );
  const [localSlideData, setLocalSlideData] = useState<SlideJson>(slideData);

  // Update local data when prop changes
  useEffect(() => {
    setLocalSlideData(slideData);
  }, [slideData]);

  // Calculate canvas dimensions
  const canvasWidth = emuToPixels(slideWidth);
  const canvasHeight = emuToPixels(slideHeight);

  // Get element bounds in pixels
  const getElementBounds = useCallback((element: SlideElement) => {
    const x = emuToPixels(element.position.x);
    const y = emuToPixels(element.position.y);
    const width = emuToPixels(element.size.width);
    const height = emuToPixels(element.size.height);
    return { x, y, width, height };
  }, []);

  // Hit detection: find element at mouse position
  const getElementAtPoint = useCallback(
    (mouseX: number, mouseY: number): number | null => {
      // Check elements in reverse order (top to bottom)
      for (let i = localSlideData.elements.length - 1; i >= 0; i--) {
        const element = localSlideData.elements[i];
        const bounds = getElementBounds(element);

        // Simple rectangle hit test
        if (
          mouseX >= bounds.x &&
          mouseX <= bounds.x + bounds.width &&
          mouseY >= bounds.y &&
          mouseY <= bounds.y + bounds.height
        ) {
          return element.id;
        }
      }
      return null;
    },
    [localSlideData.elements, getElementBounds]
  );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (
      localSlideData.background.type === "solid" &&
      localSlideData.background.color
    ) {
      ctx.fillStyle = localSlideData.background.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw elements
    localSlideData.elements.forEach((element) => {
      ctx.save();

      // Convert position and size from EMU to pixels
      const x = emuToPixels(element.position.x);
      const y = emuToPixels(element.position.y);
      const width = emuToPixels(element.size.width);
      const height = emuToPixels(element.size.height);

      // Clamp positions to canvas bounds (elements can extend beyond)
      const rightEdge = x + width;
      const bottomEdge = y + height;

      // Only draw if element intersects with canvas
      if (
        rightEdge < 0 ||
        x > canvas.width ||
        bottomEdge < 0 ||
        y > canvas.height
      ) {
        ctx.restore();
        return; // Skip elements completely outside canvas
      }

      // Apply transforms (only for image elements)
      if (element.type === "image") {
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.translate(centerX, centerY);

        if (element.transform.rotation !== 0) {
          ctx.rotate((element.transform.rotation * Math.PI) / 180);
        }

        const scaleX = element.transform.flipH ? -1 : 1;
        const scaleY = element.transform.flipV ? -1 : 1;
        ctx.scale(scaleX, scaleY);

        ctx.translate(-centerX, -centerY);
      }

      if (element.type === "image") {
        const imageElement = element as ImageElement;
        // Draw image - prefer SVG if available, otherwise use regular image
        const imageFile = imageElement.media.svg || imageElement.media.image;
        if (imageFile) {
          const img = imagesRef.current.get(imageFile);
          if (img) {
            // Handle clipping if element extends beyond canvas
            if (
              x < 0 ||
              y < 0 ||
              rightEdge > canvas.width ||
              bottomEdge > canvas.height
            ) {
              ctx.beginPath();
              ctx.rect(0, 0, canvas.width, canvas.height);
              ctx.clip();
            }
            ctx.drawImage(img, x, y, width, height);
          } else {
            // Draw placeholder
            ctx.fillStyle = "#cccccc";
            ctx.fillRect(Math.max(0, x), Math.max(0, y), width, height);
            ctx.strokeStyle = "#999999";
            ctx.strokeRect(Math.max(0, x), Math.max(0, y), width, height);
            ctx.fillStyle = "#666666";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(
              imageFile,
              Math.max(0, x) + width / 2,
              Math.max(0, y) + height / 2
            );
          }
        }
      } else if (element.type === "text") {
        const textElement = element as TextElement;
        // Draw text
        ctx.fillStyle = textElement.formatting.color;
        ctx.font = `${textElement.formatting.fontSize}px ${textElement.formatting.fontFamily}`;

        // Map alignment (canvas doesn't support justify, use left)
        const alignment =
          textElement.formatting.alignment === "justify"
            ? "left"
            : textElement.formatting.alignment;
        ctx.textAlign = alignment as CanvasTextAlign;
        ctx.textBaseline = "top";

        // Handle letter spacing (if supported)
        if (textElement.formatting.letterSpacing && "letterSpacing" in ctx) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ctx as any).letterSpacing =
            `${textElement.formatting.letterSpacing}px`;
        }

        // Calculate text position based on alignment
        let textX = x;
        if (textElement.formatting.alignment === "center") {
          textX = x + width / 2;
        } else if (textElement.formatting.alignment === "right") {
          textX = x + width;
        }

        // Clip text to element bounds
        if (
          x < 0 ||
          y < 0 ||
          rightEdge > canvas.width ||
          bottomEdge > canvas.height
        ) {
          ctx.beginPath();
          ctx.rect(
            Math.max(0, x),
            Math.max(0, y),
            Math.min(width, canvas.width - Math.max(0, x)),
            Math.min(height, canvas.height - Math.max(0, y))
          );
          ctx.clip();
        }

        // Draw text with word wrapping
        const words = textElement.content.split(" ");
        let line = "";
        let lineY = Math.max(0, y);
        const lineHeight =
          textElement.formatting.fontSize +
          (textElement.formatting.lineSpacing || 0);
        const maxY = Math.min(canvas.height, y + height);

        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;

          if (testWidth > width && i > 0) {
            if (lineY < maxY) {
              ctx.fillText(line.trim(), textX, lineY);
            }
            line = words[i] + " ";
            lineY += lineHeight;
            if (lineY >= maxY) break;
          } else {
            line = testLine;
          }
        }
        if (line.trim() && lineY < maxY) {
          ctx.fillText(line.trim(), textX, lineY);
        }
      }

      // Draw highlight border for hovered/selected element
      const isHovered = hoveredElementId === element.id;
      const isDragged = draggedElementId === element.id;
      if (isHovered || isDragged) {
        ctx.restore();
        ctx.save();

        // Draw highlight border
        ctx.strokeStyle = isDragged ? "#3b82f6" : "#60a5fa";
        ctx.lineWidth = 2;
        ctx.setLineDash(isDragged ? [] : [5, 5]);
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

        // Draw corner handles when dragged
        if (isDragged) {
          const handleSize = 8;
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(
            x - handleSize / 2,
            y - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.fillRect(
            x + width - handleSize / 2,
            y - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.fillRect(
            x - handleSize / 2,
            y + height - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.fillRect(
            x + width - handleSize / 2,
            y + height - handleSize / 2,
            handleSize,
            handleSize
          );
        }
      }

      ctx.restore();
    });
  }, [localSlideData, hoveredElementId, draggedElementId]);

  // Mouse event handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      if (draggedElementId !== null && dragOffset) {
        // Dragging: update element position
        const newX = mouseX - dragOffset.x;
        const newY = mouseY - dragOffset.y;

        setLocalSlideData((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === draggedElementId
              ? {
                  ...el,
                  position: {
                    x: pixelsToEmu(newX),
                    y: pixelsToEmu(newY),
                  },
                }
              : el
          ),
        }));

        // Notify parent
        if (onElementMove) {
          onElementMove(draggedElementId, pixelsToEmu(newX), pixelsToEmu(newY));
        }
      } else {
        // Hovering: find element under cursor
        const elementId = getElementAtPoint(mouseX, mouseY);
        setHoveredElementId(elementId);
      }
    },
    [draggedElementId, dragOffset, getElementAtPoint, onElementMove]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const elementId = getElementAtPoint(mouseX, mouseY);
      if (elementId !== null) {
        const element = localSlideData.elements.find(
          (el) => el.id === elementId
        );
        if (element) {
          const bounds = getElementBounds(element);
          setDraggedElementId(elementId);
          setDragOffset({
            x: mouseX - bounds.x,
            y: mouseY - bounds.y,
          });
          setHoveredElementId(null); // Clear hover when dragging
        }
      }
    },
    [getElementAtPoint, getElementBounds, localSlideData.elements]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedElementId(null);
    setDragOffset(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (draggedElementId === null) {
      setHoveredElementId(null);
    }
  }, [draggedElementId]);

  // Load all images (including SVG)
  useEffect(() => {
    const imageMap = new Map<string, HTMLImageElement>();
    const imagePromises: Promise<void>[] = [];

    localSlideData.elements.forEach((element) => {
      if (element.type === "image") {
        const imageElement = element as ImageElement;
        // Prefer SVG if available, otherwise use regular image
        const imageFile = imageElement.media.svg || imageElement.media.image;
        if (imageFile && !imageMap.has(imageFile)) {
          const isSvg = imageFile.toLowerCase().endsWith(".svg");
          const img = new Image();
          img.crossOrigin = "anonymous";

          const promise = new Promise<void>((resolve) => {
            const imageUrl = `${mediaBasePath}?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(imageFile)}`;

            img.onload = () => {
              imageMap.set(imageFile, img);
              resolve();
            };
            img.onerror = () => {
              console.warn(
                `Failed to load ${isSvg ? "SVG" : "image"}: ${imageFile}`
              );
              resolve(); // Continue even if image fails
            };

            // Set src - browsers can handle SVG images directly
            img.src = imageUrl;
          });

          imagePromises.push(promise);
        }
      }
    });

    Promise.all(imagePromises).then(() => {
      imagesRef.current = imageMap;
      renderCanvas();
    });
  }, [localSlideData, mediaBasePath, renderCanvas, folder]);

  useEffect(() => {
    if (imagesRef.current.size > 0) {
      renderCanvas();
    }
  }, [renderCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        maxWidth: "100%",
        height: "auto",
        border: "1px solid #ddd",
        borderRadius: "4px",
        cursor:
          hoveredElementId !== null || draggedElementId !== null
            ? "move"
            : "default",
      }}
    />
  );
}
