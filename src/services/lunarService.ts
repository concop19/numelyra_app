/**
 * lunarService.ts - Tính toán âm lịch, can chi, giờ hoàng đạo/hắc đạo, kỵ giờ
 * 
 * Sử dụng thuật toán Hồ Ngọc Đức cho quy đổi dương→âm
 * và bảng tra giờ hoàng đạo theo ngày can chi.
 * 
 * Nếu @baostudio/viet-lunar hoạt động tốt trên RN thì dùng luôn,
 * nếu không thì fallback sang logic tự viết bên dưới.
 */

// ============================================================
// 1. CONSTANTS
// ============================================================

const THIEN_CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const DIA_CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const GIO_INFO = [
  { name: 'Tý',   range: '23h-01h', startHour: 23 },
  { name: 'Sửu',  range: '01h-03h', startHour: 1 },
  { name: 'Dần',  range: '03h-05h', startHour: 3 },
  { name: 'Mão',  range: '05h-07h', startHour: 5 },
  { name: 'Thìn', range: '07h-09h', startHour: 7 },
  { name: 'Tỵ',   range: '09h-11h', startHour: 9 },
  { name: 'Ngọ',  range: '11h-13h', startHour: 11 },
  { name: 'Mùi',  range: '13h-15h', startHour: 13 },
  { name: 'Thân', range: '15h-17h', startHour: 15 },
  { name: 'Dậu',  range: '17h-19h', startHour: 17 },
  { name: 'Tuất', range: '19h-21h', startHour: 19 },
  { name: 'Hợi',  range: '21h-23h', startHour: 21 },
];

// Tứ Hành Xung: mỗi con giáp xung với con giáp đối diện (cách 6 vị trí)
const TU_HANH_XUNG: Record<string, string> = {
  'Tý': 'Ngọ', 'Sửu': 'Mùi', 'Dần': 'Thân', 'Mão': 'Dậu',
  'Thìn': 'Tuất', 'Tỵ': 'Hợi', 'Ngọ': 'Tý', 'Mùi': 'Sửu',
  'Thân': 'Dần', 'Dậu': 'Mão', 'Tuất': 'Thìn', 'Hợi': 'Tỵ'
};

const positiveMod = (value: number, modulus: number): number => ((value % modulus) + modulus) % modulus;

/** Vị trí sao Thanh Long theo Địa Chi ngày, đối chiếu LunarService.swift. */
const THANH_LONG_START_HOUR_BY_DAY_CHI: Record<number, number> = {
  0: 8, 6: 8,   // Tý, Ngọ → Thân
  1: 10, 7: 10, // Sửu, Mùi → Tuất
  2: 0, 8: 0,   // Dần, Thân → Tý
  3: 2, 9: 2,   // Mão, Dậu → Dần
  4: 4, 10: 4,  // Thìn, Tuất → Thìn
  5: 6, 11: 6,  // Tỵ, Hợi → Ngọ
};

const TWELVE_DAY_STARS = [
  { name: 'Thanh Long', isHoangDao: true },
  { name: 'Minh Đường', isHoangDao: true },
  { name: 'Thiên Hình', isHoangDao: false },
  { name: 'Chu Tước', isHoangDao: false },
  { name: 'Kim Quỹ', isHoangDao: true },
  { name: 'Thiên Đức', isHoangDao: true },
  { name: 'Bạch Hổ', isHoangDao: false },
  { name: 'Ngọc Đường', isHoangDao: true },
  { name: 'Thiên Lao', isHoangDao: false },
  { name: 'Huyền Vũ', isHoangDao: false },
  { name: 'Tư Mệnh', isHoangDao: true },
  { name: 'Câu Trận', isHoangDao: false },
] as const;

const LY_THUAN_PHONG_CUNG = [
  { name: 'Đại An', isGood: true },
  { name: 'Lưu Niên', isGood: false },
  { name: 'Tốc Hỷ', isGood: true },
  { name: 'Xích Khẩu', isGood: false },
  { name: 'Tiểu Cát', isGood: true },
  { name: 'Không Vong', isGood: false },
] as const;

