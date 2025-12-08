import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export interface SlideData {
  slideNumber: number;
  xmlContent: string;
  normalizedFonts: string[];
}

export interface ParsedPptx {
  slides: SlideData[];
  totalSlides: number;
}

/**
 * Extract fonts from OXML content
 */
function extractFontsFromXml(xmlContent: string): string[] {
  const fonts = new Set<string>();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  try {
    const parsed = parser.parse(xmlContent);

    // Extract fonts from various OXML elements
    const extractFonts = (obj: Record<string, unknown>): void => {
      if (!obj || typeof obj !== "object") return;

      // Look for typeface attributes
      if (obj["@_typeface"] && typeof obj["@_typeface"] === "string") {
        const fontName = obj["@_typeface"];
        if (fontName && fontName.trim() && !fontName.startsWith("+")) {
          fonts.add(fontName.trim());
        }
      }

      // Recursively search
      for (const key in obj) {
        if (Array.isArray(obj[key])) {
          (obj[key] as unknown[]).forEach((item) => {
            if (typeof item === "object" && item !== null) {
              extractFonts(item as Record<string, unknown>);
            }
          });
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          extractFonts(obj[key] as Record<string, unknown>);
        }
      }
    };

    extractFonts(parsed);
  } catch (error) {
    console.error("Error extracting fonts from XML:", error);
  }

  // Filter out system fonts
  const systemFonts = new Set([
    "+mn-lt",
    "+mj-lt",
    "+mn-ea",
    "+mj-ea",
    "+mn-cs",
    "+mj-cs",
    "",
  ]);

  return Array.from(fonts).filter((f) => !systemFonts.has(f));
}

/**
 * Normalize font family name by removing style/weight descriptors
 */
function normalizeFontName(rawName: string): string {
  if (!rawName) return rawName;

  // Replace separators with spaces
  let name = rawName.replace(/[_-]/g, " ");

  // Insert spaces in camel case
  name = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  // Collapse multiple spaces
  name = name.replace(/\s+/g, " ").trim();

  // Remove common style/weight suffixes
  const styleTokens = [
    "italic",
    "bold",
    "light",
    "medium",
    "semibold",
    "regular",
    "normal",
    "thin",
    "heavy",
    "black",
  ];

  const tokens = name.split(" ");
  const filtered = tokens.filter((token, index) => {
    if (index === 0) return true; // Always keep first token
    const lower = token.toLowerCase();
    return !styleTokens.some((style) => lower.includes(style));
  });

  return filtered.join(" ").trim();
}

/**
 * Parse PPTX file and extract slide XMLs
 */
export async function parsePptxFile(
  file: File | ArrayBuffer
): Promise<ParsedPptx> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find all slide XML files
  const slideFiles: { name: string; number: number }[] = [];
  zip.forEach((relativePath) => {
    if (
      relativePath.startsWith("ppt/slides/slide") &&
      relativePath.endsWith(".xml")
    ) {
      const match = relativePath.match(/slide(\d+)\.xml/);
      if (match) {
        slideFiles.push({
          name: relativePath,
          number: parseInt(match[1], 10),
        });
      }
    }
  });

  // Sort by slide number
  slideFiles.sort((a, b) => a.number - b.number);

  // Extract XML content for each slide
  const slides: SlideData[] = [];
  for (const slideFile of slideFiles) {
    const xmlContent = await zip.file(slideFile.name)?.async("string");
    if (!xmlContent) continue;

    const rawFonts = extractFontsFromXml(xmlContent);
    const normalizedFonts = Array.from(
      new Set(rawFonts.map(normalizeFontName).filter(Boolean))
    );

    slides.push({
      slideNumber: slideFile.number,
      xmlContent,
      normalizedFonts,
    });
  }

  return {
    slides,
    totalSlides: slides.length,
  };
}
