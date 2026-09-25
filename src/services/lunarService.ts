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

function getDayDiaChi(dd: number, mm: number, yy: number): number {
  const jd = jdFromDate(dd, mm, yy);
  return ((jd + 1) % 12 + 12) % 12;
}

// ============================================================
// 4. GIỜ HOÀNG ĐẠO / HẮC ĐẠO
// ============================================================

/**
 * Bảng giờ Hoàng Đạo theo Địa Chi ngày.
 * Mỗi ngày (theo Địa Chi) có 6 giờ Hoàng Đạo cố định.
 * Index 0-11 tương ứng với 12 giờ trong ngày (Tý đến Hợi).
 * true = Hoàng Đạo (tốt), false = Hắc Đạo (xấu).
 * 
 * Quy luật "Tý Ngọ Mão Dậu gia Thanh Long":
 * - Ngày Tý/Ngọ: Hoàng Đạo bắt đầu từ giờ Tý
 * - Ngày Sửu/Mùi: Hoàng Đạo bắt đầu từ giờ Dần
 * - Ngày Dần/Thân: Hoàng Đạo bắt đầu từ giờ Thìn
 * - Ngày Mão/Dậu: Hoàng Đạo bắt đầu từ giờ Ngọ
 * - Ngày Thìn/Tuất: Hoàng Đạo bắt đầu từ giờ Thân
 * - Ngày Tỵ/Hợi: Hoàng Đạo bắt đầu từ giờ Tuất
 * 
 * Pattern lặp: Hoàng Đạo tại offset 0,1,3,6,8,9 (từ vị trí bắt đầu)
 */
const HOANG_DAO_OFFSETS = [0, 1, 3, 6, 8, 9];
const HOANG_DAO_START: Record<number, number> = {
  0: 0,  // Ngày Tý → bắt đầu giờ Tý (index 0)
  6: 0,  // Ngày Ngọ → bắt đầu giờ Tý
  1: 2,  // Ngày Sửu → bắt đầu giờ Dần (index 2)
  7: 2,  // Ngày Mùi → bắt đầu giờ Dần
  2: 4,  // Ngày Dần → bắt đầu giờ Thìn (index 4)
  8: 4,  // Ngày Thân → bắt đầu giờ Thìn
  3: 6,  // Ngày Mão → bắt đầu giờ Ngọ (index 6)
  9: 6,  // Ngày Dậu → bắt đầu giờ Ngọ
  4: 8,  // Ngày Thìn → bắt đầu giờ Thân (index 8)
  10: 8, // Ngày Tuất → bắt đầu giờ Thân
  5: 10, // Ngày Tỵ → bắt đầu giờ Tuất (index 10)
  11: 10 // Ngày Hợi → bắt đầu giờ Tuất
};

export interface HourInfo {
  name: string;       // Tý, Sửu, Dần...
  range: string;      // "23h-01h"
  startHour: number;  // 23, 1, 3...
  isHoangDao: boolean;
  isClash: boolean;   // kỵ tuổi
  label: string;      // "Thanh Long", "Minh Đường"...
}

// Tên các giờ Hoàng Đạo theo thứ tự
const HOANG_DAO_NAMES = ['Thanh Long', 'Minh Đường', 'Kim Quỹ', 'Thiên Đức', 'Ngọc Đường', 'Tư Mệnh'];
const HAC_DAO_NAMES = ['Thiên Hình', 'Chu Tước', 'Bạch Hổ', 'Thiên Lao', 'Huyền Vũ', 'Câu Trận'];

