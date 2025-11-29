/**
 * Demo script showing how to use the PPT template system
 */

import path from "path";
import { PPTRegenerator } from "./ppt-regenerator";
import {
  BEIGE_BLACK_PROJECT_DECK,
  EXAMPLE_PROJECT_BRIEF_DATA,
  PresentationTemplateData,
} from "./ppt-template-config";

/**
 * Example 1: Regenerate presentation with custom data
 */
export async function regenerateProjectBrief() {
  const templatePath = path.join(
    process.cwd(),
    "src/data/Beige and Black Minimalist Project Deck Presentation-xml"
  );

  const outputPath = path.join(
    process.cwd(),
    "output",
    `Project_Brief_${Date.now()}.pptx`
  );

  const regenerator = new PPTRegenerator();

  await regenerator.regenerateFromTemplate(
    templatePath,
    BEIGE_BLACK_PROJECT_DECK,
    EXAMPLE_PROJECT_BRIEF_DATA,
    outputPath
  );

  console.log(`✅ Presentation generated: ${outputPath}`);
  return outputPath;
}

/**
 * Example 2: Generate from AI/LLM content
 */
export async function regenerateWithAIContent(
  aiGeneratedContent: Record<string, string>
) {
  const templatePath = path.join(
    process.cwd(),
    "src/data/Beige and Black Minimalist Project Deck Presentation-xml"
  );

  const outputPath = path.join(
    process.cwd(),
    "output",
    `AI_Generated_${Date.now()}.pptx`
  );

  const regenerator = new PPTRegenerator();

  await regenerator.regenerateWithLLMContent(
    templatePath,
    BEIGE_BLACK_PROJECT_DECK,
    aiGeneratedContent,
    outputPath
  );

  console.log(`✅ AI-generated presentation: ${outputPath}`);
  return outputPath;
}

/**
 * Example 3: Custom data structure
 */
export async function regenerateCustom() {
  const customData: PresentationTemplateData = {
    templateName: "custom-project",
    slides: {
      1: {
        mainTitle: "MOBILE APP\nLAUNCH STRATEGY",
        subtitle: "Building the next generation of mobile experiences",
        projectName: "SuperApp v2.0",
        presentedBy: "Mobile Product Team",
        presentedTo: "Stakeholders & Investors",
        companyName: "StartupCo | December 2025",
      },
      2: {
        agendaTitle: "What We'll Cover Today",
        pageNumber: "02/15",
        agendaItems: {
          headers: ["#", "Topic"],
          rows: [
            ["01", "Market Analysis"],
            ["02", "User Research Findings"],
            ["03", "Product Strategy"],
            ["04", "Technical Architecture"],
            ["05", "Go-to-Market Plan"],
            ["06", "Financial Projections"],
            ["07", "Next Steps"],
          ],
        },
      },
      3: {
        sectionTitle: "Market Opportunity",
        sectionNumber: "01",
        content1:
          "The mobile app market is projected to reach $935B by 2026, with a CAGR of 18.4%. Our target segment shows even higher growth potential.",
        sectionNumber2: "02",
        content2:
          "User research with 2,500+ participants revealed significant pain points in existing solutions, validating our unique value proposition.",
        sectionNumber3: "03",
        content3:
          "Our differentiated approach combines AI-driven personalization with seamless cross-platform experience, addressing key market gaps.",
        pageNumber: "03/15",
        website: "www.startupco.io",
      },
    },
  };

  const templatePath = path.join(
    process.cwd(),
    "src/data/Beige and Black Minimalist Project Deck Presentation-xml"
  );

  const outputPath = path.join(
    process.cwd(),
    "output",
    `Custom_Deck_${Date.now()}.pptx`
  );

  const regenerator = new PPTRegenerator();

  await regenerator.regenerateFromTemplate(
    templatePath,
    BEIGE_BLACK_PROJECT_DECK,
    customData,
    outputPath
  );

  console.log(`✅ Custom presentation generated: ${outputPath}`);
  return outputPath;
}

/**
 * Helper: Convert Mastra agent output to presentation data
 */
export function convertAgentOutputToSlideData(agentOutput: {
  title?: string;
  subtitle?: string;
  slides: Array<{
    title: string;
    content: string | string[];
    sectionNumber?: string;
  }>;
}): PresentationTemplateData {
  const data: PresentationTemplateData = {
    templateName: "agent-generated",
    slides: {},
  };

  // Slide 1: Title
  if (agentOutput.title) {
    data.slides[1] = {
      mainTitle: agentOutput.title.toUpperCase(),
      subtitle: agentOutput.subtitle || "",
      projectName: agentOutput.title,
      presentedBy: "AI Assistant",
      presentedTo: "Team",
      companyName: `Generated on ${new Date().toLocaleDateString()}`,
    };
  }

  // Slide 2: Agenda
  if (agentOutput.slides.length > 0) {
    data.slides[2] = {
      agendaTitle: "Agenda",
      pageNumber: `02/${agentOutput.slides.length + 2}`,
      agendaItems: {
        headers: ["#", "Section"],
        rows: agentOutput.slides.map((slide, i) => [
          String(i + 3).padStart(2, "0"),
          slide.title,
        ]),
      },
    };
  }

  // Content slides
  agentOutput.slides.forEach((slide, index) => {
    const slideNumber = index + 3;
    const content = Array.isArray(slide.content)
      ? slide.content
      : [slide.content];

    data.slides[slideNumber] = {
      sectionTitle: slide.title,
      sectionNumber: String(index + 1).padStart(2, "0"),
      content1: content[0] || "",
      content2: content[1] || "",
      content3: content[2] || "",
      pageNumber: `${slideNumber}/${agentOutput.slides.length + 2}`,
    };
  });

  return data;
}

// Run demo if executed directly
if (require.main === module) {
  (async () => {
    try {
      console.log("🚀 Starting PPT Template Demo...\n");

      // Example 1
      console.log("📊 Generating example project brief...");
      await regenerateProjectBrief();

      // Example 2
      console.log("\n🤖 Generating with AI content...");
      const aiContent = {
        mainTitle: "AI-POWERED\nANALYTICS",
        subtitle: "Transform your data into actionable insights",
        projectName: "DataViz Pro",
        presentedBy: "Analytics Team",
        presentedTo: "C-Suite",
      };
      await regenerateWithAIContent(aiContent);

      // Example 3
      console.log("\n✨ Generating custom deck...");
      await regenerateCustom();

      console.log("\n✅ All presentations generated successfully!");
    } catch (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  })();
}
