/**
 * PPT Regenerator - Regenerates PPTX from template using simple text replacement
 * This is a lighter-weight approach that works directly with XML strings
 */

import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import { promisify } from "util";
import { PresentationTemplateData, SlideTemplate } from "./ppt-template-config";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class PPTRegenerator {
  /**
   * Regenerate PPTX by replacing text content in XML files
   */
  async regenerateFromTemplate(
    templateXmlDir: string,
    slideTemplates: SlideTemplate[],
    data: PresentationTemplateData,
    outputPptxPath: string
  ): Promise<void> {
    const tempDir = path.join(
      path.dirname(outputPptxPath),
      `temp_${Date.now()}`
    );

    try {
      // Copy entire template directory to temp location
      await this.copyDirectory(templateXmlDir, tempDir);

      // Process each slide
      for (const slideTemplate of slideTemplates) {
        const slideData = data.slides[slideTemplate.slideNumber];
        if (!slideData) continue;

        const slidePath = path.join(
          tempDir,
          "ppt",
          "slides",
          `slide${slideTemplate.slideNumber}.xml`
        );

        if (!fs.existsSync(slidePath)) {
          console.warn(
            `Slide ${slideTemplate.slideNumber} not found at ${slidePath}`
          );
          continue;
        }

        await this.populateSlideXml(slidePath, slideTemplate, slideData);
      }

      // Create PPTX from modified XML
      await this.createPPTXFromXml(tempDir, outputPptxPath);
    } finally {
      // Cleanup temp directory
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Populate slide XML with data using direct text replacement
   */
  private async populateSlideXml(
    slidePath: string,
    template: SlideTemplate,
    data: Record<string, any>
  ): Promise<void> {
    let slideXml = await readFile(slidePath, "utf-8");

    // Replace text fields
    for (const field of template.textFields) {
      const value = data[field.name];
      if (value === undefined) continue;

      // Find the text element within the shape
      const shapeRegex = new RegExp(
        `(<p:sp>.*?<p:cNvPr[^>]*name="${field.selector}"[^>]*>.*?<a:t>)([^<]*)(</a:t>.*?</p:sp>)`,
        "gs"
      );

      slideXml = slideXml.replace(shapeRegex, (match, before, text, after) => {
        return `${before}${this.escapeXml(String(value))}${after}`;
      });

      // Also try without the full shape wrapper (for nested text)
      const textRegex = new RegExp(
        `(<p:cNvPr[^>]*name="${field.selector}"[^>]*>.*?<a:t>)([^<]*)(</a:t>)`,
        "gs"
      );

      slideXml = slideXml.replace(textRegex, (match, before, text, after) => {
        return `${before}${this.escapeXml(String(value))}${after}`;
      });
    }

    // Handle table fields
    if (template.tableFields) {
      for (const tableField of template.tableFields) {
        const tableData = data[tableField.name];
        if (!tableData || typeof tableData !== "object") continue;

        slideXml = this.populateTable(slideXml, tableField.selector, tableData);
      }
    }

    await writeFile(slidePath, slideXml);
  }

  /**
   * Populate table data in XML
   */
  private populateTable(
    xml: string,
    tableName: string,
    tableData: { headers?: string[]; rows: string[][] }
  ): string {
    // This is a simplified version - you may need to adapt based on your table structure
    const rows = tableData.rows || [];

    // Find table in XML
    const tableRegex = new RegExp(
      `(<p:graphicFrame>.*?<p:cNvPr[^>]*name="${tableName}"[^>]*>.*?<a:tbl>)(.*?)(</a:tbl>.*?</p:graphicFrame>)`,
      "gs"
    );

    return xml.replace(tableRegex, (match, before, tableContent, after) => {
      let newTableContent = tableContent;

      // Replace each row's cells
      rows.forEach((row, rowIndex) => {
        row.forEach((cellValue, cellIndex) => {
          // Find the nth cell and replace its text
          const cellRegex = /<a:t>([^<]*)<\/a:t>/g;
          let cellCount = 0;

          newTableContent = newTableContent.replace(
            cellRegex,
            (cellMatch, cellText) => {
              const targetIndex = rowIndex * row.length + cellIndex;
              if (cellCount === targetIndex) {
                cellCount++;
                return `<a:t>${this.escapeXml(cellValue)}</a:t>`;
              }
              cellCount++;
              return cellMatch;
            }
          );
        });
      });

      return `${before}${newTableContent}${after}`;
    });
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });

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
   * Create PPTX file from XML directory
   */
  private async createPPTXFromXml(
    xmlDir: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      output.on("close", () => {
        console.log(`PPTX created: ${outputPath} (${archive.pointer()} bytes)`);
        resolve();
      });

      output.on("error", reject);
      archive.on("error", reject);

      archive.pipe(output);

      // Add all files from XML directory
      archive.directory(xmlDir, false);

      archive.finalize();
    });
  }

  /**
   * Quick regeneration using LLM-generated content
   */
  async regenerateWithLLMContent(
    templateXmlDir: string,
    slideTemplates: SlideTemplate[],
    llmContent: Record<string, string>,
    outputPptxPath: string
  ): Promise<void> {
    // Convert LLM content to template data format
    const data: PresentationTemplateData = {
      templateName: "generated",
      slides: {},
    };

    // Map LLM content to slides
    slideTemplates.forEach((slide) => {
      data.slides[slide.slideNumber] = {};

      slide.textFields.forEach((field) => {
        // Try to find matching content from LLM
        const key = field.name.toLowerCase();
        const matchingKey = Object.keys(llmContent).find(
          (k) => k.toLowerCase().includes(key) || key.includes(k.toLowerCase())
        );

        if (matchingKey) {
          data.slides[slide.slideNumber][field.name] = llmContent[matchingKey];
        } else if (field.defaultValue) {
          data.slides[slide.slideNumber][field.name] = field.defaultValue;
        }
      });
    });

    return this.regenerateFromTemplate(
      templateXmlDir,
      slideTemplates,
      data,
      outputPptxPath
    );
  }
}

/**
 * Utility functions
 */
export async function regeneratePPT(
  templatePath: string,
  slideTemplates: SlideTemplate[],
  data: PresentationTemplateData,
  outputPath: string
): Promise<string> {
  const regenerator = new PPTRegenerator();
  await regenerator.regenerateFromTemplate(
    templatePath,
    slideTemplates,
    data,
    outputPath
  );
  return outputPath;
}
