import archiver from "archiver";
import { parseStringPromise } from "xml2js";
import { Builder } from "xml2js";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Template placeholder configuration
 */
export interface TemplatePlaceholder {
  slideNumber: number;
  shapeId: string;
  shapeName: string;
  type: "text" | "image" | "table";
  placeholder: string; // e.g., "{{title}}", "{{subtitle}}"
  defaultValue?: string;
  formatting?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    alignment?: "left" | "center" | "right" | "justify";
    bold?: boolean;
  };
}

/**
 * Template configuration for a PPTX
 */
export interface PPTXTemplate {
  name: string;
  description: string;
  templatePath: string; // Path to the template PPTX XML directory
  slides: {
    slideNumber: number;
    slideType: string; // 'title', 'content', 'two-column', 'table-of-contents', etc.
    placeholders: TemplatePlaceholder[];
  }[];
}

/**
 * Data to populate the template
 */
export interface TemplateData {
  [slideNumber: number]: {
    [placeholderName: string]:
      | string
      | string[]
      | {
          headers: string[];
          rows: string[][];
        };
  };
}

/**
 * PPT Template Engine - converts PPTX to reusable templates
 */
export class PPTTemplateEngine {
  private xmlBuilder: Builder;

  constructor() {
    this.xmlBuilder = new Builder({
      xmldec: { version: "1.0", encoding: "UTF-8" },
      renderOpts: { pretty: false },
    });
  }

  /**
   * Parse PPTX XML directory to extract template structure
   */
  async extractTemplateFromPPTX(pptxXmlDir: string): Promise<PPTXTemplate> {
    const presentationPath = path.join(pptxXmlDir, "ppt", "presentation.xml");
    const presentationXml = await readFile(presentationPath, "utf-8");
    const presentation = await parseStringPromise(presentationXml);

    const slideCount =
      presentation["p:presentation"]["p:sldIdLst"][0]["p:sldId"].length;

    const template: PPTXTemplate = {
      name: path.basename(pptxXmlDir),
      description: "Auto-generated template",
      templatePath: pptxXmlDir,
      slides: [],
    };

    // Parse each slide
    for (let i = 1; i <= slideCount; i++) {
      const slidePath = path.join(pptxXmlDir, "ppt", "slides", `slide${i}.xml`);
      if (!fs.existsSync(slidePath)) continue;

      const slideXml = await readFile(slidePath, "utf-8");
      const slide = await parseStringPromise(slideXml);

      const placeholders = this.extractPlaceholdersFromSlide(slide, i);

      template.slides.push({
        slideNumber: i,
        slideType: this.detectSlideType(placeholders),
        placeholders,
      });
    }

    return template;
  }

  /**
   * Extract text placeholders from a slide
   */
  private extractPlaceholdersFromSlide(
    slide: any,
    slideNumber: number
  ): TemplatePlaceholder[] {
    const placeholders: TemplatePlaceholder[] = [];
    const spTree = slide["p:sld"]["p:cSld"][0]["p:spTree"][0];

    // Extract text boxes
    if (spTree["p:sp"]) {
      spTree["p:sp"].forEach((shape: any, index: number) => {
        const nvSpPr = shape["p:nvSpPr"][0];
        const shapeName = nvSpPr["p:cNvPr"][0]["$"]["name"];
        const shapeId = nvSpPr["p:cNvPr"][0]["$"]["id"];

        // Check if it's a text box
        if (shape["p:txBody"]) {
          const textBody = shape["p:txBody"][0];
          const paragraphs = textBody["a:p"] || [];

          paragraphs.forEach((para: any) => {
            if (para["a:r"]) {
              para["a:r"].forEach((run: any) => {
                const text = run["a:t"] ? run["a:t"][0] : "";

                // Extract formatting
                const rPr = run["a:rPr"] ? run["a:rPr"][0] : {};
                const formatting = this.extractFormatting(rPr, para);

                placeholders.push({
                  slideNumber,
                  shapeId,
                  shapeName,
                  type: "text",
                  placeholder: `{{${this.sanitizePlaceholderName(shapeName)}_${index}}}`,
                  defaultValue: text,
                  formatting,
                });
              });
            }
          });
        }
      });
    }

    // Extract tables
    if (spTree["p:graphicFrame"]) {
      spTree["p:graphicFrame"].forEach((frame: any, index: number) => {
        const nvGraphicFramePr = frame["p:nvGraphicFramePr"][0];
        const shapeName = nvGraphicFramePr["p:cNvPr"][0]["$"]["name"];
        const shapeId = nvGraphicFramePr["p:cNvPr"][0]["$"]["id"];

        placeholders.push({
          slideNumber,
          shapeId,
          shapeName,
          type: "table",
          placeholder: `{{table_${index}}}`,
        });
      });
    }

    return placeholders;
  }

