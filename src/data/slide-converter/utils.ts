/**
 * Utility functions for slide conversion
 */

/**
 * Convert EMUs (English Metric Units) to points
 * 1 inch = 914400 EMUs = 72 points
 * 1 point = 12700 EMUs
 */
export function emuToPoints(emu: number): number {
  return emu / 12700;
}

/**
 * Convert PowerPoint font size (hundredths of a point) to points
 * PowerPoint stores font sizes as hundredths of a point
 * e.g., 3654 = 36.54 points
 */
export function pptFontSizeToPoints(pptSize: number): number {
  return pptSize / 100;
}

/**
 * Convert EMUs to pixels (assuming 96 DPI)
 * 1 inch = 914400 EMUs = 96 pixels
 * 1 pixel = 9525 EMUs
 */
export function emuToPixels(emu: number): number {
  return emu / 9525;
}

/**
 * Convert hex color string to hex format with #
 */
export function normalizeHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color.toUpperCase();
  }
  return `#${color.toUpperCase()}`;
}

/**
 * Extract numeric value from attribute
 */
export function getNumericAttribute(
  obj: any,
  key: string,
  defaultValue: number = 0
): number {
  const value = obj?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Extract string value from attribute
 */
export function getStringAttribute(
  obj: any,
  key: string,
  defaultValue: string = ""
): string {
  const value = obj?.[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return defaultValue;
}

/**
 * Extract boolean value from attribute
 */
export function getBooleanAttribute(
  obj: any,
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = obj?.[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return defaultValue;
}

/**
 * Get text alignment from alignment string
 */
export function getTextAlignment(align: string): "left" | "center" | "right" | "justify" {
  const normalized = (align || "left").toLowerCase();
  switch (normalized) {
    case "ctr":
    case "center":
      return "center";
    case "r":
    case "right":
      return "right";
    case "just":
    case "justify":
      return "justify";
    default:
      return "left";
  }
}

