/**
 * numerologyEngine.ts
 * Bộ tính toán toàn diện 24 Chỉ số Thần số học Pythagoras cho Mobile App.
 * Thuần TypeScript, không phụ thuộc thư viện ngoài, tối ưu hiệu năng.
 */

import { NUMEROLOGY_CARDS, type NumerologyCardMeta } from '../config/numerologyCards';

// Bảng số Pythagoras chuẩn quốc tế
export const PYTHAGOREAN_TABLE: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

const STANDARD_VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

// Xóa dấu tiếng Việt chuẩn
export function removeAccents(str: string): string {
  if (!str) return '';
  const accentsMap = [
    'aàảãáạăằẳẵắặâầẩẫấậ',
    'AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ',
    'dđ',
    'DĐ',
    'eèẻẽéẹêềểễếệ',
    'EÈẺẼÉẸÊỀỂỄẾỆ',
    'iìỉĩíị',
    'IÌỈĨÍỊ',
    'oòỏõóọôồổỗốộơờởỡớợ',
    'OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ',
    'uùủũúụưừửữứự',
    'UÙỦŨÚỤƯỪỬỮỨỰ',
    'yỳỷỹýỵ',
    'YỲỶỸÝỴ',
  ];
  let res = str;
  for (let i = 0; i < accentsMap.length; i++) {
    const re = new RegExp('[' + accentsMap[i].slice(1) + ']', 'g');
    res = res.replace(re, accentsMap[i][0]);
  }
  return res;
}

// Chuẩn hóa họ tên
export function normalizeName(rawName: string): string {
  if (!rawName) return '';
  const withoutAccents = removeAccents(rawName);
  const onlyLettersAndSpaces = withoutAccents.replace(/[^a-zA-Z\s]/g, ' ');
  return onlyLettersAndSpaces.replace(/\s+/g, ' ').trim().toUpperCase();
}

// Kiểm tra nguyên âm theo quy tắc Pythagoras (chữ Y)
export function isVowel(char: string, word: string): boolean {
  const upperChar = char.toUpperCase();
  if (STANDARD_VOWELS.has(upperChar)) return true;
  if (upperChar !== 'Y') return false;

  const upperWord = word.toUpperCase();
  const hasStandardVowel = upperWord.split('').some((c) => STANDARD_VOWELS.has(c));
  return !hasStandardVowel;
}

// Rút gọn tổng các chữ số (bảo tồn số bậc thầy 11, 22, 33 nếu keepMaster = true)
export function reduceDigits(num: number | string, keepMaster: boolean = true): number {
  let current = Math.abs(Math.floor(Number(num) || 0));
  while (current > 9) {
    if (keepMaster && (current === 11 || current === 22 || current === 33)) {
      break;
    }
    const sum = String(current)
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    current = sum;
  }
  return current;
}

export interface CalculatedIndicator extends NumerologyCardMeta {
  value: string | number;
  displayValue: string;
  isMaster?: boolean;
}

// Parse ngày tháng năm sinh dương lịch an toàn
export function parseBirthDate(birthDate: string): { day: number; month: number; year: number } {
  if (!birthDate) {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  }

  // Hỗ trợ ISO YYYY-MM-DD hoặc DD/MM/YYYY
  if (birthDate.includes('-')) {
    const parts = birthDate.split('T')[0].split('-');
    if (parts.length >= 3) {
      return {
        year: parseInt(parts[0], 10) || 2000,
        month: parseInt(parts[1], 10) || 1,
        day: parseInt(parts[2], 10) || 1,
      };
    }
  } else if (birthDate.includes('/')) {
    const parts = birthDate.split('/');
    if (parts.length >= 3) {
      return {
        day: parseInt(parts[0], 10) || 1,
        month: parseInt(parts[1], 10) || 1,
        year: parseInt(parts[2], 10) || 2000,
      };
    }
  }

  const d = new Date(birthDate);
  if (!isNaN(d.getTime())) {
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }
  return { day: 1, month: 1, year: 2000 };
}

