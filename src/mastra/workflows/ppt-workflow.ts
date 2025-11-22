import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import PptxGenJS from "pptxgenjs";

const workflowInputSchema = z.object({
  topic: z.string().describe("Main topic/title of the presentation"),
  audience: z.string().optional().describe("Target audience"),
  brandId: z.string().optional().describe("Brand configuration ID"),
  numSlides: z.number().optional().default(10).describe("Number of slides"),
  proposalType: z
    .enum(["rfp", "pitch", "internal", "proposal"])
    .optional()
    .describe("Type of proposal/presentation"),
});

const analyzedRequirementsSchema = z.object({
  analyzedTopic: z.string(),
  audience: z.string(),
  suggestedSlides: z.number(),
  structure: z.object({
    introduction: z.boolean().optional(),
    problem: z.boolean().optional(),
    solution: z.boolean().optional(),
    benefits: z.boolean().optional(),
    implementation: z.boolean().optional(),
    conclusion: z.boolean().optional(),
  }),
  originalTopic: z.string().optional(), // Store original topic for later use
  brandConfig: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
      logoUrl: z.string().optional(),
    })
    .optional(),
});

const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  layout: z.enum(["title", "content", "titleContent", "imageText"]),
  notes: z.string().optional(),
});

const contentStructureSchema = z.object({
  slides: z.array(slideSchema),
  originalTopic: z.string().optional(),
  brandConfig: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
      logoUrl: z.string().optional(),
    })
    .optional(),
});

const layoutElementSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    fontSize: z.number().optional(),
    bold: z.boolean().optional(),
    align: z.string().optional(),
    bullet: z.boolean().optional(),
    spacing: z.number().optional(),
  })
  .passthrough();

type LayoutElement = z.infer<typeof layoutElementSchema>;

const layoutThemeSchema = z.object({
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    headingFont: z.string(),
    bodyFont: z.string(),
    headingFontSize: z.number(),
    bodyFontSize: z.number(),
    titleFontSize: z.number(),
    lineSpacing: z.number().optional(),
    slideMargin: z.number().optional(),
  }),
  layouts: z.object({
    title: z.record(z.string(), layoutElementSchema),
    content: z.record(z.string(), layoutElementSchema),
    titleContent: z.record(z.string(), layoutElementSchema),
    imageText: z.record(z.string(), layoutElementSchema),
  }),
});

const contentWithThemeSchema = contentStructureSchema.extend({
  layoutTheme: layoutThemeSchema.optional(),
});

const workflowOutputSchema = z.object({
  pptBuffer: z.string().describe("Base64 encoded PPTX file"),
  filename: z.string(),
  slideCount: z.number(),
  metadata: z
    .object({
      topic: z.string(),
      generatedAt: z.string(),
    })
    .optional(),
});

const analyzeRequirements = createStep({
  id: "analyze-requirements",
  description:
    "Analyzes user requirements and structures the presentation approach",
  inputSchema: workflowInputSchema,
  outputSchema: analyzedRequirementsSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent("pptAgent");
    if (!agent) {
      throw new Error("PPT agent not found");
    }

    const prompt = `Analyze the following presentation requirements and provide a structured approach:

Topic: ${inputData.topic}
Audience: ${inputData.audience || "General audience"}
Proposal Type: ${inputData.proposalType || "General presentation"}
Requested Slide Count: ${inputData.numSlides || 10}

Please analyze these requirements and provide:
- analyzedTopic: A refined/expanded version of the topic
- audience: The target audience description
- suggestedSlides: Optimal number of slides (considering the topic complexity)
- structure: An object indicating which sections should be included (introduction, problem, solution, benefits, implementation, conclusion)`;

    const response = await agent.generate(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        structuredOutput: {
          schema: analyzedRequirementsSchema.omit({
            originalTopic: true,
            brandConfig: true,
          }),
        },
        // maxRetries: 1, // Add retry limit
        // timeout: 30000, // 30 second timeout
      }
    );

    if (!response.object) {
      // Fallback: try to parse the text response manually
      const text = response.text || "";
      try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            analyzedTopic: parsed.analyzedTopic || inputData.topic,
            audience:
              parsed.audience || inputData.audience || "General audience",
            suggestedSlides:
              parsed.suggestedSlides || inputData.numSlides || 10,
            structure: parsed.structure || {
              introduction: true,
              problem: true,
              solution: true,
              benefits: true,
              implementation: true,
              conclusion: true,
            },
            originalTopic: inputData.topic,
            brandConfig: undefined,
          };
        }
      } catch {
        // If parsing fails, use defaults
        return {
          analyzedTopic: inputData.topic,
          audience: inputData.audience || "General audience",
          suggestedSlides: inputData.numSlides || 10,
          structure: {
            introduction: true,
            problem: true,
            solution: true,
            benefits: true,
            implementation: true,
            conclusion: true,
          },
          originalTopic: inputData.topic,
          brandConfig: undefined,
        };
      }
      throw new Error("Failed to generate structured response from agent");
    }

    // Add original topic and brand config for later steps
    return {
      ...response.object,
      originalTopic: inputData.topic,
      brandConfig: undefined, // Will be added in future when brand system is implemented
    };
  },
});

