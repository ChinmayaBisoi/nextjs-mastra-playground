/**
 * Extractors for slide data from parsed XML
 */

import type {
  ImageElement,
  TextElement,
  SlideBackground,
  SlideLayout,
  LayoutPlaceholder,
  RelationshipMap,
  Position,
  Size,
  Transform,
  TextFormatting,
  Theme,
  ThemeColors,
  ThemeFonts,
  MasterSlide,
  PresentationMetadata,
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
  relsMap: RelationshipMap,
  layoutData?: any
): SlideLayout {
  // Try to find layout reference in relationships
  const layoutRel = Array.from(relsMap.values()).find((rel) =>
    rel.type.includes("slideLayout")
  );

  if (layoutRel) {
    const layoutPath = layoutRel.target;
    const layoutName = layoutPath.split("/").pop() || "unknown";

    // Extract layout type from layout XML if available
    let layoutType = "unknown";
    const placeholders: LayoutPlaceholder[] = [];

    if (layoutData?.sldLayout) {
      layoutType = layoutData.sldLayout["@_type"] || "unknown";

      // Extract placeholders from layout
      const cSld = layoutData.sldLayout.cSld;
      if (cSld?.spTree) {
        const extractPlaceholders = (spTree: any) => {
          // Check shapes
          const shapes = spTree.sp || [];
          const shapeArray = Array.isArray(shapes)
            ? shapes
            : shapes
              ? [shapes]
              : [];
          for (const shape of shapeArray) {
            const nvPr = shape.nvSpPr?.nvPr;
            if (nvPr?.ph) {
              placeholders.push({
                type: nvPr.ph["@_type"] || "",
                index: nvPr.ph["@_idx"]
                  ? parseInt(nvPr.ph["@_idx"], 10)
                  : undefined,
                size: nvPr.ph["@_sz"] || undefined,
              });
            }
          }

          // Check groups
          const groups = spTree.grpSp || [];
          const groupArray = Array.isArray(groups)
            ? groups
            : groups
              ? [groups]
              : [];
          for (const group of groupArray) {
            if (group.spTree) {
              extractPlaceholders(group.spTree);
            }
          }
        };

        extractPlaceholders(cSld.spTree);
      }
    }

    return {
      type: layoutType,
      reference: layoutName,
      placeholders: placeholders.length > 0 ? placeholders : undefined,
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
  const ext = xfrm.ext || {};

  const groupOffsetX = getNumericAttribute(off, "@_x", 0);
  const groupOffsetY = getNumericAttribute(off, "@_y", 0);
  const childOffsetX = getNumericAttribute(chOff, "@_x", 0);
  const childOffsetY = getNumericAttribute(chOff, "@_y", 0);

  // Get group visual extent (used for bounds validation)
  const groupExtentX = getNumericAttribute(ext, "@_cx", 0);
  const groupExtentY = getNumericAttribute(ext, "@_cy", 0);

  // Child shapes are positioned relative to chOff, not directly to group.off
  // Formula: final_position = parent_offset + group.off + (child_shape.off - group.chOff)
  const baseOffsetX =
    (groupTransform?.offsetX || 0) + groupOffsetX - childOffsetX;
  const baseOffsetY =
    (groupTransform?.offsetY || 0) + groupOffsetY - childOffsetY;

  // Calculate group visual bounds for validation
  const groupVisualLeft = groupOffsetX;
  const groupVisualRight = groupOffsetX + groupExtentX;
  const groupVisualTop = groupOffsetY;
  const groupVisualBottom = groupOffsetY + groupExtentY;

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

      // Validate element is within group's visual bounds to prevent overlaps
      // Only apply bounds checking when group has valid visual extent
      // This prevents elements from extending beyond their group's visual boundaries
      if (groupExtentX > 0 && groupExtentY > 0) {
        const elementRight = textElement.position.x + textElement.size.width;
        const elementBottom = textElement.position.y + textElement.size.height;

        // Clip element to group's visual right edge if it extends beyond
        if (
          elementRight > groupVisualRight &&
          textElement.position.x >= groupVisualLeft
        ) {
          textElement.size.width = Math.max(
            0,
            groupVisualRight - textElement.position.x
          );
        }

        // Clip element to group's visual bottom edge if it extends beyond
        if (
          elementBottom > groupVisualBottom &&
          textElement.position.y >= groupVisualTop
        ) {
          textElement.size.height = Math.max(
            0,
            groupVisualBottom - textElement.position.y
          );
        }

        // If element starts before group's visual left edge, adjust it
        if (textElement.position.x < groupVisualLeft) {
          const adjustment = groupVisualLeft - textElement.position.x;
          textElement.position.x = groupVisualLeft;
          textElement.size.width = Math.max(
            0,
            textElement.size.width - adjustment
          );
        }

        // If element starts before group's visual top edge, adjust it
        if (textElement.position.y < groupVisualTop) {
          const adjustment = groupVisualTop - textElement.position.y;
          textElement.position.y = groupVisualTop;
          textElement.size.height = Math.max(
            0,
            textElement.size.height - adjustment
          );
        }
      }

      elements.push(textElement);
      continue;
    }

    // Try to extract as image
    const imageElement = extractImageElement(shape, relsMap);
    if (imageElement) {
      // Apply group transform to position (child position is relative to chOff)
      imageElement.position.x += baseOffsetX;
      imageElement.position.y += baseOffsetY;

      // Validate element is within group's visual bounds to prevent overlaps
      // Only apply bounds checking when group has valid visual extent
      // This prevents elements from extending beyond their group's visual boundaries
      if (groupExtentX > 0 && groupExtentY > 0) {
        const elementRight = imageElement.position.x + imageElement.size.width;
        const elementBottom =
          imageElement.position.y + imageElement.size.height;

        // Clip element to group's visual right edge if it extends beyond
        if (
          elementRight > groupVisualRight &&
          imageElement.position.x >= groupVisualLeft
        ) {
          imageElement.size.width = Math.max(
            0,
            groupVisualRight - imageElement.position.x
          );
        }

        // Clip element to group's visual bottom edge if it extends beyond
        if (
          elementBottom > groupVisualBottom &&
          imageElement.position.y >= groupVisualTop
        ) {
          imageElement.size.height = Math.max(
            0,
            groupVisualBottom - imageElement.position.y
          );
        }

        // If element starts before group's visual left edge, adjust it
        if (imageElement.position.x < groupVisualLeft) {
          const adjustment = groupVisualLeft - imageElement.position.x;
          imageElement.position.x = groupVisualLeft;
          imageElement.size.width = Math.max(
            0,
            imageElement.size.width - adjustment
          );
        }

        // If element starts before group's visual top edge, adjust it
        if (imageElement.position.y < groupVisualTop) {
          const adjustment = groupVisualTop - imageElement.position.y;
          imageElement.position.y = groupVisualTop;
          imageElement.size.height = Math.max(
            0,
            imageElement.size.height - adjustment
          );
        }
      }

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

/**
 * Extract theme colors from theme XML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractThemeColors(themeData: any): ThemeColors {
  const colors: ThemeColors = {};

  if (!themeData?.theme?.themeElements?.clrScheme) {
    return colors;
  }

  const clrScheme = themeData.theme.themeElements.clrScheme;

  // Helper to extract color value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractColor = (colorObj: any): string | undefined => {
    if (!colorObj) return undefined;

    // Try srgbClr first
    if (colorObj.srgbClr?.["@_val"]) {
      return normalizeHexColor(colorObj.srgbClr["@_val"]);
    }

    // Try sysClr
    if (colorObj.sysClr?.["@_lastClr"]) {
      return normalizeHexColor(colorObj.sysClr["@_lastClr"]);
    }

    // Try schemeClr (theme color reference)
    if (colorObj.schemeClr?.["@_val"]) {
      // This is a theme color reference, we'll map it later
      return colorObj.schemeClr["@_val"];
    }

    return undefined;
  };

  if (clrScheme.dk1) colors.dk1 = extractColor(clrScheme.dk1);
  if (clrScheme.lt1) colors.lt1 = extractColor(clrScheme.lt1);
  if (clrScheme.dk2) colors.dk2 = extractColor(clrScheme.dk2);
  if (clrScheme.lt2) colors.lt2 = extractColor(clrScheme.lt2);
  if (clrScheme.accent1) colors.accent1 = extractColor(clrScheme.accent1);
  if (clrScheme.accent2) colors.accent2 = extractColor(clrScheme.accent2);
  if (clrScheme.accent3) colors.accent3 = extractColor(clrScheme.accent3);
  if (clrScheme.accent4) colors.accent4 = extractColor(clrScheme.accent4);
  if (clrScheme.accent5) colors.accent5 = extractColor(clrScheme.accent5);
  if (clrScheme.accent6) colors.accent6 = extractColor(clrScheme.accent6);
  if (clrScheme.hlink) colors.hlink = extractColor(clrScheme.hlink);
  if (clrScheme.folHlink) colors.folHlink = extractColor(clrScheme.folHlink);

  return colors;
}

/**
 * Extract theme fonts from theme XML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractThemeFonts(themeData: any): ThemeFonts {
  const fonts: ThemeFonts = {};

  if (!themeData?.theme?.themeElements?.fontScheme) {
    return fonts;
  }

  const fontScheme = themeData.theme.themeElements.fontScheme;

  if (fontScheme.majorFont) {
    fonts.majorFont = {
      latin: fontScheme.majorFont.latin?.["@_typeface"],
      ea: fontScheme.majorFont.ea?.["@_typeface"],
      cs: fontScheme.majorFont.cs?.["@_typeface"],
    };
  }

  if (fontScheme.minorFont) {
    fonts.minorFont = {
      latin: fontScheme.minorFont.latin?.["@_typeface"],
      ea: fontScheme.minorFont.ea?.["@_typeface"],
      cs: fontScheme.minorFont.cs?.["@_typeface"],
    };
  }

  return fonts;
}

/**
 * Extract theme from theme XML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTheme(themeData: any): Theme | undefined {
  if (!themeData) return undefined;

  const colors = extractThemeColors(themeData);
  const fonts = extractThemeFonts(themeData);

  // Only return if we have some data
  if (Object.keys(colors).length === 0 && Object.keys(fonts).length === 0) {
    return undefined;
  }

  return {
    colors,
    fonts,
  };
}

/**
 * Extract master slide data from master slide XML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMasterSlide(masterData: any): MasterSlide | undefined {
  if (!masterData?.sldMaster) return undefined;

  const master: MasterSlide = {};

  // Extract color map
  if (masterData.sldMaster.clrMap) {
    const clrMap = masterData.sldMaster.clrMap;
    master.colorMap = {};

    // Map all color attributes
    const colorAttrs = [
      "@_bg1",
      "@_tx1",
      "@_bg2",
      "@_tx2",
      "@_accent1",
      "@_accent2",
      "@_accent3",
      "@_accent4",
      "@_accent5",
      "@_accent6",
      "@_hlink",
      "@_folHlink",
    ];

    for (const attr of colorAttrs) {
      if (clrMap[attr]) {
        master.colorMap![attr.replace("@_", "")] = clrMap[attr];
      }
    }
  }

  // Extract text styles
  if (masterData.sldMaster.txStyles) {
    master.textStyles = {
      title: masterData.sldMaster.txStyles.titleStyle,
      body: masterData.sldMaster.txStyles.bodyStyle,
      other: masterData.sldMaster.txStyles.otherStyle,
    };
  }

  return Object.keys(master).length > 0 ? master : undefined;
}

/**
 * Extract presentation metadata from presentation XML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPresentationMetadata(
  presentationData: any
): PresentationMetadata | undefined {
  if (!presentationData?.presentation) return undefined;

  const metadata: PresentationMetadata = {};

  // Extract slide size
  if (presentationData.presentation.sldSz) {
    const sldSz = presentationData.presentation.sldSz;
    metadata.slideSize = {
      width: getNumericAttribute(sldSz, "@_cx", 0),
      height: getNumericAttribute(sldSz, "@_cy", 0),
    };
  }

  // Extract embedded fonts
  if (presentationData.presentation.embeddedFontLst?.embeddedFont) {
    const embeddedFonts =
      presentationData.presentation.embeddedFontLst.embeddedFont;
    const fontArray = Array.isArray(embeddedFonts)
      ? embeddedFonts
      : [embeddedFonts];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata.embeddedFonts = fontArray
      .map((font: any) => ({
        typeface: font.font?.["@_typeface"] || "",
        charset: font.font?.["@_charset"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }))
      .filter((f: any) => f.typeface);
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
