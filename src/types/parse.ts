export type Placeholder = {
  id: string;
  name?: string;
  type: string;
  index?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
  };
};

export type SlideLayout = {
  layoutId: string;
  layoutName: string;
  placeholders: Placeholder[];
};

export type TemplateSpec = {
  templateId: string;
  name: string;
  version: string;
  theme?: {
    primaryColor?: string;
    accentColors?: string[];
    fontFamilies?: {
      major?: string;
      minor?: string;
    };
  };
  layouts: SlideLayout[];
  metadata?: {
    uploadedAt?: string;
    author?: string;
  };
};

export type ThemeOverrides = {
  primaryColor?: string;
  accentColors?: string[];
  fontFamilies?: {
    major?: string;
    minor?: string;
  };
};

export type TemplateData = {
  templateSpec: TemplateSpec;
  themeOverrides?: ThemeOverrides;
};
