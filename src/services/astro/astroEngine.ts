/**
 * astroEngine.ts
 * Module tính toán tọa độ hành tinh (Natal & Transit) sử dụng astronomy-engine.
 * Thuần TypeScript, chạy offline 100% trên React Native / Expo Hermes.
 */
import { Body, GeoVector, Ecliptic, AstroTime } from 'astronomy-engine';
import type {
  BirthTimeAccuracy,
  ResolvedBirthLocation,
} from '../../store/userProfile';

export const ASTRO_ENGINE_VERSION = 'astrology-v2-porphyry-1';

export type AstroBirthDataPrecision = 'dateOnly' | 'timeWithoutLocation' | 'complete';

export interface ResolvedBirthDate {
  date: Date;
  isTimeEstimated: boolean;
  precision: AstroBirthDataPrecision;
  isLocalTimeAmbiguous: boolean;
}

export interface AstroAngles {
  ascendant: number;
  descendant: number;
  midheaven: number;
  imumCoeli: number;
}

export interface AstroHouseCusp {
  house: number;
  longitude: number;
}

export interface AstroNatalContext {
  birthUTC: string;
  houseSystem: 'porphyry';
  angles: AstroAngles;
  houseCusps: AstroHouseCusp[];
  planetHouses: Record<string, number>;
  precision: AstroBirthDataPrecision;
  isLocalTimeAmbiguous: boolean;
}

export interface AstroNatalSnapshot {
  engineVersion: string;
  chart: PlanetaryChart;
  context: AstroNatalContext | null;
}

export interface AstroBirthInput {
  birthDate: string;
  birthTime?: string;
  birthTimeAccuracy?: BirthTimeAccuracy;
  resolvedBirthLocation?: ResolvedBirthLocation;
}

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
function parseDateParts(value: string): { year: number; month: number; day: number } {
  const datePart = value.split('T', 1)[0];
  const separator = datePart.includes('-') ? '-' : datePart.includes('/') ? '/' : null;
  if (!separator) throw new Error(`Ngày sinh không hợp lệ: ${value}`);
  const parts = datePart.split(separator).map(Number);
  if (parts.length < 3 || parts.some((part) => !Number.isInteger(part))) {
    throw new Error(`Ngày sinh không hợp lệ: ${value}`);
  }
  const [first, second, third] = parts;
  const year = separator === '-' ? first : third;
  const month = second;
  const day = separator === '-' ? third : first;
  const validation = new Date(Date.UTC(year, month - 1, day));
  if (
    validation.getUTCFullYear() !== year
    || validation.getUTCMonth() !== month - 1
    || validation.getUTCDate() !== day
  ) {
    throw new Error(`Ngày sinh không hợp lệ: ${value}`);
  }
  return { year, month, day };
}

function timeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = timeZoneParts(date, timeZone);
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ) - date.getTime();
}

function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): { date: Date; isAmbiguous: boolean } {
  try {
    // Validate the IANA identifier before doing offset calculations.
    timeZoneParts(new Date(), timeZone);
  } catch {
    throw new Error(`Múi giờ nơi sinh không hợp lệ: ${timeZone}`);
  }

  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const probe = new Date(desiredAsUtc);
  const possibleOffsets = new Set([
    timeZoneOffsetMs(new Date(probe.getTime() - 86_400_000), timeZone),
    timeZoneOffsetMs(probe, timeZone),
    timeZoneOffsetMs(new Date(probe.getTime() + 86_400_000), timeZone),
  ]);
  const matches = [...possibleOffsets]
    .map((offset) => new Date(desiredAsUtc - offset))
    .filter((candidate) => {
      const parts = timeZoneParts(candidate, timeZone);
      return parts.year === year
        && parts.month === month
        && parts.day === day
        && parts.hour === hour
        && parts.minute === minute;
    })
    .sort((left, right) => left.getTime() - right.getTime());

  if (matches.length === 0) {
    throw new Error(
      `Giờ sinh ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} không tồn tại tại nơi sinh do chuyển giờ mùa hè.`
    );
  }
  return { date: matches[0], isAmbiguous: matches.length > 1 };
}

