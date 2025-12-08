import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parsePptxFile } from "@/lib/pptx-parser";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json(
        { error: "File must be a .pptx file" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId },
      });
    }

    // Convert File to ArrayBuffer before parsing to avoid stream locking issues
    // Read the file buffer once to avoid "body already consumed" errors
    const arrayBuffer = await file.arrayBuffer();

    // Parse PPTX file using the ArrayBuffer directly
    const parsed = await parsePptxFile(arrayBuffer);

    if (parsed.slides.length === 0) {
      return NextResponse.json(
        { error: "No slides found in PPTX file" },
        { status: 400 }
      );
    }

    // Create template in database
    const template = await prisma.template.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        name: name.trim(),
        fileName: file.name,
        templateSpec: {
          totalSlides: parsed.totalSlides,
          fonts: parsed.slides.flatMap((s) => s.normalizedFonts),
        },
        slidesJson: parsed.slides.map((slide) => ({
          slideNumber: slide.slideNumber,
          xmlContent: slide.xmlContent,
          normalizedFonts: slide.normalizedFonts,
        })),
      },
    });

    // Start processing slides in background
    // We'll process them one by one via the processing page
    return NextResponse.json({
      success: true,
      templateId: template.id,
      totalSlides: parsed.totalSlides,
    });
  } catch (error) {
    console.error("Error uploading PPTX template:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
