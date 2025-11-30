/**
 * Extractors for slide data from parsed XML
 */

import type {
  ImageElement,
  TextElement,
  SlideBackground,
  SlideLayout,
  RelationshipMap,
  Position,
  Size,
  Transform,
  TextFormatting,
} from "./types";
import {
  emuToPoints,
  pptFontSizeToPoints,
  normalizeHexColor,
  getNumericAttribute,
  getStringAttribute,
  getBooleanAttribute,
  getTextAlignment,
} from "./utils";

/**
 * Extract background from slide XML
 */
export function extractBackground(slideData: any): SlideBackground {
  const bg = slideData.sld?.cSld?.bg?.bgPr;
  if (!bg) {
    return { type: "solid", color: "#FFFFFF" };
  }

  // Check for solid fill
  const solidFill = bg.solidFill?.srgbClr?.["@_val"];
  if (solidFill) {
    return {
      type: "solid",
      color: normalizeHexColor(solidFill),
    };
  }

  // Check for image fill
  const blipFill = bg.blipFill;
  if (blipFill) {
    return {
      type: "image",
      image: "background", // Will be resolved later if needed
    };
  }

  return { type: "solid", color: "#FFFFFF" };
}

/**
 * Extract layout information from slide XML
 */
export function extractLayout(
  slideData: any,
  relsMap: RelationshipMap
): SlideLayout {
  // Try to find layout reference in relationships
  const layoutRel = Array.from(relsMap.values()).find((rel) =>
    rel.type.includes("slideLayout")
  );

  if (layoutRel) {
    const layoutPath = layoutRel.target;
    const layoutName = layoutPath.split("/").pop() || "unknown";
    return {
      type: "unknown", // Would need to parse layout XML to get actual type
      reference: layoutName,
    };
  }

  return {
    type: "unknown",
    reference: "unknown",
  };
}

/**
 * Extract transform from shape properties
 */
export function extractTransform(spPr: any): Transform {
  const xfrm = spPr?.xfrm || {};
  return {
    flipH: getBooleanAttribute(xfrm, "@_flipH", false),
    flipV: getBooleanAttribute(xfrm, "@_flipV", false),
    rotation: getNumericAttribute(xfrm, "@_rot", 0),
  };
}

/**
 * Extract position and size from transform
 */
export function extractPositionAndSize(spPr: any): {
  position: Position;
  size: Size;
} {
  const xfrm = spPr?.xfrm || {};
  const off = xfrm.off || {};
  const ext = xfrm.ext || {};

  return {
    position: {
      x: getNumericAttribute(off, "@_x", 0),
      y: getNumericAttribute(off, "@_y", 0),
    },
    size: {
      width: getNumericAttribute(ext, "@_cx", 0),
      height: getNumericAttribute(ext, "@_cy", 0),
    },
  };
}

/**
 * Extract text formatting from text run properties
 */
export function extractTextFormatting(rPr: any, pPr: any): TextFormatting {
  const fontSize = rPr?.["@_sz"]
    ? pptFontSizeToPoints(getNumericAttribute(rPr, "@_sz", 1800))
    : 14;

  const fontFamily =
    rPr?.latin?.["@_typeface"] || rPr?.ea?.["@_typeface"] || "Arial";

  const color = rPr?.solidFill?.srgbClr?.["@_val"]
    ? normalizeHexColor(rPr.solidFill.srgbClr["@_val"])
    : "#000000";

  const alignment = pPr?.["@_algn"] ? getTextAlignment(pPr["@_algn"]) : "left";

  const lineSpacing = pPr?.lnSpc?.spcPts?.["@_val"]
    ? emuToPoints(getNumericAttribute(pPr.lnSpc.spcPts, "@_val", 0))
    : undefined;

  const letterSpacing = rPr?.["@_spc"]
    ? emuToPoints(getNumericAttribute(rPr, "@_spc", 0))
    : undefined;

  return {
    fontSize,
    fontFamily,
    color,
    alignment,
    lineSpacing,
    letterSpacing,
  };
}

/**
 * Extract text content from text body
 */
export function extractTextContent(txBody: any): string {
  if (!txBody) return "";

  const paragraphs = txBody.p || [];
  const paraArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  const textParts: string[] = [];

  for (const para of paraArray) {
    const runs = para.r || [];
    const runArray = Array.isArray(runs) ? runs : runs ? [runs] : [];

    for (const run of runArray) {
      const text = run.t?.["#text"] || run.t || "";
      if (text) {
        textParts.push(String(text));
      }
    }
  }

  return textParts.join(" ").trim();
}

