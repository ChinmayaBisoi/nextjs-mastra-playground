import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { v4 as uuid } from "uuid";
import { TemplateSpec } from "@/types/parse"; // import your earlier Zod types

export async function parsePptxTemplate(
  buffer: Buffer,
  templateName = "Untitled Template"
): Promise<TemplateSpec> {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  // Paths in PPTX structure
  const layoutFiles = Object.keys(zip.files).filter((f) =>
    f.startsWith("ppt/slideLayouts/slideLayout")
  );

  const masterFiles = Object.keys(zip.files).filter((f) =>
    f.startsWith("ppt/slideMasters/slideMaster")
  );

  const themeFiles = Object.keys(zip.files).filter((f) =>
    f.startsWith("ppt/theme/theme")
  );

  // Extract theme
  const theme = themeFiles.length
    ? await extractTheme(zip, parser, themeFiles[0])
    : {};

  // Parse slide masters
  const slideMasters = await extractSlideMasters(zip, parser, masterFiles);

  // Parse all layouts
  const layouts = await Promise.all(
    layoutFiles.map(async (layoutPath) => {
      return await extractLayout(zip, parser, layoutPath, slideMasters);
    })
  );

  const template: TemplateSpec = {
    templateId: uuid(),
    name: templateName,
    version: "1.0.0",
    theme,
    layouts,
    metadata: {
      uploadedAt: new Date().toISOString(),
    },
  };

  return template;
}

// ----------------------------
// Extract Theme
// ----------------------------
async function extractTheme(zip: JSZip, parser: XMLParser, path: string) {
  const xml = await zip.file(path)!.async("string");
  const data = parser.parse(xml);

  const theme = data["a:theme"] || {};

  const colors = theme["a:themeElements"]?.["a:clrScheme"] ?? {};

  const primaryColor =
    colors["a:accent1"]?.["a:srgbClr"]?.["val"] ||
    colors["a:accent1"]?.["a:schemeClr"]?.["val"];

  const accentColors = [];

  for (let i = 2; i <= 6; i++) {
    const key = `a:accent${i}`;
    const clr =
      colors[key]?.["a:srgbClr"]?.["val"] ||
      colors[key]?.["a:schemeClr"]?.["val"];
    if (clr) accentColors.push(`#${clr}`);
  }

  const majorFont =
    theme["a:themeElements"]?.["a:fontScheme"]?.["a:majorFont"]?.["a:latin"]?.[
      "typeface"
    ];

  const minorFont =
    theme["a:themeElements"]?.["a:fontScheme"]?.["a:minorFont"]?.["a:latin"]?.[
      "typeface"
    ];

  return {
    primaryColor: primaryColor ? `#${primaryColor}` : undefined,
    accentColors,
    fontFamilies: {
      major: majorFont,
      minor: minorFont,
    },
  };
}

// ----------------------------
// Extract Slide Masters
// ----------------------------
async function extractSlideMasters(
  zip: JSZip,
  parser: XMLParser,
  masterFiles: string[]
) {
  const masters: Record<string, unknown> = {};

  for (const path of masterFiles) {
    const xml = await zip.file(path)!.async("string");
    masters[path] = parser.parse(xml);
  }

  return masters;
}

