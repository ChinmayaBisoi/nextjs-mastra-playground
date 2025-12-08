"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JSZip from "jszip";
import { Label } from "@/components/ui/label";

async function parsePptxFile(file: File) {
  // Validate file type
  if (!file.name.endsWith(".pptx")) {
    throw new Error("File must be a .pptx file");
  }

  // Validate MIME type if available
  if (file.type && !file.type.includes("presentation")) {
    console.warn("File MIME type may not be correct, but proceeding...");
  }

  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PPTX as ZIP (PPTX is essentially a ZIP archive)
    const zip = await JSZip.loadAsync(arrayBuffer);

    console.log("PPTX file loaded successfully");
    console.log("Total files in PPTX:", Object.keys(zip.files).length);

    // Extract and log all XML files
    const xmlFiles: Record<string, string> = {};

    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (filename.endsWith(".xml") && !zipEntry.dir) {
        try {
          const xmlContent = await zipEntry.async("string");
          xmlFiles[filename] = xmlContent;
          console.log(
            `Extracted XML: ${filename} (${xmlContent.length} chars)`
          );
        } catch (error) {
          console.error(`Error reading ${filename}:`, error);
        }
      }
    }

    console.log(`Extracted ${Object.keys(xmlFiles).length} XML files`);
    return xmlFiles;
  } catch (error) {
    console.error("Error parsing PPTX file:", error);
    throw error;
  }
}

function V3Page() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jsonResult, setJsonResult] = useState<Record<string, unknown> | null>(
    null
  );
  const [saveToFile, setSaveToFile] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".pptx")) {
        setError("Please select a .pptx file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setJsonResult(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setJsonResult(null);

    try {
      const xmlFiles = await parsePptxFile(file);
    } catch (error) {
      console.error("Error parsing PPTX file:", error);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("saveToFile", saveToFile.toString());

      const response = await fetch("/api/v3/pptx-2-json", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse PPTX file");
      }

      const result = await response.json();
      setJsonResult(result.json);
      const successMessage = result.savedFilePath
        ? `Successfully parsed PPTX! Found ${Object.keys(result.json).length} files. Saved to: ${result.savedFilePath}`
        : `Successfully parsed PPTX! Found ${Object.keys(result.json).length} files. Check console for full JSON.`;
      setSuccess(successMessage);
      console.log("Parsed PPTX JSON:", result.json);
      if (result.savedFilePath) {
        console.log("File saved to:", result.savedFilePath);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse PPTX file"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload PPTX File</h1>
      <div className="space-y-4">
        <div>
          <Input
            id="pptx-upload"
            type="file"
            accept=".pptx"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="save-to-file"
            checked={saveToFile}
            onChange={(e) => setSaveToFile(e.target.checked)}
            disabled={uploading}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="save-to-file" className="text-sm font-normal">
            Save result to file
          </Label>
        </div>
        <Button disabled={!file || uploading} onClick={handleParse}>
          {uploading ? "Parsing..." : "Parse PPTX File"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        {jsonResult && (
          <div className="mt-4 p-4 bg-muted rounded-md max-h-96 overflow-auto">
            <pre className="text-xs">
              {(() => {
                const jsonString = JSON.stringify(jsonResult, null, 2);
                return jsonString.length > 5000
                  ? jsonString.substring(0, 5000) + "..."
                  : jsonString;
              })()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default V3Page;