/**
 * Tính toán toàn bộ 24 chỉ số Thần số học
 */
export function calculate24Indicators(fullName: string, birthDate: string): CalculatedIndicator[] {
  const { day, month, year } = parseBirthDate(birthDate);
  const curDate = new Date();
  const curYear = curDate.getFullYear();
  const curMonth = curDate.getMonth() + 1;
  const curDay = curDate.getDate();

  const normName = normalizeName(fullName || 'NGUOI DUNG');
  const words = normName.split(' ').filter(Boolean);
  const allLetters = normName.replace(/\s/g, '').split('');

  // 1. Walks of Life (Đường đời)
  // Quy tắc chuẩn: Cộng toàn bộ chuỗi số ngày tháng năm sinh
  const dateNumStr = `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${year}`;
  let lifeSum = 0;
  for (let i = 0; i < dateNumStr.length; i++) {
    lifeSum += parseInt(dateNumStr[i], 10);
  }
  while (lifeSum >= 10 && lifeSum !== 10 && lifeSum !== 11 && lifeSum !== 22) {
    let tSum = 0;
    const s = String(lifeSum);
    for (let i = 0; i < s.length; i++) tSum += parseInt(s[i], 10);
    lifeSum = tSum;
  }
  const walksOfLife = lifeSum;

  // 2. Mission (Sứ mệnh / Expression)
  let missionSum = 0;
  for (const letter of allLetters) {
    missionSum += PYTHAGOREAN_TABLE[letter] || 0;
  }
  const mission = reduceDigits(missionSum, true);

  // 3. Soul Urge (Linh hồn)
  let soulSum = 0;
  for (const w of words) {
    const letters = w.split('');
    const vowels = letters.filter((l) => isVowel(l, w));
    for (const v of vowels) {
      soulSum += PYTHAGOREAN_TABLE[v] || 0;
    }
  }
  const soul = reduceDigits(soulSum, true);

  // 4. Personality (Nhân cách)
  let persSum = 0;
  for (const w of words) {
    const letters = w.split('');
    const consonants = letters.filter((l) => !isVowel(l, w));
    for (const c of consonants) {
      persSum += PYTHAGOREAN_TABLE[c] || 0;
    }
  }
  const personality = reduceDigits(persSum, true);

  // 5. Birthday Number (Số ngày sinh)
  const dateOfBirth = day === 11 || day === 22 ? day : reduceDigits(day, false);

  // 6. Maturity Number (Số trưởng thành)
  const mature = reduceDigits(walksOfLife + mission, true);

  // 7. Balance Number (Số cân bằng: tổng chữ cái đầu tiên mỗi từ)
  let balanceSum = 0;
  for (const w of words) {
    if (w.length > 0) balanceSum += PYTHAGOREAN_TABLE[w[0]] || 0;
  }
  const balance = reduceDigits(balanceSum, false);

  // 8. Rational Thought (Tư duy lý trí: Tên gọi + Ngày sinh)
  const firstName = words[words.length - 1] || '';
  let firstSum = 0;
  for (const l of firstName) firstSum += PYTHAGOREAN_TABLE[l] || 0;
  const rFirst = reduceDigits(firstSum, false);
  const rDay = reduceDigits(day, false);
  const rationalThinking = reduceDigits(rFirst + rDay, false);

  // 9. Missing Numbers & Subconscious Power
  const letterCounts: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) letterCounts[i] = 0;
  for (const l of allLetters) {
    const v = PYTHAGOREAN_TABLE[l];
    if (v && v >= 1 && v <= 9) letterCounts[v] = (letterCounts[v] || 0) + 1;
  }
  const missingNumbersList: number[] = [];
  for (let i = 1; i <= 9; i++) {
    if (letterCounts[i] === 0) missingNumbersList.push(i);
  }
  const missingNumbers = missingNumbersList.length > 0 ? missingNumbersList.join(', ') : 'Không thiếu';
  const subconsciousPower = 9 - missingNumbersList.length;

  // 10. Hidden Passion (Đam mê ẩn giấu: số xuất hiện nhiều nhất)
  let maxCount = 0;
  for (let i = 1; i <= 9; i++) {
    if (letterCounts[i] > maxCount) maxCount = letterCounts[i];
  }
  const passionList: number[] = [];
  if (maxCount > 0) {
    for (let i = 1; i <= 9; i++) {
      if (letterCounts[i] === maxCount) passionList.push(i);
    }
  }
  const passion = passionList.length > 0 ? passionList.join(', ') : 'Không xác định';

  // 11. Attitude (Thái độ tiếp cận: Ngày sinh + Tháng sinh)
  const attitude = reduceDigits(reduceDigits(day, false) + reduceDigits(month, false), false);

  // 12. Karmic Debts (Nợ nghiệp: 13/4, 14/5, 16/7, 19/1)
  const debts = new Set<string>();
  if ([13, 14, 16, 19].includes(day)) {
    if (day === 13) debts.add('13/4');
    if (day === 14) debts.add('14/5');
    if (day === 16) debts.add('16/7');
    if (day === 19) debts.add('19/1');
  }
  const rawLp = reduceDigits(day, false) + reduceDigits(month, false) + reduceDigits(year, false);
  if ([13, 14, 16, 19].includes(rawLp)) {
    if (rawLp === 13) debts.add('13/4');
    if (rawLp === 14) debts.add('14/5');
    if (rawLp === 16) debts.add('16/7');
    if (rawLp === 19) debts.add('19/1');
  }
  if ([13, 14, 16, 19].includes(missionSum)) {
    if (missionSum === 13) debts.add('13/4');
    if (missionSum === 14) debts.add('14/5');
    if (missionSum === 16) debts.add('16/7');
    if (missionSum === 19) debts.add('19/1');
  }
  const karmicDebts = debts.size > 0 ? Array.from(debts).join(', ') : 'Không có nợ nghiệp';

  // 13. Bridges (Các con số cầu nối)
  const rWalk = reduceDigits(walksOfLife, false);
  const rMiss = reduceDigits(mission, false);
  const rSoul = reduceDigits(soul, false);
  const rPers = reduceDigits(personality, false);
  const rMat = reduceDigits(mature, false);
  const rPass = typeof passion === 'number' ? reduceDigits(passion, false) : 0;

  const bridgeLifeMission = Math.abs(rWalk - rMiss);
  const bridgeSoulPersonality = Math.abs(rSoul - rPers);
  const bridgeMaturityPassion = Math.abs(rMat - rPass);

  // 14. Cycles (Vận hạn: Năm, Tháng, Ngày cá nhân)
  const rCurYear = reduceDigits(curYear, false);
  const yearIndividual = reduceDigits(rCurYear + reduceDigits(day, false) + reduceDigits(month, false), false);
  const monthIndividual = reduceDigits(yearIndividual + reduceDigits(curMonth, false), false);
  const dayIndividual = reduceDigits(monthIndividual + reduceDigits(curDay, false), false);

  // 15. Pinnacles (4 Đỉnh cao cuộc đời)
  const rMonth = reduceDigits(month, false);
  const rYear = reduceDigits(year, false);
  const calculatePeak = (sum: number, isPeak34: boolean) => {
    let s = sum;
    while (s >= 10) {
      if (isPeak34 && (s === 10 || s === 11)) return s;
      s = String(s).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    }
    return s;
  };
  const way1 = calculatePeak(rMonth + rDay, false);
  const way2 = calculatePeak(rDay + rYear, false);
  const way3 = calculatePeak(way1 + way2, true);
  const way4 = calculatePeak(rMonth + rYear, true);
  const way = `${way1} - ${way2} - ${way3} - ${way4}`;

  // 16. Challenges (4 Thách thức cuộc đời)
  const c1 = Math.abs(rMonth - rDay);
  const c2 = Math.abs(rYear - rDay);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(rMonth - rYear);
  const challenges = `${c1} - ${c2} - ${c3} - ${c4}`;

  // 17. Arrows (8 Mũi tên cá tính 3x3)
  const birthDigits = `${day}${month}${year}`.split('').map(Number);
  const birthCounts: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) birthCounts[i] = 0;
  for (const d of birthDigits) {
    if (d >= 1 && d <= 9) birthCounts[d] = (birthCounts[d] || 0) + 1;
  }

  const checkArrow = (n1: number, n2: number, n3: number, label: string) => {
    const hasAll = birthCounts[n1] > 0 && birthCounts[n2] > 0 && birthCounts[n3] > 0;
    const emptyAll = birthCounts[n1] === 0 && birthCounts[n2] === 0 && birthCounts[n3] === 0;
    if (hasAll) return `${label} (Mạnh)`;
    if (emptyAll) return `${label} (Trống)`;
    return null;
  };

  const detectedArrows = [
    checkArrow(1, 4, 7, '1-4-7'),
    checkArrow(2, 5, 8, '2-5-8'),
    checkArrow(3, 6, 9, '3-6-9'),
    checkArrow(1, 2, 3, '1-2-3'),
    checkArrow(4, 5, 6, '4-5-6'),
    checkArrow(7, 8, 9, '7-8-9'),
    checkArrow(1, 5, 9, '1-5-9'),
    checkArrow(3, 5, 7, '3-5-7'),
  ].filter(Boolean);
  const arrows = detectedArrows.length > 0 ? detectedArrows.join('; ') : 'Cân bằng tự nhiên';

  // 18. Name Chart & Birth Chart
  const nameChart = `Tổng ${allLetters.length} chữ cái`;
  const birthChart = `Tổng ${birthDigits.length} chữ số ngày sinh`;

  // Gom các giá trị tính được vào map
  const valueMap: Record<string, { value: string | number; isMaster?: boolean }> = {
    walksOfLife: { value: walksOfLife, isMaster: walksOfLife === 11 || walksOfLife === 22 || walksOfLife === 33 },
    mission: { value: mission, isMaster: mission === 11 || mission === 22 || mission === 33 },
    soul: { value: soul, isMaster: soul === 11 || soul === 22 || soul === 33 },
    personality: { value: personality, isMaster: personality === 11 || personality === 22 || personality === 33 },
    dateOfBirth: { value: dateOfBirth, isMaster: dateOfBirth === 11 || dateOfBirth === 22 },
    mature: { value: mature, isMaster: mature === 11 || mature === 22 || mature === 33 },
    balance: { value: balance },
    rationalThinking: { value: rationalThinking },
    subconsciousPower: { value: subconsciousPower },
    passion: { value: passion },
    attitude: { value: attitude },
    karmicDebts: { value: karmicDebts },
    missingNumbers: { value: missingNumbers },
    bridgeLifeMission: { value: bridgeLifeMission },
    bridgeSoulPersonality: { value: bridgeSoulPersonality },
    bridgeMaturityPassion: { value: bridgeMaturityPassion },
    yearIndividual: { value: yearIndividual },
    monthIndividual: { value: monthIndividual },
    dayIndividual: { value: dayIndividual },
    way: { value: way },
    challenges: { value: challenges },
    arrows: { value: arrows },
    nameChart: { value: nameChart },
    birthChart: { value: birthChart },
  };

  // Ghép nối với danh mục 24 Cards
  return NUMEROLOGY_CARDS.map((card) => {
    const computed = valueMap[card.key] || { value: '—' };
    return {
      ...card,
      value: computed.value,
      displayValue: String(computed.value),
      isMaster: computed.isMaster,
    };
  });
}
