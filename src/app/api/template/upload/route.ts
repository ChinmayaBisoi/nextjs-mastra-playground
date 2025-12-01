import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { parsePptxTemplate } from "@/utils/parse-template";
import { convertSlideToJson } from "@/data/slide-converter";
import type { SlideJson, ImageElement } from "@/data/slide-converter/types";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";
import { UTApi } from "uploadthing/server";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large file processing

const utapi = new UTApi();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse template to get spec
    const templateSpec = await parsePptxTemplate(buffer, file.name);

    // Create a unique folder name for temp extraction
    const fileName = path.basename(file.name, ".pptx");
    const sanitizedFolderName = fileName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .toLowerCase();
    const timestamp = Date.now();
    const folderName = `${sanitizedFolderName}_${timestamp}`;

    // Path to output directory for extraction
    const outputDir = path.join(process.cwd(), "tmp", folderName);
    await fs.mkdir(outputDir, { recursive: true });

    // Save uploaded file temporarily
    const tempDir = path.join(process.cwd(), "tmp");
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `${folderName}.pptx`);
    await fs.writeFile(tempFilePath, buffer);

    // Extract PPTX to directory (extracts all files including media)
    const zip = new AdmZip(tempFilePath);
    const zipEntries = zip.getEntries();

    // Extract all files (XML, media, etc.)
    for (const entry of zipEntries) {
      const outputPath = path.join(outputDir, entry.entryName);
      if (entry.entryName.endsWith("/")) {
        continue;
      }
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      const fileData = entry.getData();
      await fs.writeFile(outputPath, fileData);
    }

    // Find all slide files
    const slidesDir = path.join(outputDir, "ppt", "slides");
    let slideFiles: string[] = [];
    try {
      slideFiles = await fs.readdir(slidesDir);
    } catch {
      // Clean up and return error
      await fs.unlink(tempFilePath).catch(() => {});
      return NextResponse.json(
        { error: "Failed to read slides directory" },
        { status: 500 }
      );
    }

    const slideNumbers = slideFiles
      .filter((f) => f.startsWith("slide") && f.endsWith(".xml"))
      .map((f) => {
        const match = f.match(/slide(\d+)\.xml/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    // Convert all slides to JSON
    const slides: SlideJson[] = [];
    for (const slideNumber of slideNumbers) {
      try {
        const slideJson = await convertSlideToJson(slideNumber, outputDir);
        slides.push(slideJson);
      } catch (error) {
        console.error(`Error converting slide ${slideNumber}:`, error);
        // Continue with other slides even if one fails
      }
    }

    // Collect all unique image filenames from slide JSON
    const imageFileMap = new Map<string, string>(); // filename -> UploadThing URL
    const imageFiles: { name: string; data: Buffer; mimeType: string }[] = [];

    // Find all image files referenced in slides
    for (const slide of slides) {
      for (const element of slide.elements) {
        if (element.type === "image") {
          const imgElement = element as ImageElement;
          if (
            imgElement.media.image &&
            !imageFileMap.has(imgElement.media.image)
          ) {
            imageFileMap.set(imgElement.media.image, "");
            // Read image file from extracted directory
            const imagePath = path.join(
              outputDir,
              "ppt",
              "media",
              imgElement.media.image
            );
            try {
              const imageData = await fs.readFile(imagePath);
              const ext =
                imgElement.media.image.split(".").pop()?.toLowerCase() || "";
              const mimeType =
                ext === "jpg" || ext === "jpeg"
                  ? "image/jpeg"
                  : ext === "svg"
                    ? "image/svg+xml"
                    : `image/${ext}`;
              imageFiles.push({
                name: imgElement.media.image,
                data: imageData,
                mimeType,
              });
            } catch (error) {
              console.error(
                `Error reading image ${imgElement.media.image}:`,
                error
              );
            }
          }
          if (imgElement.media.svg && !imageFileMap.has(imgElement.media.svg)) {
            imageFileMap.set(imgElement.media.svg, "");
            const svgPath = path.join(
              outputDir,
              "ppt",
              "media",
              imgElement.media.svg
            );
            try {
              const svgData = await fs.readFile(svgPath);
              imageFiles.push({
                name: imgElement.media.svg,
                data: svgData,
                mimeType: "image/svg+xml",
              });
            } catch (error) {
              console.error(
                `Error reading SVG ${imgElement.media.svg}:`,
                error
              );
            }
          }
        }
      }
      // Check background image
      if (slide.background.type === "image" && slide.background.image) {
        const bgImageName =
          slide.background.image.split("/").pop() || slide.background.image;
        if (!imageFileMap.has(bgImageName)) {
          imageFileMap.set(bgImageName, "");
          const bgImagePath = path.join(outputDir, "ppt", "media", bgImageName);
          try {
            const bgImageData = await fs.readFile(bgImagePath);
            const ext = bgImageName.split(".").pop()?.toLowerCase() || "";
            const mimeType =
              ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : ext === "svg"
                  ? "image/svg+xml"
                  : `image/${ext}`;
            imageFiles.push({
              name: bgImageName,
              data: bgImageData,
              mimeType,
            });
          } catch (error) {
            console.error(
              `Error reading background image ${bgImageName}:`,
              error
            );
          }
        }
      }
    }

    // Create folder name for UploadThing
    const folderPrefix = `templates/${sanitizedFolderName}_${timestamp}`;

    // Upload pptx file to UploadThing
    const pptxBlob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const pptxFileName = `${folderPrefix}/${file.name}`;
    const pptxFile = new File([pptxBlob], pptxFileName, {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    let pptxUrl: string | null = null;
    try {
      const uploadResult = await utapi.uploadFiles(pptxFile);
      pptxUrl = uploadResult.data?.url || null;
    } catch (error) {
      console.error("Error uploading PPTX to UploadThing:", error);
    }

    // Upload images to UploadThing and create mapping
    const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
    const imageUrls: string[] = [];
    for (const imageFile of imageFiles) {
      // Check individual image size
      if (imageFile.data.length > MAX_IMAGE_SIZE) {
        console.warn(
          `Image ${imageFile.name} exceeds 4MB limit (${(imageFile.data.length / (1024 * 1024)).toFixed(2)}MB), skipping upload`
        );
        continue;
      }

      try {
        const imageBlob = new Blob([new Uint8Array(imageFile.data)], {
          type: imageFile.mimeType,
        });
        const imageFileName = `${folderPrefix}/images/${imageFile.name}`;
        const imageUploadFile = new File([imageBlob], imageFileName, {
          type: imageFile.mimeType,
        });

        const uploadResult = await utapi.uploadFiles(imageUploadFile);
        if (uploadResult.data?.url) {
          imageFileMap.set(imageFile.name, uploadResult.data.url);
          imageUrls.push(uploadResult.data.url);
        }
      } catch (error) {
        console.error(`Error uploading image ${imageFile.name}:`, error);
      }
    }

    // Map image filenames to UploadThing URLs in slide JSON
    const slidesWithMappedImages = slides.map((slide) => {
      const mappedElements = slide.elements.map((element) => {
        if (element.type === "image") {
          const imgElement = element as ImageElement;
          const mappedMedia: { image?: string; svg?: string } = {};
          if (imgElement.media.image) {
            mappedMedia.image =
              imageFileMap.get(imgElement.media.image) ||
              imgElement.media.image;
          }
          if (imgElement.media.svg) {
            mappedMedia.svg =
              imageFileMap.get(imgElement.media.svg) || imgElement.media.svg;
          }
          return {
            ...imgElement,
            media: mappedMedia,
          };
        }
        return element;
      });

      const mappedBackground = { ...slide.background };
      if (slide.background.type === "image" && slide.background.image) {
        const bgImageName =
          slide.background.image.split("/").pop() || slide.background.image;
        const mappedUrl = imageFileMap.get(bgImageName);
        if (mappedUrl) {
          mappedBackground.image = mappedUrl;
        }
      }

      return {
        ...slide,
        elements: mappedElements,
        background: mappedBackground,
      };
    });

    // Clean up temp files
    await fs.unlink(tempFilePath).catch(() => {});
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId },
      });
    }

    // Create Template record with slides JSON
    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: templateSpec.name,
        fileName: file.name,
        fileUrl: pptxUrl,
        templateSpec: templateSpec as Prisma.InputJsonValue,
        slidesJson: JSON.parse(
          JSON.stringify(slidesWithMappedImages)
        ) as Prisma.InputJsonValue,
        images:
          imageUrls.length > 0
            ? (imageUrls as Prisma.InputJsonValue)
            : undefined,
      },
    });

    return NextResponse.json({
      templateId: template.id,
      templateSpec,
      slides: slidesWithMappedImages,
      fileUrl: pptxUrl,
      imageUrls,
    });
  } catch (error) {
    console.error("Error uploading template:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload template",
      },
      { status: 500 }
    );
  }
}