const HY_THAN_BY_DAY_CAN = [
  'Đông Bắc', 'Tây Bắc', 'Tây Nam', 'Chính Nam', 'Đông Nam',
  'Đông Bắc', 'Tây Bắc', 'Tây Nam', 'Chính Nam', 'Đông Nam',
] as const;

const TAI_THAN_BY_DAY_CAN = [
  'Đông Nam', 'Đông Nam', 'Chính Đông', 'Chính Đông', 'Chính Bắc',
  'Chính Nam', 'Tây Nam', 'Tây Nam', 'Chính Tây', 'Tây Bắc',
] as const;

interface TrucDefinition {
  name: string;
  quality: 'Tốt' | 'Bình' | 'Xấu';
  yi: string[];
  ji: string[];
}

const THAP_NHI_KIEN_TRU: TrucDefinition[] = [
  { name: 'Kiến', quality: 'Tốt', yi: ['Xuất hành', 'Khai trương', 'Nhậm chức', 'Cưới hỏi'], ji: ['Động thổ', 'Đào giếng', 'Mở kho'] },
  { name: 'Trừ', quality: 'Tốt', yi: ['Cầu an', 'Chữa bệnh', 'Dọn dẹp', 'Cầu phúc'], ji: ['Ký kết lớn', 'Xuất hành xa', 'Cưới hỏi'] },
  { name: 'Mãn', quality: 'Tốt', yi: ['Cầu tài', 'Khai trương', 'Cúng tế', 'Hội họp'], ji: ['Kiện tụng', 'Động thổ', 'Nhậm chức'] },
  { name: 'Bình', quality: 'Bình', yi: ['Giao dịch', 'Sửa chữa', 'Hội họp', 'Di chuyển'], ji: ['Động thổ lớn', 'Đào móng', 'Kiện tụng'] },
  { name: 'Định', quality: 'Tốt', yi: ['Ký kết', 'Giao dịch', 'Cưới hỏi', 'Cầu phúc'], ji: ['Kiện tụng', 'Xuất hành xa', 'Chữa bệnh'] },
  { name: 'Chấp', quality: 'Bình', yi: ['Xây dựng', 'Sửa chữa', 'Cầu an', 'Lập kế hoạch'], ji: ['Xuất hành xa', 'Dời nhà', 'Mở kho'] },
  { name: 'Phá', quality: 'Xấu', yi: ['Phá dỡ cũ', 'Chữa bệnh', 'Dọn dẹp'], ji: ['Khai trương', 'Cưới hỏi', 'Ký kết', 'Cầu tài'] },
  { name: 'Nguy', quality: 'Xấu', yi: ['Cầu an', 'Cúng tế', 'Tĩnh dưỡng'], ji: ['Xuất hành xa', 'Động thổ', 'Mạo hiểm'] },
  { name: 'Thành', quality: 'Tốt', yi: ['Khai trương', 'Cưới hỏi', 'Ký kết', 'Nhập trạch'], ji: ['Kiện tụng', 'Tranh chấp'] },
  { name: 'Thu', quality: 'Bình', yi: ['Thu hoạch', 'Tích trữ', 'Nạp tài', 'Giao dịch'], ji: ['Khởi công lớn', 'An táng', 'Xuất hành xa'] },
  { name: 'Khai', quality: 'Tốt', yi: ['Khai trương', 'Cầu tài', 'Xuất hành', 'Nhập trạch'], ji: ['An táng', 'Kiện tụng', 'Động thổ'] },
  { name: 'Bế', quality: 'Xấu', yi: ['Tu bổ', 'Tĩnh tâm', 'Lập kế hoạch nội bộ'], ji: ['Khai trương', 'Xuất hành', 'Cưới hỏi', 'Cầu tài'] },
];

