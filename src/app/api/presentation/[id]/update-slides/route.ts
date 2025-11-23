import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  layout: z.enum(["title", "content", "titleContent", "imageText"]),
  notes: z.string().optional(),
});

const outlineSchema = z.object({
  slides: z.array(slideSchema),
});

// Editor format schema (more permissive)
const editorSlideSchema = z.object({
  id: z.string(),
  background: z.string(),
  elements: z.array(z.any()),
});

const editorOutlineSchema = z.object({
  slides: z.array(editorSlideSchema),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { slides } = await req.json();

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: "Slides array is required" },
        { status: 400 }
      );
    }

    // Try to validate with editor format first, fallback to old format
    let validatedOutline;
    try {
      validatedOutline = editorOutlineSchema.parse({ slides });
    } catch {
      validatedOutline = outlineSchema.parse({ slides });
    }

    // Fetch presentation and verify ownership
    const presentation = await prisma.presentation.findUnique({
      where: { id },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found" },
        { status: 404 }
      );
    }

    if (presentation.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - not your presentation" },
        { status: 403 }
      );
    }

    // Update presentation with new slides
    const updatedPresentation = await prisma.presentation.update({
      where: { id },
      data: {
        outline: validatedOutline as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      presentation: updatedPresentation,
    });
  } catch (error: unknown) {
    console.error("Error updating slides:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid slides format", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
