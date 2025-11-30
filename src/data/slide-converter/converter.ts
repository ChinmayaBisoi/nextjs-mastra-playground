/**
 * Main converter function for slides
 */

import fs from "fs/promises";
import path from "path";
import type { SlideJson } from "./types";
import { parseSlideXml, parseSlideRels } from "./parser";
import {
  extractBackground,
  extractLayout,
  extractElements,
} from "./extractors";

/**
 * Convert a slide to JSON structure
 */
export async function convertSlideToJson(
  slideNumber: number,
  outputDir: string
): Promise<SlideJson> {
  const slidePath = path.join(
    outputDir,
    "ppt",
    "slides",
    `slide${slideNumber}.xml`
  );
  const relsPath = path.join(
    outputDir,
    "ppt",
    "slides",
    "_rels",
    `slide${slideNumber}.xml.rels`
  );

  // Parse slide XML
  const slideData = await parseSlideXml(slidePath);

  // Parse relationships
  const relsMap = await parseSlideRels(relsPath);

  // Extract data
  const background = extractBackground(slideData);
  const layout = extractLayout(slideData, relsMap);
  const elements = extractElements(slideData, relsMap);

  return {
    slideNumber,
    background,
    elements,
    layout,
  };
}

/**
 * Convert slide to JSON and save to file
 */
export async function convertSlideToJsonFile(
  slideNumber: number,
  outputDir: string,
  outputPath?: string
): Promise<string> {
  const slideJson = await convertSlideToJson(slideNumber, outputDir);

  const finalOutputPath =
    outputPath ||
    path.join(
      outputDir,
      "slides-json",
      `slide${slideNumber}.json`
    );

  // Create directory if it doesn't exist
  await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

  // Write JSON file
  await fs.writeFile(
    finalOutputPath,
    JSON.stringify(slideJson, null, 2),
    "utf-8"
  );

  console.log(`Converted slide ${slideNumber} to: ${finalOutputPath}`);
  return finalOutputPath;
}

