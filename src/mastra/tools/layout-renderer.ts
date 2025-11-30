import PptxGenJS from "pptxgenjs";
import {
  SlideLayout,
  Placeholder,
  ThemeOverrides,
  TemplateSpec,
} from "@/types/parse";

type SlideContent = {
  title: string;
  content: string[];
  layout: "title" | "content" | "titleContent" | "imageText";
  notes?: string;
};

type ResolvedTheme = {
  primaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
};

// EMU to inches conversion (914400 EMUs = 1 inch)
const EMU_TO_INCH = 914400;

/**
 * Resolves theme colors from overrides, template theme, or defaults
 */
export function resolveTheme(
  templateSpec?: TemplateSpec,
  themeOverrides?: ThemeOverrides
): ResolvedTheme {
  const templateTheme = templateSpec?.theme;

  // Priority: themeOverrides > templateTheme > defaults
  const primaryColor =
    themeOverrides?.primaryColor?.replace("#", "") ||
    templateTheme?.primaryColor?.replace("#", "") ||
    "252525";

  const accentColor =
    themeOverrides?.accentColors?.[0]?.replace("#", "") ||
    templateTheme?.accentColors?.[0]?.replace("#", "") ||
    "4472C4";

  const headingFont =
    themeOverrides?.fontFamilies?.major ||
    templateTheme?.fontFamilies?.major ||
    "Calibri";

  const bodyFont =
    themeOverrides?.fontFamilies?.minor ||
    templateTheme?.fontFamilies?.minor ||
    "Calibri";

  return {
    primaryColor,
    accentColor,
    textColor: "252525", // Dark text for readability
    backgroundColor: "FFFFFF",
    headingFont,
    bodyFont,
  };
}

/**
 * Converts EMU (English Metric Units) to inches for PptxGenJS
 */
function emuToInches(emu: number | undefined): number | undefined {
  if (emu === undefined || emu === 0) return undefined;
  return emu / EMU_TO_INCH;
}

/**
 * Finds a placeholder by type in the layout
 */
function findPlaceholder(
  layout: SlideLayout,
  type: string
): Placeholder | undefined {
  return layout.placeholders.find((p) => p.type === type);
}

/**
 * Renders a slide using the template layout and placeholder positions
 */
export function renderSlideWithLayout(
  pptxSlide: PptxGenJS.Slide,
  slide: SlideContent,
  layout: SlideLayout | undefined,
  theme: ResolvedTheme
): void {
  // Set slide background
  pptxSlide.background = { fill: theme.backgroundColor };

  if (!layout) {
    // Fallback to default rendering if no layout
    renderDefaultSlide(pptxSlide, slide, theme);
    return;
  }

  // Find placeholders
  const titlePlaceholder =
    findPlaceholder(layout, "title") || findPlaceholder(layout, "subtitle");
  const bodyPlaceholder = findPlaceholder(layout, "body");

  // Render title if needed
  if (slide.title && slide.layout !== "content") {
    const tp = titlePlaceholder;

    pptxSlide.addText(slide.title, {
      x: emuToInches(tp?.x) ?? 0.5,
      y: emuToInches(tp?.y) ?? (slide.layout === "title" ? 2 : 0.3),
      w: emuToInches(tp?.width) ?? 9,
      h: emuToInches(tp?.height) ?? (slide.layout === "title" ? 1.5 : 0.8),
      fontSize: tp?.style?.fontSize ?? (slide.layout === "title" ? 44 : 32),
      bold: tp?.style?.bold ?? true,
      color: theme.primaryColor,
      fontFace: tp?.style?.fontFamily ?? theme.headingFont,
      align: slide.layout === "title" ? "center" : "left",
      valign: slide.layout === "title" ? "middle" : "top",
    });
  }

  // Render body content if needed
  if (slide.content.length > 0 && slide.layout !== "title") {
    const bp = bodyPlaceholder;

    // Calculate starting Y position
    const startY = emuToInches(bp?.y) ?? 1.3;
    const contentWidth =
      emuToInches(bp?.width) ?? (slide.layout === "imageText" ? 4.5 : 8.6);
    const startX = emuToInches(bp?.x) ?? 0.7;

    // Calculate line spacing based on available height and content count
    const availableHeight = emuToInches(bp?.height) ?? 5;
    const lineHeight = Math.min(0.7, availableHeight / slide.content.length);

    slide.content.forEach((item, index) => {
      pptxSlide.addText(item, {
        x: startX,
        y: startY + index * lineHeight,
        w: contentWidth,
        h: lineHeight,
        fontSize: bp?.style?.fontSize ?? 16,
        bullet: true,
        color: theme.textColor,
        fontFace: bp?.style?.fontFamily ?? theme.bodyFont,
        lineSpacing: 28,
        valign: "top",
      });
    });
  }

  // Add speaker notes if provided
  if (slide.notes) {
    pptxSlide.addNotes(slide.notes);
  }
}

/**
 * Default slide rendering when no template layout is available
 */
function renderDefaultSlide(
  pptxSlide: PptxGenJS.Slide,
  slide: SlideContent,
  theme: ResolvedTheme
): void {
  switch (slide.layout) {
    case "title":
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: theme.primaryColor,
        fontFace: theme.headingFont,
        align: "center",
        valign: "middle",
      });
      break;

    case "content":
      slide.content.forEach((item, index) => {
        pptxSlide.addText(item, {
          x: 0.5,
          y: 0.5 + index * 0.8,
          w: 9,
          h: 0.7,
          fontSize: 18,
          bullet: true,
          color: theme.textColor,
          fontFace: theme.bodyFont,
        });
      });
      break;

    case "titleContent":
    default:
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: theme.primaryColor,
        fontFace: theme.headingFont,
        valign: "top",
      });

      slide.content.forEach((item, index) => {
        pptxSlide.addText(item, {
          x: 0.7,
          y: 1.3 + index * 0.7,
          w: 8.6,
          h: 0.6,
          fontSize: 16,
          bullet: true,
          color: theme.textColor,
          fontFace: theme.bodyFont,
          lineSpacing: 28,
          valign: "top",
        });
      });
      break;

    case "imageText":
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: theme.primaryColor,
        fontFace: theme.headingFont,
        valign: "top",
      });

      slide.content.forEach((item, index) => {
        pptxSlide.addText(item, {
          x: 0.7,
          y: 1.3 + index * 0.7,
          w: 4.5,
          h: 0.6,
          fontSize: 16,
          bullet: true,
          color: theme.textColor,
          fontFace: theme.bodyFont,
          valign: "top",
        });
      });
      break;
  }

  if (slide.notes) {
    pptxSlide.addNotes(slide.notes);
  }
}