const LUC_THAP_HOA_GIAP_NAP_AM = [
  ['Hải Trung Kim', 'Kim'], ['Lư Trung Hỏa', 'Hỏa'], ['Đại Lâm Mộc', 'Mộc'],
  ['Lộ Bàng Thổ', 'Thổ'], ['Kiếm Phong Kim', 'Kim'], ['Sơn Đầu Hỏa', 'Hỏa'],
  ['Giản Hạ Thủy', 'Thủy'], ['Thành Đầu Thổ', 'Thổ'], ['Bạch Lạp Kim', 'Kim'],
  ['Dương Liễu Mộc', 'Mộc'], ['Tuyền Trung Thủy', 'Thủy'], ['Ốc Thượng Thổ', 'Thổ'],
  ['Tích Lịch Hỏa', 'Hỏa'], ['Tùng Bách Mộc', 'Mộc'], ['Trường Lưu Thủy', 'Thủy'],
  ['Sa Trung Kim', 'Kim'], ['Sơn Hạ Hỏa', 'Hỏa'], ['Bình Địa Mộc', 'Mộc'],
  ['Bích Thượng Thổ', 'Thổ'], ['Kim Bạch Kim', 'Kim'], ['Phú Đăng Hỏa', 'Hỏa'],
  ['Thiên Hà Thủy', 'Thủy'], ['Đại Trạch Thổ', 'Thổ'], ['Thoa Xuyến Kim', 'Kim'],
  ['Tang Đố Mộc', 'Mộc'], ['Đại Khê Thủy', 'Thủy'], ['Sa Trung Thổ', 'Thổ'],
  ['Thiên Thượng Hỏa', 'Hỏa'], ['Thạch Lựu Mộc', 'Mộc'], ['Đại Hải Thủy', 'Thủy'],
] as const;

// ============================================================
// 2. THUẬT TOÁN ÂM LỊCH (Hồ Ngọc Đức)
// ============================================================

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat: number;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return Jd1 + C1 - deltat;
}

function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return L;
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  return Math.floor(sunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean; // tháng nhuận
}

export function solarToLunar(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}

// ============================================================
// 3. CAN CHI
// ============================================================

export function getCanChiYear(lunarYear: number): string {
  const canIdx = ((lunarYear - 4) % 10 + 10) % 10;
  const chiIdx = ((lunarYear - 4) % 12 + 12) % 12;
  return `${THIEN_CAN[canIdx]} ${DIA_CHI[chiIdx]}`;
}

export function getCanChiMonth(lunarMonth: number, lunarYear: number): string {
  // Thiên Can tháng phụ thuộc vào Thiên Can năm
  const yearCanIdx = ((lunarYear - 4) % 10 + 10) % 10;
  // Công thức: Can tháng Giêng = (Can năm * 2 + 1) % 10 (0-indexed: Giáp=0)
  const monthCanStart = (yearCanIdx * 2 + 2) % 10;
  const canIdx = (monthCanStart + lunarMonth - 1) % 10;
  const chiIdx = (lunarMonth + 1) % 12; // tháng Giêng = Dần (index 2)
  return `${THIEN_CAN[canIdx]} ${DIA_CHI[chiIdx]}`;
}

export function getCanChiDay(dd: number, mm: number, yy: number): string {
  const jd = jdFromDate(dd, mm, yy);
  const canIdx = ((jd + 9) % 10 + 10) % 10;
  const chiIdx = ((jd + 1) % 12 + 12) % 12;
  return `${THIEN_CAN[canIdx]} ${DIA_CHI[chiIdx]}`;
}

export function getDayThienCan(dd: number, mm: number, yy: number): number {
  const jd = jdFromDate(dd, mm, yy);
  return positiveMod(jd + 9, 10);
}

export function getDayDiaChi(dd: number, mm: number, yy: number): number {
  const jd = jdFromDate(dd, mm, yy);
  return positiveMod(jd + 1, 12);
}

/** Chỉ số trong vòng Lục Thập Hoa Giáp, 0 = Giáp Tý. */
export function getDaySexagenaryIndex(dd: number, mm: number, yy: number): number {
  return positiveMod(jdFromDate(dd, mm, yy) + 49, 60);
}

/** Can Chi giờ theo Ngũ Thử Độn. */
export function getCanChiHour(hourChiIdx: number, dayCanIdx: number): string {
  const chiIdx = positiveMod(hourChiIdx, 12);
  const canStart = positiveMod((positiveMod(dayCanIdx, 10) % 5) * 2, 10);
  return `${THIEN_CAN[positiveMod(canStart + chiIdx, 10)]} ${DIA_CHI[chiIdx]}`;
}

/**
 * Lấy năm sinh âm lịch từ ngày sinh dương lịch. Không dùng `new Date(string)` để
 * tránh ngày bị dịch do múi giờ trên Android/iOS.
 */