export function getHoangDaoHours(dd: number, mm: number, yy: number, zodiac?: string): HourInfo[] {
  const dayChiIdx = getDayDiaChi(dd, mm, yy);
  const startOffset = HOANG_DAO_START[dayChiIdx] ?? 0;

  // Xây set giờ Hoàng Đạo
  const hoangDaoSet = new Set<number>();
  for (const offset of HOANG_DAO_OFFSETS) {
    hoangDaoSet.add((startOffset + offset) % 12);
  }

  // Giờ kỵ theo tuổi
  const clashHour = zodiac ? TU_HANH_XUNG[zodiac] : null;

  let hdIdx = 0;
  let hacIdx = 0;

  return GIO_INFO.map((gio, idx) => {
    const isHoangDao = hoangDaoSet.has(idx);
    const isClash = clashHour === gio.name;
    let label: string;
    if (isHoangDao) {
      label = HOANG_DAO_NAMES[hdIdx % HOANG_DAO_NAMES.length];
      hdIdx++;
    } else {
      label = HAC_DAO_NAMES[hacIdx % HAC_DAO_NAMES.length];
      hacIdx++;
    }
    return {
      name: gio.name,
      range: gio.range,
      startHour: gio.startHour,
      isHoangDao,
      isClash,
      label
    };
  });
}

// ============================================================
// 5. GIỜ XUẤT HÀNH ĐẠI CÁT
// ============================================================

export function getBestDepartureHour(dd: number, mm: number, yy: number, zodiac: string): HourInfo | null {
  const hours = getHoangDaoHours(dd, mm, yy, zodiac);
  const currentHour = new Date().getHours();

  // Ưu tiên: Hoàng Đạo + không kỵ tuổi + chưa qua giờ hiện tại
  const candidates = hours.filter(h => h.isHoangDao && !h.isClash);

  // Tìm giờ gần nhất chưa qua
  const future = candidates.filter(h => h.startHour >= currentHour);
  if (future.length > 0) return future[0];

  // Nếu không còn giờ tốt trong ngày, trả về giờ tốt đầu tiên
  return candidates.length > 0 ? candidates[0] : null;
}

// ============================================================
// 6. NGÀY TỐT / XẤU — VIỆC NÊN/KIÊNG
// ============================================================

const VIEC_YI = [
  ['Cầu tài', 'Khai trương', 'Giao dịch', 'Xuất hành'],
  ['Cưới hỏi', 'Ăn hỏi', 'Cầu phúc', 'Dời nhà'],
  ['Động thổ', 'Xây dựng', 'Sửa chữa', 'Cầu an'],
  ['Khai trương', 'Nhập trạch', 'An táng', 'Xuất hành'],
  ['Cầu phúc', 'Giao dịch', 'Hội họp', 'Ký kết'],
  ['Cưới hỏi', 'Cầu tài', 'Xuất hành', 'Khai trương'],
];

const VIEC_JI = [
  ['Tranh chấp', 'Kiện tụng'],
  ['Động thổ', 'Phá tường'],
  ['Cưới hỏi', 'Khai trương'],
  ['Tranh chấp', 'Xuất hành xa'],
  ['Động thổ', 'Phá tường'],
  ['Kiện tụng', 'An táng'],
];

export function getDayActivities(dd: number, mm: number, yy: number): { yi: string[], ji: string[] } {
  const jd = jdFromDate(dd, mm, yy);
  const idx = ((jd % 6) + 6) % 6;
  return {
    yi: VIEC_YI[idx],
    ji: VIEC_JI[idx]
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

const HUONG_XUAT_HANH = [
  { huong: 'Đông Bắc', than: 'Hỷ Thần' },
  { huong: 'Tây Bắc', than: 'Tài Thần' },
  { huong: 'Đông Nam', than: 'Hỷ Thần' },
  { huong: 'Tây Nam', than: 'Tài Thần' },
  { huong: 'Chính Đông', than: 'Hỷ Thần' },
  { huong: 'Chính Tây', than: 'Tài Thần' },
  { huong: 'Chính Nam', than: 'Hỷ Thần' },
  { huong: 'Chính Bắc', than: 'Tài Thần' },
];

export function getDayDirection(dd: number, mm: number, yy: number): { huong: string, than: string } {
  const jd = jdFromDate(dd, mm, yy);
  const idx = ((jd % 8) + 8) % 8;
  return HUONG_XUAT_HANH[idx];
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
