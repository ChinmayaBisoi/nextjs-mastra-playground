import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import PptxGenJS from "pptxgenjs";

const slideSchema = z.object({
  title: z.string().describe("Slide title"),
  content: z.array(z.string()).describe("Bullet points or content array"),
  layout: z
    .enum(["title", "content", "titleContent", "imageText"])
    .describe("Slide layout type"),
  notes: z.string().optional().describe("Speaker notes for the slide"),
});

const brandConfigSchema = z
  .object({
    primaryColor: z.string().optional().describe("Primary brand color (hex)"),
    secondaryColor: z
      .string()
      .optional()
      .describe("Secondary brand color (hex)"),
    fontFamily: z.string().optional().describe("Font family name"),
    logoUrl: z.string().optional().describe("Logo URL or path"),
  })
  .optional();

const inputSchema = z.object({
  slides: z.array(slideSchema).describe("Array of slides to generate"),
  brandConfig: brandConfigSchema,
  title: z.string().optional().describe("Presentation title"),
});

const outputSchema = z.object({
  buffer: z.string().describe("Base64 encoded PPTX file"),
  filename: z.string().describe("Generated filename"),
  slideCount: z.number().describe("Number of slides generated"),
});

export const pptGeneratorTool = createTool({
  id: "ppt-generator",
  description:
    "Generates a PowerPoint presentation (.pptx) from structured slide data with optional brand theming",
  inputSchema,
  outputSchema,
  execute: async (inputData) => {
    try {
      if (!inputData?.context) {
        throw new Error("Input data context not found");
      }

      const { slides, brandConfig, title } = inputData.context;

      if (!slides || !Array.isArray(slides) || slides.length === 0) {
        throw new Error("Slides array is required and must not be empty");
      }

      // Create new presentation
      const pres = new PptxGenJS();

      // Set presentation properties
      if (title) {
        pres.title = title;
      }

      // Apply brand configuration
      if (brandConfig) {
        if (brandConfig.primaryColor) {
          pres.defineLayout({ name: "CUSTOM", width: 10, height: 7.5 });
          pres.layout = "CUSTOM";
        }
      }

      // Define color scheme if brand colors provided
      const primaryColor = brandConfig?.primaryColor || "363636";
      const secondaryColor = brandConfig?.secondaryColor || "4472C4";
      const fontFamily = brandConfig?.fontFamily || "Calibri";

      // Loop through slides and add them
      for (const slide of slides) {
        const pptxSlide = pres.addSlide();

        // Apply layout based on slide.layout
        switch (slide.layout) {
          case "title":
            // Title slide
            pptxSlide.addText(slide.title, {
              x: 0.5,
              y: 2,
              w: 9,
              h: 1.5,
              fontSize: 44,
              bold: true,
              color: primaryColor,
              fontFace: fontFamily,
              align: "center",
            });
            break;

          case "content":
            // Content-only slide (no title)
            slide.content.forEach((item, index) => {
              pptxSlide.addText(item, {
                x: 0.5,
                y: 0.5 + index * 0.8,
                w: 9,
                h: 0.7,
                fontSize: 18,
                bullet: true,
                color: "363636",
                fontFace: fontFamily,
              });
            });
            break;

          case "titleContent":
          default:
            // Title + Content slide (most common)
            // Add title
            pptxSlide.addText(slide.title, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.8,
              fontSize: 32,
              bold: true,
              color: primaryColor,
              fontFace: fontFamily,
            });

            // Add content as bullet points
            slide.content.forEach((item, index) => {
              pptxSlide.addText(item, {
                x: 0.7,
                y: 1.3 + index * 0.7,
                w: 8.6,
                h: 0.6,
                fontSize: 16,
                bullet: true,
                color: "363636",
                fontFace: fontFamily,
                lineSpacing: 28,
              });
            });
            break;

          case "imageText":
            // Image + Text layout (placeholder for future enhancement)
            pptxSlide.addText(slide.title, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.8,
              fontSize: 32,
              bold: true,
              color: primaryColor,
              fontFace: fontFamily,
            });
            slide.content.forEach((item, index) => {
              pptxSlide.addText(item, {
                x: 0.7,
                y: 1.3 + index * 0.7,
                w: 4.5,
                h: 0.6,
                fontSize: 16,
                bullet: true,
                color: "363636",
                fontFace: fontFamily,
              });
            });
            break;
        }

        // Add speaker notes if provided
        if (slide.notes) {
          pptxSlide.addNotes(slide.notes);
        }
      }

      // Generate presentation as base64
      const base64Buffer = await pres.write({ outputType: "base64" });

      return {
        buffer: base64Buffer as string,
        filename: title
          ? `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pptx`
          : "presentation.pptx",
        slideCount: slides.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate PowerPoint: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
