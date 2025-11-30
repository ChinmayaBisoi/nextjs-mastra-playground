"use client";

import React, { useEffect, useRef, useCallback } from "react";
import type {
  SlideJson,
  ImageElement,
  TextElement,
} from "@/data/slide-converter";

interface CanvasRendererProps {
  slideData: SlideJson;
  mediaBasePath: string;
  slideWidth?: number; // in EMUs
  slideHeight?: number; // in EMUs
}

// Standard PowerPoint slide size: 18288000 x 10287000 EMUs (16:9)
const STANDARD_SLIDE_WIDTH_EMU = 18288000;
const STANDARD_SLIDE_HEIGHT_EMU = 10287000;

// Convert EMU to pixels (assuming 96 DPI: 1 inch = 914400 EMUs = 96 pixels)
function emuToPixels(emu: number): number {
  return (emu / 914400) * 96;
}

export function CanvasRenderer({
  slideData,
  mediaBasePath,
  slideWidth = STANDARD_SLIDE_WIDTH_EMU,
  slideHeight = STANDARD_SLIDE_HEIGHT_EMU,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Calculate canvas dimensions
  const canvasWidth = emuToPixels(slideWidth);
  const canvasHeight = emuToPixels(slideHeight);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (slideData.background.type === "solid" && slideData.background.color) {
      ctx.fillStyle = slideData.background.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw elements
    slideData.elements.forEach((element) => {
      ctx.save();

      // Convert position and size from EMU to pixels
      // PowerPoint coordinates can be negative or extend beyond slide bounds
      const x = emuToPixels(element.position.x);
      const y = emuToPixels(element.position.y);
      const width = emuToPixels(element.size.width);
      const height = emuToPixels(element.size.height);

      // Clamp positions to canvas bounds (elements can extend beyond)
      // But allow drawing if any part is visible
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
        // Draw image
        const imageFile = imageElement.media.image || imageElement.media.svg;
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

      ctx.restore();
    });
  }, [slideData]);

  // Load all images
  useEffect(() => {
    const imageMap = new Map<string, HTMLImageElement>();
    const imagePromises: Promise<void>[] = [];

    slideData.elements.forEach((element) => {
      if (element.type === "image") {
        const imageFile = element.media.image || element.media.svg;
        if (imageFile && !imageMap.has(imageFile)) {
          const img = new Image();
          img.crossOrigin = "anonymous";

          const promise = new Promise<void>((resolve) => {
            img.onload = () => {
              imageMap.set(imageFile, img);
              resolve();
            };
            img.onerror = () => {
              console.warn(`Failed to load image: ${imageFile}`);
              resolve(); // Continue even if image fails
            };
          });

          img.src = `${mediaBasePath}?folder=cream&file=${encodeURIComponent(imageFile)}`;
          imagePromises.push(promise);
        }
      }
    });

    Promise.all(imagePromises).then(() => {
      imagesRef.current = imageMap;
      renderCanvas();
    });
  }, [slideData, mediaBasePath, renderCanvas]);

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
      style={{
        maxWidth: "100%",
        height: "auto",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    />
  );
}
