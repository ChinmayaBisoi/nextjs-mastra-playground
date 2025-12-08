import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId },
      });
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

    const body = await req.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Get slides data from template
    const slidesJson = template.slidesJson as any[];
    if (!slidesJson || slidesJson.length === 0) {
      return NextResponse.json(
        { error: "No slides found in template" },
        { status: 400 }
      );
    }

    // We need to get the React components from the frontend
    // For now, we'll update the template name and description
    // The layouts will be saved separately via the frontend

    await prisma.template.update({
      where: { id: templateId },
      data: {
        name: name.trim(),
        templateSpec: {
          ...((template.templateSpec as any) || {}),
          description: description?.trim() || "",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Template updated",
    });
  } catch (error) {
    console.error("Error saving template:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
