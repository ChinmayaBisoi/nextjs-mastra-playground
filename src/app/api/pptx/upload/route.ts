import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import { convertSlideToJson } from "@/data/slide-converter";
import type { SlideJson } from "@/data/slide-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(req: Request) {
  try {
    // Log request details for debugging
    const contentType = req.headers.get("content-type");
    console.log("Upload request received, content-type:", contentType);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json(
        { error: "File must be a .pptx file" },
        { status: 400 }
      );
    }

    // Create a unique folder name based on file name (sanitized)
    const fileName = path.basename(file.name, ".pptx");
    const sanitizedFolderName = fileName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .toLowerCase();
    const timestamp = Date.now();
    const folderName = `${sanitizedFolderName}_${timestamp}`;

    // Path to output directory
    const outputDir = path.join(
      process.cwd(),
      "src",
      "data",
      "output",
      folderName
    );

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Save uploaded file temporarily
    const tempDir = path.join(process.cwd(), "tmp");
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `${folderName}.pptx`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    // Extract PPTX to XML (extracts all files including media)
    const zip = new AdmZip(tempFilePath);
    const zipEntries = zip.getEntries();

    // Extract all files (XML, media, etc.)
    for (const entry of zipEntries) {
      const outputPath = path.join(outputDir, entry.entryName);

      // Skip directory entries
      if (entry.entryName.endsWith("/")) {
        continue;
      }

      // Create subdirectories if needed
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Extract file
      const fileData = entry.getData();
      await fs.writeFile(outputPath, fileData);
    }

    // Clean up temp file
    await fs.unlink(tempFilePath).catch(() => {
      // Ignore errors if file doesn't exist
    });

    // Find all slide files
    const slidesDir = path.join(outputDir, "ppt", "slides");
    let slideFiles: string[] = [];
    try {
      slideFiles = await fs.readdir(slidesDir);
    } catch {
      return NextResponse.json(
        { error: "Failed to read slides directory" },
        { status: 500 }
      );
    }

    const slideNumbers = slideFiles
      .filter((f) => f.startsWith("slide") && f.endsWith(".xml"))
      .map((f) => {
        const match = f.match(/slide(\d+)\.xml/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    if (slideNumbers.length === 0) {
      return NextResponse.json(
        { error: "No slides found in PPTX file" },
        { status: 400 }
      );
    }

    // Convert all slides to JSON
    const slides: SlideJson[] = [];
    for (const slideNumber of slideNumbers) {
      try {
        const slideJson = await convertSlideToJson(slideNumber, outputDir);
        slides.push(slideJson);
      } catch (error) {
        console.error(`Error converting slide ${slideNumber}:`, error);
        // Continue with other slides even if one fails
      }
    }

    if (slides.length === 0) {
      return NextResponse.json(
        { error: "Failed to convert any slides" },
        { status: 500 }
      );
    }

    // Save JSON files
    const slidesJsonDir = path.join(outputDir, "slides-json");
    await fs.mkdir(slidesJsonDir, { recursive: true });

    for (const slide of slides) {
      const jsonPath = path.join(
        slidesJsonDir,
        `slide${slide.slideNumber}.json`
      );
      await fs.writeFile(jsonPath, JSON.stringify(slide, null, 2), "utf-8");
    }

    return NextResponse.json({
      folderName,
      slides,
      totalSlides: slides.length,
    });
  } catch (error) {
    console.error("Error processing PPTX:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process PPTX file",
      },
      { status: 500 }
    );
  }
}
