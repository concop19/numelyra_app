import type { ImageSourcePropType } from 'react-native';

export interface ConstellationSamplingOptions {
  samplesPerPath?: number;
  straightToleranceDeg?: number;
  filterPasses?: number;
}

export interface AstrologySymbolPreset {
  id: string;
  svgXml: string;
  title: string;
  backgroundSource: ImageSourcePropType;
  auroraSource: ImageSourcePropType;
  sampling?: ConstellationSamplingOptions;
}

export interface ConstellationPoint {
  x: number;
  y: number;
}

export interface SvgViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ParsedConstellationSvg {
  viewBox: SvgViewBox;
  paths: string[];
}

export interface ConstellationContour {
  points: ConstellationPoint[];
  closed: boolean;
}

export interface ConstellationGeometry {
  viewBox: SvgViewBox;
  contours: ConstellationContour[];
}

export interface ConstellationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConstellationRenderNode extends ConstellationPoint {
  key: string;
}

export interface ConstellationRenderEdge {
  key: string;
  fromIndex: number;
  toIndex: number;
}

export interface ConstellationRenderGraph {
  nodes: ConstellationRenderNode[];
  edges: ConstellationRenderEdge[];
}

export interface AmbientStar {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}
