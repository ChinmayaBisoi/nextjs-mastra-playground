import { NextResponse } from "next/server";
import { parsePptxTemplate } from "@/utils/parse-template";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;

  const buffer = Buffer.from(await file.arrayBuffer());

  const templateSpec = await parsePptxTemplate(buffer, file.name);

  return NextResponse.json(templateSpec);
}
