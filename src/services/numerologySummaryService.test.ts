import { getIndicatorShortSummary } from './numerologySummaryService';
import { CalculatedIndicator, calculate24Indicators } from './numerologyEngine';
import {
  getArrowReading,
  getDigitReading,
  getFrequencyBand,
} from './numerologyMatrixInterpretations';

describe('numerologySummaryService', () => {
  it('returns the exact archetype summary for Life Path 7 (as in mockup)', () => {
    const mockIndicator: CalculatedIndicator = {
      id: 'card_01_walksOfLife',
      number: '01',
      key: 'walksOfLife',
      nameVi: 'Số Đường Đời',
      nameEn: 'Life Path',
      category: 'core',
      categoryNameVi: 'Cốt Lõi',
      image: {} as any,
      description: 'Chỉ số quan trọng nhất...',
      value: 7,
      displayValue: '7',
    };

    const summary = getIndicatorShortSummary(mockIndicator);
    expect(summary).toBe(
      'Người tìm kiếm chân lý, mang trong mình trí tuệ sâu sắc và khát khao khám phá những điều bí ẩn của cuộc sống.'
    );
  });

  it('handles master numbers 11, 22, 33 properly', () => {
    const mockIndicator11: CalculatedIndicator = {
      id: 'card_01_walksOfLife',
      number: '01',
      key: 'walksOfLife',
      nameVi: 'Số Đường Đời',
      nameEn: 'Life Path',
      category: 'core',
      categoryNameVi: 'Cốt Lõi',
      image: {} as any,
      description: '',
      value: 11,
      displayValue: '11/2',
      isMaster: true,
    };

    const summary11 = getIndicatorShortSummary(mockIndicator11);
    expect(summary11).toContain('Bậc thầy trực giác tâm linh');
  });

  it('handles special indicators like karmicDebts and missingNumbers', () => {
    const mockKarmic13: CalculatedIndicator = {
      id: 'card_12_karmicDebts',
      number: '12',
      key: 'karmicDebts',
      nameVi: 'Con Số Nợ Nghiệp',
      nameEn: 'Karmic Debts',
      category: 'karmic',
      categoryNameVi: 'Nghiệp & Cầu Nối',
      image: {} as any,
      description: '',
      value: '13/4',
      displayValue: '13/4',
    };

    const summary13 = getIndicatorShortSummary(mockKarmic13);
    expect(summary13).toContain('Nợ nghiệp 13/4');

    const mockMissing: CalculatedIndicator = {
      id: 'card_13_missingNumbers',
      number: '13',
      key: 'missingNumbers',
      nameVi: 'Bài Học Số Thiếu',
      nameEn: 'Karmic Lessons',
      category: 'karmic',
      categoryNameVi: 'Nghiệp & Cầu Nối',
      image: {} as any,
      description: '',
      value: '2, 7',
      displayValue: '2, 7',
    };

    const summaryMissing = getIndicatorShortSummary(mockMissing);
    expect(summaryMissing).toContain('số 2, 7');
  });
});

describe('matrix-specific interpretations', () => {
  it('selects the four digit-frequency bands at 0, 1, 2, and 3+ occurrences', () => {
    expect([0, 1, 2, 3, 8].map(getFrequencyBand)).toEqual([
      'missing', 'baseline', 'highlighted', 'amplified', 'amplified',
    ]);
  });

  it('uses distinct Vietnamese readings for the same number in each matrix', () => {
    const nameReading = getDigitReading('nameChart', 1, 0);
    const birthReading = getDigitReading('birthChart', 1, 0);

    expect(nameReading.theme).not.toBe(birthReading.theme);
    expect(nameReading.summary).not.toBe(birthReading.summary);
    expect(nameReading.advice).toBeTruthy();
    expect(birthReading.challenge).toBeTruthy();
  });

  it('has usable readings for every digit and safely falls back for an unavailable JSON entry', () => {
    for (const matrix of ['nameChart', 'birthChart'] as const) {
      for (let digit = 1; digit <= 9; digit += 1) {
        for (const count of [0, 1, 2, 3]) {
          const reading = getDigitReading(matrix, digit, count);
          expect(reading.summary).toBeTruthy();
          expect(reading.strength).toBeTruthy();
          expect(reading.challenge).toBeTruthy();
          expect(reading.advice).toBeTruthy();
        }
      }
    }

    expect(getDigitReading('nameChart', 99, 0).summary).toContain('99');
  });

  it('provides all three states and a safe fallback for each of the eight arrows', () => {
    const arrowLabels = ['1-4-7', '2-5-8', '3-6-9', '1-2-3', '4-5-6', '7-8-9', '1-5-9', '3-5-7'];

    for (const label of arrowLabels) {
      for (const status of ['strong', 'partial', 'empty'] as const) {
        const reading = getArrowReading(label, status);
        expect(reading.summary).toBeTruthy();
        expect(reading.advice).toBeTruthy();
      }
    }

    expect(getArrowReading('unknown-arrow', 'empty').summary).toContain('unknown-arrow');
  });

  it('derives name counts independently and all three arrow states from birth digits', () => {
    const firstProfile = calculate24Indicators('A', '01/02/2003');
    const otherName = calculate24Indicators('B', '01/02/2003');
    const otherBirthDate = calculate24Indicators('A', '01/02/2004');
    const firstNameChart = firstProfile.find((item) => item.key === 'nameChart')!;
    const otherNameChart = otherName.find((item) => item.key === 'nameChart')!;
    const firstBirthChart = firstProfile.find((item) => item.key === 'birthChart')!;
    const otherNameBirthChart = otherName.find((item) => item.key === 'birthChart')!;
    const laterBirthChart = otherBirthDate.find((item) => item.key === 'birthChart')!;
    const arrowChart = firstProfile.find((item) => item.key === 'arrows')!;

    expect(firstNameChart.chartData?.counts[1]).toBe(1);
    expect(otherNameChart.chartData?.counts[2]).toBe(1);
    expect(firstBirthChart.chartData?.counts).toEqual(otherNameBirthChart.chartData?.counts);
    expect(laterBirthChart.chartData?.counts).not.toEqual(firstBirthChart.chartData?.counts);
    expect(new Set(arrowChart.chartData?.arrows?.map((arrow) => arrow.status))).toEqual(
      new Set(['strong', 'partial', 'empty'])
    );
  });
});
