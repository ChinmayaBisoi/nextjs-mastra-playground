import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const presentations = await prisma.presentation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        description: true,
        slideCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        outline: true,
      },
    });

    return NextResponse.json(presentations);
  } catch (error: unknown) {
    console.error("Error fetching presentations:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
