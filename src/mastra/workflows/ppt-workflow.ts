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

Please analyze these requirements and respond with a JSON object containing:
- analyzedTopic: A refined/expanded version of the topic
- audience: The target audience description
- suggestedSlides: Optimal number of slides (considering the topic complexity)
- structure: An object indicating which sections should be included (introduction, problem, solution, benefits, implementation, conclusion)

Respond ONLY with valid JSON in this format:
{
  "analyzedTopic": "...",
  "audience": "...",
  "suggestedSlides": 10,
  "structure": {
    "introduction": true,
    "problem": true,
    "solution": true,
    "benefits": true,
    "implementation": true,
    "conclusion": true
  }
}`;

    const response = await agent.generate([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse the JSON response
    let analyzedData;
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analyzedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // Fallback to default structure if parsing fails
      analyzedData = {
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
      };
    }

    // Add original topic and brand config for later steps
    return {
      ...analyzedData,
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
- Ensure logical flow and narrative progression

Return ONLY valid JSON in this exact format:
{
  "slides": [
    {
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "layout": "titleContent",
      "notes": "Optional speaker notes"
    }
  ]
}`;

    const response = await agent.generate([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse the JSON response
    let slideData;
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        slideData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }

      // Validate that slides array exists
      if (!slideData.slides || !Array.isArray(slideData.slides)) {
        throw new Error("Invalid slide data structure");
      }
    } catch (error) {
      throw new Error(
        `Failed to parse slide content: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Pass through original topic and brand config
    return {
      ...slideData,
      originalTopic: inputData.originalTopic,
      brandConfig: inputData.brandConfig,
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
  title?: string
) {
  const pres = new PptxGenJS();

  if (title) {
    pres.title = title;
  }

  if (brandConfig?.primaryColor) {
    pres.defineLayout({ name: "CUSTOM", width: 10, height: 7.5 });
    pres.layout = "CUSTOM";
  }

  const primaryColor = brandConfig?.primaryColor || "363636";
  const fontFamily = brandConfig?.fontFamily || "Calibri";

  for (const slide of slides) {
    const pptxSlide = pres.addSlide();

    switch (slide.layout) {
      case "title":
        pptxSlide.addText(slide.title, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 1.5,
          fontSize: 44,
          bold: true,
          color: primaryColor,
          fontFace: fontFamily,
          align: "center",
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
            color: "363636",
            fontFace: fontFamily,
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
          color: primaryColor,
          fontFace: fontFamily,
        });

        slide.content.forEach((item, index) => {
          pptxSlide.addText(item, {
            x: 0.7,
            y: 1.3 + index * 0.7,
            w: 8.6,
            h: 0.6,
            fontSize: 16,
            bullet: true,
            color: "363636",
            fontFace: fontFamily,
            lineSpacing: 28,
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
          color: primaryColor,
          fontFace: fontFamily,
        });
        slide.content.forEach((item, index) => {
          pptxSlide.addText(item, {
            x: 0.7,
            y: 1.3 + index * 0.7,
            w: 4.5,
            h: 0.6,
            fontSize: 16,
            bullet: true,
            color: "363636",
            fontFace: fontFamily,
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
  inputSchema: contentStructureSchema,
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

    // Generate PPT file using helper function
    const result = await generatePptFile(
      inputData.slides,
      inputData.brandConfig,
      inputData.originalTopic || "Presentation"
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
  .then(createPptFile);

pptWorkflow.commit();

export { pptWorkflow };
