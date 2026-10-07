import {
  generatePureAstroVector,
  calculateVectorCosineSimilarity,
  resolveDominantAstroSignal,
} from '../astroVectorEngine';
import {
  computeNatalChart,
  resolveBirthDate,
  calculateTemperamentBalance,
  calculateAngles,
  calculatePorphyryCusps,
  houseForLongitude,
} from '../astroEngine';
import {
  calculateAspectScores,
  getShortestAngleDiff,
  type DetectedAspect,
} from '../aspectCalculator';

function aspect(
  transitPlanet: string,
  natalPlanet: string,
  nature: DetectedAspect['nature'],
  type: DetectedAspect['type'],
  weight = 1
): DetectedAspect {
  return {
    transitPlanet,
    natalPlanet,
    nature,
    type,
    weight,
    symbol: '',
    nameVi: '',
    targetAngle: 0,
    actualAngle: 0,
    orb: 0,
  };
}

describe('Pure Astrology Feature Vector Engine', () => {
  const fixedTestCurrentDate = new Date('2026-10-04T12:00:00Z');

  describe('resolveBirthDate & Noon Chart Fallback', () => {
    it('sử dụng Noon chart 12:00 UTC khi người dùng không nhập giờ sinh', () => {
      const resolved = resolveBirthDate('1998-10-20');
      expect(resolved.isTimeEstimated).toBe(true);
      expect(resolved.date.getUTCHours()).toBe(12);
      expect(resolved.date.getUTCMinutes()).toBe(0);
      expect(resolved.date.getUTCFullYear()).toBe(1998);
      expect(resolved.date.getUTCMonth()).toBe(9); // Tháng 10 = index 9
      expect(resolved.date.getUTCDate()).toBe(20);
    });

    it('sử dụng giờ sinh chính xác khi người dùng cung cấp', () => {
      const resolved = resolveBirthDate('1998-10-20', '14:35');
      expect(resolved.isTimeEstimated).toBe(false);
      expect(resolved.date.getUTCHours()).toBe(14);
      expect(resolved.date.getUTCMinutes()).toBe(35);
    });

    it('chuyển giờ sinh tại Việt Nam sang UTC và đánh dấu dữ liệu đầy đủ', () => {
      const resolved = resolveBirthDate('1998-10-20', '12:00', 'exact', {
        placeId: 'hanoi',
        userLabel: 'Hà Nội, Việt Nam',
        latitude: 21.0278,
        longitude: 105.8342,
        timeZoneIdentifier: 'Asia/Ho_Chi_Minh',
        resolvedAt: '2026-10-06T00:00:00.000Z',
      });
      expect(resolved.date.toISOString()).toBe('1998-10-20T05:00:00.000Z');
      expect(resolved.precision).toBe('complete');
    });

    it('phát hiện giờ DST không tồn tại và giờ lặp lại', () => {
      const newYork = {
        placeId: 'new-york',
        userLabel: 'New York, USA',
        latitude: 40.7128,
        longitude: -74.006,
        timeZoneIdentifier: 'America/New_York',
        resolvedAt: '2026-10-06T00:00:00.000Z',
      };
      expect(() => resolveBirthDate('2024-03-10', '02:30', 'exact', newYork)).toThrow(
        /không tồn tại/
      );
      expect(resolveBirthDate('2024-11-03', '01:30', 'exact', newYork).isLocalTimeAmbiguous)
        .toBe(true);
    });
  });

  describe('Porphyry houses', () => {
    it('khớp golden fixture Hà Nội từ bản Swift', () => {
      const angles = calculateAngles(
        new Date('2000-01-01T05:00:00Z'),
        21.0278,
        105.8342
      );
      expect(angles.ascendant).toBeCloseTo(14.320311, 1);
      expect(angles.midheaven).toBeCloseTo(280.115466, 1);
      const expected = [
        14.320311, 42.918696, 71.517081, 100.115466,
        131.517081, 162.918696, 194.320311, 222.918696,
        251.517081, 280.115466, 311.517081, 342.918696,
      ];
      calculatePorphyryCusps(angles).forEach((cusp, index) => {
        expect(cusp.longitude).toBeCloseTo(expected[index], 1);
      });
    });

    it('gán nhà đúng khi kinh độ đi qua 0°', () => {
      const cusps = Array.from({ length: 12 }, (_, index) => ({
        house: index + 1,
        longitude: index * 30,
      }));
      expect(houseForLongitude(0, cusps)).toBe(1);
      expect(houseForLongitude(29.999, cusps)).toBe(1);
      expect(houseForLongitude(359.999, cusps)).toBe(12);
    });
  });

  describe('calculateTemperamentBalance', () => {
    it('tính đúng phân bổ 4 nguyên tố và 3 tính chất cho Natal Chart', () => {
      const chart = computeNatalChart('1995-03-21');
      const balance = calculateTemperamentBalance(chart.planetList);

      expect(balance.fire + balance.earth + balance.air + balance.water).toBeCloseTo(1.0, 2);
      expect(balance.cardinal + balance.fixed + balance.mutable).toBeCloseTo(1.0, 2);
      expect(balance.fire).toBeGreaterThanOrEqual(0);
      expect(balance.water).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generatePureAstroVector', () => {
    it('tạo ra vector đúng 32 chiều thuần Chiêm tinh học với giá trị chuẩn hóa [0.0, 1.0]', () => {
      const result = generatePureAstroVector(
        { birthDate: '1995-03-21' },
        fixedTestCurrentDate
      );

      expect(result.vector).toHaveLength(32);
      expect(result.float32Array).toHaveLength(32);

      // Kiểm tra tất cả các phần tử không bị NaN và nằm trong khoảng [0, 1]
      result.vector.forEach((val) => {
        expect(isNaN(val)).toBe(false);
        expect(val).toBeGreaterThanOrEqual(0.0);
        expect(val).toBeLessThanOrEqual(1.0);
      });

      // Vị trí index 0: Khi khuyết giờ sinh -> confidenceScore = 0.7
      expect(result.vector[0]).toBe(0.7);
      expect(result.metadata.hasExactTime).toBe(false);
      expect(result.metadata.natalSunSign).toBe('Aries'); // 21/03 là Bạch Dương
      expect(result.metadata.temperament.dominantElement).toBeDefined();
      expect(result.metadata.temperament.dominantModality).toBeDefined();
    });

    it('tăng confidenceScore lên 1.0 khi có giờ sinh cụ thể', () => {
      const result = generatePureAstroVector(
        { birthDate: '1995-03-21', birthTime: '08:15' },
        fixedTestCurrentDate
      );

      expect(result.vector[0]).toBe(1.0);
      expect(result.metadata.hasExactTime).toBe(true);
    });

    it('dựng ASC, MC và 12 nhà khi có đủ giờ và nơi sinh', () => {
      const result = generatePureAstroVector({
        birthDate: '1995-03-21',
        birthTime: '08:15',
        birthTimeAccuracy: 'exact',
        resolvedBirthLocation: {
          placeId: 'hanoi',
          userLabel: 'Hà Nội, Việt Nam',
          latitude: 21.0278,
          longitude: 105.8342,
          timeZoneIdentifier: 'Asia/Ho_Chi_Minh',
          resolvedAt: '2026-10-06T00:00:00.000Z',
        },
      }, fixedTestCurrentDate);

      expect(result.metadata.birthDataPrecision).toBe('complete');
      expect(result.metadata.natalContext?.houseCusps).toHaveLength(12);
      expect(Object.keys(result.metadata.natalContext?.planetHouses ?? {})).toHaveLength(10);
      expect(result.metadata.dailyContext?.activatedHouses.length).toBeGreaterThan(0);
    });

    it('đảm bảo tính nhất quán (deterministic)', () => {
      const run1 = generatePureAstroVector({ birthDate: '2001-07-15' }, fixedTestCurrentDate);
      const run2 = generatePureAstroVector({ birthDate: '2001-07-15' }, fixedTestCurrentDate);

      expect(run1.vector).toEqual(run2.vector);
      expect(run1.metadata.scores).toEqual(run2.metadata.scores);
      expect(run1.metadata.temperament).toEqual(run2.metadata.temperament);
    });
  });

  describe('Aspect Angle Calculations', () => {
    it('tính đúng khoảng cách góc ngắn nhất giữa 2 độ', () => {
      expect(getShortestAngleDiff(10, 350)).toBe(20);
      expect(getShortestAngleDiff(0, 180)).toBe(180);
      expect(getShortestAngleDiff(90, 180)).toBe(90);
      expect(getShortestAngleDiff(355, 5)).toBe(10);
    });

    it('normalizes tension and harmony as proportions without saturation', () => {
      const scores = calculateAspectScores([
        aspect('Moon', 'Sun', 'tension', 'square', 0.8),
        aspect('Venus', 'Moon', 'harmony', 'trine', 0.6),
      ]);

      expect(scores.tensionScore).toBeGreaterThan(0);
      expect(scores.harmonyScore).toBeGreaterThan(0);
      expect(scores.tensionScore + scores.harmonyScore).toBeCloseTo(1, 4);
      expect(scores.tensionScore).toBeLessThan(1);
      expect(scores.harmonyScore).toBeLessThan(1);
    });

    it('counts fast activity from the transit planet, not the natal planet', () => {
      const slowTransit = calculateAspectScores([
        aspect('Uranus', 'Moon', 'tension', 'square'),
      ]);
      const fastTransit = calculateAspectScores([
        aspect('Moon', 'Uranus', 'tension', 'square'),
      ]);

      expect(slowTransit.fastPlanetActivity).toBe(0);
      expect(fastTransit.fastPlanetActivity).toBe(1);
      expect(calculateAspectScores([])).toEqual({
        tensionScore: 0,
        harmonyScore: 0,
        conjunctionIntensity: 0,
        fastPlanetActivity: 0,
      });
    });

    it('classifies every dominant daily signal branch', () => {
      expect(resolveDominantAstroSignal({ tension: 0.7, harmony: 0.3, conjunction: 0.1 }))
        .toBe('tension');
      expect(resolveDominantAstroSignal({ tension: 0.3, harmony: 0.7, conjunction: 0.1 }))
        .toBe('harmony');
      expect(resolveDominantAstroSignal({ tension: 0.6, harmony: 0.4, conjunction: 0.3 }))
        .toBe('conjunction');
      expect(resolveDominantAstroSignal({ tension: 0.55, harmony: 0.45, conjunction: 0.1 }))
        .toBe('balanced');
    });

    it('does not saturate both directional scores across profiles and days', () => {
      const birthDates = ['1990-01-01', '1995-03-21', '1998-10-20', '2001-07-15', '2005-12-31'];
      const summaries = new Set<string>();

      for (const birthDate of birthDates) {
        for (let day = 1; day <= 14; day += 1) {
          const metadata = generatePureAstroVector(
            { birthDate },
            new Date(2026, 9, day, 12)
          ).metadata;
          summaries.add(metadata.vibeSummary);
          expect(metadata.scores.tension === 1 && metadata.scores.harmony === 1).toBe(false);
          expect(metadata.dominantSignal).toBeDefined();
        }
      }

      expect(summaries.size).toBeGreaterThan(1);
    });
  });

  describe('calculateVectorCosineSimilarity', () => {
    it('trả về 1.0 cho 2 vector giống hệt nhau', () => {
      const vecA = [0.1, 0.5, 0.9, 0.3];
      const vecB = [0.1, 0.5, 0.9, 0.3];
      expect(calculateVectorCosineSimilarity(vecA, vecB)).toBe(1.0);
    });

    it('trả về giá trị nhỏ hơn 1.0 cho 2 vector khác nhau', () => {
      const res1 = generatePureAstroVector({ birthDate: '1990-01-01' }, fixedTestCurrentDate);
      const res2 = generatePureAstroVector({ birthDate: '2005-12-31' }, fixedTestCurrentDate);

      const sim = calculateVectorCosineSimilarity(res1.vector, res2.vector);
      expect(sim).toBeLessThan(1.0);
      expect(sim).toBeGreaterThan(0.0);
    });
  });
});
