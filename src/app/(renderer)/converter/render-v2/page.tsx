"use client";

import React, { useRef } from "react";
import { parsePptxFile } from "@/utils/pptx-browser-parser";

function RenderV2() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pptx")) {
      console.error("Please upload a .pptx file");
      return;
    }

    try {
      const slides = await parsePptxFile(file);
      console.log("Parsed slides:", slides);
    } catch (error) {
      console.error("Error parsing PPTX file:", error);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto">
        <label className="block mb-4">
          <span className="block text-sm font-medium mb-2">
            Upload PPTX File
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
        </label>
        <p className="text-sm text-gray-500 mt-2">
          Select a .pptx file to read its contents. Check the browser console
          for output.
        </p>
      </div>
    </div>
  );
}

export default RenderV2;
