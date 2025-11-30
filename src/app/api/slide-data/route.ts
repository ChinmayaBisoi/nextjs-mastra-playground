import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { SlideJson } from "@/data/slide-converter";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slideNumber = searchParams.get("slide") || "1";

    // Path to slide JSON file
    const slidePath = path.join(
      process.cwd(),
      "src",
      "data",
      "output",
      "cream",
      "slides-json",
      `slide${slideNumber}.json`
    );

    // Check if file exists
    try {
      await fs.access(slidePath);
    } catch {
      return NextResponse.json(
        { error: `Slide ${slideNumber} not found` },
        { status: 404 }
      );
    }

    // Read and parse JSON
    const fileContent = await fs.readFile(slidePath, "utf-8");
    const slideData: SlideJson = JSON.parse(fileContent);

    return NextResponse.json(slideData);
  } catch (error) {
    console.error("Error loading slide data:", error);
    return NextResponse.json(
      { error: "Failed to load slide data" },
      { status: 500 }
    );
  }
}

