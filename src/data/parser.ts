import { XMLParser } from "fast-xml-parser";
import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";

interface ParseOptions {
  ignoreAttributes?: boolean;
  attributeNamePrefix?: string;
  textNodeName?: string;
  ignoreDeclaration?: boolean;
  removeNSPrefix?: boolean;
}

export async function parseXmlFile(
  filePath: string,
  outputPath?: string,
  options?: ParseOptions
): Promise<unknown> {
  try {
    // Read the XML file
    const xmlData = await fs.readFile(filePath, "utf-8");

    // Initialize parser with options
    const parser = new XMLParser({
      ignoreAttributes: options?.ignoreAttributes ?? false,
      attributeNamePrefix: options?.attributeNamePrefix ?? "@_",
      textNodeName: options?.textNodeName ?? "#text",
      ignoreDeclaration: options?.ignoreDeclaration ?? false,
      removeNSPrefix: options?.removeNSPrefix ?? false,
    });

    // Parse the XML
    const result = parser.parse(xmlData);

    // Determine output path
    const finalOutputPath =
      outputPath ||
      path.join(
        path.dirname(filePath),
        `${path.basename(filePath, path.extname(filePath))}.json`
      );

    // Write result to file
    await fs.writeFile(
      finalOutputPath,
      JSON.stringify(result, null, 2),
      "utf-8"
    );

    console.log(`Parsed XML saved to: ${finalOutputPath}`);

    return result;
  } catch (error) {
    console.error("Error parsing XML file:", error);
    throw error;
  }
}

export async function parsePptxFile(
  pptxPath: string,
  outputDir?: string
): Promise<Record<string, unknown>> {
  try {
    // Extract PPTX (it's a ZIP file)
    const zip = new AdmZip(pptxPath);
    const zipEntries = zip.getEntries();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      removeNSPrefix: true,
    });

    const results: Record<string, unknown> = {};

    // Parse all XML files in the PPTX
    for (const entry of zipEntries) {
      if (
        entry.entryName.endsWith(".xml") ||
        entry.entryName.endsWith(".xml.rels")
      ) {
        const xmlContent = entry.getData().toString("utf-8");
        results[entry.entryName] = parser.parse(xmlContent);
      }
    }

    // Determine output path
    const finalOutputPath =
      outputDir ||
      path.join(
        path.dirname(pptxPath),
        `${path.basename(pptxPath, ".pptx")}-parsed.json`
      );

    // Write result to file
    await fs.writeFile(
      finalOutputPath,
      JSON.stringify(results, null, 2),
      "utf-8"
    );

    console.log(`Parsed PPTX saved to: ${finalOutputPath}`);

    return results;
  } catch (error) {
    console.error("Error parsing PPTX file:", error);
    throw error;
  }
}

export async function extractPptxToXml(
  pptxPath: string,
  outputDir?: string
): Promise<string> {
  try {
    // Extract PPTX (it's a ZIP file)
    const zip = new AdmZip(pptxPath);
    const zipEntries = zip.getEntries();

    // Determine output directory
    const finalOutputDir =
      outputDir ||
      path.join(
        path.dirname(pptxPath),
        `${path.basename(pptxPath, ".pptx")}-xml`
      );

    // Create output directory if it doesn't exist
    await fs.mkdir(finalOutputDir, { recursive: true });

    // Extract all XML files
    for (const entry of zipEntries) {
      if (
        entry.entryName.endsWith(".xml") ||
        entry.entryName.endsWith(".xml.rels")
      ) {
        const xmlContent = entry.getData().toString("utf-8");
        const outputPath = path.join(finalOutputDir, entry.entryName);

        // Create subdirectories if needed
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Write XML file
        await fs.writeFile(outputPath, xmlContent, "utf-8");
      }
    }

    console.log(`Extracted XML files to: ${finalOutputDir}`);
    return finalOutputDir;
  } catch (error) {
    console.error("Error extracting PPTX to XML:", error);
    throw error;
  }
}

// CLI execution
const filePath =
  process.argv[2] ||
  path.join(
    __dirname,
    "Beige and Black Minimalist Project Deck Presentation.pptx"
  );

const mode = process.argv[3] || "parse"; // "parse" or "extract"

if (mode === "extract") {
  extractPptxToXml(filePath).catch(console.error);
} else {
  parsePptxFile(filePath).catch(console.error);
}
