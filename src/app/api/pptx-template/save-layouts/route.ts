import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const body = await req.json();
    const { templateId, layouts } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    if (!layouts || !Array.isArray(layouts) || layouts.length === 0) {
      return NextResponse.json(
        { error: "Layouts array is required" },
        { status: 400 }
      );
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (template.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete existing layouts
    await prisma.templateLayout.deleteMany({
      where: { templateId },
    });

    // Create new layouts
    const createdLayouts = await Promise.all(
      layouts.map((layout: any) =>
        prisma.templateLayout.create({
          data: {
            templateId,
            layoutId: layout.layoutId || layout.slideNumber?.toString(),
            layoutName: layout.layoutName || `Slide${layout.slideNumber}`,
            layoutCode: layout.layoutCode || layout.react_component,
            html: layout.html,
            fonts: layout.fonts ? JSON.parse(JSON.stringify(layout.fonts)) : null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      saved_count: createdLayouts.length,
      message: `Successfully saved ${createdLayouts.length} layout(s)`,
    });
  } catch (error) {
    console.error("Error saving layouts:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

