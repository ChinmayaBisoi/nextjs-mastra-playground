/**
 * XML parsing utilities for slides
 */

import { XMLParser } from "fast-xml-parser";
import fs from "fs/promises";
import path from "path";
import type { Relationship, RelationshipMap } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true,
});

/**
 * Parse a slide XML file
 */
export async function parseSlideXml(slidePath: string): Promise<any> {
  try {
    const xmlData = await fs.readFile(slidePath, "utf-8");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing slide XML: ${slidePath}`, error);
    throw error;
  }
}

/**
 * Parse a relationships XML file and return a map
 */
export async function parseSlideRels(
  relsPath: string
): Promise<RelationshipMap> {
  try {
    const xmlData = await fs.readFile(relsPath, "utf-8");
    const parsed = parser.parse(xmlData);
    const relationships = parsed.Relationships?.Relationship || [];
    const relsArray = Array.isArray(relationships)
      ? relationships
      : [relationships];

    const map: RelationshipMap = new Map();

    for (const rel of relsArray) {
      if (rel["@_Id"] && rel["@_Target"]) {
        map.set(rel["@_Id"], {
          id: rel["@_Id"],
          target: rel["@_Target"],
          type: rel["@_Type"] || "",
        });
      }
    }

    return map;
  } catch (error) {
    console.error(`Error parsing relationships XML: ${relsPath}`, error);
    return new Map();
  }
}

/**
 * Get the base directory for a slide (e.g., output/cream)
 */
export function getSlideBaseDir(outputDir: string): string {
  return path.join(outputDir, "ppt");
}

/**
 * Get slide XML path
 */
export function getSlideXmlPath(
  outputDir: string,
  slideNumber: number
): string {
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, "slides", `slide${slideNumber}.xml`);
}

/**
 * Get slide relationships XML path
 */
export function getSlideRelsPath(
  outputDir: string,
  slideNumber: number
): string {
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, "slides", "_rels", `slide${slideNumber}.xml.rels`);
}

/**
 * Resolve media file path from relationship target
 */
export function resolveMediaPath(target: string, outputDir: string): string {
  // Remove leading "../" if present
  const cleanTarget = target.replace(/^\.\.\//, "");
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, cleanTarget);
}

/**
 * Parse a layout XML file
 */
export async function parseLayoutXml(layoutPath: string): Promise<any> {
  try {
    const xmlData = await fs.readFile(layoutPath, "utf-8");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing layout XML: ${layoutPath}`, error);
    return null;
  }
}

/**
 * Parse a master slide XML file
 */
export async function parseMasterSlideXml(masterPath: string): Promise<any> {
  try {
    const xmlData = await fs.readFile(masterPath, "utf-8");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing master slide XML: ${masterPath}`, error);
    return null;
  }
}

/**
 * Parse a theme XML file
 */
export async function parseThemeXml(themePath: string): Promise<any> {
  try {
    const xmlData = await fs.readFile(themePath, "utf-8");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing theme XML: ${themePath}`, error);
    return null;
  }
}

/**
 * Parse presentation XML file
 */
export async function parsePresentationXml(
  presentationPath: string
): Promise<any> {
  try {
    const xmlData = await fs.readFile(presentationPath, "utf-8");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing presentation XML: ${presentationPath}`, error);
    return null;
  }
}

/**
 * Get layout XML path
 */
export function getLayoutXmlPath(
  outputDir: string,
  layoutName: string
): string {
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, "slideLayouts", layoutName);
}

/**
 * Get master slide XML path
 */
export function getMasterSlideXmlPath(
  outputDir: string,
  masterName: string = "slideMaster1.xml"
): string {
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, "slideMasters", masterName);
}

/**
 * Get theme XML path
 */
export function getThemeXmlPath(
  outputDir: string,
  themeName: string = "theme1.xml"
): string {
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, "theme", themeName);
}

/**
 * Get presentation XML path
 */
export function getPresentationXmlPath(outputDir: string): string {
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, "presentation.xml");
}
