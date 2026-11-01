import {
  localizeCalendarWarning,
  localizeCanChi,
  localizeDayOfficer,
  localizeDayQualityLabel,
  localizeDirection,
  localizeHourRange,
  localizeHourStar,
  localizeLyThuanPhong,
  localizeSolarTerm,
  localizeZodiac,
} from './calendarPresentation';

describe('calendar presentation localization', () => {
  it('localizes the Can Chi values shown on the lunar-date card', () => {
    expect(localizeCanChi('Bính Ngọ', 'en')).toBe('Yang Fire Horse');
    expect(localizeCanChi('Mậu Tuất', 'en')).toBe('Yang Earth Dog');
    expect(localizeCanChi('Kỷ Mão', 'en')).toBe('Yin Earth Cat');
    expect(localizeCanChi('Bính Ngọ', 'vi')).toBe('Bính Ngọ');
  });

  it('localizes all twelve zodiac-hour names', () => {
    const vietnamese = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    expect(vietnamese.map((name) => localizeZodiac(name, 'en'))).toEqual([
      'Rat', 'Ox', 'Tiger', 'Cat', 'Dragon', 'Snake',
      'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
    ]);
  });

  it('localizes the remaining dynamic terms in the hour sheet', () => {
    expect(localizeHourStar('Tư Mệnh', 'en')).toBe('Life Guardian');
    expect(localizeLyThuanPhong('Đại An', 'en')).toBe('Great Peace');
    expect(localizeDirection('Đông Bắc', 'en')).toBe('Northeast');
    expect(localizeDayOfficer('Thành', 'en')).toBe('Success');
    expect(localizeHourRange('23h-01h', 'en')).toBe('23:00 – 01:00');
  });

  it('localizes detail-modal values without changing the calculation result', () => {
    expect(localizeSolarTerm('Lập xuân', 'en')).toBe('Start of Spring');
    expect(localizeCalendarWarning('⚠️ Ngày Nguyệt Kỵ — nên hạn chế khởi sự việc lớn', 'en'))
      .toBe('⚠️ Monthly taboo day — avoid starting major undertakings');
    expect(localizeDayQualityLabel({ isHoangDao: true, label: 'Ngày Hoàng đạo (Thanh Long)' }, 'en'))
      .toBe('Favorable day (Azure Dragon)');
  });
});
