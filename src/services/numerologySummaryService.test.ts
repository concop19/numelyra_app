import { getIndicatorShortSummary } from './numerologySummaryService';
import { getSpecialIndicatorReading } from './numerologySpecialInterpretations';
import { CalculatedIndicator, calculate24Indicators } from './numerologyEngine';
import { NUMEROLOGY_CARDS } from '../config/numerologyCards';
import {
  getArrowKnowledgeValue,
  getKnowledgeAtoms,
  getMatrixKnowledgeValue,
  NUMEROLOGY_KNOWLEDGE_CONTRACT,
  NUMEROLOGY_KNOWLEDGE_REQUIRED_COUNT,
} from './numerologyKnowledgeContract';
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
    expect(summaryMissing).toContain('2 (');
    expect(summaryMissing).toContain('7 (');
  });

  it('summarizes every karmic debt in a combined result and handles no debt explicitly', () => {
    const base: CalculatedIndicator = {
      id: 'card_12_karmicDebts',
      number: '12',
      key: 'karmicDebts',
      nameVi: 'Con Số Nợ Nghiệp',
      nameEn: 'Karmic Debts',
      category: 'karmic',
      categoryNameVi: 'Nghiệp & Cầu Nối',
      image: {} as any,
      description: '',
      value: '13/4, 16/7',
      displayValue: '13/4, 16/7',
    };

    const combined = getIndicatorShortSummary(base);
    expect(combined).toContain('13/4');
    expect(combined).toContain('16/7');

    const none = getIndicatorShortSummary({
      ...base,
      value: 'Không có nợ nghiệp',
      displayValue: 'Không có nợ nghiệp',
    });
    expect(none).toContain('Không ghi nhận nợ nghiệp');
  });

  it('builds detailed readings from every missing number instead of only the first one', () => {
    const reading = getSpecialIndicatorReading('missingNumbers', '2, 7', 'Bài Học Số Thiếu')!;

    expect(reading.overview).toContain('Số 2 thiếu');
    expect(reading.overview).toContain('Số 7 thiếu');
    expect(reading.strengths).toHaveLength(2);
    expect(reading.advice).toContain('Số 2:');
    expect(reading.advice).toContain('Số 7:');
  });

  it('does not map an empty karmic result to the number 1 archetype', () => {
    const reading = getSpecialIndicatorReading(
      'karmicDebts',
      'Không có nợ nghiệp',
      'Con Số Nợ Nghiệp'
    )!;

    expect(reading.title).toContain('Không ghi nhận nợ nghiệp');
    expect(reading.overview).not.toContain('Năng lượng khởi nguyên');
  });

  it('changes karmic and missing-number copy when the actual profile changes', () => {
    const sparseName = calculate24Indicators('A', '13/01/2000');
    const completeName = calculate24Indicators('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '12/01/2000');
    const sparseDebt = sparseName.find((item) => item.key === 'karmicDebts')!;
    const completeDebt = completeName.find((item) => item.key === 'karmicDebts')!;
    const sparseMissing = sparseName.find((item) => item.key === 'missingNumbers')!;
    const completeMissing = completeName.find((item) => item.key === 'missingNumbers')!;

    expect(sparseDebt.value).toContain('13/4');
    expect(completeDebt.value).toBe('Không có nợ nghiệp');
    expect(getIndicatorShortSummary(sparseDebt)).not.toBe(getIndicatorShortSummary(completeDebt));
    expect(sparseMissing.value).not.toBe(completeMissing.value);
    expect(getIndicatorShortSummary(sparseMissing)).not.toBe(getIndicatorShortSummary(completeMissing));
  });

  it('preserves Life Path 33 and calculates every maturity-passion bridge distance', () => {
    const masterProfile = calculate24Indicators('A B', '1903-09-29');
    const bridgeProfile = calculate24Indicators('A B', '2000-01-01');

    expect(masterProfile.find((item) => item.key === 'walksOfLife')?.value).toBe(33);
    expect(bridgeProfile.find((item) => item.key === 'passion')?.value).toBe('1, 2');
    expect(bridgeProfile.find((item) => item.key === 'bridgeMaturityPassion')?.value).toBe('5, 6');
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

describe('numerology knowledge coverage contract', () => {
  it('covers every one of the 24 configured indicators exactly once', () => {
    const configuredKeys = NUMEROLOGY_CARDS.map((card) => card.key).sort();
    const contractKeys = NUMEROLOGY_KNOWLEDGE_CONTRACT.map((entry) => entry.key).sort();

    expect(contractKeys).toEqual(configuredKeys);
    expect(new Set(contractKeys).size).toBe(24);
    expect(NUMEROLOGY_KNOWLEDGE_REQUIRED_COUNT).toBe(304);
  });

  it('contains no duplicate key/value requirement', () => {
    const pairs = NUMEROLOGY_KNOWLEDGE_CONTRACT.flatMap((entry) =>
      entry.requiredValues.map((value) => `${entry.key}|${value}`)
    );

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('decomposes composite results into atomic DB lookups', () => {
    expect(getKnowledgeAtoms('karmicDebts', '13/4, 16/7').map((atom) => atom.numberValue))
      .toEqual(['13/4', '16/7']);
    expect(getKnowledgeAtoms('karmicDebts', 'Không có nợ nghiệp').map((atom) => atom.numberValue))
      .toEqual(['none']);
    expect(getKnowledgeAtoms('missingNumbers', '2, 7').map((atom) => atom.numberValue))
      .toEqual(['2', '7']);
    expect(getKnowledgeAtoms('missingNumbers', 'Không thiếu').map((atom) => atom.numberValue))
      .toEqual(['none']);
    expect(getKnowledgeAtoms('bridgeMaturityPassion', '2, 5').map((atom) => atom.numberValue))
      .toEqual(['2', '5']);
    expect(getKnowledgeAtoms('way', '3 - 7 - 1 - 8').map((atom) => atom.numberValue))
      .toEqual(['3', '7', '1', '8']);
  });

  it('covers zero-valued name components and the maximum soul-personality bridge', () => {
    const vowelsOnly = calculate24Indicators('I', '2000-01-01');
    const consonantsOnly = calculate24Indicators('R', '2000-01-01');
    const personalityZero = vowelsOnly.find((item) => item.key === 'personality')!;
    const soulZero = consonantsOnly.find((item) => item.key === 'soul')!;
    const bridgeNine = consonantsOnly.find((item) => item.key === 'bridgeSoulPersonality')!;

    expect(personalityZero.value).toBe(0);
    expect(soulZero.value).toBe(0);
    expect(bridgeNine.value).toBe(9);
    expect(getKnowledgeAtoms('personality', personalityZero.value)[0].numberValue).toBe('0');
    expect(getKnowledgeAtoms('soul', soulZero.value)[0].numberValue).toBe('0');
    expect(getKnowledgeAtoms('bridgeSoulPersonality', bridgeNine.value)[0].numberValue).toBe('9');
    expect(getSpecialIndicatorReading('personality', 0, personalityZero.nameVi)?.overview)
      .toContain('không có phụ âm');
    expect(getSpecialIndicatorReading('soul', 0, soulZero.nameVi)?.overview)
      .toContain('không có nguyên âm');
  });

  it('maps every reachable engine state into the DB coverage contract', () => {
    const required = new Map(
      NUMEROLOGY_KNOWLEDGE_CONTRACT.map((entry) => [entry.key, new Set(entry.requiredValues)])
    );
    const seen = new Map(NUMEROLOGY_KNOWLEDGE_CONTRACT.map((entry) => [entry.key, new Set<string>()]));
    const representativeDates = new Map<string, string>();

    const capture = (profile: CalculatedIndicator[]) => {
      for (const indicator of profile) {
        if (indicator.key === 'nameChart' || indicator.key === 'birthChart') {
          for (const [digit, count] of Object.entries(indicator.chartData?.counts || {})) {
            seen.get(indicator.key)!.add(getMatrixKnowledgeValue(Number(digit), getFrequencyBand(count)));
          }
          continue;
        }
        if (indicator.key === 'arrows') {
          for (const arrow of indicator.chartData?.arrows || []) {
            seen.get(indicator.key)!.add(getArrowKnowledgeValue(arrow.label, arrow.status));
          }
          continue;
        }
        for (const atom of getKnowledgeAtoms(indicator.key, indicator.value)) {
          seen.get(indicator.key)!.add(atom.numberValue);
        }
      }
    };

    // Một chu kỳ ngày rộng thu thập toàn bộ trạng thái phụ thuộc ngày sinh.
    for (let year = 1900; year <= 1999; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day += 1) {
          const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const profile = calculate24Indicators('ABCDEFGHI', birthDate);
          capture(profile);
          const life = String(profile.find((item) => item.key === 'walksOfLife')!.value);
          if (!representativeDates.has(life)) representativeDates.set(life, birthDate);
        }
      }
    }
    capture(calculate24Indicators('ABCDEFGHI', '4444-05-04'));
    capture(calculate24Indicators('ABCDEFGHI', '2222-02-02'));
    capture(calculate24Indicators('ABCDEFGHI', '2222-02-03'));

    // Tạo có chủ đích mọi tổng tên, số hiện diện và bốn dải tần suất ma trận tên.
    const nameCorpus = new Set<string>(['AS', 'I', 'R', 'ABCDEFGHI']);
    for (let total = 1; total <= 40; total += 1) {
      nameCorpus.add('A'.repeat(total));
      nameCorpus.add('S'.repeat(total));
    }
    for (const letter of 'ABCDEFGHI') {
      for (let count = 1; count <= 4; count += 1) nameCorpus.add(letter.repeat(count));
    }
    for (let distinct = 1; distinct <= 9; distinct += 1) {
      nameCorpus.add('ABCDEFGHI'.slice(0, distinct));
      nameCorpus.add(Array(distinct).fill('A').join(' '));
    }
    for (const name of nameCorpus) capture(calculate24Indicators(name, '2000-01-01'));

    // Ghép các tổng tên quan trọng với đại diện từng Đường đời để phủ số Trưởng thành và cầu nối.
    const importantNameTotals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
    for (const birthDate of representativeDates.values()) {
      for (const total of importantNameTotals) {
        capture(calculate24Indicators('A'.repeat(total), birthDate));
      }
    }

    const outsideContract: string[] = [];
    const unobservedRequired: string[] = [];
    for (const [indicatorKey, values] of seen) {
      const allowed = required.get(indicatorKey)!;
      for (const value of values) {
        if (!allowed.has(value)) outsideContract.push(`${indicatorKey}|${value}`);
      }
      for (const value of allowed) {
        if (!values.has(value)) unobservedRequired.push(`${indicatorKey}|${value}`);
      }
    }
    expect(outsideContract).toEqual([]);
    expect(unobservedRequired).toEqual([]);
  }, 30_000);
});
