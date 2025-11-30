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
}

export interface SlideJson {
  slideNumber: number;
  background: SlideBackground;
  elements: SlideElement[];
  layout: SlideLayout;
}

export interface Relationship {
  id: string;
  target: string;
  type: string;
}

export type RelationshipMap = Map<string, Relationship>;