export function extractBirthYear(birthDate?: string | null, fallbackYear = 1998): number {
  const raw = birthDate?.trim();
  if (!raw) return fallbackYear;

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    if (year > 1800 && year < 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return solarToLunar(day, month, year).year;
    }
  }

  const viMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
  if (viMatch) {
    const [, day, month, year] = viMatch.map(Number);
    if (year > 1800 && year < 2200 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return solarToLunar(day, month, year).year;
    }
  }

  const year = Number(raw.slice(0, 4));
  return Number.isInteger(year) && year > 1800 && year < 2200 ? year : fallbackYear;
}

export function getZodiac(birthYear: number): string {
  return DIA_CHI[positiveMod(birthYear - 4, 12)];
}

export interface NapAmInfo {
  name: string;
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
}

export function getNapAm(birthYear: number): NapAmInfo {
  const [name, element] = LUC_THAP_HOA_GIAP_NAP_AM[Math.floor(positiveMod(birthYear - 4, 60) / 2)];
  return { name, element };
}

export function getNapAmYear(birthYear: number): string {
  return getNapAm(birthYear).name;
}

/** Ngũ Hành Nạp Âm của năm sinh, không phải chỉ riêng hành của Thiên Can. */
export function getNguHanh(birthYear: number): NapAmInfo['element'] {
  return getNapAm(birthYear).element;
}

// ============================================================
// 4. GIỜ HOÀNG ĐẠO / HẮC ĐẠO
// ============================================================

export interface HourInfo {
  name: string;       // Tý, Sửu, Dần...
  canChi: string;     // Giáp Tý, Ất Sửu...
  range: string;      // "23h-01h"
  startHour: number;  // 23, 1, 3...
  isHoangDao: boolean;
  isClash: boolean;   // kỵ tuổi
  isDayClash: boolean; // Nhật Phá: xung với Địa Chi ngày
  label: string;      // "Thanh Long", "Minh Đường"...
  lyThuanPhong: string;
  isLyThuanPhongGood: boolean;
}

export function getLyThuanPhongHour(lunarDay: number, lunarMonth: number, hourChiIdx: number) {
  return LY_THUAN_PHONG_CUNG[positiveMod(lunarMonth + lunarDay + hourChiIdx - 2, 6)];
}

export function getHoangDaoHours(dd: number, mm: number, yy: number, zodiac?: string): HourInfo[] {
  const lunar = solarToLunar(dd, mm, yy);
  const dayCanIdx = getDayThienCan(dd, mm, yy);
  const dayChiIdx = getDayDiaChi(dd, mm, yy);
  const thanhLongStart = THANH_LONG_START_HOUR_BY_DAY_CHI[dayChiIdx] ?? 0;
  const userClashHour = zodiac ? TU_HANH_XUNG[zodiac] : undefined;
  const dayClashHour = TU_HANH_XUNG[DIA_CHI[dayChiIdx]];

  return GIO_INFO.map((gio, idx) => {
    const star = TWELVE_DAY_STARS[positiveMod(idx - thanhLongStart, 12)];
    const lyThuanPhong = getLyThuanPhongHour(lunar.day, lunar.month, idx);
    return {
      name: gio.name,
      canChi: getCanChiHour(idx, dayCanIdx),
      range: gio.range,
      startHour: gio.startHour,
      isHoangDao: star.isHoangDao,
      isClash: userClashHour === gio.name,
      isDayClash: dayClashHour === gio.name,
      label: star.name,
      lyThuanPhong: lyThuanPhong.name,
      isLyThuanPhongGood: lyThuanPhong.isGood,
    };
  });
}

// ============================================================
// 5. GIỜ XUẤT HÀNH ĐẠI CÁT
// ============================================================

export function getBestDepartureHour(
  dd: number,
  mm: number,
  yy: number,
  zodiac: string,
  currentHour = new Date().getHours(),
): HourInfo | null {
  const chronologicalHours = [...getHoangDaoHours(dd, mm, yy, zodiac)]
    .sort((a, b) => a.startHour - b.startHour);
  const candidates = chronologicalHours.filter(hour => hour.isHoangDao && !hour.isClash);
  if (candidates.length === 0) return null;

  const tiers = [
    candidates.filter(hour => !hour.isDayClash && hour.isLyThuanPhongGood),
    candidates.filter(hour => !hour.isDayClash),
    candidates,
  ];

  for (const tier of tiers) {
    const upcoming = tier.find(hour => hour.startHour >= currentHour);
    if (upcoming) return upcoming;
  }
  return tiers.find(tier => tier.length > 0)?.[0] ?? candidates[0];
}

