import {
  generatePureAstroVector,
  calculateVectorCosineSimilarity,
} from '../astroVectorEngine';
import {
  computeNatalChart,
  resolveBirthDate,
  calculateTemperamentBalance,
} from '../astroEngine';
import { getShortestAngleDiff } from '../aspectCalculator';

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
