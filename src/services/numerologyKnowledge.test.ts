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

  it('keeps ChatNumerologyContext out of the detailed UI and loads mature 4 from SQLite', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'mature',
        number_value: '4',
        title: 'Năng Lượng Tuổi Trung Niên Của Con Số Trưởng Thành 4',
        content: [
          '# Năng Lượng Tuổi Trung Niên Của Con Số Trưởng Thành 4',
          '## Sự Thức Tỉnh Bản Ngã Sau Tuổi 35',
          'Người mang Con số Trưởng thành 4 tập trung kiến tạo nền móng vững chắc.',
          '## Tầm Ảnh Hưởng Xã Hội Và Mục Tiêu Cuộc Sống',
          'Bạn phát huy khả năng quản trị hệ thống và xây dựng di sản thực tế.',
          '## Khủng Hoảng Tuổi Trung Niên Thường Gặp',
          'Bạn có thể kiệt sức vì trách nhiệm và trở nên cứng nhắc.',
          '## Lời Khuyên Chuẩn Bị Nền Tảng',
          'Linh hoạt đón nhận đổi mới và duy trì thời gian nghỉ ngơi.',
        ].join('\n'),
      },
    ]);

    const reading = await getIndicatorReading('mature', 4, 'Số Trưởng Thành');

    expect(mockFetchRows).toHaveBeenCalledWith('mature', ['4']);
    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('nền móng vững chắc');
    expect(reading.strengths).toContain('Bạn phát huy khả năng quản trị hệ thống và xây dựng di sản thực tế.');
    expect(reading.challenges).toContain('Bạn có thể kiệt sức vì trách nhiệm và trở nên cứng nhắc.');
    expect(reading.advice).toContain('Linh hoạt đón nhận đổi mới');
    expect(reading.fullContent).toContain('Tầm Ảnh Hưởng Xã Hội');
  });

  it('maps the long-form balance 5 headings into detailed UI sections', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'balance',
        number_value: '5',
        title: 'Chiến Lược Lấy Lại Cân Bằng Của Con Số Cân Bằng 5',
        content: [
          '# Chiến Lược Lấy Lại Cân Bằng Của Con Số Cân Bằng 5',
          '## Phản Ứng Tự Vệ Vô Thức Khi Đối Mặt Khủng Hoảng',
          'Phản ứng ban đầu có thể là muốn thay đổi ngay mọi thứ xung quanh.',
          '## Những Phản Ứng Tiêu Cực Cần Tránh Khi Bị Áp Lực',
          'Tránh bốc đồng phá vỡ các cam kết quan trọng vì cảm xúc nhất thời.',
          '## Mỏ Neo Tâm Lý Giúp Tĩnh Tâm',
          'Khả năng thích ứng linh hoạt là nguồn lực giúp bạn xoay chuyển tình thế.',
          '## Kỹ Thuật Định Tâm Cấp Tốc',
          '1. **Vận động:** Tập vận động ngắn để giải phóng căng thẳng.',
          '2. **Đổi góc nhìn:** Thở chậm và chủ động nhìn lại tình huống.',
        ].join('\n'),
      },
    ]);

    const reading = await getIndicatorReading('balance', 5, 'Số Cân Bằng');

    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('muốn thay đổi ngay');
    expect(reading.strengths).toContain('Khả năng thích ứng linh hoạt là nguồn lực giúp bạn xoay chuyển tình thế.');
    expect(reading.challenges).toContain('Tránh bốc đồng phá vỡ các cam kết quan trọng vì cảm xúc nhất thời.');
    expect(reading.advice).toContain('Tập vận động ngắn');
    expect(reading.advice).toContain('Thở chậm');
    expect(reading.advice).not.toContain('**');
  });
});
