import AdmZip from "adm-zip";
import fs from "fs/promises";
import path from "path";

/**
 * Extracts a PPTX file from test-files to XML files in output/[filename]/
 * @param filename - The name of the PPTX file in test-files (e.g., "cream.pptx")
 * @returns The path to the output directory
 */
export async function extractPptxToXml(filename: string): Promise<string> {
  try {
    // Get the directory where this file is located
    const currentDir = __dirname;

    // Path to the PPTX file in test-files
    const pptxPath = path.join(currentDir, "test-files", filename);

    // Check if file exists
    try {
      await fs.access(pptxPath);
    } catch {
      throw new Error(`File not found: ${pptxPath}`);
    }

    // Extract filename without extension for output folder name
    const baseName = path.basename(filename, ".pptx");

    // Output directory: src/data/output/[filename]/
    const outputDir = path.join(currentDir, "output", baseName);

    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Extract PPTX (it's a ZIP file)
    const zip = new AdmZip(pptxPath);
    const zipEntries = zip.getEntries();

    // Extract all files (not just XML, to preserve structure)
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        const entryPath = path.join(outputDir, entry.entryName);

        // Create subdirectories if needed
        await fs.mkdir(path.dirname(entryPath), { recursive: true });

        // Write file
        const fileData = entry.getData();
        await fs.writeFile(entryPath, fileData);
      }
    }

    console.log(`Extracted ${filename} to: ${outputDir}`);
    return outputDir;
  } catch (error) {
    console.error(`Error extracting PPTX file ${filename}:`, error);
    throw error;
  }
}

// Run with: npx tsx src/data/test-v1-parser.ts
// Or: npx ts-node src/data/test-v1-parser.ts
extractPptxToXml("cream.pptx").catch(console.error);