// ============================================================
// 6. NGÀY TỐT / XẤU — VIỆC NÊN/KIÊNG
// ============================================================

export interface DayActivities {
  trucName: string;
  trucQuality: 'Tốt' | 'Bình' | 'Xấu';
  yi: string[];
  ji: string[];
}

export function getDayActivities(dd: number, mm: number, yy: number): DayActivities {
  const lunar = solarToLunar(dd, mm, yy);
  const dayChiIdx = getDayDiaChi(dd, mm, yy);
  const monthChiIdx = positiveMod(lunar.month + 1, 12); // Tháng Giêng = Dần
  const truc = THAP_NHI_KIEN_TRU[positiveMod(dayChiIdx - monthChiIdx, 12)];
  return {
    trucName: truc.name,
    trucQuality: truc.quality,
    yi: [...truc.yi],
    ji: [...truc.ji],
  };
}

// ============================================================
// 7. NGÀY KIÊNG CỮ ĐẶC BIỆT
// ============================================================

/**
 * Nguyệt Kỵ: mùng 5, 14, 23 âm lịch
 * Tam Nương: mùng 3, 7, 13, 18, 22, 27 âm lịch
 */
export function isNguyetKy(lunarDay: number): boolean {
  return [5, 14, 23].includes(lunarDay);
}

export function isTamNuong(lunarDay: number): boolean {
  return [3, 7, 13, 18, 22, 27].includes(lunarDay);
}

export function getDayWarning(lunarDay: number): string | null {
  if (isNguyetKy(lunarDay)) {
    return '⚠️ Ngày Nguyệt Kỵ — nên hạn chế khởi sự việc lớn';
  }
  if (isTamNuong(lunarDay)) {
    return '⚠️ Ngày Tam Nương — không nên cưới hỏi, khai trương';
  }
  return null;
}

// ============================================================
// 8. HƯỚNG XUẤT HÀNH
// ============================================================

export interface DayDirection {
  huong: string;
  than: string;
  hyThan: string;
  taiThan: string;
  hacThan: string | null;
}

/** Hướng Hạc Thần theo chu kỳ 60 ngày; null nghĩa là Hạc Thần tại thiên. */
export function getHacThanDirection(dd: number, mm: number, yy: number): string | null {
  const idx = getDaySexagenaryIndex(dd, mm, yy);
  if (idx >= 29 && idx <= 44) return null;
  if (idx >= 45 && idx <= 50) return 'Đông Bắc';
  if (idx >= 51 && idx <= 55) return 'Chính Đông';
  if (idx >= 56 || idx <= 1) return 'Đông Nam';
  if (idx >= 2 && idx <= 6) return 'Chính Nam';
  if (idx >= 7 && idx <= 12) return 'Tây Nam';
  if (idx >= 13 && idx <= 17) return 'Chính Tây';
  if (idx >= 18 && idx <= 23) return 'Tây Bắc';
  if (idx >= 24 && idx <= 28) return 'Chính Bắc';
  return null;
}

export function getDayDirection(dd: number, mm: number, yy: number): DayDirection {
  const dayCanIdx = getDayThienCan(dd, mm, yy);
  const hyThan = HY_THAN_BY_DAY_CAN[dayCanIdx];
  const taiThan = TAI_THAN_BY_DAY_CAN[dayCanIdx];
  return {
    huong: hyThan === taiThan ? hyThan : `${hyThan} (Hỷ) · ${taiThan} (Tài)`,
    than: 'Hỷ Thần & Tài Thần',
    hyThan,
    taiThan,
    hacThan: getHacThanDirection(dd, mm, yy),
  };
}

// ============================================================
// 9. TIỆN ÍCH & MỞ RỘNG CHO TỜ LỊCH BLỐC TRUYỀN THỐNG
// ============================================================