const generateContentStructure = createStep({
  id: "generate-content-structure",
  description:
    "Generates structured slide content based on analyzed requirements",
  inputSchema: analyzedRequirementsSchema,
  outputSchema: contentStructureSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent("pptAgent");
    if (!agent) {
      throw new Error("PPT agent not found");
    }

    const prompt = `Create a ${inputData.suggestedSlides}-slide presentation about: "${inputData.analyzedTopic}"

Target Audience: ${inputData.audience}

Presentation Structure:
${JSON.stringify(inputData.structure, null, 2)}

Requirements:
- Generate exactly ${inputData.suggestedSlides} slides
- First slide should use "title" layout
- All other slides should use "titleContent" layout
- Each slide should have a compelling title (5-8 words)
- Each slide should have 3-7 bullet points
- Content should be professional, clear, and engaging
- Ensure logical flow and narrative progression`;

    const response = await agent.generate(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        structuredOutput: {
          schema: contentStructureSchema.omit({
            originalTopic: true,
            brandConfig: true,
          }),
        },
      }
    );

    if (!response.object) {
      throw new Error("Failed to generate structured response from agent");
    }

    // Pass through original topic and brand config
    return {
      ...response.object,
      originalTopic: inputData.originalTopic,
      brandConfig: inputData.brandConfig,
    };
  },
});

const generateLayoutTheme = createStep({
  id: "generate-layout-theme",
  description:
    "Generates layout specifications and visual theme for the presentation",
  inputSchema: contentStructureSchema,
  outputSchema: contentWithThemeSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    if (!mastra) {
      throw new Error("Mastra instance not found");
    }

    const agent = mastra.getAgent("layoutThemeAgent");
    if (!agent) {
      throw new Error("Layout theme agent not found");
    }

    const prompt = `Design a professional layout and theme for a presentation about: "${inputData.originalTopic || "Presentation"}"

The presentation has ${inputData.slides?.length || 0} slides with the following structure:
${JSON.stringify(
  inputData.slides?.map((s) => ({ title: s.title, layout: s.layout })),
  null,
  2
)}

Requirements:
- Create a cohesive visual theme with appropriate colors, fonts, and spacing
- Design optimal layouts for each slide type (title, content, titleContent, imageText)
- Ensure professional, consulting-grade appearance
- Consider the topic and content when selecting the theme style
- Provide exact positioning and styling specifications

Return the theme and layout specifications in the required JSON format.`;

    const response = await agent.generate(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        structuredOutput: {
          schema: layoutThemeSchema,
        },
      }
    );

    if (!response.object) {
      // Fallback to default theme
      const defaultTheme: z.infer<typeof layoutThemeSchema> = {
        theme: {
          primaryColor: "#363636",
          secondaryColor: "#4472C4",
          headingFont: "Calibri",
          bodyFont: "Calibri",
          headingFontSize: 32,
          bodyFontSize: 16,
          titleFontSize: 44,
          lineSpacing: 28,
          slideMargin: 0.5,
        },
        layouts: {
          title: {
            title: {
              x: 0.5,
              y: 2,
              w: 9,
              h: 1.5,
              fontSize: 44,
              bold: true,
              align: "center",
            },
          },
          content: {
            content: {
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 0.7,
              fontSize: 18,
              bullet: true,
              spacing: 0.8,
            },
          },
          titleContent: {
            title: {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.8,
              fontSize: 32,
              bold: true,
            },
            content: {
              x: 0.7,
              y: 1.3,
              w: 8.6,
              h: 0.6,
              fontSize: 16,
              bullet: true,
              spacing: 0.7,
            },
          },
          imageText: {
            title: {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.8,
              fontSize: 32,
              bold: true,
            },
            content: {
              x: 0.7,
              y: 1.3,
              w: 4.5,
              h: 0.6,
              fontSize: 16,
              bullet: true,
              spacing: 0.7,
            },
          },
        },
      };
      return {
        ...inputData,
        layoutTheme: defaultTheme,
      };
    }

    return {
      ...inputData,
      layoutTheme: response.object,
    };
  },
});

