import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

// GET: Fetch all slides for a presentation
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify presentation ownership
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

    // Fetch all slides ordered by order field
    const slides = await prisma.slide.findMany({
      where: { presentationId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(slides);
  } catch (error: unknown) {
    console.error("Error fetching slides:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// POST: Save/update slides
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

    // Verify presentation ownership
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

    const { slides } = await req.json();

    if (!Array.isArray(slides)) {
      return NextResponse.json(
        { error: "Invalid slides format - expected array" },
        { status: 400 }
      );
    }

    // Delete all existing slides and create new ones in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing slides
      await tx.slide.deleteMany({
        where: { presentationId: id },
      });

      // Create new slides
      if (slides.length > 0) {
        await tx.slide.createMany({
          data: slides.map((slide: any, index: number) => ({
            presentationId: id,
            order: index,
            data: slide as Prisma.InputJsonValue,
          })),
        });
      }
    });

    // Fetch and return updated slides
    const updatedSlides = await prisma.slide.findMany({
      where: { presentationId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(updatedSlides);
  } catch (error: unknown) {
    console.error("Error saving slides:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Clear all slides for a presentation
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify presentation ownership
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

    // Delete all slides
    await prisma.slide.deleteMany({
      where: { presentationId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting slides:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

