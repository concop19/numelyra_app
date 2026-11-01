import type { AppLocale } from './translations';

const HEAVENLY_STEMS_EN: Record<string, string> = {
  'Giáp': 'Yang Wood',
  'Ất': 'Yin Wood',
  'Bính': 'Yang Fire',
  'Đinh': 'Yin Fire',
  'Mậu': 'Yang Earth',
  'Kỷ': 'Yin Earth',
  'Canh': 'Yang Metal',
  'Tân': 'Yin Metal',
  'Nhâm': 'Yang Water',
  'Quý': 'Yin Water',
};

const EARTHLY_BRANCHES_EN: Record<string, string> = {
  'Tý': 'Rat',
  'Sửu': 'Ox',
  'Dần': 'Tiger',
  'Mão': 'Cat',
  'Thìn': 'Dragon',
  'Tỵ': 'Snake',
  'Ngọ': 'Horse',
  'Mùi': 'Goat',
  'Thân': 'Monkey',
  'Dậu': 'Rooster',
  'Tuất': 'Dog',
  'Hợi': 'Pig',
};

const DIRECTIONS_EN: Record<string, string> = {
  'Chính Bắc': 'North',
  'Đông Bắc': 'Northeast',
  'Chính Đông': 'East',
  'Đông Nam': 'Southeast',
  'Chính Nam': 'South',
  'Tây Nam': 'Southwest',
  'Chính Tây': 'West',
  'Tây Bắc': 'Northwest',
};

const HOUR_STARS_EN: Record<string, string> = {
  'Thanh Long': 'Azure Dragon',
  'Minh Đường': 'Bright Hall',
  'Thiên Hình': 'Heavenly Punishment',
  'Chu Tước': 'Vermilion Bird',
  'Kim Quỹ': 'Golden Coffer',
  'Thiên Đức': 'Heavenly Virtue',
  'Bạch Hổ': 'White Tiger',
  'Ngọc Đường': 'Jade Hall',
  'Thiên Lao': 'Heavenly Prison',
  'Huyền Vũ': 'Black Tortoise',
  'Tư Mệnh': 'Life Guardian',
  'Câu Trận': 'Hook Array',
};

const LY_THUAN_PHONG_EN: Record<string, string> = {
  'Đại An': 'Great Peace',
  'Lưu Niên': 'Lingering Year',
  'Tốc Hỷ': 'Swift Joy',
  'Xích Khẩu': 'Red Mouth',
  'Tiểu Cát': 'Small Fortune',
  'Không Vong': 'Emptiness',
};

const DAY_OFFICERS_EN: Record<string, string> = {
  'Kiến': 'Establish',
  'Trừ': 'Remove',
  'Mãn': 'Full',
  'Bình': 'Balance',
  'Định': 'Stable',
  'Chấp': 'Hold',
  'Phá': 'Destruction',
  'Nguy': 'Danger',
  'Thành': 'Success',
  'Thu': 'Receive',
  'Khai': 'Open',
  'Bế': 'Close',
};

const SOLAR_TERMS_EN: Record<string, string> = {
  'Xuân phân': 'Spring Equinox',
  'Thanh minh': 'Clear and Bright',
  'Cốc vũ': 'Grain Rain',
  'Lập hạ': 'Start of Summer',
  'Tiểu mãn': 'Grain Full',
  'Mang chủng': 'Grain in Ear',
  'Hạ chí': 'Summer Solstice',
  'Tiểu thử': 'Minor Heat',
  'Đại thử': 'Major Heat',
  'Lập thu': 'Start of Autumn',
  'Xử thử': 'End of Heat',
  'Bạch lộ': 'White Dew',
  'Thu phân': 'Autumn Equinox',
  'Hàn lộ': 'Cold Dew',
  'Sương giáng': "Frost's Descent",
  'Lập đông': 'Start of Winter',
  'Tiểu tuyết': 'Minor Snow',
  'Đại tuyết': 'Major Snow',
  'Đông chí': 'Winter Solstice',
  'Tiểu hàn': 'Minor Cold',
  'Đại hàn': 'Major Cold',
  'Lập xuân': 'Start of Spring',
  'Vũ thủy': 'Rain Water',
  'Kinh trập': 'Awakening of Insects',
};

const FIVE_ELEMENTS_EN: Record<string, string> = {
  'Kim': 'Metal',
  'Mộc': 'Wood',
  'Thủy': 'Water',
  'Hỏa': 'Fire',
  'Thổ': 'Earth',
};

function localizedTerm(value: string | undefined, locale: AppLocale, terms: Record<string, string>): string {
  if (!value || locale === 'vi') return value ?? '';
  return terms[value] ?? value;
}

export function localizeZodiac(value: string | undefined, locale: AppLocale): string {
  return localizedTerm(value, locale, EARTHLY_BRANCHES_EN);
}

export function localizeCanChi(value: string | undefined, locale: AppLocale): string {
  if (!value || locale === 'vi') return value ?? '';
  const [stem, branch, ...rest] = value.trim().split(/\s+/);
  if (!HEAVENLY_STEMS_EN[stem] || !EARTHLY_BRANCHES_EN[branch] || rest.length > 0) return value;
  return `${HEAVENLY_STEMS_EN[stem]} ${EARTHLY_BRANCHES_EN[branch]}`;
}

export function localizeDirection(value: string | undefined | null, locale: AppLocale): string {
  return localizedTerm(value ?? undefined, locale, DIRECTIONS_EN);
}

export function localizeHourStar(value: string | undefined, locale: AppLocale): string {
  return localizedTerm(value, locale, HOUR_STARS_EN);
}

export function localizeLyThuanPhong(value: string | undefined, locale: AppLocale): string {
  return localizedTerm(value, locale, LY_THUAN_PHONG_EN);
}

export function localizeDayOfficer(value: string | undefined, locale: AppLocale): string {
  return localizedTerm(value, locale, DAY_OFFICERS_EN);
}

export function localizeSolarTerm(value: string | undefined, locale: AppLocale): string {
  return localizedTerm(value, locale, SOLAR_TERMS_EN);
}

export function localizeFiveElement(value: string | undefined, locale: AppLocale): string {
  return localizedTerm(value, locale, FIVE_ELEMENTS_EN);
}

export function localizeHourRange(value: string, locale: AppLocale): string {
  const separated = value.replace('-', ' – ');
  return locale === 'en' ? separated.replace(/(\d{2})h/g, '$1:00') : separated;
}

export function localizeCalendarWarning(value: string | null | undefined, locale: AppLocale): string {
  if (!value || locale === 'vi') return value ?? '';
  if (value.includes('Ngày Nguyệt Kỵ')) {
    return '⚠️ Monthly taboo day — avoid starting major undertakings';
  }
  if (value.includes('Ngày Tam Nương')) {
    return '⚠️ Tam Nuong day — avoid weddings and grand openings';
  }
  return value;
}

export function localizeDayQualityLabel(
  value: { isHoangDao: boolean; label: string } | undefined,
  locale: AppLocale,
): string {
  if (!value || locale === 'vi') return value?.label ?? '';
  const star = /\(([^)]+)\)/.exec(value.label)?.[1];
  const quality = value.isHoangDao ? 'Favorable day' : 'Cautious day';
  return star ? `${quality} (${localizeHourStar(star, locale)})` : quality;
}
