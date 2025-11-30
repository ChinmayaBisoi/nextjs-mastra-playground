import { SlideLayout, TemplateSpec } from "@/types/parse";

type SlideContent = {
  title: string;
  content: string[];
  layout: "title" | "content" | "titleContent" | "imageText";
  notes?: string;
};

type LayoutScore = {
  layoutId: string;
  score: number;
};

/**
 * Analyzes a slide to determine its content type for layout matching
 */
function analyzeSlideContent(slide: SlideContent): {
  needsTitle: boolean;
  needsBody: boolean;
  needsImage: boolean;
  contentDensity: "low" | "medium" | "high";
} {
  const contentLength = slide.content.length;

  return {
    needsTitle:
      slide.layout === "title" ||
      slide.layout === "titleContent" ||
      slide.layout === "imageText",
    needsBody: slide.layout !== "title" && contentLength > 0,
    needsImage: slide.layout === "imageText",
    contentDensity:
      contentLength <= 2 ? "low" : contentLength <= 5 ? "medium" : "high",
  };
}

/**
 * Scores a layout for a specific slide based on placeholder compatibility
 */
function scoreLayoutForSlide(
  layout: SlideLayout,
  slideAnalysis: ReturnType<typeof analyzeSlideContent>,
  usageCount: number,
  maxRepetitions: number
): number {
  let score = 0;

  const hasTitle = layout.placeholders.some(
    (p) => p.type === "title" || p.type === "subtitle"
  );
  const hasBody = layout.placeholders.some((p) => p.type === "body");
  const hasImage = layout.placeholders.some((p) => p.type === "image");

  // Score based on placeholder availability matching slide needs
  if (slideAnalysis.needsTitle && hasTitle) {
    score += 30;
  }

  if (slideAnalysis.needsBody && hasBody) {
    score += 40;
  }

  if (slideAnalysis.needsImage && hasImage) {
    score += 20;
  }

  // Bonus for layouts that match content density
  const bodyPlaceholders = layout.placeholders.filter((p) => p.type === "body");
  if (bodyPlaceholders.length > 0) {
    const avgHeight =
      bodyPlaceholders.reduce((sum, p) => sum + (p.height || 0), 0) /
      bodyPlaceholders.length;
    // Larger body areas are better for high-density content
    if (slideAnalysis.contentDensity === "high" && avgHeight > 3000000) {
      score += 10;
    }
  }

  // Penalize layouts that have been used too many times
  if (usageCount >= maxRepetitions) {
    score -= 50;
  } else if (usageCount === maxRepetitions - 1) {
    // Slight penalty for layouts approaching the limit
    score -= 15;
  }

  return score;
}

/**
 * Assigns layouts to slides using a greedy algorithm that respects repetition limits
 *
 * @param slides - Array of slide content to assign layouts to
 * @param templateSpec - Template specification containing available layouts
 * @param maxRepetitions - Maximum times a single layout can be used (default: 2)
 * @returns Record mapping slide index to assigned layoutId
 */
export function assignLayoutsToSlides(
  slides: SlideContent[],
  templateSpec: TemplateSpec,
  maxRepetitions: number = 2
): Record<number, string> {
  const assignments: Record<number, string> = {};
  const usageCounts: Record<string, number> = {};

  // Initialize usage counts
  for (const layout of templateSpec.layouts) {
    usageCounts[layout.layoutId] = 0;
  }

  // Special handling for title slide (first slide)
  // Find a layout that's primarily for titles (has title, minimal body)
  const titleLayouts = templateSpec.layouts.filter((layout) => {
    const hasTitle = layout.placeholders.some((p) => p.type === "title");
    const bodyCount = layout.placeholders.filter(
      (p) => p.type === "body"
    ).length;
    return hasTitle && bodyCount <= 1;
  });

  // Greedy assignment for each slide
  for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
    const slide = slides[slideIndex];
    const analysis = analyzeSlideContent(slide);

    // Score all layouts for this slide
    const scores: LayoutScore[] = templateSpec.layouts.map((layout) => ({
      layoutId: layout.layoutId,
      score: scoreLayoutForSlide(
        layout,
        analysis,
        usageCounts[layout.layoutId],
        maxRepetitions
      ),
    }));

    // For title slides (first slide or explicitly "title" layout), prefer title-focused layouts
    if (slideIndex === 0 || slide.layout === "title") {
      for (const score of scores) {
        if (titleLayouts.some((tl) => tl.layoutId === score.layoutId)) {
          score.score += 25; // Boost title layouts for title slides
        }
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Find the best available layout (not exceeding max repetitions unless all are exhausted)
    let selectedLayout = scores[0];

    // If best layout is at or over limit, try to find one that isn't
    if (usageCounts[selectedLayout.layoutId] >= maxRepetitions) {
      const underLimitLayout = scores.find(
        (s) => usageCounts[s.layoutId] < maxRepetitions
      );
      if (underLimitLayout) {
        selectedLayout = underLimitLayout;
      }
      // If all layouts are at limit, use the best scoring one anyway
    }

    assignments[slideIndex] = selectedLayout.layoutId;
    usageCounts[selectedLayout.layoutId]++;
  }

  return assignments;
}

/**
 * Gets layout usage statistics for debugging/display
 */
export function getLayoutUsageStats(
  assignments: Record<number, string>
): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const layoutId of Object.values(assignments)) {
    stats[layoutId] = (stats[layoutId] || 0) + 1;
  }

  return stats;
}
