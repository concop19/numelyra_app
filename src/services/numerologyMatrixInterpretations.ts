import nameChartData from '../data/numerologyMatrices/nameChart.vi.json';
import birthChartData from '../data/numerologyMatrices/birthChart.vi.json';
import arrowsData from '../data/numerologyMatrices/arrows.vi.json';

export type MatrixKey = 'nameChart' | 'birthChart';
export type FrequencyBand = 'missing' | 'baseline' | 'highlighted' | 'amplified';
export type ArrowStatus = 'strong' | 'partial' | 'empty';

export interface MatrixReading {
  summary: string;
  strength: string;
  challenge: string;
  advice: string;
}

export interface DigitReading extends MatrixReading {
  theme: string;
  band: FrequencyBand;
  bandLabel: string;
}

export interface ArrowReading extends MatrixReading {
  theme: string;
  label: string;
}

type DigitMatrixData = {
  matrixKey: MatrixKey;
  title: string;
  numbers: Record<string, {
    theme: string;
    states: Record<FrequencyBand, MatrixReading>;
  }>;
};

type ArrowMatrixData = {
  matrixKey: 'arrows';
  title: string;
  arrows: Array<{
    label: string;
    theme: string;
    numbers: number[];
    states: Record<ArrowStatus, MatrixReading>;
  }>;
};

const DIGIT_MATRICES: Record<MatrixKey, DigitMatrixData> = {
  nameChart: nameChartData as DigitMatrixData,
  birthChart: birthChartData as DigitMatrixData,
};
const ARROW_MATRIX = arrowsData as ArrowMatrixData;

const FREQUENCY_LABELS: Record<FrequencyBand, string> = {
  missing: 'Vắng mặt',
  baseline: 'Nền tảng',
  highlighted: 'Nổi bật',
  amplified: 'Lặp mạnh',
};

export function getFrequencyBand(count: number): FrequencyBand {
  if (count <= 0) return 'missing';
  if (count === 1) return 'baseline';
  if (count === 2) return 'highlighted';
  return 'amplified';
}

export function getDigitReading(matrix: MatrixKey, digit: number, count: number): DigitReading {
  const band = getFrequencyBand(count);
  const entry = DIGIT_MATRICES[matrix]?.numbers[String(digit)];
  const reading = entry?.states?.[band] ?? {
    summary: `Số ${digit} xuất hiện ${Math.max(0, count)} lần trong biểu đồ này.`,
    strength: 'Hãy xem đây là một gợi ý để nhận diện nguồn lực có thể phát triển.',
    challenge: 'Tần suất của con số chưa có nội dung luận giải riêng trong dữ liệu hiện tại.',
    advice: 'Đối chiếu với trải nghiệm thực tế và chọn một hành động nhỏ để tự quan sát.',
  };

  return {
    ...reading,
    theme: entry?.theme ?? `Năng lượng số ${digit}`,
    band,
    bandLabel: FREQUENCY_LABELS[band],
  };
}

export function getArrowReading(label: string, status: ArrowStatus): ArrowReading {
  const entry = ARROW_MATRIX.arrows.find((arrow) => arrow.label === label);
  const reading = entry?.states?.[status] ?? {
    summary: `Mũi tên ${label} đang ở trạng thái ${status}.`,
    strength: 'Hãy xem các con số hiện diện như những điểm tựa có thể rèn luyện.',
    challenge: 'Chưa có luận giải riêng cho tổ hợp này trong dữ liệu hiện tại.',
    advice: 'Quan sát cách chủ đề này xuất hiện trong trải nghiệm thực tế của bạn.',
  };

  return {
    ...reading,
    theme: entry?.theme ?? 'Tổ hợp số',
    label,
  };
}
