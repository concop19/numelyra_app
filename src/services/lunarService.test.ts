import {
  extractBirthYear,
  getBestDepartureHour,
  getCanChiHour,
  getDayActivities,
  getDayDirection,
  getHoangDaoHours,
  getNapAmYear,
  getNguHanh,
  getZodiac,
  getSolarTermMonthChiIndex,
  makeDaySnapshot,
  solarToLunar,
} from './lunarService';

describe('lunarService parity with the Swift reference', () => {
  test('converts the 2026 Lunar New Year correctly', () => {
    expect(solarToLunar(17, 2, 2026)).toEqual({ day: 1, month: 1, year: 2026, leap: false });
  });

  test('calculates Can Chi hour using Ngũ Thử Độn', () => {
    expect(getCanChiHour(0, 0)).toBe('Giáp Tý');
    expect(getCanChiHour(1, 5)).toBe('Ất Sửu');
    expect(getCanChiHour(0, 1)).toBe('Bính Tý');
    expect(getCanChiHour(0, 2)).toBe('Mậu Tý');
    expect(getCanChiHour(0, 3)).toBe('Canh Tý');
    expect(getCanChiHour(0, 4)).toBe('Nhâm Tý');
  });

  test('uses lunar birth year and Lục Thập Hoa Giáp Nạp Âm', () => {
    expect(getNapAmYear(1984)).toBe('Hải Trung Kim');
    expect(getNguHanh(1984)).toBe('Kim');
    expect(getNapAmYear(1998)).toBe('Thành Đầu Thổ');
    expect(getNguHanh(1998)).toBe('Thổ');
    expect(getNguHanh(1996)).toBe('Thủy');

    const beforeTet = extractBirthYear('1998-01-15');
    expect(beforeTet).toBe(1997);
    expect(getZodiac(beforeTet)).toBe('Sửu');
    expect(getNapAmYear(beforeTet)).toBe('Giản Hạ Thủy');
    expect(extractBirthYear('1998-06-15')).toBe(1998);
  });

  test('rotates the twelve hour stars from the correct Thanh Long position', () => {
    const hours = getHoangDaoHours(17, 2, 2026, 'Dần');
    expect(hours.filter(hour => hour.isHoangDao).map(hour => hour.name))
      .toEqual(['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi']);
    expect(hours[4]).toMatchObject({ name: 'Thìn', label: 'Thanh Long', isHoangDao: true, isDayClash: true });
    expect(hours[2]).toMatchObject({ name: 'Dần', label: 'Tư Mệnh', isHoangDao: true, isDayClash: false });
    expect(hours[8].isClash).toBe(true);
  });

  test('does not select the 23h Tý slot during the morning', () => {
    const bestHour = getBestDepartureHour(15, 2, 2026, 'Tý', 8);
    expect(bestHour).not.toBeNull();
    expect(bestHour?.name).not.toBe('Tý');
    expect(bestHour?.startHour).toBeGreaterThanOrEqual(8);
    expect(bestHour?.startHour).toBeLessThan(23);
  });

  test('calculates directions and activities from Can Chi and 12 Trực', () => {
    expect(getDayDirection(17, 2, 2026)).toMatchObject({
      hyThan: 'Chính Nam',
      taiThan: 'Chính Tây',
      hacThan: 'Đông Nam',
    });
    expect(getDayActivities(17, 2, 2026)).toMatchObject({ trucName: 'Thành', trucQuality: 'Tốt' });
  });

  test('changes Nguyệt Kiến on solar-term boundaries instead of lunar new month', () => {
    // Tiểu Hàn 2026 begins the Sửu month. The officer repeats on the
    // transition date because both the day branch and month branch advance.
    expect(getSolarTermMonthChiIndex(4, 1, 2026)).toBe(0); // Tý
    expect(getSolarTermMonthChiIndex(5, 1, 2026)).toBe(1); // Sửu
    expect(getDayActivities(4, 1, 2026).trucName).toBe('Mãn');
    expect(getDayActivities(5, 1, 2026).trucName).toBe('Mãn');

    // Lập Xuân starts the Dần month before lunar New Year in 2026.
    expect(getSolarTermMonthChiIndex(3, 2, 2026)).toBe(1); // Sửu
    expect(getSolarTermMonthChiIndex(4, 2, 2026)).toBe(2); // Dần
    expect(getDayActivities(3, 2, 2026).trucName).toBe('Nguy');
    expect(getDayActivities(4, 2, 2026).trucName).toBe('Nguy');
  });

  test('never recommends a hard-blocked activity across a full calendar year', () => {
    for (let date = new Date(2026, 0, 1, 12); date.getFullYear() === 2026; date.setDate(date.getDate() + 1)) {
      const snapshot = makeDaySnapshot(new Date(date), { birthDate: '1998-06-15', locale: 'vi' });
      const hardBlockedRecommendation = snapshot.activities.rated?.recommended.find((activity) => (
        /Nguyệt Kỵ|Tam Nương/i.test(activity.reason)
      ));
      expect(hardBlockedRecommendation).toBeUndefined();
    }
  });

  test('builds one reusable Calendar/Astrology snapshot', () => {
    const snapshot = makeDaySnapshot(new Date(2026, 1, 17, 8), { birthDate: '1998-01-15' });
    expect(snapshot).toMatchObject({
      userBirthYear: 1997,
      userZodiac: 'Sửu',
      userNguHanh: 'Thủy',
      userNapAm: 'Giản Hạ Thủy',
      canChiDay: 'Nhâm Tuất',
      canChiYear: 'Bính Ngọ',
    });
    expect(snapshot.hours).toHaveLength(12);
  });
});
