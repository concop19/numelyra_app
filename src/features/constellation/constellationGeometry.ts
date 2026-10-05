import type {
  AmbientStar,
  ConstellationBounds,
  ConstellationGeometry,
  ConstellationPoint,
  ParsedConstellationSvg,
} from './types';

export const MAX_SVG_LENGTH = 250_000;
export const MAX_SVG_PATHS = 32;
export const MAX_CONSTELLATION_STARS = 300;

const FORBIDDEN_SVG_CONTENT = /<(?:script|foreignObject|iframe|object|embed|image|use)\b|\b(?:href|xlink:href)\s*=/i;
const TRANSFORMED_GEOMETRY = /<(?:g|path)\b[^>]*\btransform\s*=/i;

function decodeXmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function readAttribute(attributes: string, name: string): string | null {
  const expression = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = attributes.match(expression);
  const raw = match?.[1] ?? match?.[2];
  return typeof raw === 'string' ? decodeXmlAttribute(raw) : null;
}

export function parseConstellationSvg(svgXml: string): ParsedConstellationSvg {
  if (!svgXml.trim()) throw new Error('SVG trống.');
  if (svgXml.length > MAX_SVG_LENGTH) throw new Error('SVG vượt quá giới hạn 250 KB.');
  if (FORBIDDEN_SVG_CONTENT.test(svgXml)) throw new Error('SVG chứa nội dung hoặc liên kết không được hỗ trợ.');
  if (TRANSFORMED_GEOMETRY.test(svgXml)) throw new Error('SVG phải được flatten transform trước khi sử dụng.');

  const svgTag = svgXml.match(/<svg\b([^>]*)>/i);
  if (!svgTag) throw new Error('Không tìm thấy phần tử <svg>.');

  const viewBoxValue = readAttribute(svgTag[1], 'viewBox');
  if (!viewBoxValue) throw new Error('SVG phải có thuộc tính viewBox.');

  const values = viewBoxValue.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error('viewBox của SVG không hợp lệ.');
  }

  const [minX, minY, width, height] = values;
  if (width <= 0 || height <= 0) throw new Error('viewBox phải có chiều rộng và chiều cao lớn hơn 0.');

  const paths: string[] = [];
  const pathExpression = /<path\b([^>]*)\/?\s*>/gi;
  let pathMatch: RegExpExecArray | null;
  while ((pathMatch = pathExpression.exec(svgXml))) {
    const data = readAttribute(pathMatch[1], 'd');
    if (data?.trim()) paths.push(data.trim());
    if (paths.length > MAX_SVG_PATHS) throw new Error(`SVG chỉ được chứa tối đa ${MAX_SVG_PATHS} path.`);
  }

  if (paths.length === 0) throw new Error('SVG không có path hợp lệ để dựng chòm sao.');

  return {
    viewBox: { minX, minY, width, height },
    paths,
  };
}

function direction(from: ConstellationPoint, to: ConstellationPoint): number {
  let value = Math.atan2(to.y - from.y, to.x - from.x);
  if (value < 0) value += Math.PI * 2;
  return value;
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function filterPointsOnAngle(
  points: ConstellationPoint[],
  straightToleranceDeg: number
): ConstellationPoint[] {
  if (points.length < 3) return points.slice();

  const excluded = new Set<number>();
  for (let index = 0; index < points.length - 2; index += 1) {
    const firstAngle = direction(points[index], points[index + 1]);
    const secondAngle = direction(points[index + 2], points[index + 1]);
    let difference = Math.abs(firstAngle - secondAngle);
    if (difference > Math.PI) difference = Math.PI * 2 - difference;

    if (Math.abs(180 - degrees(difference)) < straightToleranceDeg) {
      excluded.add(index + 1);
      index += 1;
    }
  }

  return points.filter((_, index) => !excluded.has(index));
}

export function simplifyConstellationPoints(
  points: ConstellationPoint[],
  straightToleranceDeg: number,
  filterPasses: number
): ConstellationPoint[] {
  let simplified = points.slice();
  for (let pass = 0; pass < filterPasses; pass += 1) {
    simplified = filterPointsOnAngle(simplified, straightToleranceDeg);
  }
  return simplified;
}

export function removeClosedEndpoint(points: ConstellationPoint[], epsilon = 0.01): ConstellationPoint[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) <= epsilon) return points.slice(0, -1);
  return points;
}

export function fitConstellationGeometry(
  geometry: ConstellationGeometry,
  bounds: ConstellationBounds
): ConstellationGeometry {
  const scale = Math.min(bounds.width / geometry.viewBox.width, bounds.height / geometry.viewBox.height);
  const renderedWidth = geometry.viewBox.width * scale;
  const renderedHeight = geometry.viewBox.height * scale;
  const offsetX = bounds.x + (bounds.width - renderedWidth) / 2;
  const offsetY = bounds.y + (bounds.height - renderedHeight) / 2;

  return {
    viewBox: { minX: bounds.x, minY: bounds.y, width: bounds.width, height: bounds.height },
    contours: geometry.contours.map((contour) => ({
      closed: contour.closed,
      points: contour.points.map((point) => ({
        x: offsetX + (point.x - geometry.viewBox.minX) * scale,
        y: offsetY + (point.y - geometry.viewBox.minY) * scale,
      })),
    })),
  };
}

export function countConstellationStars(geometry: ConstellationGeometry): number {
  return geometry.contours.reduce((total, contour) => total + contour.points.length, 0);
}

export function createAmbientStars(seed: number, count: number): AmbientStar[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    radius: 0.45 + random() * 1.45,
    opacity: 0.25 + random() * 0.7,
  }));
}
