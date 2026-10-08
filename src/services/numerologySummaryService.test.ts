import { getIndicatorShortSummary } from './numerologySummaryService';
import { CalculatedIndicator } from './numerologyEngine';

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
