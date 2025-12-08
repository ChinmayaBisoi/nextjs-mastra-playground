import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
// @ts-expect-error - pptx2json is a CommonJS module without types
import PPTX2Json from "pptx2json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const saveToFileParam = formData.get("saveToFile");
    const shouldSaveToFile = saveToFileParam === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json(
        { error: "File must be a .pptx file" },
        { status: 400 }
      );
    }

    // Check file size (16MB limit)
    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the limit of 16MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PPTX to JSON using pptx2json
    const pptx2json = new PPTX2Json();
    const json = await pptx2json.buffer2json(buffer);

    let savedFilePath: string | null = null;

    // Save to file if requested
    if (shouldSaveToFile) {
      try {
        // Create output directory
        const outputDir = path.join(process.cwd(), "v3-pptx2json");
        await fs.mkdir(outputDir, { recursive: true });

        // Generate filename based on original file name
        const fileName = path.basename(file.name, ".pptx");
        const sanitizedFileName = fileName
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .toLowerCase();
        const timestamp = Date.now();
        const jsonFileName = `${sanitizedFileName}_${timestamp}.json`;
        const filePath = path.join(outputDir, jsonFileName);

        // Write JSON to file
        await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
        savedFilePath = filePath;
      } catch (saveError) {
        console.error("Error saving file:", saveError);
        // Don't fail the request if saving fails, just log it
      }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      json,
      ...(savedFilePath && { savedFilePath }),
    });
  } catch (error) {
    console.error("Error parsing PPTX to JSON:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse PPTX file",
      },
      { status: 500 }
    );
  }
}
