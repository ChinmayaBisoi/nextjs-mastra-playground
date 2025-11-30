/**
 * Test script to convert slide 1 to JSON
 * 
 * Run with: npx tsx src/data/slide-converter/test-slide1.ts
 */

import path from "path";
import { convertSlideToJsonFile } from "./converter";

async function main() {
  const currentDir = __dirname;
  const outputDir = path.join(currentDir, "..", "output", "cream");

  try {
    console.log("Converting slide 1 to JSON...");
    const outputPath = await convertSlideToJsonFile(1, outputDir);
    console.log(`✅ Success! Output saved to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error converting slide:", error);
    process.exit(1);
  }
}

main();