export function resolveBirthDate(
  birthDateStr: string,
  birthTimeStr?: string,
  accuracy?: BirthTimeAccuracy,
  location?: ResolvedBirthLocation
): ResolvedBirthDate {
  const { year, month, day } = parseDateParts(birthDateStr);
  let hour = 12;
  let minute = 0;
  let isTimeEstimated = true;
  const effectiveAccuracy = accuracy ?? (birthTimeStr?.trim() ? 'exact' : 'unknown');

  if (effectiveAccuracy === 'exact' && birthTimeStr?.trim()) {
    const timeParts = birthTimeStr.trim().split(':').map(Number);
    if (
      timeParts.length < 2
      || !Number.isInteger(timeParts[0])
      || !Number.isInteger(timeParts[1])
      || timeParts[0] < 0
      || timeParts[0] > 23
      || timeParts[1] < 0
      || timeParts[1] > 59
    ) {
      throw new Error(`Giờ sinh không hợp lệ: ${birthTimeStr}`);
    }
    [hour, minute] = timeParts;
    isTimeEstimated = false;
  }

  const resolved = location
    ? localDateTimeToUtc(year, month, day, hour, minute, location.timeZoneIdentifier)
    : { date: new Date(Date.UTC(year, month - 1, day, hour, minute, 0)), isAmbiguous: false };
  const precision: AstroBirthDataPrecision = isTimeEstimated
    ? 'dateOnly'
    : location
      ? 'complete'
      : 'timeWithoutLocation';

  return {
    date: resolved.date,
    isTimeEstimated,
    precision,
    isLocalTimeAmbiguous: resolved.isAmbiguous,
  };
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
export function computeNatalChart(
  birthDateStr: string,
  birthTimeStr?: string,
  accuracy?: BirthTimeAccuracy,
  location?: ResolvedBirthLocation
): PlanetaryChart {
  const { date, isTimeEstimated } = resolveBirthDate(
    birthDateStr,
    birthTimeStr,
    accuracy,
    location
  );
  return calculatePlanetaryChart(date, isTimeEstimated);
}

function positiveModulo(value: number, divisor: number): number {
  const result = value % divisor;
  return result < 0 ? result + divisor : result;
}

function rounded(value: number, places = 6): number {
  return Number(value.toFixed(places));
}

export function calculateAngles(date: Date, latitude: number, longitude: number): AstroAngles {
  const julianDate = date.getTime() / 86_400_000 + 2_440_587.5;
  const centuries = (julianDate - 2_451_545) / 36_525;
  const gmst = 280.460_618_37
    + 360.985_647_366_29 * (julianDate - 2_451_545)
    + 0.000_387_933 * centuries * centuries
    - centuries * centuries * centuries / 38_710_000;
  const sidereal = positiveModulo(gmst + longitude, 360) * Math.PI / 180;
  const obliquity = (
    23.439_291_111
      - 0.013_004_167 * centuries
      - 0.000_000_164 * centuries * centuries
      + 0.000_000_504 * centuries * centuries * centuries
  ) * Math.PI / 180;
  const latitudeRadians = Math.max(-89.999, Math.min(89.999, latitude)) * Math.PI / 180;
  const midheaven = Math.atan2(
    Math.sin(sidereal),
    Math.cos(sidereal) * Math.cos(obliquity)
  ) * 180 / Math.PI;
  const ascendant = Math.atan2(
    -Math.cos(sidereal),
    Math.sin(sidereal) * Math.cos(obliquity)
      + Math.tan(latitudeRadians) * Math.sin(obliquity)
  ) * 180 / Math.PI;
  // atan2 expression above resolves the western intersection; the Ascendant
  // is the eastern intersection, exactly 180° opposite on the ecliptic.
  const asc = positiveModulo(ascendant + 180, 360);
  const mc = positiveModulo(midheaven, 360);
  return {
    ascendant: rounded(asc),
    descendant: rounded(positiveModulo(asc + 180, 360)),
    midheaven: rounded(mc),
    imumCoeli: rounded(positiveModulo(mc + 180, 360)),
  };
}

export function calculatePorphyryCusps(angles: AstroAngles): AstroHouseCusp[] {
  const values = new Array<number>(12).fill(0);
  values[0] = angles.ascendant;
  values[3] = angles.imumCoeli;
  values[6] = angles.descendant;
  values[9] = angles.midheaven;
  for (const startHouse of [0, 3, 6, 9]) {
    const endHouse = (startHouse + 3) % 12;
    const arc = positiveModulo(values[endHouse] - values[startHouse], 360);
    values[(startHouse + 1) % 12] = positiveModulo(values[startHouse] + arc / 3, 360);
    values[(startHouse + 2) % 12] = positiveModulo(values[startHouse] + arc * 2 / 3, 360);
  }
  return values.map((longitude, index) => ({ house: index + 1, longitude: rounded(longitude) }));
}

export function houseForLongitude(longitude: number, cusps: AstroHouseCusp[]): number | null {
  if (cusps.length !== 12) return null;
  const ordered = [...cusps].sort((left, right) => left.house - right.house);
  const target = positiveModulo(longitude, 360);
  for (let index = 0; index < ordered.length; index += 1) {
    const start = ordered[index].longitude;
    const end = ordered[(index + 1) % ordered.length].longitude;
    const span = positiveModulo(end - start, 360);
    const offset = positiveModulo(target - start, 360);
    if (offset < span || (span === 0 && offset === 0)) return ordered[index].house;
  }
  return null;
}

export function assignPlanetsToHouses(
  planets: PlanetPosition[],
  cusps: AstroHouseCusp[]
): Record<string, number> {
  return planets.reduce<Record<string, number>>((result, planet) => {
    const house = houseForLongitude(planet.longitude, cusps);
    if (house !== null) result[planet.name] = house;
    return result;
  }, {});
}

export function makeNatalSnapshot(input: AstroBirthInput): AstroNatalSnapshot {
  const resolved = resolveBirthDate(
    input.birthDate,
    input.birthTime,
    input.birthTimeAccuracy,
    input.resolvedBirthLocation
  );
  const chart = calculatePlanetaryChart(resolved.date, resolved.isTimeEstimated);
  if (resolved.precision !== 'complete' || !input.resolvedBirthLocation) {
    return { engineVersion: ASTRO_ENGINE_VERSION, chart, context: null };
  }
  const angles = calculateAngles(
    resolved.date,
    input.resolvedBirthLocation.latitude,
    input.resolvedBirthLocation.longitude
  );
  const houseCusps = calculatePorphyryCusps(angles);
  return {
    engineVersion: ASTRO_ENGINE_VERSION,
    chart,
    context: {
      birthUTC: resolved.date.toISOString(),
      houseSystem: 'porphyry',
      angles,
      houseCusps,
      planetHouses: assignPlanetsToHouses(chart.planetList, houseCusps),
      precision: resolved.precision,
      isLocalTimeAmbiguous: resolved.isLocalTimeAmbiguous,
    },
  };
}

/**
 * Tính Transit Chart (Bầu trời hiện tại)
 */
export function computeTransitChart(currentDate: Date = new Date()): PlanetaryChart {
  return calculatePlanetaryChart(currentDate, false);
}
