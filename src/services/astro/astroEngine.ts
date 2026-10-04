/**
 * astroEngine.ts
 * Module tính toán tọa độ hành tinh (Natal & Transit) sử dụng astronomy-engine.
 * Thuần TypeScript, chạy offline 100% trên React Native / Expo Hermes.
 */
import { Body, GeoVector, Ecliptic, AstroTime } from 'astronomy-engine';

export interface PlanetPosition {
  name: string;
  body: Body;
  longitude: number;      // Tọa độ hoàng đạo (0° đến 360°)
  sign: string;           // Cung hoàng đạo (Aries, Taurus...)
  signIndex: number;      // 0 = Aries, 11 = Pisces
  degreeInSign: number;   // 0° đến 30°
  normalized: number;     // 0.0 đến 1.0 (longitude / 360)
}

export interface PlanetaryChart {
  targetDate: Date;
  isTimeEstimated: boolean; // true nếu khuyết giờ sinh (dùng Noon chart 12:00)
  planets: Record<string, PlanetPosition>;
  planetList: PlanetPosition[];
}

export const ZODIAC_SIGNS = [
  'Aries',        // Bạch Dương (0) - Fire, Cardinal
  'Taurus',       // Kim Ngưu (1) - Earth, Fixed
  'Gemini',       // Song Tử (2) - Air, Mutable
  'Cancer',       // Cự Giải (3) - Water, Cardinal
  'Leo',          // Sư Tử (4) - Fire, Fixed
  'Virgo',        // Xử Nữ (5) - Earth, Mutable
  'Libra',        // Thiên Bình (6) - Air, Cardinal
  'Scorpio',      // Bọ Cạp (7) - Water, Fixed
  'Sagittarius',  // Nhân Mã (8) - Fire, Mutable
  'Capricorn',    // Ma Kết (9) - Earth, Cardinal
  'Aquarius',     // Bảo Bình (10) - Air, Fixed
  'Pisces',       // Song Ngư (11) - Water, Mutable
];

export type ElementType = 'fire' | 'earth' | 'air' | 'water';
export type ModalityType = 'cardinal' | 'fixed' | 'mutable';

export interface ZodiacQuality {
  element: ElementType;
  modality: ModalityType;
}

export const ZODIAC_QUALITIES: ZodiacQuality[] = [
  { element: 'fire', modality: 'cardinal' },  // Aries
  { element: 'earth', modality: 'fixed' },    // Taurus
  { element: 'air', modality: 'mutable' },    // Gemini
  { element: 'water', modality: 'cardinal' }, // Cancer
  { element: 'fire', modality: 'fixed' },     // Leo
  { element: 'earth', modality: 'mutable' },  // Virgo
  { element: 'air', modality: 'cardinal' },   // Libra
  { element: 'water', modality: 'fixed' },    // Scorpio
  { element: 'fire', modality: 'mutable' },   // Sagittarius
  { element: 'earth', modality: 'cardinal' }, // Capricorn
  { element: 'air', modality: 'fixed' },      // Aquarius
  { element: 'water', modality: 'mutable' },  // Pisces
];

export interface TemperamentBalance {
  fire: number;      // 0.0 - 1.0 (tỷ lệ hành tinh thuộc Lửa)
  earth: number;     // 0.0 - 1.0 (tỷ lệ hành tinh thuộc Đất)
  air: number;       // 0.0 - 1.0 (tỷ lệ hành tinh thuộc Khí)
  water: number;     // 0.0 - 1.0 (tỷ lệ hành tinh thuộc Nước)
  cardinal: number;  // 0.0 - 1.0 (tỷ lệ hành tinh Tiên phong)
  fixed: number;     // 0.0 - 1.0 (tỷ lệ hành tinh Kiên định)
  mutable: number;   // 0.0 - 1.0 (tỷ lệ hành tinh Linh hoạt)
}

/**
 * Tính toán phân bổ Nguyên tố (Fire/Earth/Air/Water) và Tính chất (Cardinal/Fixed/Mutable)
 */
export function calculateTemperamentBalance(planetList: PlanetPosition[]): TemperamentBalance {
  let fire = 0, earth = 0, air = 0, water = 0;
  let cardinal = 0, fixed = 0, mutable = 0;
  const total = planetList.length || 1;

  for (const p of planetList) {
    const quality = ZODIAC_QUALITIES[p.signIndex];
    if (quality) {
      if (quality.element === 'fire') fire++;
      else if (quality.element === 'earth') earth++;
      else if (quality.element === 'air') air++;
      else if (quality.element === 'water') water++;

      if (quality.modality === 'cardinal') cardinal++;
      else if (quality.modality === 'fixed') fixed++;
      else if (quality.modality === 'mutable') mutable++;
    }
  }

  return {
    fire: Number((fire / total).toFixed(4)),
    earth: Number((earth / total).toFixed(4)),
    air: Number((air / total).toFixed(4)),
    water: Number((water / total).toFixed(4)),
    cardinal: Number((cardinal / total).toFixed(4)),
    fixed: Number((fixed / total).toFixed(4)),
    mutable: Number((mutable / total).toFixed(4)),
  };
}