// ----------------------------
// Extract Layout + Placeholders
// ----------------------------
async function extractLayout(
  zip: JSZip,
  parser: XMLParser,
  layoutPath: string,
  _masters: Record<string, unknown>
) {
  const xml = await zip.file(layoutPath)!.async("string");
  const data = parser.parse(xml);

  const layoutRoot = data["p:sldLayout"];
  const layoutName = layoutRoot?.["p:cSld"]?.["p:name"] || "Unnamed Layout";

  // Handle both array and single object cases
  const spTree = layoutRoot?.["p:cSld"]?.["p:spTree"] || {};
  const shapes = Array.isArray(spTree["p:sp"])
    ? spTree["p:sp"]
    : spTree["p:sp"]
      ? [spTree["p:sp"]]
      : [];

  const placeholders = [];

  for (const shape of shapes) {
    const nv = shape["p:nvSpPr"];
    if (!nv) continue;

    // Placeholder is in p:nvPr -> p:ph, not in p:cNvPr
    const nvPr = nv["p:nvPr"];
    const placeholder = nvPr?.["p:ph"];

    // Only process if this is actually a placeholder
    if (!placeholder) continue;

    const phType = placeholder["type"] || ""; // title, body, ctrTitle, subTitle...
    const mappedType = mapPlaceholderType(phType);

    // Extract position data - handle both object and array structures
    const spPr = shape["p:spPr"] || {};
    const xfrm = spPr["a:xfrm"] || {};

    // Handle a:off and a:ext - they might be objects or arrays
    const off = Array.isArray(xfrm["a:off"]) ? xfrm["a:off"][0] : xfrm["a:off"];
    const ext = Array.isArray(xfrm["a:ext"]) ? xfrm["a:ext"][0] : xfrm["a:ext"];

    const x = off?.["x"] ? parseInt(String(off["x"]), 10) : 0;
    const y = off?.["y"] ? parseInt(String(off["y"]), 10) : 0;
    const width = ext?.["cx"] ? parseInt(String(ext["cx"]), 10) : 0;
    const height = ext?.["cy"] ? parseInt(String(ext["cy"]), 10) : 0;

    // Only include placeholders with valid position data
    if (width === 0 && height === 0) continue;

    const cNvPr = nv["p:cNvPr"] || {};
    const style = extractTextStyle(shape);

    placeholders.push({
      id: cNvPr["id"] || String(placeholders.length + 1),
      name: cNvPr["name"],
      type: mappedType,
      index: placeholder["idx"]
        ? parseInt(String(placeholder["idx"]), 10)
        : undefined,
      x,
      y,
      width,
      height,
      style,
    });
  }

  return {
    layoutId: layoutPath.replace("ppt/slideLayouts/", ""),
    layoutName,
    placeholders,
  };
}

// ----------------------------
// Map PPT Placeholder types
// ----------------------------
function mapPlaceholderType(type: string) {
  const t = type?.toLowerCase?.() || "";

  if (t.includes("title") || t.includes("ctrtitle")) return "title";
  if (t.includes("subtitle")) return "subtitle";
  if (t.includes("body")) return "body";
  if (t.includes("pic") || t.includes("picture")) return "image";
  if (t.includes("chart")) return "chart";

  return "unknown";
}

// ----------------------------
// Extract Text Styling
// ----------------------------
function extractTextStyle(shape: unknown) {
  const shapeObj = shape as Record<string, unknown>;
  const txBody = shapeObj?.["p:txBody"] as Record<string, unknown> | undefined;
  if (!txBody) return {};

  // Handle both array and object cases
  const paraData = txBody["a:p"];
  const paragraphs = Array.isArray(paraData)
    ? paraData
    : paraData
      ? [paraData]
      : [];

  if (paragraphs.length === 0) return {};

  // Get first paragraph's first run properties
  const firstPara = paragraphs[0] as Record<string, unknown>;
  const runData = firstPara["a:r"];
  const runs = Array.isArray(runData) ? runData : runData ? [runData] : [];

  const defRPr =
    (runs[0] as Record<string, unknown>)?.["a:rPr"] ||
    firstPara["a:rPr"] ||
    ((firstPara["a:pPr"] as Record<string, unknown>)?.["a:defRPr"] as
      | Record<string, unknown>
      | undefined);

  if (!defRPr) return {};

  const defRPrObj = defRPr as Record<string, unknown>;

  // Handle array/object cases for nested properties
  const latinData = defRPrObj["latin"];
  const latin = Array.isArray(latinData)
    ? (latinData[0] as Record<string, unknown>)
    : (latinData as Record<string, unknown> | undefined);

  const solidFillData = defRPrObj["solidFill"];
  const solidFill = Array.isArray(solidFillData)
    ? (solidFillData[0] as Record<string, unknown>)
    : (solidFillData as Record<string, unknown> | undefined);

  const srgbClr = solidFill?.["a:srgbClr"] as
    | Record<string, unknown>
    | undefined;
  const schemeClr = solidFill?.["a:schemeClr"] as
    | Record<string, unknown>
    | undefined;

  return {
    fontFamily: latin?.["typeface"] as string | undefined,
    fontSize: defRPrObj["sz"] ? Number(defRPrObj["sz"]) / 100 : undefined,
    color:
      srgbClr?.["val"] || schemeClr?.["val"]
        ? `#${(srgbClr?.["val"] || schemeClr?.["val"]) as string}`
        : undefined,
    bold: defRPrObj["b"] === "1" || defRPrObj["b"] === 1,
    italic: defRPrObj["i"] === "1" || defRPrObj["i"] === 1,
  };
}
