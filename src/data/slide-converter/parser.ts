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
    const relsArray = Array.isArray(relationships) ? relationships : [relationships];
    
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
export function getSlideXmlPath(outputDir: string, slideNumber: number): string {
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
export function resolveMediaPath(
  target: string,
  outputDir: string
): string {
  // Remove leading "../" if present
  const cleanTarget = target.replace(/^\.\.\//, "");
  const baseDir = getSlideBaseDir(outputDir);
  return path.join(baseDir, cleanTarget);
}

