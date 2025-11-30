import { NextResponse } from "next/server";
import { parsePptxTemplate } from "@/utils/parse-template";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const templateSpec = await parsePptxTemplate(buffer, file.name);

    return NextResponse.json(templateSpec);
  } catch (error) {
    console.error("Error parsing template:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse template",
      },
      { status: 500 }
    );
  }
}
