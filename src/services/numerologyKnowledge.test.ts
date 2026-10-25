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

    const reading = await getIndicatorReading('karmicDebts', '13/4, 16/7', 'Con Số Nợ Nghiệp', 'vi');

    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('13/4');
    expect(reading.overview).toContain('16/7');
    expect(reading.strengths).toEqual(['13/4 · Điểm mạnh 13/4', '16/7 · Điểm mạnh 16/7']);
    expect(mockFetchRows).toHaveBeenCalledWith('karmicDebts', ['13/4', '16/7'], 'vi');
  });

  it('uses the complete offline reading when one atomic DB row is missing', async () => {
    mockFetchRows.mockResolvedValue(
      [
        { indicator_key: 'missingNumbers', number_value: '2', title: '2', content: contentFor('2') },
      ]
    );

    const reading = await getIndicatorReading('missingNumbers', '2, 7', 'Bài Học Số Thiếu', 'vi');

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

    const bundle = await getMatrixKnowledgeBundle(indicator, 'vi');

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

    const reading = await getIndicatorReading('mature', 4, 'Số Trưởng Thành', 'vi');

    expect(mockFetchRows).toHaveBeenCalledWith('mature', ['4'], 'vi');
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

    const reading = await getIndicatorReading('balance', 5, 'Số Cân Bằng', 'vi');

    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('muốn thay đổi ngay');
    expect(reading.strengths).toContain('Khả năng thích ứng linh hoạt là nguồn lực giúp bạn xoay chuyển tình thế.');
    expect(reading.challenges).toContain('Tránh bốc đồng phá vỡ các cam kết quan trọng vì cảm xúc nhất thời.');
    expect(reading.advice).toContain('Tập vận động ngắn');
    expect(reading.advice).toContain('Thở chậm');
    expect(reading.advice).not.toContain('**');
  });

  const VI_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

  function englishContentFor(label: string): string {
    return [
      '# OVERVIEW',
      `In the Life Path, energy for ${label} centers on discipline and purpose.`,
      '# STRENGTHS',
      `- Reliable effort and consistent work for ${label}.`,
      '# CHALLENGES',
      `- Shortcuts or impatience when challenged for ${label}.`,
      '# GUIDANCE',
      `Build progress through steady daily routines for ${label}.`,
    ].join('\n');
  }

  it('correctly parses a single English SQLite row with OVERVIEW, STRENGTHS, CHALLENGES, and GUIDANCE', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'lifePath',
        number_value: '4',
        title: 'Life Path 4',
        content: englishContentFor('4'),
      },
    ]);

    const reading = await getIndicatorReading('lifePath', 4, 'Life Path', 'en');

    expect(mockFetchRows).toHaveBeenCalledWith('lifePath', ['4'], 'en');
    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('energy for 4 centers on discipline');
    expect(reading.strengths).toEqual(['Reliable effort and consistent work for 4.']);
    expect(reading.challenges).toEqual(['Shortcuts or impatience when challenged for 4.']);
    expect(reading.advice).toBe('Build progress through steady daily routines for 4.');

    // Assert strictly that no Vietnamese text appears anywhere in the English reading result
    expect(VI_REGEX.test(reading.overview)).toBe(false);
    expect(VI_REGEX.test(reading.strengths.join(' '))).toBe(false);
    expect(VI_REGEX.test(reading.challenges.join(' '))).toBe(false);
    expect(VI_REGEX.test(reading.advice)).toBe(false);
  });

  it('correctly parses composite English rows (e.g., 6, 7) without falling back to Vietnamese guidance', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'missingNumbers',
        number_value: '6',
        title: 'Missing Number 6',
        content: [
          '# OVERVIEW',
          'Missing number 6 highlights the theme of responsibility and family harmony.',
          '# STRENGTHS',
          '- Deep empathy and protective instincts.',
          '# CHALLENGES',
          '- Tendency toward micromanagement or emotional burden.',
          '# GUIDANCE',
          'Care for others without abandoning your own boundaries.',
        ].join('\n'),
      },
      {
        indicator_key: 'missingNumbers',
        number_value: '7',
        title: 'Missing Number 7',
        content: [
          '# OVERVIEW',
          'Missing number 7 encourages spiritual depth and analytical inquiry.',
          '# STRENGTHS',
          '- Discernment and intuitive understanding.',
          '# CHALLENGES',
          '- Skepticism or emotional isolation.',
          '# GUIDANCE',
          'Balance introspection with shared experiences.',
        ].join('\n'),
      },
    ]);

    const reading = await getIndicatorReading('missingNumbers', '6, 7', 'Karmic Lessons', 'en');

    expect(mockFetchRows).toHaveBeenCalledWith('missingNumbers', ['6', '7'], 'en');
    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('6 · Missing number 6 highlights');
    expect(reading.overview).toContain('7 · Missing number 7 encourages');
    expect(reading.strengths).toEqual([
      '6 · Deep empathy and protective instincts.',
      '7 · Discernment and intuitive understanding.',
    ]);
    expect(reading.challenges).toEqual([
      '6 · Tendency toward micromanagement or emotional burden.',
      '7 · Skepticism or emotional isolation.',
    ]);
    expect(reading.advice).toBe(
      '6: Care for others without abandoning your own boundaries. 7: Balance introspection with shared experiences.'
    );

    // Verify it did not fall back to the hard-coded Vietnamese advice
    expect(reading.advice).not.toContain('Phát huy điểm mạnh');
    expect(VI_REGEX.test(reading.advice)).toBe(false);
    expect(VI_REGEX.test(reading.overview)).toBe(false);
  });

  it('falls back to English advice when an English row lacks a guidance section', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'karmicDebts',
        number_value: '13/4',
        title: 'Karmic Debt 13/4',
        content: [
          '# OVERVIEW',
          'Karmic Debt 13/4 addresses perseverance and structured labor.',
          '# STRENGTHS',
          '- Tenacity and resilience through challenges.',
          '# CHALLENGES',
          '- Resistance to effort and desire for shortcuts.',
        ].join('\n'),
      },
    ]);

    const reading = await getIndicatorReading('karmicDebts', '13/4', 'Karmic Debts', 'en');

    expect(reading.source).toBe('local-sqlite');
    expect(reading.strengths).toEqual(['Tenacity and resilience through challenges.']);
    expect(reading.challenges).toEqual(['Resistance to effort and desire for shortcuts.']);
    expect(reading.advice).toBe('Leverage your innate strengths and maintain inner balance.');
    expect(reading.advice).not.toContain('Phát huy điểm mạnh');
    expect(VI_REGEX.test(reading.advice)).toBe(false);
  });

  it('loads English matrix bundle and correctly extracts strengths, challenges, and guidance', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'birthChart',
        number_value: '1:baseline',
        title: 'Digit 1 in Birth Chart',
        content: [
          '# OVERVIEW',
          'Having a single 1 indicates grounded self-expression.',
          '# STRENGTHS',
          '- Authentic voice and clear self-reliance.',
          '# CHALLENGES',
          '- Hesitation to share vulnerability with others.',
          '# GUIDANCE',
          'Practice open dialogue with trusted peers.',
        ].join('\n'),
      },
    ]);

    const indicator = {
      key: 'birthChart',
      nameEn: 'Birth Chart',
      nameVi: 'Biểu Đồ Ngày Sinh',
      chartData: { counts: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 } },
    } as unknown as CalculatedIndicator;

    const bundle = await getMatrixKnowledgeBundle(indicator, 'en');

    expect(mockFetchRows).toHaveBeenCalledWith('birthChart', expect.arrayContaining(['1:baseline']), 'en');
    const item = bundle['1:baseline'];
    expect(item).toBeDefined();
    expect(item?.source).toBe('local-sqlite');
    expect(item?.summary).toContain('Having a single 1 indicates');
    expect(item?.strength).toContain('Authentic voice and clear self-reliance.');
    expect(item?.challenge).toContain('Hesitation to share vulnerability with others.');
    expect(item?.advice).toBe('Practice open dialogue with trusted peers.');
    expect(VI_REGEX.test(item?.strength || '')).toBe(false);
    expect(VI_REGEX.test(item?.challenge || '')).toBe(false);
    expect(VI_REGEX.test(item?.advice || '')).toBe(false);
  });

  it('supports varied English section headings like NATURAL STRENGTHS, POTENTIAL BLIND SPOTS, and ACTION', async () => {
    mockFetchRows.mockResolvedValue([
      {
        indicator_key: 'attitude',
        number_value: '3',
        title: 'Attitude 3',
        content: [
          '# CORE NATURE & ENERGY',
          'Attitude 3 presents a cheerful and magnetic initial demeanor.',
          '## NATURAL STRENGTHS',
          '- Uplifting warmth and humorous perspective.',
          '## POTENTIAL BLIND SPOTS',
          '- Superficial deflection of uncomfortable emotions.',
          '## ACTION & NEXT STEPS',
          'Allow yourself to experience and share deeper feelings.',
        ].join('\n'),
      },
    ]);

    const reading = await getIndicatorReading('attitude', 3, 'Attitude', 'en');

    expect(reading.source).toBe('local-sqlite');
    expect(reading.overview).toContain('cheerful and magnetic');
    expect(reading.strengths).toEqual(['Uplifting warmth and humorous perspective.']);
    expect(reading.challenges).toEqual(['Superficial deflection of uncomfortable emotions.']);
    expect(reading.advice).toBe('Allow yourself to experience and share deeper feelings.');
    expect(VI_REGEX.test(reading.advice)).toBe(false);
  });
});

