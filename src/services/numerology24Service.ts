/**
 * numerology24Service.ts - Tính toán động các chỉ số trong kho 24 chỉ số Thần số học Pythagoras
 * Cung cấp cho AI Agent khả năng tra cứu chính xác từng chỉ số theo nhu cầu của câu hỏi.
 */

export const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isVowelChar(char: string, word: string): boolean {
  const upper = char.toUpperCase();
  if (VOWELS.has(upper)) return true;
  if (upper !== 'Y') return false;
  // 'Y' là nguyên âm nếu từ không có nguyên âm nào khác
  const upperWord = word.toUpperCase();
  return !upperWord.split('').some(c => VOWELS.has(c));
}

export function reduceNumber(num: number, keepMaster = true): number {
  let cur = Math.abs(Math.floor(num));
  while (cur > 9) {
    if (keepMaster && (cur === 11 || cur === 22 || cur === 33)) break;
    const digits = String(cur).split('').map(Number);
    cur = digits.reduce((a, b) => a + b, 0);
  }
  return cur;
}

export interface IndicatorInfo {
  key: string;
  name: string;
  value: number | string;
  meaning: string;
}

export class NumerologyCalculator {
  day: number;
  month: number;
  year: number;
  fullName: string;
  normalizedName: string;

  constructor(fullName: string, birthDate: string) {
    this.fullName = fullName;
    this.normalizedName = normalizeName(fullName);

    const parts = birthDate.split('-');
    if (parts.length === 3) {
      this.year = parseInt(parts[0], 10) || 2000;
      this.month = parseInt(parts[1], 10) || 1;
      this.day = parseInt(parts[2], 10) || 1;
    } else {
      this.year = 2000;
      this.month = 1;
      this.day = 1;
    }
  }

  // 1. Số Đường Đời (Life Path)
  getWalksOfLife(): IndicatorInfo {
    const rDay = reduceNumber(this.day, false);
    const rMonth = reduceNumber(this.month, false);
    const rYear = reduceNumber(this.year, false);
    const val = reduceNumber(rDay + rMonth + rYear, true);
    return {
      key: 'walksOfLife',
      name: 'Số Đường Đời (Life Path)',
      value: val,
      meaning: `Chỉ số cốt lõi số ${val}, phản ánh bài học và con đường tiến hóa cả đời của bạn.`
    };
  }

  // 2. Số Sứ Mệnh (Mission)
  getMission(): IndicatorInfo {
    let sum = 0;
    for (const char of this.normalizedName.replace(/\s/g, '')) {
      sum += PYTHAGOREAN_MAP[char] || 0;
    }
    const val = reduceNumber(sum, true);
    return {
      key: 'mission',
      name: 'Số Sứ Mệnh (Destiny / Mission)',
      value: val,
      meaning: `Năng lực bẩm sinh và đích đến mà bạn được sinh ra để cống hiến cho cuộc đời (Số ${val}).`
    };
  }

  // 3. Số Linh Hồn (Soul Urge)
  getSoul(): IndicatorInfo {
    const words = this.normalizedName.split(' ').filter(Boolean);
    let sum = 0;
    for (const w of words) {
      for (const char of w) {
        if (isVowelChar(char, w)) {
          sum += PYTHAGOREAN_MAP[char] || 0;
        }
      }
    }
    const val = reduceNumber(sum, true);
    return {
      key: 'soul',
      name: 'Số Linh Hồn (Soul Urge)',
      value: val,
      meaning: `Khát vọng sâu kín, điều thực sự nuôi dưỡng cảm xúc và mang lại hạnh phúc cho bạn (Số ${val}).`
    };
  }

  // 4. Số Nhân Cách (Personality)
  getPersonality(): IndicatorInfo {
    const words = this.normalizedName.split(' ').filter(Boolean);
    let sum = 0;
    for (const w of words) {
      for (const char of w) {
        if (!isVowelChar(char, w)) {
          sum += PYTHAGOREAN_MAP[char] || 0;
        }
      }
    }
    const val = reduceNumber(sum, true);
    return {
      key: 'personality',
      name: 'Số Nhân Cách (Personality)',
      value: val,
      meaning: `Ấn tượng và phong thái bên ngoài mà người khác cảm nhận được từ bạn (Số ${val}).`
    };
  }

  // 5. Số Ngày Sinh (Birthday Number)
  getBirthdayNumber(): IndicatorInfo {
    const val = this.day === 11 || this.day === 22 ? this.day : reduceNumber(this.day, false);
    return {
      key: 'dateOfBirth',
      name: 'Số Ngày Sinh (Birthday Number)',
      value: val,
      meaning: `Món quà tài năng đặc biệt và phản xạ tự nhiên trong cuộc sống thường nhật (Số ${val}).`
    };
  }

