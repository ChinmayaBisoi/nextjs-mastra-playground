import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folder = searchParams.get("folder") || "cream";
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "File parameter is required" },
        { status: 400 }
      );
    }

    // Sanitize file name to prevent directory traversal
    const fileName = path.basename(file);

    // Path to media file
    const mediaPath = path.join(
      process.cwd(),
      "src",
      "data",
      "output",
      folder,
      "ppt",
      "media",
      fileName
    );

    // Check if file exists
    try {
      await fs.access(mediaPath);
    } catch {
      return NextResponse.json(
        { error: `Media file ${fileName} not found` },
        { status: 404 }
      );
    }

    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    let contentType = "application/octet-stream";

    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".svg") contentType = "image/svg+xml; charset=utf-8";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";

    // For SVG files, read as text to ensure proper encoding
    if (ext === ".svg") {
      const svgContent = await fs.readFile(mediaPath, "utf-8");
      return new NextResponse(svgContent, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // For binary files, read as buffer
    const fileBuffer = await fs.readFile(mediaPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error loading media file:", error);
    return NextResponse.json(
      { error: "Failed to load media file" },
      { status: 500 }
    );
  }
}