/**
 * Extract image element from picture element (<p:pic>)
 */
export function extractPicElement(
  pic: any,
  relsMap: RelationshipMap
): ImageElement | null {
  const nvPicPr = pic.nvPicPr || {};
  const cNvPr = nvPicPr.cNvPr || {};
  const spPr = pic.spPr || {};

  const id = getNumericAttribute(cNvPr, "@_id", 0);
  const name = getStringAttribute(cNvPr, "@_name", "Unknown");

  const { position, size } = extractPositionAndSize(spPr);
  const transform = extractTransform(spPr);

  // Extract image references - blipFill is directly under pic, not spPr
  const blipFill = pic.blipFill;
  const media: { image?: string; svg?: string } = {};

  if (blipFill?.blip) {
    const embedId = blipFill.blip["@_embed"];
    if (embedId) {
      const rel = relsMap.get(embedId);
      if (rel) {
        const fileName = rel.target.split("/").pop() || "";
        if (fileName.endsWith(".svg")) {
          media.svg = fileName;
        } else {
          media.image = fileName;
        }
      }
    }

    // Check for SVG in extensions
    const extLst = blipFill.blip.extLst?.ext;
    if (extLst) {
      const extArray = Array.isArray(extLst) ? extLst : [extLst];
      for (const ext of extArray) {
        const svgBlip = ext["asvg:svgBlip"] || ext.svgBlip;
        if (svgBlip?.["@_embed"]) {
          const svgRel = relsMap.get(svgBlip["@_embed"]);
          if (svgRel) {
            media.svg = svgRel.target.split("/").pop() || "";
          }
        }
      }
    }
  }

  // Only return if we have at least one media reference
  if (!media.image && !media.svg) {
    return null;
  }

  return {
    id,
    type: "image",
    name,
    position,
    size,
    transform,
    media,
  };
}

/**
 * Extract image element from shape
 */
export function extractImageElement(
  shape: any,
  relsMap: RelationshipMap
): ImageElement | null {
  const nvSpPr = shape.nvSpPr || {};
  const cNvPr = nvSpPr.cNvPr || {};
  const spPr = shape.spPr || {};

  const id = getNumericAttribute(cNvPr, "@_id", 0);
  const name = getStringAttribute(cNvPr, "@_name", "Unknown");

  const { position, size } = extractPositionAndSize(spPr);
  const transform = extractTransform(spPr);

  // Extract image references
  const blipFill = spPr.blipFill;
  const media: { image?: string; svg?: string } = {};

  if (blipFill?.blip) {
    const embedId = blipFill.blip["@_embed"];
    if (embedId) {
      const rel = relsMap.get(embedId);
      if (rel) {
        const fileName = rel.target.split("/").pop() || "";
        if (fileName.endsWith(".svg")) {
          media.svg = fileName;
        } else {
          media.image = fileName;
        }
      }
    }

    // Check for SVG in extensions
    const extLst = blipFill.blip.extLst?.ext;
    if (extLst) {
      const extArray = Array.isArray(extLst) ? extLst : [extLst];
      for (const ext of extArray) {
        const svgBlip = ext["asvg:svgBlip"] || ext.svgBlip;
        if (svgBlip?.["@_embed"]) {
          const svgRel = relsMap.get(svgBlip["@_embed"]);
          if (svgRel) {
            media.svg = svgRel.target.split("/").pop() || "";
          }
        }
      }
    }
  }

  // Only return if we have at least one media reference
  if (!media.image && !media.svg) {
    return null;
  }

  return {
    id,
    type: "image",
    name,
    position,
    size,
    transform,
    media,
  };
}

/**
 * Extract text element from shape
 */
export function extractTextElement(shape: any): TextElement | null {
  const nvSpPr = shape.nvSpPr || {};
  const cNvPr = nvSpPr.cNvPr || {};

  // Check if shape has text body with content
  const txBody = shape.txBody || {};
  const content = extractTextContent(txBody);

  // If no content, skip
  if (!content || content.trim().length === 0) {
    return null;
  }

  const id = getNumericAttribute(cNvPr, "@_id", 0);
  const name = getStringAttribute(cNvPr, "@_name", "Unknown");

  const spPr = shape.spPr || {};
  const { position, size } = extractPositionAndSize(spPr);

  // Extract formatting from first paragraph and run
  const firstPara = Array.isArray(txBody.p) ? txBody.p[0] : txBody.p;
  const pPr = firstPara?.pPr || {};
  const firstRun = Array.isArray(firstPara?.r) ? firstPara.r[0] : firstPara?.r;
  const rPr = firstRun?.rPr || {};

  const formatting = extractTextFormatting(rPr, pPr);

  return {
    id,
    type: "text",
    name,
    position,
    size,
    content,
    formatting,
  };
}

