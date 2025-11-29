"use client";
import React, { useState } from "react";
import { FileUp, Download, ArrowRight, AlertCircle } from "lucide-react";
import JSZip from "jszip";

type ConversionMode = "pptx-to-xml" | "xml-to-pptx" | "test-parse";

export default function PPTXConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [xmlData, setXmlData] = useState<string>("");
  const [mode, setMode] = useState<ConversionMode>("pptx-to-xml");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [parseResult, setParseResult] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError("");
    setStatus("");
    setXmlData("");
    setParseResult("");

    if (mode === "pptx-to-xml") {
      await convertPPTXToXML(uploadedFile);
    } else if (mode === "test-parse") {
      await testParseRoute(uploadedFile);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          PowerPoint Converter
        </h1>
        <p className="text-gray-600 mb-8">
          Convert between PPTX and XML formats, or test the parse API
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setMode("pptx-to-xml");
                setFile(null);
                setXmlData("");
                setParseResult("");
                setStatus("");
                setError("");
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                mode === "pptx-to-xml"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              PPTX → XML
            </button>
            <button
              onClick={() => {
                setMode("xml-to-pptx");
                setFile(null);
                setXmlData("");
                setParseResult("");
                setStatus("");
                setError("");
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                mode === "xml-to-pptx"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              XML → PPTX
            </button>
            <button
              onClick={() => {
                setMode("test-parse");
                setFile(null);
                setXmlData("");
                setParseResult("");
                setStatus("");
                setError("");
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                mode === "test-parse"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Test Parse API
            </button>
          </div>

          {mode === "test-parse" ? (
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