  // 6. Số Trưởng Thành (Maturity Number)
  getMaturity(): IndicatorInfo {
    const lp = this.getWalksOfLife().value as number;
    const mis = this.getMission().value as number;
    const val = reduceNumber(lp + mis, true);
    return {
      key: 'mature',
      name: 'Số Trưởng Thành (Maturity)',
      value: val,
      meaning: `Sức mạnh nở rộ sau tuổi 35–40 khi Đường đời và Sứ mệnh hội tụ (Số ${val}).`
    };
  }

  // 7. Số Tư Duy Lý Trí (Rational Thought)
  getRationalThinking(): IndicatorInfo {
    // Ngày sinh rút gọn + Tên riêng rút gọn
    const firstName = this.normalizedName.split(' ').pop() || '';
    let nameSum = 0;
    for (const c of firstName) {
      nameSum += PYTHAGOREAN_MAP[c] || 0;
    }
    const val = reduceNumber(reduceNumber(this.day, false) + reduceNumber(nameSum, false), true);
    return {
      key: 'rationalThinking',
      name: 'Số Tư Duy Lý Trí (Rational Thought)',
      value: val,
      meaning: `Cách bạn phân tích dữ kiện và đưa ra quyết định khi đứng trước các ngã rẽ (Số ${val}).`
    };
  }

  // 8. Năm Cá Nhân (Personal Year)
  getPersonalYear(targetYear = new Date().getFullYear()): IndicatorInfo {
    const rDay = reduceNumber(this.day, false);
    const rMonth = reduceNumber(this.month, false);
    const rYear = reduceNumber(targetYear, false);
    const val = reduceNumber(rDay + rMonth + rYear, false); // nghiêm ngặt 1-9
    return {
      key: 'yearIndividual',
      name: `Năm Cá Nhân ${targetYear} (Personal Year)`,
      value: val,
      meaning: `Năm số ${val} trong chu kỳ 9 năm: ${getPersonalYearTheme(val)}`
    };
  }

  // 9. Số Thái Độ (Attitude Number)
  getAttitude(): IndicatorInfo {
    const rDay = reduceNumber(this.day, false);
    const rMonth = reduceNumber(this.month, false);
    const val = reduceNumber(rDay + rMonth, false);
    return {
      key: 'attitude',
      name: 'Số Thái Độ (Attitude Number)',
      value: val,
      meaning: `Phản xạ đầu tiên và tâm thế của bạn khi đối diện biến cố hay cơ hội (Số ${val}).`
    };
  }

  // Lấy danh sách các chỉ số theo yêu cầu của Agent
  getRequestedIndicators(keys: string[]): IndicatorInfo[] {
    const map: Record<string, () => IndicatorInfo> = {
      walksOfLife: () => this.getWalksOfLife(),
      mission: () => this.getMission(),
      soul: () => this.getSoul(),
      personality: () => this.getPersonality(),
      dateOfBirth: () => this.getBirthdayNumber(),
      mature: () => this.getMaturity(),
      rationalThinking: () => this.getRationalThinking(),
      yearIndividual: () => this.getPersonalYear(),
      attitude: () => this.getAttitude()
    };

    const results: IndicatorInfo[] = [];
    for (const k of keys) {
      if (map[k]) {
        results.push(map[k]());
      }
    }
    // Preserve the classifier's selection; an unknown key must not be replaced
    // by a different indicator that the server did not request.
    return results;
  }
}

function getPersonalYearTheme(yearNum: number): string {
  switch (yearNum) {
    case 1: return 'Khởi đầu mới, tiên phong, đặt nền móng cho chu kỳ 9 năm tiếp theo.';
    case 2: return 'Hợp tác, hòa giải, kiên nhẫn, phát triển trực giác và các mối quan hệ.';
    case 3: return 'Mở rộng giao tiếp, sáng tạo, lan tỏa cảm hứng và học hỏi kỹ năng mới.';
    case 4: return 'Kỷ luật, củng cố nền tảng, làm việc kiên trì và quản lý tài chính vững chắc.';
    case 5: return 'Thay đổi, bứt phá giới hạn, linh hoạt, du lịch và đón nhận cơ hội bất ngờ.';
    case 6: return 'Gia đình, trách nhiệm, yêu thương, phụng sự và chăm sóc những người thân yêu.';
    case 7: return 'Chiêm nghiệm, tĩnh lặng, đào sâu tâm linh, nâng cao tri thức và nhìn lại chính mình.';
    case 8: return 'Gặt hái tài chính, quyền lực cá nhân, thành tựu sự nghiệp và đền đáp công sức.';
    case 9: return 'Khép lại chu kỳ, buông bỏ những điều không còn phù hợp, bao dung và chuẩn bị tái sinh.';
    default: return 'Chu kỳ phát triển cá nhân.';
  }
}
