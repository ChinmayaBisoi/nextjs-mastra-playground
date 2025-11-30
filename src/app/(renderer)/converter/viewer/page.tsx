"use client";
import React, { useState, useRef } from "react";
import {
  FileUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

interface TextElement {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: string;
}

interface SlideData {
  number: number;
  elements: TextElement[];
}

export default function PPTXViewer() {
  const [file, setFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [slideDimensions, setSlideDimensions] = useState<{
    widthEmu: number;
    heightEmu: number;
  }>({ widthEmu: 9144000, heightEmu: 6858000 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setLoading(true);
    setSlides([]);
    setCurrentSlideIndex(0);
    setZoom(1);
    setSlideDimensions({ widthEmu: 9144000, heightEmu: 6858000 });

    try {
      await parseAndDisplayPPTX(selectedFile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse PPTX file"
      );
    } finally {
      setLoading(false);
    }
  };

  const parseAndDisplayPPTX = async (pptxFile: File) => {
    // Read file as base64
    const reader = new FileReader();

    return new Promise<void>((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const result = event.target?.result;
          if (!result) {
            reject(new Error("Failed to read file"));
            return;
          }

          // Extract base64 string
          const dataUrl = result.toString();
          const startIndex = dataUrl.indexOf("base64,");
          const base64Data = dataUrl.substring(startIndex + 7);

          // Convert base64 to buffer
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Parse PPTX (it's a ZIP file)
          const zip = await JSZip.loadAsync(bytes);
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
            textNodeName: "#text",
          });

          // Read presentation.xml to get actual slide dimensions
          let slideWidthEmu = 9144000; // Default 10 inches
          let slideHeightEmu = 6858000; // Default 7.5 inches

          try {
            const presentationXml = await zip
              .file("ppt/presentation.xml")
              ?.async("string");
            if (presentationXml) {
              const presentationData = parser.parse(presentationXml);
              const presentation = (presentationData["p:presentation"] ||
                presentationData["presentation"] ||
                {}) as Record<string, unknown>;
              const sldSz = (presentation["p:sldSz"] ||
                presentation["sldSz"] ||
                {}) as Record<string, unknown>;

              if (sldSz["cx"]) {
                slideWidthEmu = parseInt(String(sldSz["cx"]), 10);
              }
              if (sldSz["cy"]) {
                slideHeightEmu = parseInt(String(sldSz["cy"]), 10);
              }
            }
          } catch (err) {
            console.warn(
              "Could not read presentation.xml, using defaults",
              err
            );
          }

          // Find all slide files
          const slideFiles = Object.keys(zip.files).filter((path) =>
            path.match(/^ppt\/slides\/slide\d+\.xml$/)
          );

          const parsedSlides: SlideData[] = [];

          for (const slidePath of slideFiles.sort()) {
            const slideNumber = parseInt(
              slidePath.match(/slide(\d+)\.xml$/)?.[1] || "0"
            );
            const slideXml = await zip.file(slidePath)?.async("string");
            if (!slideXml) continue;

            const slideData = parser.parse(slideXml);
            const slideContent = extractSlideContent(
              slideData,
              slideNumber,
              slideWidthEmu,
              slideHeightEmu
            );
            parsedSlides.push(slideContent);
          }

          setSlideDimensions({
            widthEmu: slideWidthEmu,
            heightEmu: slideHeightEmu,
          });
          setSlides(parsedSlides);
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(pptxFile);
    });
  };

  // Display dimensions (fixed width, height calculated from aspect ratio)
  const DISPLAY_WIDTH_PX = 960;
  const getDisplayHeight = () => {
    if (slideDimensions.widthEmu === 0) return 720; // fallback
    const aspectRatio = slideDimensions.heightEmu / slideDimensions.widthEmu;
    return Math.round(DISPLAY_WIDTH_PX * aspectRatio);
  };

  const emuToPx = (
    emu: number,
    isWidth: boolean,
    slideWidthEmu: number,
    slideHeightEmu: number
  ) => {
    const base = isWidth ? slideWidthEmu : slideHeightEmu;
    const displaySize = isWidth
      ? DISPLAY_WIDTH_PX
      : DISPLAY_WIDTH_PX * (slideHeightEmu / slideWidthEmu);
    return (emu / base) * displaySize;
  };

  const extractSlideContent = (
    slideData: Record<string, unknown>,
    slideNumber: number,
    slideWidthEmu: number,
    slideHeightEmu: number
  ): SlideData => {
    const slide = (slideData["p:sld"] || slideData["sld"] || {}) as Record<
      string,
      unknown
    >;
    const cSld = (slide["p:cSld"] || slide["cSld"] || {}) as Record<
      string,
      unknown
    >;
    const spTree = (cSld["p:spTree"] || cSld["spTree"] || {}) as Record<
      string,
      unknown
    >;
    const shapes = (spTree["p:sp"] || spTree["sp"] || []) as unknown[];
    const shapeArray = Array.isArray(shapes) ? shapes : shapes ? [shapes] : [];

    const elements: TextElement[] = [];

    for (const shapeItem of shapeArray) {
      const shape = shapeItem as Record<string, unknown>;
      const txBody = shape["p:txBody"] || shape["txBody"];
      if (!txBody) continue;

      // Extract shape position and size
      const spPr = (shape["p:spPr"] || shape["spPr"] || {}) as Record<
        string,
        unknown
      >;
      const xfrm = (spPr["a:xfrm"] || spPr["xfrm"] || {}) as Record<
        string,
        unknown
      >;
      const off = (xfrm["a:off"] || xfrm["off"] || {}) as Record<
        string,
        unknown
      >;
      const ext = (xfrm["a:ext"] || xfrm["ext"] || {}) as Record<
        string,
        unknown
      >;

      const xEmu = off["x"] ? parseInt(String(off["x"]), 10) : 0;
      const yEmu = off["y"] ? parseInt(String(off["y"]), 10) : 0;
      const widthEmu = ext["cx"] ? parseInt(String(ext["cx"]), 10) : 0;
      const heightEmu = ext["cy"] ? parseInt(String(ext["cy"]), 10) : 0;

      // Convert EMU to pixels
      const x = emuToPx(xEmu, true, slideWidthEmu, slideHeightEmu);
      const y = emuToPx(yEmu, false, slideWidthEmu, slideHeightEmu);
      const width = emuToPx(widthEmu, true, slideWidthEmu, slideHeightEmu);
      const height = emuToPx(heightEmu, false, slideWidthEmu, slideHeightEmu);

      // Don't filter elements - let them render even if slightly outside
      // The canvas will handle overflow

      // Extract text content from all paragraphs
      const txBodyObj = txBody as Record<string, unknown>;
      const paragraphs = txBodyObj["a:p"] || [];
      const paraArray = Array.isArray(paragraphs)
        ? paragraphs
        : paragraphs
          ? [paragraphs]
          : [];

      const textParts: string[] = [];
      let fontSize: number | undefined;
      let color: string | undefined;
      let fontFamily: string | undefined;
      let bold = false;
      let italic = false;
      let alignment: string | undefined;

      for (const paraItem of paraArray) {
        const para = paraItem as Record<string, unknown>;
        // Extract paragraph alignment
        const pPr = (para["a:pPr"] || {}) as Record<string, unknown>;
        alignment = (pPr["algn"] as string) || "l"; // l, ctr, r, just

        const runs = para["a:r"] || [];
        const runArray = Array.isArray(runs) ? runs : runs ? [runs] : [];

        for (const runItem of runArray) {
          const run = runItem as Record<string, unknown>;
          const textNode = run["a:t"];
          const text =
            (typeof textNode === "object" && textNode && "#text" in textNode
              ? (textNode as Record<string, unknown>)["#text"]
              : textNode) || "";
          if (text && typeof text === "string") {
            textParts.push(text);
          }

          // Extract text styling from run properties
          const rPr = (run["a:rPr"] || {}) as Record<string, unknown>;
          if (rPr["sz"]) {
            fontSize = parseInt(String(rPr["sz"]), 10) / 100; // Convert from hundredths of a point
          }
          if (rPr["b"] === "1" || rPr["b"] === 1) {
            bold = true;
          }
          if (rPr["i"] === "1" || rPr["i"] === 1) {
            italic = true;
          }

          // Extract color
          const solidFill = (rPr["a:solidFill"] ||
            rPr["solidFill"] ||
            {}) as Record<string, unknown>;
          const srgbClr = (solidFill["a:srgbClr"] ||
            solidFill["srgbClr"] ||
            {}) as Record<string, unknown>;
          const schemeClr = (solidFill["a:schemeClr"] ||
            solidFill["schemeClr"] ||
            {}) as Record<string, unknown>;
          if (srgbClr["val"]) {
            color = `#${srgbClr["val"]}`;
          } else if (schemeClr["val"]) {
            // Scheme colors - use a default mapping or keep as is
            color = `#${schemeClr["val"]}`;
          }

          // Extract font family
          const latin = (rPr["a:latin"] || rPr["latin"] || {}) as Record<
            string,
            unknown
          >;
          if (latin["typeface"]) {
            fontFamily = latin["typeface"] as string;
          }
        }
      }

      if (textParts.length > 0 && width > 0 && height > 0) {
        elements.push({
          type: "text",
          text: textParts.join(" "),
          x,
          y,
          width,
          height,
          fontSize,
          color,
          fontFamily,
          bold,
          italic,
          alignment,
        });
      }
    }

    return {
      number: slideNumber,
      elements,
    };
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">PPTX Viewer</h1>
        <p className="text-gray-600 mb-8">
          Upload a PPTX file to view its slides in the browser
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* File Upload */}
          <label className="block mb-6">
            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer bg-gray-50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pptx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center">
                <FileUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {file ? file.name : "Click to upload PPTX file"}
                </p>
              </div>
            </div>
          </label>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Parsing PPTX file...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Slide Viewer */}
          {slides.length > 0 && currentSlide && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Slide {currentSlideIndex + 1} of {slides.length}
                  </span>
                  <button
                    onClick={nextSlide}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Slide Display */}
              <div className="flex justify-center p-4 overflow-auto">
                <div
                  className="bg-gray-100 rounded-lg shadow-2xl border-2 border-gray-300 relative"
                  style={{
                    width: `${DISPLAY_WIDTH_PX * zoom}px`,
                    height: `${getDisplayHeight() * zoom}px`,
                    minWidth: `${DISPLAY_WIDTH_PX * zoom}px`,
                    minHeight: `${getDisplayHeight() * zoom}px`,
                    overflow: "visible",
                  }}
                >
                  <div
                    className="absolute bg-white"
                    style={{
                      width: `${DISPLAY_WIDTH_PX}px`,
                      height: `${getDisplayHeight()}px`,
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                      top: 0,
                      left: 0,
                      overflow: "visible",
                    }}
                  >
                    {/* Slide Canvas - positioned elements */}
                    {currentSlide.elements.length > 0 ? (
                      currentSlide.elements.map((element, index) => (
                        <div
                          key={index}
                          className="absolute"
                          style={{
                            left: `${element.x}px`,
                            top: `${element.y}px`,
                            width: `${element.width}px`,
                            minHeight: `${element.height}px`,
                            fontSize: element.fontSize
                              ? `${element.fontSize}pt`
                              : "14pt",
                            color: element.color || "#000000",
                            fontFamily:
                              element.fontFamily || "Arial, sans-serif",
                            fontWeight: element.bold ? "bold" : "normal",
                            fontStyle: element.italic ? "italic" : "normal",
                            textAlign:
                              element.alignment === "ctr"
                                ? "center"
                                : element.alignment === "r"
                                  ? "right"
                                  : element.alignment === "just"
                                    ? "justify"
                                    : "left",
                            overflow: "visible",
                            wordWrap: "break-word",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.2",
                            padding: "2px",
                          }}
                        >
                          {element.text}
                        </div>
                      ))
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <p>No content found on this slide</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Slide Thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {slides.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`shrink-0 w-32 h-20 rounded border-2 transition ${
                      index === currentSlideIndex
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="p-2 text-xs text-gray-600">
                      <div className="font-semibold">Slide {slide.number}</div>
                      <div className="text-[10px] text-gray-400 truncate mt-1">
                        {slide.elements[0]?.text || "Empty slide"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