// Helper function to generate PPT (extracted from tool logic)
async function generatePptFile(
  slides: Array<{
    title: string;
    content: string[];
    layout: "title" | "content" | "titleContent" | "imageText";
    notes?: string;
  }>,
  brandConfig?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoUrl?: string;
  },
  title?: string,
  layoutTheme?: z.infer<typeof layoutThemeSchema>
) {
  const pres = new PptxGenJS();

  if (title) {
    pres.title = title;
  }

  if (brandConfig?.primaryColor) {
    pres.defineLayout({ name: "CUSTOM", width: 10, height: 7.5 });
    pres.layout = "CUSTOM";
  }

  // Use layout theme if available, otherwise use brand config or defaults
  const theme = layoutTheme?.theme;
  const layouts = layoutTheme?.layouts;

  const primaryColor =
    theme?.primaryColor?.replace("#", "") ||
    brandConfig?.primaryColor?.replace("#", "") ||
    "363636";
  const headingFont =
    theme?.headingFont || brandConfig?.fontFamily || "Calibri";
  const bodyFont = theme?.bodyFont || brandConfig?.fontFamily || "Calibri";
  const textColor = theme?.textColor?.replace("#", "") || "363636";

  for (const slide of slides) {
    const pptxSlide = pres.addSlide();
    const layoutSpec = layouts?.[slide.layout];

    switch (slide.layout) {
      case "title":
        const titleLayout =
          (layoutSpec?.title as LayoutElement | undefined) ||
          (layouts?.title?.title as LayoutElement | undefined);
        pptxSlide.addText(slide.title, {
          x: titleLayout?.x ?? 0.5,
          y: titleLayout?.y ?? 2,
          w: titleLayout?.w ?? 9,
          h: titleLayout?.h ?? 1.5,
          fontSize: titleLayout?.fontSize ?? theme?.titleFontSize ?? 44,
          bold: titleLayout?.bold ?? true,
          color: primaryColor,
          fontFace: headingFont,
          align:
            (titleLayout?.align as "left" | "center" | "right" | undefined) ??
            "center",
        });
        break;

      case "content":
        const contentLayout =
          (layoutSpec?.content as LayoutElement | undefined) ||
          (layouts?.content?.content as LayoutElement | undefined);
        slide.content.forEach((item, index) => {
          const spacing = contentLayout?.spacing ?? 0.8;
          pptxSlide.addText(item, {
            x: contentLayout?.x ?? 0.5,
            y: (contentLayout?.y ?? 0.5) + index * spacing,
            w: contentLayout?.w ?? 9,
            h: contentLayout?.h ?? 0.7,
            fontSize: contentLayout?.fontSize ?? theme?.bodyFontSize ?? 18,
            bullet: contentLayout?.bullet ?? true,
            color: textColor,
            fontFace: bodyFont,
          });
        });
        break;

      case "titleContent":
      default:
        const tcTitleLayout =
          (layoutSpec?.title as LayoutElement | undefined) ||
          (layouts?.titleContent?.title as LayoutElement | undefined);
        const tcContentLayout =
          (layoutSpec?.content as LayoutElement | undefined) ||
          (layouts?.titleContent?.content as LayoutElement | undefined);

        pptxSlide.addText(slide.title, {
          x: tcTitleLayout?.x ?? 0.5,
          y: tcTitleLayout?.y ?? 0.3,
          w: tcTitleLayout?.w ?? 9,
          h: tcTitleLayout?.h ?? 0.8,
          fontSize: tcTitleLayout?.fontSize ?? theme?.headingFontSize ?? 32,
          bold: tcTitleLayout?.bold ?? true,
          color: primaryColor,
          fontFace: headingFont,
        });

        slide.content.forEach((item, index) => {
          const spacing = tcContentLayout?.spacing ?? 0.7;
          pptxSlide.addText(item, {
            x: tcContentLayout?.x ?? 0.7,
            y: (tcContentLayout?.y ?? 1.3) + index * spacing,
            w: tcContentLayout?.w ?? 8.6,
            h: tcContentLayout?.h ?? 0.6,
            fontSize: tcContentLayout?.fontSize ?? theme?.bodyFontSize ?? 16,
            bullet: tcContentLayout?.bullet ?? true,
            color: textColor,
            fontFace: bodyFont,
            lineSpacing: theme?.lineSpacing ?? 28,
          });
        });
        break;

      case "imageText":
        const itTitleLayout =
          (layoutSpec?.title as LayoutElement | undefined) ||
          (layouts?.imageText?.title as LayoutElement | undefined);
        const itContentLayout =
          (layoutSpec?.content as LayoutElement | undefined) ||
          (layouts?.imageText?.content as LayoutElement | undefined);

        pptxSlide.addText(slide.title, {
          x: itTitleLayout?.x ?? 0.5,
          y: itTitleLayout?.y ?? 0.3,
          w: itTitleLayout?.w ?? 9,
          h: itTitleLayout?.h ?? 0.8,
          fontSize: itTitleLayout?.fontSize ?? theme?.headingFontSize ?? 32,
          bold: itTitleLayout?.bold ?? true,
          color: primaryColor,
          fontFace: headingFont,
        });

        slide.content.forEach((item, index) => {
          const spacing = itContentLayout?.spacing ?? 0.7;
          pptxSlide.addText(item, {
            x: itContentLayout?.x ?? 0.7,
            y: (itContentLayout?.y ?? 1.3) + index * spacing,
            w: itContentLayout?.w ?? 4.5,
            h: itContentLayout?.h ?? 0.6,
            fontSize: itContentLayout?.fontSize ?? theme?.bodyFontSize ?? 16,
            bullet: itContentLayout?.bullet ?? true,
            color: textColor,
            fontFace: bodyFont,
          });
        });
        break;
    }

    if (slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  const base64Buffer = (await pres.write({ outputType: "base64" })) as string;

  return {
    buffer: base64Buffer,
    filename: title
      ? `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pptx`
      : "presentation.pptx",
    slideCount: slides.length,
  };
}

const createPptFile = createStep({
  id: "create-ppt-file",
  description: "Generates PowerPoint file from structured slide data",
  inputSchema: contentWithThemeSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    if (
      !inputData.slides ||
      !Array.isArray(inputData.slides) ||
      inputData.slides.length === 0
    ) {
      throw new Error("Slides data is required and must not be empty");
    }

    // Generate PPT file using helper function with layout theme
    const result = await generatePptFile(
      inputData.slides,
      inputData.brandConfig,
      inputData.originalTopic || "Presentation",
      inputData.layoutTheme
    );

    return {
      pptBuffer: result.buffer,
      filename: result.filename,
      slideCount: result.slideCount,
      metadata: {
        topic: inputData.originalTopic || "Presentation",
        generatedAt: new Date().toISOString(),
      },
    };
  },
});

const pptWorkflow = createWorkflow({
  id: "ppt-workflow",
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(analyzeRequirements)
  .then(generateContentStructure)
  .then(generateLayoutTheme)
  .then(createPptFile);

pptWorkflow.commit();

export { pptWorkflow };
