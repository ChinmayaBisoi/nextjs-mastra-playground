"use client";
import React, { useState } from "react";
import {
  FileUp,
  Download,
  ArrowRight,
  AlertCircle,
  Eye,
  Layers,
} from "lucide-react";
import JSZip from "jszip";
import { TemplateSpec, SlideLayout } from "@/types/parse";
import { cn } from "@/lib/utils";

type ConversionMode =
  | "pptx-to-xml"
  | "xml-to-pptx"
  | "test-parse"
  | "template-preview";

export default function PPTXConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [xmlData, setXmlData] = useState<string>("");
  const [mode, setMode] = useState<ConversionMode>("template-preview");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [parseResult, setParseResult] = useState<string>("");

  // Template preview state
  const [templateSpec, setTemplateSpec] = useState<TemplateSpec | null>(null);
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError("");
    setStatus("");
    setXmlData("");
    setParseResult("");
    setTemplateSpec(null);
    setSelectedLayoutIndex(0);

    if (mode === "pptx-to-xml") {
      await convertPPTXToXML(uploadedFile);
    } else if (mode === "test-parse") {
      await testParseRoute(uploadedFile);
    } else if (mode === "template-preview") {
      await parseTemplateForPreview(uploadedFile);
    }
  };

  const parseTemplateForPreview = async (pptxFile: File) => {
    try {
      setStatus("Parsing template...");
      const formData = new FormData();
      formData.append("file", pptxFile);

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TemplateSpec = await response.json();
      setTemplateSpec(result);
      setStatus(`Template loaded: ${result.layouts.length} layouts found`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError("Error parsing template: " + errorMessage);
      setStatus("");
    }
  };

  const testParseRoute = async (pptxFile: File) => {
    try {
      setStatus("Parsing PPTX template...");
      const formData = new FormData();
      formData.append("file", pptxFile);

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setParseResult(JSON.stringify(result, null, 2));
      setStatus("Template parsed successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError("Error parsing template: " + errorMessage);
      setStatus("");
    }
  };

  const convertPPTXToXML = async (pptxFile: File) => {
    try {
      setStatus("Converting PPTX to XML...");
      const zip = new JSZip();
      const contents = await zip.loadAsync(pptxFile);

      const xmlFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(contents.files)) {
        if (!file.dir && path.endsWith(".xml")) {
          const content = await file.async("string");
          xmlFiles[path] = content;
        }
      }

      const xmlOutput = JSON.stringify(xmlFiles, null, 2);
      setXmlData(xmlOutput);
      setStatus("Conversion complete! XML data extracted.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError("Error converting PPTX: " + errorMessage);
      setStatus("");
    }
  };

  const handleXMLInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setXmlData(e.target.value);
    setError("");
  };

  const convertXMLToPPTX = async () => {
    try {
      setStatus("Converting XML to PPTX...");
      const xmlFiles = JSON.parse(xmlData) as Record<string, string>;

      const zip = new JSZip();

      for (const [path, content] of Object.entries(xmlFiles)) {
        zip.file(path, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted.pptx";
      a.click();
      URL.revokeObjectURL(url);

      setStatus("PPTX file generated and downloaded!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError("Error converting XML to PPTX: " + errorMessage);
      setStatus("");
    }
  };

  const downloadXML = () => {
    const blob = new Blob([xmlData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "presentation-xml.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadParseResult = () => {
    const blob = new Blob([parseResult], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-spec.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetMode = (newMode: ConversionMode) => {
    setMode(newMode);
    setFile(null);
    setXmlData("");
    setParseResult("");
    setTemplateSpec(null);
    setSelectedLayoutIndex(0);
    setStatus("");
    setError("");
  };

  const currentLayout = templateSpec?.layouts[selectedLayoutIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          PowerPoint Converter
        </h1>
        <p className="text-gray-600 mb-8">
          Convert between PPTX and XML formats, or preview template layouts
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => resetMode("template-preview")}
              className={`flex-1 min-w-[140px] py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                mode === "template-preview"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Eye className="h-4 w-4" />
              Template Preview
            </button>
            <button
              onClick={() => resetMode("pptx-to-xml")}
              className={`flex-1 min-w-[140px] py-3 px-4 rounded-lg font-medium transition ${
                mode === "pptx-to-xml"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              PPTX → XML
            </button>
            <button
              onClick={() => resetMode("xml-to-pptx")}
              className={`flex-1 min-w-[140px] py-3 px-4 rounded-lg font-medium transition ${
                mode === "xml-to-pptx"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              XML → PPTX
            </button>
            <button
              onClick={() => resetMode("test-parse")}
              className={`flex-1 min-w-[140px] py-3 px-4 rounded-lg font-medium transition ${
                mode === "test-parse"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Test Parse API
            </button>
          </div>

          {mode === "template-preview" ? (
            <div>
              <label className="block mb-4">
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
                      {file ? file.name : "Click to upload PPTX template"}
                    </p>
                  </div>
                </div>
              </label>

              {templateSpec && (
                <div className="mt-6 space-y-6">
                  {/* Template Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {templateSpec.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Layouts:</span>{" "}
                        <span className="font-medium">
                          {templateSpec.layouts.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Primary Color:</span>{" "}
                        <span
                          className="inline-block w-4 h-4 rounded ml-1 align-middle border"
                          style={{
                            backgroundColor:
                              templateSpec.theme?.primaryColor || "#4472C4",
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-gray-500">Heading Font:</span>{" "}
                        <span className="font-medium">
                          {templateSpec.theme?.fontFamilies?.major || "Default"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Body Font:</span>{" "}
                        <span className="font-medium">
                          {templateSpec.theme?.fontFamilies?.minor || "Default"}
                        </span>
                      </div>
                    </div>
                    {templateSpec.theme?.accentColors &&
                      templateSpec.theme.accentColors.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-gray-500 text-sm">
                            Accent Colors:
                          </span>
                          {templateSpec.theme.accentColors.map((color, i) => (
                            <span
                              key={i}
                              className="inline-block w-4 h-4 rounded border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Layout Preview */}
                  <div className="flex gap-6">
                    {/* Layout Thumbnails */}
                    <div className="w-48 flex-shrink-0 space-y-2 max-h-[600px] overflow-y-auto">
                      <h4 className="font-semibold text-gray-700 text-sm mb-3">
                        Layouts
                      </h4>
                      {templateSpec.layouts.map((layout, index) => (
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
                            {
                              layout.placeholders.filter(
                                (p) => p.type !== "unknown"
                              ).length
                            }{" "}
                            placeholders
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Main Layout Preview */}
                    <div className="flex-1">
                      {currentLayout && (
                        <LayoutPreview
                          layout={currentLayout}
                          theme={templateSpec.theme}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : mode === "test-parse" ? (
            <div>
              <label className="block mb-4">
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
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700">
                      Parse Result
                    </h3>
                    <button
                      onClick={downloadParseResult}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      Download JSON
                    </button>
                  </div>
                  <textarea
                    value={parseResult}
                    readOnly
                    className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              )}
            </div>
          ) : mode === "pptx-to-xml" ? (
            <div>
              <label className="block mb-4">
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

              {xmlData && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700">
                      Extracted XML Data
                    </h3>
                    <button
                      onClick={downloadXML}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      Download XML
                    </button>
                  </div>
                  <textarea
                    value={xmlData}
                    readOnly
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-2">
                  Paste XML Data (JSON format)
                </label>
                <textarea
                  value={xmlData}
                  onChange={handleXMLInput}
                  placeholder='{"ppt/slides/slide1.xml": "<xml>...</xml>", ...}'
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <button
                onClick={convertXMLToPPTX}
                disabled={!xmlData}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <ArrowRight className="h-5 w-5" />
                Convert to PPTX
              </button>
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>Template Preview</strong>: Upload a PPTX to visualize
              its layouts and placeholders
            </li>
            <li>• PPTX files are ZIP archives containing XML files</li>
            <li>• PPTX → XML extracts all XML files into a JSON structure</li>
            <li>• XML → PPTX rebuilds the PPTX archive from the XML data</li>
            <li>
              • Test Parse API calls /api/parse to extract template
              specification
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Layout Preview Component
function LayoutPreview({
  layout,
  theme,
}: {
  layout: SlideLayout;
  theme?: TemplateSpec["theme"];
}) {
  // EMU to percentage conversion (assuming 9144000 EMU = 100% width for standard slide)
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
      default:
        return "bg-gray-200 border-gray-400";
    }
  };

  const visiblePlaceholders = layout.placeholders.filter(
    (p) => p.type !== "unknown" && (p.width || 0) > 0 && (p.height || 0) > 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800">
          {layout.layoutName || "Unnamed Layout"}
        </h4>
        <span className="text-sm text-gray-500">{layout.layoutId}</span>
      </div>

      {/* Slide Canvas */}
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

      {/* Placeholder Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" />
          <span>Title</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-200 border border-purple-400" />
          <span>Subtitle</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-200 border border-green-400" />
          <span>Body</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400" />
          <span>Image</span>
        </div>
      </div>

      {/* Placeholder Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-700 mb-2 text-sm">Placeholders</h5>
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
              {placeholder.index !== undefined && (
                <span className="text-gray-400">idx: {placeholder.index}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