export const ASTRO_BODIES: { name: string; body: Body }[] = [
  { name: 'Sun', body: Body.Sun },
  { name: 'Moon', body: Body.Moon },
  { name: 'Mercury', body: Body.Mercury },
  { name: 'Venus', body: Body.Venus },
  { name: 'Mars', body: Body.Mars },
  { name: 'Jupiter', body: Body.Jupiter },
  { name: 'Saturn', body: Body.Saturn },
  { name: 'Uranus', body: Body.Uranus },
  { name: 'Neptune', body: Body.Neptune },
  { name: 'Pluto', body: Body.Pluto },
];

/**
 * Đổi tọa độ hoàng đạo (0-360°) sang thông tin Cung hoàng đạo
 */
export function longitudeToZodiac(longitude: number): {
  sign: string;
  signIndex: number;
  degreeInSign: number;
  normalized: number;
} {
  // Đảm bảo góc luôn nằm trong [0, 360)
  let lon = longitude % 360;
  if (lon < 0) lon += 360;

  const signIndex = Math.floor(lon / 30) % 12;
  const degreeInSign = lon % 30;
  const normalized = Number((lon / 360).toFixed(6));

  return {
    sign: ZODIAC_SIGNS[signIndex],
    signIndex,
    degreeInSign,
    normalized,
  };
}

/**
 * Parse chuỗi ngày sinh và giờ sinh thành đối tượng Date (UTC)
 * Nếu không có giờ sinh -> Fallback về Noon Chart (12:00:00)
 */
export function resolveBirthDate(
  birthDateStr: string,
  birthTimeStr?: string
): { date: Date; isTimeEstimated: boolean } {
  let y = 2000, m = 1, d = 1;

  if (birthDateStr.includes('-')) {
    const parts = birthDateStr.split('T')[0].split('-').map(Number);
    if (parts.length >= 3) {
      y = parts[0];
      m = parts[1];
      d = parts[2];
    }
  } else if (birthDateStr.includes('/')) {
    const parts = birthDateStr.split('/').map(Number);
    if (parts.length >= 3) {
      d = parts[0];
      m = parts[1];
      y = parts[2];
    }
  }

  let hour = 12;
  let minute = 0;
  let isTimeEstimated = true;

  if (birthTimeStr && birthTimeStr.trim()) {
    const timeParts = birthTimeStr.trim().split(':').map(Number);
    if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
      hour = Math.min(23, Math.max(0, timeParts[0]));
      minute = Math.min(59, Math.max(0, timeParts[1]));
      isTimeEstimated = false;
    }
  }

  // Khởi tạo Date theo UTC để đảm bảo tính nhất quán (deterministic)
  const resolved = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  return { date: resolved, isTimeEstimated };
}

/**
 * Tính toán vị trí của 10 hành tinh tại một thời điểm
 */
export function calculatePlanetaryChart(date: Date, isTimeEstimated: boolean = false): PlanetaryChart {
  const time = new AstroTime(date);
  const planets: Record<string, PlanetPosition> = {};
  const planetList: PlanetPosition[] = [];

  for (const { name, body } of ASTRO_BODIES) {
    const gv = GeoVector(body, time, true);
    const eclip = Ecliptic(gv);
    const lon = eclip.elon;
    const zodiac = longitudeToZodiac(lon);

    const pos: PlanetPosition = {
      name,
      body,
      longitude: lon,
      sign: zodiac.sign,
      signIndex: zodiac.signIndex,
      degreeInSign: zodiac.degreeInSign,
      normalized: zodiac.normalized,
    };

    planets[name] = pos;
    planetList.push(pos);
  }

  return {
    targetDate: date,
    isTimeEstimated,
    planets,
    planetList,
  };
}

/**
 * Tính Natal Chart của người dùng
 */
export function computeNatalChart(birthDateStr: string, birthTimeStr?: string): PlanetaryChart {
  const { date, isTimeEstimated } = resolveBirthDate(birthDateStr, birthTimeStr);
  return calculatePlanetaryChart(date, isTimeEstimated);
}

/**
 * Tính Transit Chart (Bầu trời hiện tại)
 */
export function computeTransitChart(currentDate: Date = new Date()): PlanetaryChart {
  return calculatePlanetaryChart(currentDate, false);
}
