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
  masters: Record<string, unknown>
) {
  const xml = await zip.file(layoutPath)!.async("string");
  const data = parser.parse(xml);

  const layoutRoot = data["p:sldLayout"];
  const layoutName = layoutRoot?.["p:cSld"]?.["p:name"] || "Unnamed Layout";

  const shapes = layoutRoot?.["p:cSld"]?.["p:spTree"]?.["p:sp"] || []; // the placeholder shapes

  const placeholders = [];

  for (const shape of shapes) {
    const nv = shape["p:nvSpPr"];
    if (!nv) continue;

    const placeholder = nv["p:nvPr"]?.["p:ph"] || nv["p:cNvPr"]?.["p:ph"]; // placeholder node

    if (!placeholder) continue;

    const phType = placeholder["type"] || ""; // title, body, ctrTitle, subTitle...

    const mappedType = mapPlaceholderType(phType);

    const geom = shape["p:spPr"]?.["a:xfrm"] || {};
    const pos = {
      x: parseInt(geom["a:off"]?.["x"] || "0", 10),
      y: parseInt(geom["a:off"]?.["y"] || "0", 10),
      width: parseInt(geom["a:ext"]?.["cx"] || "0", 10),
      height: parseInt(geom["a:ext"]?.["cy"] || "0", 10),
    };

    const style = extractTextStyle(shape);

    placeholders.push({
      id: nv["p:cNvPr"]?.["id"],
      name: nv["p:cNvPr"]?.["name"],
      type: mappedType,
      index: placeholder["idx"] ? parseInt(placeholder["idx"]) : undefined,
      ...pos,
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
function extractTextStyle(shape: any) {
  const defRPr =
    shape?.["p:txBody"]?.["a:p"]?.["a:r"]?.["a:rPr"] ||
    shape?.["p:txBody"]?.["a:p"]?.["a:rPr"];

  if (!defRPr) return {};

  return {
    fontFamily: defRPr["latin"]?.["typeface"],
    fontSize: defRPr["sz"] ? Number(defRPr["sz"]) / 100 : undefined,
    color:
      defRPr["solidFill"]?.["srgbClr"]?.["val"] ||
      defRPr["solidFill"]?.["schemeClr"]?.["val"],
    bold: defRPr["b"] === "1",
    italic: defRPr["i"] === "1",
  };
}
