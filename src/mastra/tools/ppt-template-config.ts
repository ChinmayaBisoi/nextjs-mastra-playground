/**
 * Template registry and configuration
 * Maps slide layouts to data fields for easy regeneration
 */

export interface SlideTemplate {
  slideNumber: number;
  type:
    | "title"
    | "agenda"
    | "content"
    | "two-column"
    | "image-text"
    | "quote"
    | "team"
    | "contact";
  textFields: {
    name: string;
    selector: string; // XPath or shape name to locate in XML
    defaultValue?: string;
    required?: boolean;
  }[];
  imageFields?: {
    name: string;
    selector: string;
    relationshipId?: string;
  }[];
  tableFields?: {
    name: string;
    selector: string;
    headers: string[];
  }[];
}

/**
 * Beige and Black Minimalist Project Deck Template
 */
export const BEIGE_BLACK_PROJECT_DECK: SlideTemplate[] = [
  // Slide 1: Title Slide
  {
    slideNumber: 1,
    type: "title",
    textFields: [
      {
        name: "mainTitle",
        selector: "TextBox 15",
        defaultValue: "PROJECT BRIEF DECK",
        required: true,
      },
      {
        name: "subtitle",
        selector: "TextBox 5",
        defaultValue: "Add a subtitle or the company tagline here",
      },
      {
        name: "projectName",
        selector: "TextBox 7",
        defaultValue: "Write here",
        required: true,
      },
      {
        name: "presentedBy",
        selector: "TextBox 9",
        defaultValue: "Write here",
        required: true,
      },
      {
        name: "presentedTo",
        selector: "TextBox 11",
        defaultValue: "Write here",
        required: true,
      },
      {
        name: "companyName",
        selector: "TextBox 12",
        defaultValue: "Add company name here | MM/DD/YYYY",
      },
    ],
    imageFields: [
      {
        name: "backgroundImage",
        selector: "Freeform 2",
        relationshipId: "rId2",
      },
      { name: "logo", selector: "Freeform 4", relationshipId: "rId5" },
    ],
  },

  // Slide 2: Table of Contents / Agenda
  {
    slideNumber: 2,
    type: "agenda",
    textFields: [
      {
        name: "agendaTitle",
        selector: "TextBox 6",
        defaultValue: "Agenda",
        required: true,
      },
      { name: "pageNumber", selector: "TextBox 11", defaultValue: "03/10" },
    ],
    tableFields: [
      {
        name: "agendaItems",
        selector: "Table 3",
        headers: ["#", "Section"],
      },
    ],
  },

  // Slide 3: Overview
  {
    slideNumber: 3,
    type: "content",
    textFields: [
      {
        name: "sectionTitle",
        selector: "TextBox 10",
        defaultValue: "Overview",
        required: true,
      },
      { name: "sectionNumber", selector: "TextBox 9", defaultValue: "01" },
      {
        name: "content1",
        selector: "TextBox 8",
        defaultValue: "Introduce the project...",
      },
      { name: "sectionNumber2", selector: "TextBox 7", defaultValue: "02" },
      {
        name: "content2",
        selector: "TextBox 6",
        defaultValue: "Introduce the project...",
      },
      { name: "sectionNumber3", selector: "TextBox 13", defaultValue: "03" },
      {
        name: "content3",
        selector: "TextBox 14",
        defaultValue: "Introduce the project...",
      },
      { name: "imageCaption", selector: "TextBox 5", defaultValue: "" },
      { name: "pageNumber", selector: "TextBox 11", defaultValue: "03/10" },
      {
        name: "website",
        selector: "TextBox 12",
        defaultValue: "www.reallygreatsite.com",
      },
    ],
    imageFields: [
      {
        name: "backgroundImage",
        selector: "Freeform 2",
        relationshipId: "rId2",
      },
      { name: "contentImage", selector: "Picture 4", relationshipId: "rId3" },
    ],
  },
];

/**
 * Template data structure for generating presentations
 */
export interface PresentationTemplateData {
  templateName: string;
  slides: {
    [slideNumber: number]: {
      [fieldName: string]:
        | string
        | string[][]
        | { headers: string[]; rows: string[][] };
    };
  };
}

/**
 * Helper function to create template data structure
 */
export function createTemplateData(
  templateName: string = "beige-black-project-deck"
): PresentationTemplateData {
  return {
    templateName,
    slides: {},
  };
}

/**
 * Validate template data against template definition
 */
export function validateTemplateData(
  template: SlideTemplate[],
  data: PresentationTemplateData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  template.forEach((slideTemplate) => {
    const slideData = data.slides[slideTemplate.slideNumber];

    if (!slideData) {
      errors.push(`Missing data for slide ${slideTemplate.slideNumber}`);
      return;
    }

    // Check required text fields
    slideTemplate.textFields.forEach((field) => {
      if (field.required && !slideData[field.name]) {
        errors.push(
          `Missing required field '${field.name}' in slide ${slideTemplate.slideNumber}`
        );
      }
    });

    // Check table fields
    if (slideTemplate.tableFields) {
      slideTemplate.tableFields.forEach((tableField) => {
        const tableData = slideData[tableField.name];
        if (!tableData) {
          errors.push(
            `Missing table data '${tableField.name}' in slide ${slideTemplate.slideNumber}`
          );
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Example usage / template for project brief deck
 */
export const EXAMPLE_PROJECT_BRIEF_DATA: PresentationTemplateData = {
  templateName: "beige-black-project-deck",
  slides: {
    1: {
      mainTitle: "AI PRODUCT\nLAUNCH DECK",
      subtitle: "Revolutionary AI-powered solutions for modern businesses",
      projectName: "NextGen AI Platform",
      presentedBy: "Jane Smith, Product Manager",
      presentedTo: "Executive Board",
      companyName: "TechCorp Inc. | 11/27/2025",
    },
    2: {
      agendaTitle: "Agenda",
      pageNumber: "02/13",
      agendaItems: {
        headers: ["#", "Section"],
        rows: [
          ["03", "Overview"],
          ["04", "Goals and company vision"],
          ["05", "Target Audience"],
          ["06", "Competition"],
          ["07", "Timeline"],
          ["08", "Message from project founder"],
          ["09", "Team"],
          ["10", "Contacts"],
        ],
      },
    },
    3: {
      sectionTitle: "Overview",
      sectionNumber: "01",
      content1:
        "Our AI platform revolutionizes how businesses interact with data, providing real-time insights and automated decision-making capabilities.",
      sectionNumber2: "02",
      content2:
        "Built on cutting-edge machine learning algorithms, the platform adapts to your business needs and scales with your growth.",
      sectionNumber3: "03",
      content3:
        "With enterprise-grade security and compliance built-in, you can trust your data is safe while leveraging the power of AI.",
      pageNumber: "03/13",
      website: "www.techcorp.com",
    },
  },
};
