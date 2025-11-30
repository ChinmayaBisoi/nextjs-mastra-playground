"use client";
import React, { useState } from "react";
import { FileUp, Download, AlertCircle } from "lucide-react";
import { TemplateSpec, SlideLayout } from "@/types/parse";
import { cn } from "@/lib/utils";

export default function ConverterV1Page() {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<TemplateSpec | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState(0);
  const [showJson, setShowJson] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError("");
    setStatus("");
    setParseResult(null);
    setSelectedLayoutIndex(0);
    setShowJson(false);

    try {
      setStatus("Parsing PPTX file...");
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TemplateSpec = await response.json();
      setParseResult(result);
      setStatus(
        `File parsed successfully! Found ${result.layouts.length} layouts.`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError("Error parsing file: " + errorMessage);
      setStatus("");
    }
  };

  const downloadJson = () => {
    if (!parseResult) return;
    const blob = new Blob([JSON.stringify(parseResult, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name?.replace(".pptx", "") || "parsed"}-result.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentLayout = parseResult?.layouts[selectedLayoutIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          PPTX Converter V1
        </h1>
        <p className="text-gray-600 mb-8">
          Upload a PPTX file to extract and visualize its structure
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* File Upload */}
          <label className="block mb-6">
            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer bg-gray-50">
              <input
                type="file"
                accept=".pptx"
                onChange={handleFileUpload}
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

          {parseResult && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    {showJson ? "Hide" : "Show"} JSON
                  </button>
                  <button
                    onClick={downloadJson}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Download className="h-4 w-4" />
                    Download JSON
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {parseResult.layouts.length} layout
                  {parseResult.layouts.length !== 1 ? "s" : ""} found
                </div>
              </div>

              {/* JSON Display */}
              {showJson && (
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-green-400 text-xs font-mono">
                    {JSON.stringify(parseResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Layout Selection and Canvas */}
              <div className="flex gap-6">
                {/* Layout Thumbnails */}
                <div className="w-48 flex-shrink-0 space-y-2 max-h-[600px] overflow-y-auto">
                  <h4 className="font-semibold text-gray-700 text-sm mb-3">
                    Layouts
                  </h4>
                  {parseResult.layouts.map((layout, index) => (
                    <button
                      key={layout.layoutId}
                      onClick={() => setSelectedLayoutIndex(index)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg border-2 transition",
                        index === selectedLayoutIndex
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      )}
                    >
                      <div className="text-xs font-medium truncate">
                        {layout.layoutName || `Layout ${index + 1}`}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {layout.placeholders.length} placeholder
                        {layout.placeholders.length !== 1 ? "s" : ""}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Canvas Area */}
                <div className="flex-1">
                  {currentLayout && (
                    <CanvasRenderer
                      layout={currentLayout}
                      theme={parseResult.theme}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800">{status}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Canvas Renderer Component
function CanvasRenderer({
  layout,
  theme,
}: {
  layout: SlideLayout;
  theme?: TemplateSpec["theme"];
}) {
  // EMU to percentage conversion (standard PowerPoint slide dimensions)
  const SLIDE_WIDTH_EMU = 9144000;
  const SLIDE_HEIGHT_EMU = 6858000;

  const emuToPercent = (emu: number, isWidth: boolean) => {
    const base = isWidth ? SLIDE_WIDTH_EMU : SLIDE_HEIGHT_EMU;
    return (emu / base) * 100;
  };

  const getPlaceholderColor = (type: string) => {
    switch (type) {
      case "title":
        return "bg-blue-200 border-blue-400";
      case "subtitle":
        return "bg-purple-200 border-purple-400";
      case "body":
        return "bg-green-200 border-green-400";
      case "image":
        return "bg-yellow-200 border-yellow-400";
      case "chart":
        return "bg-orange-200 border-orange-400";
      default:
        return "bg-gray-200 border-gray-400";
    }
  };

  const visiblePlaceholders = layout.placeholders.filter(
    (p) => (p.width || 0) > 0 && (p.height || 0) > 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">
          {layout.layoutName || "Unnamed Layout"}
        </h4>
        <span className="text-sm text-gray-500">{layout.layoutId}</span>
      </div>

      {/* Canvas */}
      <div
        className="relative bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden"
        style={{
          aspectRatio: "16/9",
          backgroundColor: theme?.primaryColor
            ? `${theme.primaryColor}10`
            : "#f9fafb",
        }}
      >
        {visiblePlaceholders.map((placeholder, index) => {
          const left = emuToPercent(placeholder.x || 0, true);
          const top = emuToPercent(placeholder.y || 0, false);
          const width = emuToPercent(placeholder.width || 0, true);
          const height = emuToPercent(placeholder.height || 0, false);

          return (
            <div
              key={`${placeholder.id}-${index}`}
              className={cn(
                "absolute border-2 rounded flex items-center justify-center p-2",
                getPlaceholderColor(placeholder.type)
              )}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            >
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {placeholder.type}
                </div>
                {placeholder.name && (
                  <div className="text-[10px] text-gray-600 mt-1 truncate max-w-full">
                    {placeholder.name}
                  </div>
                )}
                {placeholder.index !== undefined && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    idx: {placeholder.index}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {visiblePlaceholders.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <p className="text-sm">No visible placeholders</p>
          </div>
        )}
      </div>

      {/* Placeholder Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-700 mb-2 text-sm">
          Placeholder Details ({layout.placeholders.length})
        </h5>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {layout.placeholders.map((placeholder, index) => (
            <div
              key={`detail-${placeholder.id}-${index}`}
              className="flex items-center justify-between text-xs p-2 bg-white rounded border"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded",
                    getPlaceholderColor(placeholder.type).split(" ")[0]
                  )}
                />
                <span className="font-medium">
                  {placeholder.name || `Placeholder ${index + 1}`}
                </span>
                <span className="text-gray-400">({placeholder.type})</span>
              </div>
              <div className="text-gray-400 text-[10px]">
                {placeholder.x !== undefined && placeholder.y !== undefined
                  ? `x:${Math.round(emuToPercent(placeholder.x, true))}% y:${Math.round(emuToPercent(placeholder.y, false))}%`
                  : "no position"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
