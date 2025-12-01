/**
 * Type definitions for slide conversion
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  flipH: boolean;
  flipV: boolean;
  rotation: number;
}

export interface TextFormatting {
  fontSize: number; // in points
  fontFamily: string;
  color: string; // hex color
  alignment: "left" | "center" | "right" | "justify";
  lineSpacing?: number; // in points
  letterSpacing?: number; // in points
}

export interface ImageElement {
  id: number;
  type: "image";
  name: string;
  position: Position;
  size: Size;
  transform: Transform;
  media: {
    image?: string;
    svg?: string;
  };
}

export interface TextElement {
  id: number;
  type: "text";
  name: string;
  position: Position;
  size: Size;
  content: string;
  formatting: TextFormatting;
}

export type SlideElement = ImageElement | TextElement;

export interface SlideBackground {
  type: "solid" | "gradient" | "image";
  color?: string; // hex color for solid
  image?: string; // for image background
}

export interface SlideLayout {
  type: string;
  reference: string;
  placeholders?: LayoutPlaceholder[];
}

export interface LayoutPlaceholder {
  type: string;
  index?: number;
  size?: string;
}

export interface ThemeColors {
  dk1?: string; // Dark 1
  lt1?: string; // Light 1
  dk2?: string; // Dark 2
  lt2?: string; // Light 2
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
  accent5?: string;
  accent6?: string;
  hlink?: string; // Hyperlink
  folHlink?: string; // Followed hyperlink
}

export interface ThemeFonts {
  majorFont?: {
    latin?: string;
    ea?: string;
    cs?: string;
  };
  minorFont?: {
    latin?: string;
    ea?: string;
    cs?: string;
  };
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
}

export interface MasterSlide {
  colorMap?: Record<string, string>;
  textStyles?: {
    title?: any;
    body?: any;
    other?: any;
  };
}

export interface PresentationMetadata {
  slideSize?: {
    width: number;
    height: number;
  };
  embeddedFonts?: Array<{
    typeface: string;
    charset?: string;
  }>;
}

export interface SlideJson {
  slideNumber: number;
  background: SlideBackground;
  elements: SlideElement[];
  layout: SlideLayout;
  theme?: Theme;
  masterSlide?: MasterSlide;
  presentationMetadata?: PresentationMetadata;
}

export interface Relationship {
  id: string;
  target: string;
  type: string;
}

export type RelationshipMap = Map<string, Relationship>;
