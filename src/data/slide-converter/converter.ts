/**
 * Main converter function for slides
 */

import fs from "fs/promises";
import path from "path";
import type { SlideJson } from "./types";
import {
  parseSlideXml,
  parseSlideRels,
  parseLayoutXml,
  parseMasterSlideXml,
  parseThemeXml,
  parsePresentationXml,
  getLayoutXmlPath,
  getMasterSlideXmlPath,
  getThemeXmlPath,
  getPresentationXmlPath,
} from "./parser";
import {
  extractBackground,
  extractLayout,
  extractElements,
  extractTheme,
  extractMasterSlide,
  extractPresentationMetadata,
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

  // Parse layout XML if layout reference exists
  let layoutData = null;
  const layoutRel = Array.from(relsMap.values()).find((rel) =>
    rel.type.includes("slideLayout")
  );
  if (layoutRel) {
    const layoutPath = layoutRel.target;
    const layoutName = layoutPath.split("/").pop() || "";
    if (layoutName) {
      const fullLayoutPath = getLayoutXmlPath(outputDir, layoutName);
      layoutData = await parseLayoutXml(fullLayoutPath);
    }
  }

  // Extract data
  const background = extractBackground(slideData);
  const layout = extractLayout(slideData, relsMap, layoutData);
  const elements = extractElements(slideData, relsMap);

  // Parse presentation-level data (theme, master slide, presentation metadata)
  // These are the same for all slides, but we parse them here for simplicity
  // In a production system, you might want to cache these
  const themePath = getThemeXmlPath(outputDir);
  const themeData = await parseThemeXml(themePath);
  const theme = extractTheme(themeData);

  const masterPath = getMasterSlideXmlPath(outputDir);
  const masterData = await parseMasterSlideXml(masterPath);
  const masterSlide = extractMasterSlide(masterData);

  const presentationPath = getPresentationXmlPath(outputDir);
  const presentationData = await parsePresentationXml(presentationPath);
  const presentationMetadata = extractPresentationMetadata(presentationData);

  return {
    slideNumber,
    background,
    elements,
    layout,
    ...(theme && { theme }),
    ...(masterSlide && { masterSlide }),
    ...(presentationMetadata && { presentationMetadata }),
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
    path.join(outputDir, "slides-json", `slide${slideNumber}.json`);

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
