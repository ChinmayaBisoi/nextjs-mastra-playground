/**
 * Browser-based PPTX parser using JSZip
 * Parses PPTX files directly in the browser without server upload
 */

import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { SlideJson, RelationshipMap } from "@/data/slide-converter/types";
import {
  extractBackground,
  extractLayout,
  extractElements,
  extractTheme,
  extractMasterSlide,
  extractPresentationMetadata,
} from "@/data/slide-converter/extractors";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true,
});

/**
 * Parse slide XML from JSZip
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseSlideXml(zip: JSZip, slideNumber: number): Promise<any> {
  const slidePath = `ppt/slides/slide${slideNumber}.xml`;
  const slideFile = zip.file(slidePath);
  if (!slideFile) {
    throw new Error(`Slide ${slideNumber} not found`);
  }
  const xmlData = await slideFile.async("string");
  return parser.parse(xmlData);
}

/**
 * Parse slide relationships from JSZip
 */
async function parseSlideRels(
  zip: JSZip,
  slideNumber: number
): Promise<RelationshipMap> {
  const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
  const relsFile = zip.file(relsPath);
  if (!relsFile) {
    return new Map();
  }

  try {
    const xmlData = await relsFile.async("string");
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
 * Parse layout XML from JSZip
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseLayoutXml(zip: JSZip, layoutPath: string): Promise<any> {
  const layoutFile = zip.file(layoutPath);
  if (!layoutFile) {
    return null;
  }
  try {
    const xmlData = await layoutFile.async("string");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing layout XML: ${layoutPath}`, error);
    return null;
  }
}

/**
 * Parse master slide XML from JSZip
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseMasterSlideXml(
  zip: JSZip,
  masterPath: string = "ppt/slideMasters/slideMaster1.xml"
): Promise<any> {
  const masterFile = zip.file(masterPath);
  if (!masterFile) {
    return null;
  }
  try {
    const xmlData = await masterFile.async("string");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing master slide XML: ${masterPath}`, error);
    return null;
  }
}

/**
 * Parse theme XML from JSZip
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseThemeXml(
  zip: JSZip,
  themePath: string = "ppt/theme/theme1.xml"
): Promise<any> {
  const themeFile = zip.file(themePath);
  if (!themeFile) {
    return null;
  }
  try {
    const xmlData = await themeFile.async("string");
    return parser.parse(xmlData);
  } catch (error) {
    console.error(`Error parsing theme XML: ${themePath}`, error);
    return null;
  }
}

/**
 * Parse presentation XML from JSZip
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parsePresentationXml(zip: JSZip): Promise<any> {
  const presentationFile = zip.file("ppt/presentation.xml");
  if (!presentationFile) {
    return null;
  }
  try {
    const xmlData = await presentationFile.async("string");
    return parser.parse(xmlData);
  } catch (error) {
    console.error("Error parsing presentation XML", error);
    return null;
  }
}

/**
 * Find all slide numbers in the PPTX
 */
function findSlideNumbers(zip: JSZip): number[] {
  const slideNumbers: number[] = [];
  const slidePattern = /^ppt\/slides\/slide(\d+)\.xml$/;

  for (const filename of Object.keys(zip.files)) {
    const match = filename.match(slidePattern);
    if (match) {
      slideNumbers.push(parseInt(match[1], 10));
    }
  }

  return slideNumbers.sort((a, b) => a - b);
}

/**
 * Convert a slide to JSON structure using JSZip
 */
async function convertSlideToJson(
  zip: JSZip,
  slideNumber: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeData?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  masterData?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presentationData?: any
): Promise<SlideJson> {
  // Parse slide XML
  const slideData = await parseSlideXml(zip, slideNumber);

  // Parse relationships
  const relsMap = await parseSlideRels(zip, slideNumber);

  // Parse layout XML if layout reference exists
  let layoutData = null;
  const layoutRel = Array.from(relsMap.values()).find((rel) =>
    rel.type.includes("slideLayout")
  );
  if (layoutRel) {
    const layoutPath = `ppt/${layoutRel.target}`;
    layoutData = await parseLayoutXml(zip, layoutPath);
  }

  // Extract data
  const background = extractBackground(slideData);
  const layout = extractLayout(slideData, relsMap, layoutData);
  const elements = extractElements(slideData, relsMap);

  // Extract theme, master slide, and presentation metadata
  const theme = themeData ? extractTheme(themeData) : undefined;
  const masterSlide = masterData ? extractMasterSlide(masterData) : undefined;
  const presentationMetadata = presentationData
    ? extractPresentationMetadata(presentationData)
    : undefined;

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
 * Parse a PPTX file in the browser and return all slides as JSON
 * @param file - The PPTX file to parse
 * @returns Array of parsed slide JSON objects
 */
export async function parsePptxFile(file: File): Promise<SlideJson[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    console.log("PPTX file loaded successfully");
    console.log("Files in PPTX:", Object.keys(zip.files));

    // Parse presentation-level data once (theme, master slide, presentation metadata)
    const themeData = await parseThemeXml(zip);
    const masterData = await parseMasterSlideXml(zip);
    const presentationData = await parsePresentationXml(zip);

    // Find all slides
    const slideNumbers = findSlideNumbers(zip);
    console.log(`Found ${slideNumbers.length} slides:`, slideNumbers);

    if (slideNumbers.length === 0) {
      throw new Error("No slides found in PPTX file");
    }

    // Parse each slide
    const slides: SlideJson[] = [];
    for (const slideNumber of slideNumbers) {
      try {
        const slideJson = await convertSlideToJson(
          zip,
          slideNumber,
          themeData,
          masterData,
          presentationData
        );
        slides.push(slideJson);
        console.log(`Parsed slide ${slideNumber}`);
      } catch (error) {
        console.error(`Error parsing slide ${slideNumber}:`, error);
        // Continue with other slides even if one fails
      }
    }

    if (slides.length === 0) {
      throw new Error("Failed to parse any slides from PPTX file");
    }

    console.log(`Successfully parsed ${slides.length} slides`);
    return slides;
  } catch (error) {
    console.error("Error parsing PPTX file:", error);
    throw error;
  }
}