/**
 * Extract elements from a group shape, applying group transform to nested elements
 */
function extractElementsFromGroup(
  grpSp: any,
  relsMap: RelationshipMap,
  groupTransform?: { offsetX: number; offsetY: number }
): Array<ImageElement | TextElement> {
  const elements: Array<ImageElement | TextElement> = [];

  // Get group transform
  const grpSpPr = grpSp.grpSpPr || {};
  const xfrm = grpSpPr.xfrm || {};
  const off = xfrm.off || {};
  const chOff = xfrm.chOff || {};

  const groupOffsetX = getNumericAttribute(off, "@_x", 0);
  const groupOffsetY = getNumericAttribute(off, "@_y", 0);
  const childOffsetX = getNumericAttribute(chOff, "@_x", 0);
  const childOffsetY = getNumericAttribute(chOff, "@_y", 0);

  // Child shapes are positioned relative to chOff, not directly to group.off
  // Formula: final_position = parent_offset + group.off + (child_shape.off - group.chOff)
  const baseOffsetX =
    (groupTransform?.offsetX || 0) + groupOffsetX - childOffsetX;
  const baseOffsetY =
    (groupTransform?.offsetY || 0) + groupOffsetY - childOffsetY;

  // Process nested shapes
  const shapes = grpSp.sp || [];
  const shapeArray = Array.isArray(shapes) ? shapes : shapes ? [shapes] : [];

  for (const shape of shapeArray) {
    // Try to extract as text first
    const textElement = extractTextElement(shape);
    if (textElement) {
      // Apply group transform to position (child position is relative to chOff)
      textElement.position.x += baseOffsetX;
      textElement.position.y += baseOffsetY;
      elements.push(textElement);
      continue;
    }

    // Try to extract as image
    const imageElement = extractImageElement(shape, relsMap);
    if (imageElement) {
      // Apply group transform to position (child position is relative to chOff)
      imageElement.position.x += baseOffsetX;
      imageElement.position.y += baseOffsetY;
      elements.push(imageElement);
      continue;
    }
  }

  // Process nested groups recursively
  // For nested groups, pass the accumulated transform (group.off, not baseOffset)
  const nestedGroups = grpSp.grpSp || [];
  const groupArray = Array.isArray(nestedGroups)
    ? nestedGroups
    : nestedGroups
      ? [nestedGroups]
      : [];
  for (const nestedGroup of groupArray) {
    const nestedElements = extractElementsFromGroup(nestedGroup, relsMap, {
      offsetX: (groupTransform?.offsetX || 0) + groupOffsetX,
      offsetY: (groupTransform?.offsetY || 0) + groupOffsetY,
    });
    elements.push(...nestedElements);
  }

  return elements;
}

/**
 * Extract all elements from slide
 */
export function extractElements(
  slideData: any,
  relsMap: RelationshipMap
): Array<ImageElement | TextElement> {
  const elements: Array<ImageElement | TextElement> = [];
  const spTree = slideData.sld?.cSld?.spTree;
  if (!spTree) return elements;

  // Process picture elements (<p:pic>)
  const pics = spTree.pic || [];
  const picArray = Array.isArray(pics) ? pics : pics ? [pics] : [];
  for (const pic of picArray) {
    const picElement = extractPicElement(pic, relsMap);
    if (picElement) {
      elements.push(picElement);
    }
  }

  // Process group shapes (<p:grpSp>) - these contain nested shapes
  const groups = spTree.grpSp || [];
  const groupArray = Array.isArray(groups) ? groups : groups ? [groups] : [];
  for (const group of groupArray) {
    const groupElements = extractElementsFromGroup(group, relsMap);
    elements.push(...groupElements);
  }

  // Process shape elements (<p:sp>)
  const shapes = spTree.sp || [];
  const shapeArray = Array.isArray(shapes) ? shapes : shapes ? [shapes] : [];

  for (const shape of shapeArray) {
    // Try to extract as text first
    const textElement = extractTextElement(shape);
    if (textElement) {
      elements.push(textElement);
      continue;
    }

    // Try to extract as image
    const imageElement = extractImageElement(shape, relsMap);
    if (imageElement) {
      elements.push(imageElement);
      continue;
    }

    // Skip if neither text nor image
  }

  return elements;
}