  /**
   * Extract formatting from XML properties
   */
  private extractFormatting(
    rPr: any,
    para: any
  ): TemplatePlaceholder["formatting"] {
    const formatting: TemplatePlaceholder["formatting"] = {};

    if (rPr["$"]) {
      if (rPr["$"]["sz"]) formatting.fontSize = parseInt(rPr["$"]["sz"]) / 100;
      if (rPr["$"]["b"])
        formatting.bold = rPr["$"]["b"] === "true" || rPr["$"]["b"] === "1";
    }

    if (rPr["a:latin"] && rPr["a:latin"][0]["$"]) {
      formatting.fontFamily = rPr["a:latin"][0]["$"]["typeface"];
    }

    if (rPr["a:solidFill"] && rPr["a:solidFill"][0]["a:srgbClr"]) {
      formatting.color = rPr["a:solidFill"][0]["a:srgbClr"][0]["$"]["val"];
    }

    if (
      para["a:pPr"] &&
      para["a:pPr"][0]["$"] &&
      para["a:pPr"][0]["$"]["algn"]
    ) {
      formatting.alignment = para["a:pPr"][0]["$"]["algn"] as any;
    }

    return formatting;
  }

  /**
   * Detect slide type based on placeholders
   */
  private detectSlideType(placeholders: TemplatePlaceholder[]): string {
    const hasTable = placeholders.some((p) => p.type === "table");
    if (hasTable) return "table-of-contents";

    const textCount = placeholders.filter((p) => p.type === "text").length;
    if (textCount >= 10) return "title";
    if (textCount >= 4) return "two-column";

    return "content";
  }

  /**
   * Sanitize placeholder name for use in templates
   */
  private sanitizePlaceholderName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Generate PPTX from template and data
   */
  async generateFromTemplate(
    template: PPTXTemplate,
    data: TemplateData,
    outputPath: string
  ): Promise<void> {
    const tempDir = path.join(path.dirname(outputPath), `temp_${Date.now()}`);

    try {
      // Copy template directory to temp location
      await this.copyDirectory(template.templatePath, tempDir);

      // Populate each slide with data
      for (const slide of template.slides) {
        const slideData = data[slide.slideNumber];
        if (!slideData) continue;

        const slidePath = path.join(
          tempDir,
          "ppt",
          "slides",
          `slide${slide.slideNumber}.xml`
        );
        await this.populateSlide(slidePath, slide.placeholders, slideData);
      }

      // Zip the directory into a PPTX
      await this.zipDirectory(tempDir, outputPath);
    } finally {
      // Cleanup temp directory
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true });
      }
    }
  }

  /**
   * Populate a single slide with data
   */
  private async populateSlide(
    slidePath: string,
    placeholders: TemplatePlaceholder[],
    data: Record<string, any>
  ): Promise<void> {
    const slideXml = await readFile(slidePath, "utf-8");
    const slide = await parseStringPromise(slideXml);

    const spTree = slide["p:sld"]["p:cSld"][0]["p:spTree"][0];

    // Replace text placeholders
    if (spTree["p:sp"]) {
      spTree["p:sp"].forEach((shape: any) => {
        const shapeName = shape["p:nvSpPr"][0]["p:cNvPr"][0]["$"]["name"];

        if (shape["p:txBody"] && shape["p:txBody"][0]["a:p"]) {
          shape["p:txBody"][0]["a:p"].forEach((para: any) => {
            if (para["a:r"]) {
              para["a:r"].forEach((run: any) => {
                const placeholder = placeholders.find(
                  (p) => p.shapeName === shapeName && p.type === "text"
                );

                if (placeholder && run["a:t"]) {
                  const placeholderKey = placeholder.placeholder.replace(
                    /[{}]/g,
                    ""
                  );

                  // Check if we have data for this placeholder
                  Object.keys(data).forEach((key) => {
                    if (
                      placeholderKey.includes(key) ||
                      shapeName.toLowerCase().includes(key)
                    ) {
                      run["a:t"][0] = data[key];
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    // Save updated XML
    const updatedXml = this.xmlBuilder.buildObject(slide);
    await writeFile(slidePath, updatedXml);
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Zip directory into PPTX file
   */
  private async zipDirectory(
    sourceDir: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => resolve());
      archive.on("error", (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Save template configuration to JSON
   */
  async saveTemplate(
    template: PPTXTemplate,
    outputPath: string
  ): Promise<void> {
    const templateJson = JSON.stringify(template, null, 2);
    await writeFile(outputPath, templateJson);
  }

  /**
   * Load template configuration from JSON
   */
  async loadTemplate(templatePath: string): Promise<PPTXTemplate> {
    const templateJson = await readFile(templatePath, "utf-8");
    return JSON.parse(templateJson);
  }
}

/**
 * Predefined template configurations for common presentation types
 */
export const PREDEFINED_TEMPLATES = {
  "project-brief": {
    slides: [
      {
        slideNumber: 1,
        slideType: "title",
        fields: [
          "title",
          "subtitle",
          "projectName",
          "presentedBy",
          "presentedTo",
          "companyName",
          "date",
        ],
      },
      {
        slideNumber: 2,
        slideType: "table-of-contents",
        fields: ["agenda"],
      },
      {
        slideNumber: 3,
        slideType: "content",
        fields: ["overview", "details"],
      },
    ],
  },
};
