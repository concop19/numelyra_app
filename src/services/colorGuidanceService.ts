import { solarToLunar } from './lunarService';

export const COLOR_GUIDANCE_RULE_VERSION = 'v1';
export const COLOR_GUIDANCE_SOURCE_URL = 'https://apx-security-de.audible.de/podcast/Phong-Thy-Vit/B0GXTYN66R';

export type FengShuiElement = 'Kim' | 'Thủy' | 'Mộc' | 'Hỏa' | 'Thổ';
export type TarotElement = 'fire' | 'water' | 'air' | 'earth';

export type ColorId =
  | 'white' | 'gray' | 'silver' | 'yellow' | 'beige'
  | 'black' | 'navy' | 'purple' | 'green' | 'blue'
  | 'moss' | 'red' | 'orange' | 'pink' | 'coral' | 'brown';

export interface FengShuiColor {
  id: ColorId;
  name: string;
  hex: string;
}

export interface ColorGuidanceContext {
  ruleVersion: typeof COLOR_GUIDANCE_RULE_VERSION;
  sourceUrl: typeof COLOR_GUIDANCE_SOURCE_URL;
  lunarYear: number;
  element: FengShuiElement;
  palette: FengShuiColor[];
  selectedColorIds: [ColorId, ColorId];
  tarotElement: TarotElement;
  cardId: string;
  isReversed: boolean;
}

type TarotCardLike = {
  card?: { id?: string };
  isReversed?: boolean;
};

const COLORS: Record<ColorId, FengShuiColor> = {
  white: { id: 'white', name: 'Trắng', hex: '#F7F5F0' },
  gray: { id: 'gray', name: 'Xám', hex: '#8A8D91' },
  silver: { id: 'silver', name: 'Bạc', hex: '#C0C5C9' },
  yellow: { id: 'yellow', name: 'Vàng', hex: '#E8C547' },
  beige: { id: 'beige', name: 'Be', hex: '#D9C4A3' },
  black: { id: 'black', name: 'Đen', hex: '#15171A' },
  navy: { id: 'navy', name: 'Xanh đậm', hex: '#183A63' },
  purple: { id: 'purple', name: 'Tím', hex: '#6D4C9B' },
  green: { id: 'green', name: 'Xanh lá', hex: '#3C8D45' },
  blue: { id: 'blue', name: 'Xanh lam', hex: '#2878B8' },
  moss: { id: 'moss', name: 'Xanh rêu', hex: '#647A3C' },
  red: { id: 'red', name: 'Đỏ', hex: '#C93434' },
  orange: { id: 'orange', name: 'Cam', hex: '#E97824' },
  pink: { id: 'pink', name: 'Hồng', hex: '#D85B8E' },
  coral: { id: 'coral', name: 'Cam san hô', hex: '#F07D63' },
  brown: { id: 'brown', name: 'Nâu', hex: '#7A4E32' },
};

const PALETTE_IDS: Record<FengShuiElement, readonly ColorId[]> = {
  Kim: ['white', 'gray', 'silver', 'yellow', 'beige'],
  Thủy: ['black', 'navy', 'purple', 'white', 'gray'],
  Mộc: ['green', 'blue', 'black', 'purple', 'moss'],
  Hỏa: ['red', 'orange', 'pink', 'green', 'coral'],
  Thổ: ['yellow', 'brown', 'beige', 'red', 'orange'],
};

const TAROT_ELEMENT_PRIORITY: Record<TarotElement, readonly ColorId[]> = {
  fire: ['red', 'orange', 'coral', 'pink', 'yellow', 'green', 'black', 'navy', 'purple', 'blue', 'white', 'gray', 'silver', 'beige', 'brown', 'moss'],
  water: ['black', 'navy', 'purple', 'blue', 'white', 'gray', 'silver', 'green', 'moss', 'pink', 'coral', 'red', 'orange', 'yellow', 'beige', 'brown'],
  air: ['white', 'gray', 'silver', 'blue', 'purple', 'black', 'navy', 'green', 'moss', 'yellow', 'beige', 'brown', 'orange', 'coral', 'pink', 'red'],
  earth: ['brown', 'beige', 'yellow', 'orange', 'red', 'moss', 'green', 'black', 'navy', 'purple', 'blue', 'white', 'gray', 'silver', 'pink', 'coral'],
};

const AIR_MAJORS = new Set(['0-fool', '1-magician', '6-lovers', '11-justice', '17-star']);
const WATER_MAJORS = new Set(['2-high-priestess', '7-chariot', '12-hanged-man', '13-death', '18-moon']);
const EARTH_MAJORS = new Set(['3-empress', '5-hierophant', '9-hermit', '15-devil', '21-world']);

export function isColorQuestion(question: string): boolean {
  return /\bmàu\b|màu\s+(hợp|may mắn|gì|nào|nên|sắc)|phối\s+màu|mặc\s+màu|sơn\s+màu|màu\s+(trang phục|phụ kiện|ví|ốp|xe)/i.test(question);
}

export function elementFromLunarYear(lunarYear: number): FengShuiElement {
  switch (Math.abs(lunarYear) % 10) {
    case 0:
    case 1: return 'Kim';
    case 2:
    case 3: return 'Thủy';
    case 4:
    case 5: return 'Mộc';
    case 6:
    case 7: return 'Hỏa';
    default: return 'Thổ';
  }
}

export function tarotElementFromCardId(cardId: string): TarotElement {
  if (cardId.startsWith('wands-')) return 'fire';
  if (cardId.startsWith('cups-')) return 'water';
  if (cardId.startsWith('swords-')) return 'air';
  if (cardId.startsWith('pentacles-')) return 'earth';
  if (AIR_MAJORS.has(cardId)) return 'air';
  if (WATER_MAJORS.has(cardId)) return 'water';
  if (EARTH_MAJORS.has(cardId)) return 'earth';
  return 'fire';
}

function parseBirthDate(birthDate: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) throw new Error('Ngày sinh phải theo định dạng YYYY-MM-DD');
  const [year, month, day] = match.slice(1).map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('Ngày sinh không hợp lệ');
  return [year, month, day];
}

export function createColorGuidance(birthDate: string, drawnCard: TarotCardLike): ColorGuidanceContext {
  const [year, month, day] = parseBirthDate(birthDate);
  const lunarYear = solarToLunar(day, month, year, 7).year;
  const element = elementFromLunarYear(lunarYear);
  const cardId = drawnCard.card?.id || '';
  const tarotElement = tarotElementFromCardId(cardId);
  const paletteIds = PALETTE_IDS[element];
  const priority = drawnCard.isReversed
    ? [...TAROT_ELEMENT_PRIORITY[tarotElement]].reverse()
    : TAROT_ELEMENT_PRIORITY[tarotElement];
  const selected = priority.filter((colorId) => paletteIds.includes(colorId)).slice(0, 2) as ColorId[];
  if (selected.length !== 2) throw new Error('Không thể chọn đủ hai màu hợp mệnh');

  return {
    ruleVersion: COLOR_GUIDANCE_RULE_VERSION,
    sourceUrl: COLOR_GUIDANCE_SOURCE_URL,
    lunarYear,
    element,
    palette: paletteIds.map((colorId) => COLORS[colorId]),
    selectedColorIds: [selected[0], selected[1]],
    tarotElement,
    cardId,
    isReversed: Boolean(drawnCard.isReversed),
  };
}
