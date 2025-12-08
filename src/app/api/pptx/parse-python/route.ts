import { NextResponse } from "next/server";

const PYTHON_SERVICE_URL =
  process.env.PYTHON_PPTX_SERVICE_URL || "http://localhost:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(req: Request) {
  try {
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

    // Forward file to Python service
    const pythonFormData = new FormData();
    pythonFormData.append("file", file);

    const response = await fetch(`${PYTHON_SERVICE_URL}/parse-pptx`, {
      method: "POST",
      body: pythonFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Python service error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `Python service error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error parsing PPTX with Python service:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse PPTX file with Python service",
      },
      { status: 500 }
    );
  }
}