export function formatLunarDate(lunar: LunarDate): string {
  const leapStr = lunar.leap ? ' (nhuận)' : '';
  return `Ngày ${lunar.day} tháng ${lunar.month}${leapStr} năm ${getCanChiYear(lunar.year)}`;
}

/** Thứ trong tuần tiếng Việt */
export function getDayOfWeekVi(date: Date): string {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[date.getDay()];
}

/** Thứ trong tuần tiếng Anh */
export function getDayOfWeekEn(date: Date): string {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[date.getDay()];
}

/** Tên tháng tiếng Anh */
export function getMonthEn(month: number): string {
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  return months[month - 1] || '';
}

/**
 * Tính Ngày Hoàng Đạo / Ngày Hắc Đạo theo tháng âm lịch và địa chi ngày.
 */
const NGAY_HOANG_DAO_START: Record<number, number> = {
  1: 0, 7: 0,   // Tháng 1, 7 bắt đầu từ Tý
  2: 2, 8: 2,   // Tháng 2, 8 bắt đầu từ Dần
  3: 4, 9: 4,   // Tháng 3, 9 bắt đầu từ Thìn
  4: 6, 10: 6,  // Tháng 4, 10 bắt đầu từ Ngọ
  5: 8, 11: 8,  // Tháng 5, 11 bắt đầu từ Thân
  6: 10, 12: 10 // Tháng 6, 12 bắt đầu từ Tuất
};

export function getDayHoangDaoStatus(dd: number, mm: number, yy: number, lunarMonth: number): { isHoangDao: boolean; label: string } {
  const dayChiIdx = getDayDiaChi(dd, mm, yy);
  const m = ((lunarMonth - 1) % 12) + 1;
  const startOffset = NGAY_HOANG_DAO_START[m] ?? 0;
  const relOffset = (dayChiIdx - startOffset + 12) % 12;

  // Các sao Hoàng Đạo theo thứ tự 12 sao:
  // 0: Thanh Long (HĐ), 1: Minh Đường (HĐ), 2: Thiên Hình (Hắc), 3: Chu Tước (Hắc),
  // 4: Kim Quỹ (HĐ), 5: Thiên Đức (HĐ), 6: Bạch Hổ (Hắc), 7: Ngọc Đường (HĐ),
  // 8: Thiên Lao (Hắc), 9: Huyền Vũ (Hắc), 10: Tư Mệnh (HĐ), 11: Câu Trận (Hắc)
  const SAO_NAMES = [
    { name: 'Thanh Long', isHD: true },
    { name: 'Minh Đường', isHD: true },
    { name: 'Thiên Hình', isHD: false },
    { name: 'Chu Tước', isHD: false },
    { name: 'Kim Quỹ', isHD: true },
    { name: 'Thiên Đức', isHD: true },
    { name: 'Bạch Hổ', isHD: false },
    { name: 'Ngọc Đường', isHD: true },
    { name: 'Thiên Lao', isHD: false },
    { name: 'Huyền Vũ', isHD: false },
    { name: 'Tư Mệnh', isHD: true },
    { name: 'Câu Trận', isHD: false }
  ];

  const sao = SAO_NAMES[relOffset] || SAO_NAMES[0];
  return {
    isHoangDao: sao.isHD,
    label: sao.isHD ? `Ngày Hoàng đạo (${sao.name})` : `Ngày Hắc đạo (${sao.name})`
  };
}

/**
 * Tính 24 Tiết Khí dựa vào kinh độ Mặt Trời (Sun Longitude)
 */
const TIET_KHI = [
  'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
  'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
  'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
  'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập'
];

export function getSolarTerm(dd: number, mm: number, yy: number): string {
  const jdn = jdFromDate(dd, mm, yy);
  const rad = sunLongitude(jdn - 0.5 - 7 / 24);
  let deg = (rad * 180 / Math.PI) % 360;
  if (deg < 0) deg += 360;
  const idx = Math.floor(deg / 15) % 24;
  return TIET_KHI[idx] || 'Lập xuân';
}

/**
 * Kiểm tra tháng âm lịch là Tháng Đủ [Đ] (30 ngày) hay Tháng Thiếu [T] (29 ngày)
 */
