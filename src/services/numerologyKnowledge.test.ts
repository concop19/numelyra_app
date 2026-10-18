const mockFetchRows = jest.fn();

jest.mock('../db/numerologyKnowledgeService', () => ({
  fetchNumerologyKnowledgeRows: (...args: unknown[]) => mockFetchRows(...args),
}));

import { CalculatedIndicator } from './numerologyEngine';
import { getIndicatorReading, getMatrixKnowledgeBundle } from './numerologyKnowledge';

function contentFor(label: string): string {
  return [
    '# TỔNG QUAN',
    `Tổng quan riêng của ${label}.`,
    '# ĐIỂM MẠNH',
    `- Điểm mạnh ${label}`,
    '# THÁCH THỨC',
    `- Thách thức ${label}`,
    '# LỜI KHUYÊN',
    `Lời khuyên ${label}.`,
  ].join('\n');
}

describe('numerologyKnowledge SQLite-first resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and combines every atomic DB row for a composite result', async () => {
    mockFetchRows.mockResolvedValue(
      [
        { indicator_key: 'karmicDebts', number_value: '13/4', title: '13/4', content: contentFor('13/4') },
        { indicator_key: 'karmicDebts', number_value: '16/7', title: '16/7', content: contentFor('16/7') },
      ]
    );

    const reading = await getIndicatorReading('karmicDebts', '13/4, 16/7', 'Con Số Nợ Nghiệp');

    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('13/4');
    expect(reading.overview).toContain('16/7');
    expect(reading.strengths).toEqual(['13/4 · Điểm mạnh 13/4', '16/7 · Điểm mạnh 16/7']);
    expect(mockFetchRows).toHaveBeenCalledWith('karmicDebts', ['13/4', '16/7']);
  });

  it('uses the complete offline reading when one atomic DB row is missing', async () => {
    mockFetchRows.mockResolvedValue(
      [
        { indicator_key: 'missingNumbers', number_value: '2', title: '2', content: contentFor('2') },
      ]
    );

    const reading = await getIndicatorReading('missingNumbers', '2, 7', 'Bài Học Số Thiếu');

    expect(reading.source).toBe('offline-archetype');
    expect(reading.overview).toContain('Số 2 thiếu');
    expect(reading.overview).toContain('Số 7 thiếu');
  });

  it('loads matrix state rows as a batch and leaves absent states to JSON fallback', async () => {
    mockFetchRows.mockResolvedValue(
      [
        { indicator_key: 'nameChart', number_value: '1:baseline', title: 'Số 1', content: contentFor('số 1 nền tảng') },
      ]
    );
    const indicator = {
      key: 'nameChart',
      nameVi: 'Biểu Đồ Tên',
      chartData: { counts: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 } },
    } as unknown as CalculatedIndicator;

    const bundle = await getMatrixKnowledgeBundle(indicator);

    expect(bundle['1:baseline']?.source).toBe('local-sqlite');
    expect(bundle['1:baseline']?.summary).toContain('số 1 nền tảng');
    expect(bundle['2:missing']).toBeUndefined();
  });
});