export function isLunarMonthFull(dd: number, mm: number, yy: number, lunarMonth: number, lunarYear: number): boolean {
  // So sánh khoảng cách giữa 2 kỳ sóc kế tiếp
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  const nm1 = getNewMoonDay(k, 7);
  const nm2 = getNewMoonDay(k + 1, 7);
  const nm3 = getNewMoonDay(k + 2, 7);

  if (dayNumber >= nm2) {
    return (nm3 - nm2) >= 30;
  }
  return (nm2 - nm1) >= 30;
}

/**
 * Thông tin tuần (Tuần thứ mấy trong năm & danh sách 7 ngày từ Thứ 2 đến CN)
 */
export interface WeekDayItem {
  date: Date;
  dayNumber: number;
  dayOfWeekVi: string;
  dayOfWeekShort: string;
  isCurrentDay: boolean;
}

export interface WeekInfo {
  weekNumber: number;
  days: WeekDayItem[];
}

export function getWeekInfo(currentDate: Date): WeekInfo {
  // ISO Week Number
  const target = new Date(currentDate.valueOf());
  const dayNr = (currentDate.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  // Tìm ngày Thứ 2 của tuần chứa currentDate
  const monday = new Date(currentDate);
  const currentDayOfWeek = currentDate.getDay(); // 0 = CN, 1 = T2...
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  monday.setDate(currentDate.getDate() + diffToMonday);

  const shortNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  const fullNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

  const days: WeekDayItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: d,
      dayNumber: d.getDate(),
      dayOfWeekVi: fullNames[i],
      dayOfWeekShort: shortNames[i],
      isCurrentDay: d.getDate() === currentDate.getDate() &&
                    d.getMonth() === currentDate.getMonth() &&
                    d.getFullYear() === currentDate.getFullYear()
    });
  }

  return { weekNumber, days };
}

/** Dữ liệu lịch đã chuẩn hóa để Calendar và lớp phân tích Astrology dùng chung. */
export interface LunarDaySnapshot {
  solarDate: Date;
  day: number;
  month: number;
  year: number;
  weekdayVi: string;
  lunarDate: LunarDate;
  isLunarMonthFull: boolean;
  canChiDay: string;
  canChiMonth: string;
  canChiYear: string;
  dayHoangDaoStatus: { isHoangDao: boolean; label: string };
  solarTerm: string;
  hours: HourInfo[];
  bestDepartureHour: HourInfo | null;
  direction: DayDirection;
  activities: DayActivities;
  warning: string | null;
  weekInfo: WeekInfo;
  userBirthYear: number;
  userZodiac: string;
  userNguHanh: NapAmInfo['element'];
  userNapAm: string;
}

export interface LunarDaySnapshotOptions {
  birthDate?: string | null;
  currentHour?: number;
  timeZone?: number;
}

export function makeDaySnapshot(
  date: Date,
  options: LunarDaySnapshotOptions = {},
): LunarDaySnapshot {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const lunarDate = solarToLunar(day, month, year, options.timeZone ?? 7);
  const userBirthYear = extractBirthYear(options.birthDate);
  const userZodiac = getZodiac(userBirthYear);
  const napAm = getNapAm(userBirthYear);
  const hours = getHoangDaoHours(day, month, year, userZodiac);

  return {
    solarDate: date,
    day,
    month,
    year,
    weekdayVi: getDayOfWeekVi(date),
    lunarDate,
    isLunarMonthFull: isLunarMonthFull(day, month, year, lunarDate.month, lunarDate.year),
    canChiDay: getCanChiDay(day, month, year),
    canChiMonth: getCanChiMonth(lunarDate.month, lunarDate.year),
    canChiYear: getCanChiYear(lunarDate.year),
    dayHoangDaoStatus: getDayHoangDaoStatus(day, month, year, lunarDate.month),
    solarTerm: getSolarTerm(day, month, year),
    hours,
    bestDepartureHour: getBestDepartureHour(
      day,
      month,
      year,
      userZodiac,
      options.currentHour ?? date.getHours(),
    ),
    direction: getDayDirection(day, month, year),
    activities: getDayActivities(day, month, year),
    warning: getDayWarning(lunarDate.day),
    weekInfo: getWeekInfo(date),
    userBirthYear,
    userZodiac,
    userNguHanh: napAm.element,
    userNapAm: napAm.name,
  };
}
