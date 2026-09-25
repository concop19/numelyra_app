/**
 * tuViBaziService.ts - Dịch vụ tính toán Tử Vi Đẩu Số & Bát Tự Tứ Trụ (Bazi Synastry) Toàn Diện
 * Dựa trên thuật toán Bát Tự Tình Duyên chuẩn của NUMELYRA Web (lib/bazi-love/engine.ts).
 * Tích hợp:
 * 1. Tứ Trụ Can Chi (Năm, Tháng, Ngày) & Ngũ Hành Nhật Chủ
 * 2. Cung Phu Thê (Lục Hợp, Tam Hợp, Lục Xung, Tương Hại)
 * 3. Thiên Can Ngũ Hợp (Giáp Kỷ, Ất Canh, Bính Tân, Đinh Nhâm, Mậu Quý)
 * 4. Ngũ Hành Nạp Âm 60 Hoa Giáp Tương Sinh / Tương Khắc
 * 5. Cung Phi Bát Trạch Quái Mệnh Phối Hôn (Sinh Khí, Diên Niên, Thiên Y, Phục Vị vs Tuyệt Mệnh, Họa Hại, Lục Sát, Ngũ Quỷ)
 * 6. Địa Chi Con Giáp Năm Sinh (Lục Hợp, Tam Hợp, Tứ Hành Xung)
 */

export interface PillarData {
  gan: string;
  zhi: string;
  ganVi: string;
  zhiVi: string;
  element: string; // Kim, Mộc, Thủy, Hỏa, Thổ
  elementEn: 'metal' | 'wood' | 'water' | 'fire' | 'earth';
}

export interface PersonTuViBaziChart {
  fullName: string;
  birthDate: string;
  gender: 'male' | 'female';
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  dayMaster: string; // Nhật Chủ (Can ngày)
  dayMasterElement: string; // Ngũ hành Nhật Chủ
  spousalPalace: string; // Cung Phu Thê (Chi ngày)
  spousalPalaceElement: string;
  napAmYear: string; // Ngũ hành nạp âm năm sinh (ví dụ: Hải Trung Kim)
  napAmElement: string; // Kim, Mộc, Thủy, Hỏa, Thổ
  cungPhi: string; // Quái mệnh: Càn, Khôn, Chấn, Tốn, Cấn, Ly, Khảm, Đoài
  cungPhiElement: string;
  cungPhiGroup: 'Đông Tứ Mệnh' | 'Tây Tứ Mệnh';
}

export interface TuViBaziSynastryResult {
  personA: PersonTuViBaziChart;
  personB: PersonTuViBaziChart;
  compatibilityScore: number; // 0 - 100
  spousalInteraction: {
    type: 'liu_he' | 'san_he' | 'chong' | 'hai' | 'neutral';
    labelVi: string;
    description: string;
  };
  stemInteraction: {
    type: 'he' | 'chong' | 'neutral';
    labelVi: string;
    description: string;
  };
  elementHarmony: {
    relationship: 'sinh' | 'khac' | 'dong_hanh';
    description: string;
  };
  napAmHarmony: {
    relationship: 'sinh' | 'khac' | 'dong_hanh';
    labelVi: string;
    description: string;
  };
  cungPhiBatTrach: {
    type: 'sinh_khi' | 'dien_nien' | 'thien_y' | 'phuc_vi' | 'tuyet_menh' | 'hoa_hai' | 'luc_sat' | 'ngu_quy';
    isAuspicious: boolean;
    labelVi: string;
    description: string;
  };
  yearAnimalHarmony: {
    labelVi: string;
    description: string;
  };
  summaryVi: string;
  adviceVi: string;
}

// -------------------------------------------------------------
// CONSTANTS & MAPS
// -------------------------------------------------------------

const THIEN_CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const DIA_CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const CAN_WUXING: Record<string, { vi: string; en: 'metal' | 'wood' | 'water' | 'fire' | 'earth' }> = {
  Giáp: { vi: 'Mộc', en: 'wood' },
  Ất: { vi: 'Mộc', en: 'wood' },
  Bính: { vi: 'Hỏa', en: 'fire' },
  Đinh: { vi: 'Hỏa', en: 'fire' },
  Mậu: { vi: 'Thổ', en: 'earth' },
  Kỷ: { vi: 'Thổ', en: 'earth' },
  Canh: { vi: 'Kim', en: 'metal' },
  Tân: { vi: 'Kim', en: 'metal' },
  Nhâm: { vi: 'Thủy', en: 'water' },
  Quý: { vi: 'Thủy', en: 'water' }
};

const CHI_WUXING: Record<string, { vi: string; en: 'metal' | 'wood' | 'water' | 'fire' | 'earth' }> = {
  Tý: { vi: 'Thủy', en: 'water' },
  Sửu: { vi: 'Thổ', en: 'earth' },
  Dần: { vi: 'Mộc', en: 'wood' },
  Mão: { vi: 'Mộc', en: 'wood' },
  Thìn: { vi: 'Thổ', en: 'earth' },
  Tỵ: { vi: 'Hỏa', en: 'fire' },
  Ngọ: { vi: 'Hỏa', en: 'fire' },
  Mùi: { vi: 'Thổ', en: 'earth' },
  Thân: { vi: 'Kim', en: 'metal' },
  Dậu: { vi: 'Kim', en: 'metal' },
  Tuất: { vi: 'Thổ', en: 'earth' },
  Hợi: { vi: 'Thủy', en: 'water' }
};

// Lục Hợp Địa Chi (Zhi Liu He)
const LIU_HE_MAP: Record<string, { pair: string; vi: string; desc: string }> = {
  'Tý': { pair: 'Sửu', vi: 'Tý Sửu Lục Hợp (Hóa Thổ)', desc: 'Sự hòa quyện bền chặt giữa lý trí và tình cảm thực tế.' },
  'Sửu': { pair: 'Tý', vi: 'Tý Sửu Lục Hợp (Hóa Thổ)', desc: 'Sự hòa quyện bền chặt giữa lý trí và tình cảm thực tế.' },
  'Dần': { pair: 'Hợi', vi: 'Dần Hợi Lục Hợp (Hóa Mộc)', desc: 'Tương hợp sinh sôi, kích hoạt sự nghiệp và cảm hứng sống.' },
  'Hợi': { pair: 'Dần', vi: 'Dần Hợi Lục Hợp (Hóa Mộc)', desc: 'Tương hợp sinh sôi, kích hoạt sự nghiệp và cảm hứng sống.' },
  'Mão': { pair: 'Tuất', vi: 'Mão Tuất Lục Hợp (Hóa Hỏa)', desc: 'Tình cảm nồng nàn, thấu hiểu sâu sắc tâm tư của nhau.' },
  'Tuất': { pair: 'Mão', vi: 'Mão Tuất Lục Hợp (Hóa Hỏa)', desc: 'Tình cảm nồng nàn, thấu hiểu sâu sắc tâm tư của nhau.' },
  'Thìn': { pair: 'Dậu', vi: 'Thìn Dậu Lục Hợp (Hóa Kim)', desc: 'Hỗ trợ tài lộc, gia đạo hưng thịnh và tôn trọng lẫn nhau.' },
  'Dậu': { pair: 'Thìn', vi: 'Thìn Dậu Lục Hợp (Hóa Kim)', desc: 'Hỗ trợ tài lộc, gia đạo hưng thịnh và tôn trọng lẫn nhau.' },
  'Tỵ': { pair: 'Thân', vi: 'Tỵ Thân Lục Hợp (Hóa Thủy)', desc: 'Linh hoạt, nhạy bén và biết nhường nhịn khi cần thiết.' },
  'Thân': { pair: 'Tỵ', vi: 'Tỵ Thân Lục Hợp (Hóa Thủy)', desc: 'Linh hoạt, nhạy bén và biết nhường nhịn khi cần thiết.' },
  'Ngọ': { pair: 'Mùi', vi: 'Ngọ Mùi Lục Hợp (Hóa Thổ)', desc: 'Ấm áp, chở che và mang lại cảm giác bình yên lâu dài.' },
  'Mùi': { pair: 'Ngọ', vi: 'Ngọ Mùi Lục Hợp (Hóa Thổ)', desc: 'Ấm áp, chở che và mang lại cảm giác bình yên lâu dài.' }
};

// Tam Hợp Địa Chi (San He)
const SAN_HE_GROUPS = [
  { branches: ['Thân', 'Tý', 'Thìn'], cục: 'Thủy Cục', desc: 'Trực giác nhạy bén, đồng điệu sâu sắc về mặt cảm xúc.' },
  { branches: ['Hợi', 'Mão', 'Mùi'], cục: 'Mộc Cục', desc: 'Bao dung, nhân hậu, hướng thiện và cùng nhau phát triển.' },
  { branches: ['Dần', 'Ngọ', 'Tuất'], cục: 'Hỏa Cục', desc: 'Nhiệt huyết, đam mê mãnh liệt và tràn đầy sức sống.' },
  { branches: ['Tỵ', 'Dậu', 'Sửu'], cục: 'Kim Cục', desc: 'Kiên định, rõ ràng, chung tay xây dựng nền tảng vững chắc.' }
];

// Lục Xung Địa Chi (Zhi Liu Chong)
const LIU_CHONG_MAP: Record<string, string> = {
  'Tý': 'Ngọ', 'Ngọ': 'Tý',
  'Sửu': 'Mùi', 'Mùi': 'Sửu',
  'Dần': 'Thân', 'Thân': 'Dần',
  'Mão': 'Dậu', 'Dậu': 'Mão',
  'Thìn': 'Tuất', 'Tuất': 'Thìn',
  'Tỵ': 'Hợi', 'Hợi': 'Tỵ'
};

// Tương Hại Địa Chi
const LIU_HAI_MAP: Record<string, string> = {
  'Tý': 'Mùi', 'Mùi': 'Tý',
  'Sửu': 'Ngọ', 'Ngọ': 'Sửu',
  'Dần': 'Tỵ', 'Tỵ': 'Dần',
  'Mão': 'Thìn', 'Thìn': 'Mão',
  'Thân': 'Hợi', 'Hợi': 'Thân',
  'Dậu': 'Tuất', 'Tuất': 'Dậu'
};

// Thiên Can Ngũ Hợp (Tian Gan Wu He)
const CAN_HE_MAP: Record<string, { partner: string; vi: string; desc: string }> = {
  'Giáp': { partner: 'Kỷ', vi: 'Giáp Kỷ hợp hóa Thổ (Trung Chính chi hợp)', desc: 'Sự kết hợp mẫu mực, tôn trọng đạo nghĩa và chuẩn mực.' },
  'Kỷ': { partner: 'Giáp', vi: 'Giáp Kỷ hợp hóa Thổ (Trung Chính chi hợp)', desc: 'Sự kết hợp mẫu mực, tôn trọng đạo nghĩa và chuẩn mực.' },
  'Ất': { partner: 'Canh', vi: 'Ất Canh hợp hóa Kim (Nhân Nghĩa chi hợp)', desc: 'Đồng điệu về chí hướng, dũng cảm và chân thành.' },
  'Canh': { partner: 'Ất', vi: 'Ất Canh hợp hóa Kim (Nhân Nghĩa chi hợp)', desc: 'Đồng điệu về chí hướng, dũng cảm và chân thành.' },
  'Bính': { partner: 'Tân', vi: 'Bính Tân hợp hóa Thủy (Uy Chế chi hợp)', desc: 'Cân bằng giữa sự tỏa sáng và nét tinh tế, sâu lắng.' },
  'Tân': { partner: 'Bính', vi: 'Bính Tân hợp hóa Thủy (Uy Chế chi hợp)', desc: 'Cân bằng giữa sự tỏa sáng và nét tinh tế, sâu lắng.' },
  'Đinh': { partner: 'Nhâm', vi: 'Đinh Nhâm hợp hóa Mộc (Nhân Thọ chi hợp)', desc: 'Tình cảm nồng hậu, giàu lòng trắc ẩn và chở che.' },
  'Nhâm': { partner: 'Đinh', vi: 'Đinh Nhâm hợp hóa Mộc (Nhân Thọ chi hợp)', desc: 'Tình cảm nồng hậu, giàu lòng trắc ẩn và chở che.' },
  'Mậu': { partner: 'Quý', vi: 'Mậu Quý hợp hóa Hỏa (Vô Tình chi hợp)', desc: 'Sự thu hút mãnh liệt giữa hai thái cực đối lập.' },
  'Quý': { partner: 'Mậu', vi: 'Mậu Quý hợp hóa Hỏa (Vô Tình chi hợp)', desc: 'Sự thu hút mãnh liệt giữa hai thái cực đối lập.' }
};

// 60 Hoa Giáp Nạp Âm
const NAP_AM_MAP: Record<string, string> = {
  'Giáp Tý': 'Hải Trung Kim', 'Ất Sửu': 'Hải Trung Kim',
  'Bính Dần': 'Lư Trung Hỏa', 'Đinh Mão': 'Lư Trung Hỏa',
  'Mậu Thìn': 'Đại Lâm Mộc', 'Kỷ Tỵ': 'Đại Lâm Mộc',
  'Canh Ngọ': 'Lộ Bàng Thổ', 'Tân Mùi': 'Lộ Bàng Thổ',
  'Nhâm Thân': 'Kiếm Phong Kim', 'Quý Dậu': 'Kiếm Phong Kim',
  'Giáp Tuất': 'Sơn Đầu Hỏa', 'Ất Hợi': 'Sơn Đầu Hỏa',
  'Bính Tý': 'Giản Hạ Thủy', 'Đinh Sửu': 'Giản Hạ Thủy',
  'Mậu Dần': 'Thành Đầu Thổ', 'Kỷ Mão': 'Thành Đầu Thổ',
  'Canh Thìn': 'Bạch Lạp Kim', 'Tân Tỵ': 'Bạch Lạp Kim',
  'Nhâm Ngọ': 'Dương Liễu Mộc', 'Quý Mùi': 'Dương Liễu Mộc',
  'Giáp Thân': 'Tuyền Trung Thủy', 'Ất Dậu': 'Tuyền Trung Thủy',
  'Bính Tuất': 'Ốc Thượng Thổ', 'Đinh Hợi': 'Ốc Thượng Thổ',
  'Mậu Tý': 'Tích Lịch Hỏa', 'Kỷ Sửu': 'Tích Lịch Hỏa',
  'Canh Dần': 'Tùng Bách Mộc', 'Tân Mão': 'Tùng Bách Mộc',
  'Nhâm Thìn': 'Trường Lưu Thủy', 'Quý Tỵ': 'Trường Lưu Thủy',
  'Giáp Ngọ': 'Sa Trung Kim', 'Ất Mùi': 'Sa Trung Kim',
  'Bính Thân': 'Sơn Hạ Hỏa', 'Đinh Dậu': 'Sơn Hạ Hỏa',
  'Mậu Tuất': 'Bình Địa Mộc', 'Kỷ Hợi': 'Bình Địa Mộc',
  'Canh Tý': 'Bích Thượng Thổ', 'Tân Sửu': 'Bích Thượng Thổ',
  'Nhâm Dần': 'Kim Bạch Kim', 'Quý Mão': 'Kim Bạch Kim',
  'Giáp Thìn': 'Phú Đăng Hỏa', 'Ất Tỵ': 'Phú Đăng Hỏa',
  'Bính Ngọ': 'Thiên Hà Thủy', 'Đinh Mùi': 'Thiên Hà Thủy',
  'Mậu Thân': 'Đại Trạch Thổ', 'Kỷ Dậu': 'Đại Trạch Thổ',
  'Canh Tuất': 'Thoa Xuyến Kim', 'Tân Hợi': 'Thoa Xuyến Kim',
  'Nhâm Tý': 'Tang Đố Mộc', 'Quý Sửu': 'Tang Đố Mộc',
  'Giáp Dần': 'Đại Khê Thủy', 'Ất Mão': 'Đại Khê Thủy',
  'Bính Thìn': 'Sa Trung Thổ', 'Đinh Tỵ': 'Sa Trung Thổ',
  'Mậu Ngọ': 'Thiên Thượng Hỏa', 'Kỷ Mùi': 'Thiên Thượng Hỏa',
  'Canh Thân': 'Thạch Lựu Mộc', 'Tân Dậu': 'Thạch Lựu Mộc',
  'Nhâm Tuất': 'Đại Hải Thủy', 'Quý Hợi': 'Đại Hải Thủy'
};

// -------------------------------------------------------------
// CUNG PHI BÁT TRẠCH (QUÁI MỆNH PHỐI HÔN)
// -------------------------------------------------------------

export function getCungPhi(year: number, gender: 'male' | 'female'): { name: string; element: string; group: 'Đông Tứ Mệnh' | 'Tây Tứ Mệnh' } {
  let y = year;
  let s = 0;
  while (y > 0) {
    s += y % 10;
    y = Math.floor(y / 10);
  }
  while (s > 9) {
    let temp = 0;
    while (s > 0) {
      temp += s % 10;
      s = Math.floor(s / 10);
    }
    s = temp;
  }

  let num = 1;
  if (year >= 2000) {
    if (gender === 'male') {
      num = 9 - s;
      if (num <= 0) num += 9;
    } else {
      num = 6 + s;
      while (num > 9) num -= 9;
    }
  } else {
    if (gender === 'male') {
      num = 10 - s;
      while (num > 9) num -= 9;
      if (num <= 0) num += 9;
    } else {
      num = 5 + s;
      while (num > 9) num -= 9;
    }
  }

  if (num === 5) {
    num = gender === 'male' ? 6 : 3; // Nam: Khôn (6), Nữ: Cấn (3)
  }

  const map: Record<number, { name: string; element: string; group: 'Đông Tứ Mệnh' | 'Tây Tứ Mệnh' }> = {
    1: { name: 'Khảm', element: 'Thủy', group: 'Đông Tứ Mệnh' },
    2: { name: 'Ly', element: 'Hỏa', group: 'Đông Tứ Mệnh' },
    3: { name: 'Cấn', element: 'Thổ', group: 'Tây Tứ Mệnh' },
    4: { name: 'Đoài', element: 'Kim', group: 'Tây Tứ Mệnh' },
    6: { name: 'Khôn', element: 'Thổ', group: 'Tây Tứ Mệnh' },
    7: { name: 'Tốn', element: 'Mộc', group: 'Đông Tứ Mệnh' },
    8: { name: 'Chấn', element: 'Mộc', group: 'Đông Tứ Mệnh' },
    9: { name: 'Càn', element: 'Kim', group: 'Tây Tứ Mệnh' }
  };

  return map[num] || { name: 'Càn', element: 'Kim', group: 'Tây Tứ Mệnh' };
}

export function evaluateBatTrachPair(cungA: string, cungB: string): {
  type: 'sinh_khi' | 'dien_nien' | 'thien_y' | 'phuc_vi' | 'tuyet_menh' | 'hoa_hai' | 'luc_sat' | 'ngu_quy';
  isAuspicious: boolean;
  labelVi: string;
  description: string;
} {
  const pairKey = `${cungA}-${cungB}`;
  const reverseKey = `${cungB}-${cungA}`;

  const table: Record<string, { type: any; isAuspicious: boolean; labelVi: string; desc: string }> = {
    // Sinh Khí (Thượng Cát)
    'Càn-Đoài': { type: 'sinh_khi', isAuspicious: true, labelVi: 'Sinh Khí (Thượng Cát)', desc: 'Gia đạo hưng vượng, tài lộc dồi dào, sinh khí dồi dào, con cái thông minh hiếu thuận.' },
    'Cấn-Khôn': { type: 'sinh_khi', isAuspicious: true, labelVi: 'Sinh Khí (Thượng Cát)', desc: 'Tài vận hanh thông, gia đình hòa thuận êm ấm, hậu vận phú quý vinh hiển.' },
    'Chấn-Ly': { type: 'sinh_khi', isAuspicious: true, labelVi: 'Sinh Khí (Thượng Cát)', desc: 'Mộc Hỏa tương sinh, thanh danh vang dội, vợ chồng đồng tâm sự nghiệp thăng hoa.' },
    'Khảm-Tốn': { type: 'sinh_khi', isAuspicious: true, labelVi: 'Sinh Khí (Thượng Cát)', desc: 'Thủy Mộc giao hòa, tình duyên đằm thắm gắn bó, vượng khí sinh tài bền bỉ.' },

    // Diên Niên (Phước Đức Thượng Cát)
    'Càn-Khôn': { type: 'dien_nien', isAuspicious: true, labelVi: 'Diên Niên (Phước Đức Thượng Cát)', desc: 'Trời đất giao thoa (Càn Khôn hợp cách), tình cảm sắt son trăm năm, phúc lộc trường thọ.' },
    'Đoài-Cấn': { type: 'dien_nien', isAuspicious: true, labelVi: 'Diên Niên (Đại Cát)', desc: 'Tình nghĩa vẹn toàn, tiền bạc ổn định, gia đạo an khang thịnh vượng.' },
    'Chấn-Tốn': { type: 'dien_nien', isAuspicious: true, labelVi: 'Diên Niên (Đại Cát)', desc: 'Hai hành Mộc tương trợ, hòa thuận ấm êm, cùng nhau gầy dựng cơ đồ vững chắc.' },
    'Khảm-Ly': { type: 'dien_nien', isAuspicious: true, labelVi: 'Diên Niên (Thủy Hỏa Ký Tế)', desc: 'Âm dương tương phối, duyên nợ bền chặt, tôn trọng và yêu thương nhau suốt đời.' },

    // Thiên Y (Trung Cát)
    'Càn-Cấn': { type: 'thien_y', isAuspicious: true, labelVi: 'Thiên Y (Trung Cát)', desc: 'Trời ban phúc lộc, sức khỏe dồi dào, tiêu trừ tai ách, gặp hung hóa cát.' },
    'Khôn-Đoài': { type: 'thien_y', isAuspicious: true, labelVi: 'Thiên Y (Trung Cát)', desc: 'Được quý nhân trợ lực, gia đình hòa thuận, con cái đỗ đạt thành tài.' },
    'Chấn-Khảm': { type: 'thien_y', isAuspicious: true, labelVi: 'Thiên Y (Trung Cát)', desc: 'Tâm ý tương thông, cùng vượt qua trở ngại, tích lũy điền sản dồi dào.' },
    'Tốn-Ly': { type: 'thien_y', isAuspicious: true, labelVi: 'Thiên Y (Trung Cát)', desc: 'Trí tuệ sáng suốt, gia vận thăng tiến không ngừng, tiền đồ rạng rỡ.' },

    // Tuyệt Mệnh (Hung)
    'Càn-Ly': { type: 'tuyet_menh', isAuspicious: false, labelVi: 'Tuyệt Mệnh (Hung)', desc: 'Kim Hỏa xung khắc. Hóa giải: Chọn hướng phòng ngủ/bếp thuộc Thiên Y, sinh con hợp tuổi để hóa giải.' },
    'Khôn-Khảm': { type: 'tuyet_menh', isAuspicious: false, labelVi: 'Tuyệt Mệnh (Hung)', desc: 'Thổ Thủy đối nghịch. Hóa giải: Dùng vật phẩm phong thủy hành Kim trung hòa hoặc hướng bếp Diên Niên.' },
    'Cấn-Tốn': { type: 'tuyet_menh', isAuspicious: false, labelVi: 'Tuyệt Mệnh (Hung)', desc: 'Mộc Thổ giao tranh. Hóa giải: Dùng hành Hỏa điều hòa năng lượng, giữ tâm tính ôn hòa.' },
    'Đoài-Chấn': { type: 'tuyet_menh', isAuspicious: false, labelVi: 'Tuyệt Mệnh (Hung)', desc: 'Kim Mộc tương tàn. Hóa giải: Dùng hành Thủy chuyển tiếp, nhường nhịn và thấu hiểu khi bất đồng.' },

    // Ngũ Quỷ (Hung)
    'Càn-Chấn': { type: 'ngu_quy', isAuspicious: false, labelVi: 'Ngũ Quỷ (Thứ Hung)', desc: 'Dễ nảy sinh hiểu lầm, hao tài. Hóa giải: Dùng hướng Sinh Khí để áp chế, minh bạch tài chính.' },
    'Khôn-Tốn': { type: 'ngu_quy', isAuspicious: false, labelVi: 'Ngũ Quỷ (Thứ Hung)', desc: 'Khí vận bất hòa. Hóa giải: Bố trí không gian sống thoáng đãng, hướng bếp Sinh Khí hóa giải.' },
    'Cấn-Khảm': { type: 'ngu_quy', isAuspicious: false, labelVi: 'Ngũ Quỷ (Thứ Hung)', desc: 'Dễ tranh cãi. Hóa giải: Đặt bếp hướng Sinh Khí, kiểm soát cảm xúc khi trao đổi.' },
    'Đoài-Ly': { type: 'ngu_quy', isAuspicious: false, labelVi: 'Ngũ Quỷ (Thứ Hung)', desc: 'Hỏa khắc Kim nung nấu. Hóa giải: Dùng hành Thổ làm cầu nối tương sinh bền vững.' },

    // Lục Sát (Hung)
    'Càn-Khảm': { type: 'luc_sat', isAuspicious: false, labelVi: 'Lục Sát (Thứ Hung)', desc: 'Khí lạnh cô đơn, tình cảm dễ nguội lạnh. Hóa giải: Hướng bếp Diên Niên sưởi ấm gia đạo.' },
    'Khôn-Chấn': { type: 'luc_sat', isAuspicious: false, labelVi: 'Lục Sát (Thứ Hung)', desc: 'Bất đồng quan điểm. Hóa giải: Cùng nhau chia sẻ việc nhà, hướng bếp Diên Niên hóa giải.' },
    'Cấn-Ly': { type: 'luc_sat', isAuspicious: false, labelVi: 'Lục Sát (Thứ Hung)', desc: 'Nhiều áp lực từ bên ngoài. Hóa giải: Hướng bếp Diên Niên, tạo không gian thư giãn.' },
    'Đoài-Tốn': { type: 'luc_sat', isAuspicious: false, labelVi: 'Lục Sát (Thứ Hung)', desc: 'Tương khắc nhẹ. Hóa giải: Dùng hành Thủy trợ duyên, trò chuyện thẳng thắn.' },

    // Họa Hại (Hung)
    'Càn-Tốn': { type: 'hoa_hai', isAuspicious: false, labelVi: 'Họa Hại (Tiểu Hung)', desc: 'Dễ vướng khẩu thiệt thị phi. Hóa giải: Chọn hướng bếp Phục Vị hoặc Thiên Y để tiêu tai.' },
    'Khôn-Ly': { type: 'hoa_hai', isAuspicious: false, labelVi: 'Họa Hại (Tiểu Hung)', desc: 'Hay giận dỗi vặt vãnh. Hóa giải: Lắng nghe không ngắt lời, hướng bếp Thiên Y trợ mệnh.' },
    'Cấn-Chấn': { type: 'hoa_hai', isAuspicious: false, labelVi: 'Họa Hại (Tiểu Hung)', desc: 'Khác biệt thói quen sống. Hóa giải: Tôn trọng không gian riêng, hướng bếp Thiên Y.' },
    'Đoài-Khảm': { type: 'hoa_hai', isAuspicious: false, labelVi: 'Họa Hại (Tiểu Hung)', desc: 'Tâm tư ít bộc lộ. Hóa giải: Dành thời gian hẹn hò định kỳ, củng cố niềm tin.' },
  };

  if (cungA === cungB) {
    return {
      type: 'phuc_vi',
      isAuspicious: true,
      labelVi: 'Phục Vị (Tiểu Cát)',
      description: `Đồng Quái Mệnh (${cungA} - ${cungB}): Tính cách tương đồng, dễ đồng cảm và nương tựa lẫn nhau.`
    };
  }

  const match = table[pairKey] || table[reverseKey];
  if (match) {
    return {
      type: match.type,
      isAuspicious: match.isAuspicious,
      labelVi: match.labelVi,
      description: match.desc
    };
  }

  return {
    type: 'phuc_vi',
    isAuspicious: true,
    labelVi: 'Bình Hòa Tương Phối',
    description: `Quái mệnh ${cungA} và ${cungB} ở thế cân bằng, cần bồi đắp tình cảm qua sự thấu hiểu hàng ngày.`
  };
}

// -------------------------------------------------------------
// HELPER FUNCTIONS (Julian Day & Tứ Trụ)
// -------------------------------------------------------------

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function computePersonTuViBazi(
  fullName: string,
  birthDateStr: string,
  gender: 'male' | 'female' = 'female'
): PersonTuViBaziChart {
  const parts = birthDateStr.split('-').map(Number);
  const year = parts[0] || 2000;
  const month = parts[1] || 1;
  const day = parts[2] || 1;

  // 1. Trụ Năm
  const canYearIdx = (year + 6) % 10;
  const chiYearIdx = (year + 8) % 12;
  const ganYear = THIEN_CAN[canYearIdx];
  const zhiYear = DIA_CHI[chiYearIdx];

  // 2. Trụ Tháng (Ngũ Hổ Độn)
  const monthChiIdx = (month + 1) % 12;
  const monthZhi = DIA_CHI[monthChiIdx];
  const monthCanIdx = ((canYearIdx % 5) * 2 + 2 + (month - 1)) % 10;
  const monthGan = THIEN_CAN[monthCanIdx];

  // 3. Trụ Ngày (Julian Day Number)
  const jd = jdFromDate(day, month, year);
  const dayCanIdx = (jd + 9) % 10;
  const dayChiIdx = (jd + 1) % 12;
  const dayGan = THIEN_CAN[dayCanIdx];
  const dayZhi = DIA_CHI[dayChiIdx];

  const yearPillar: PillarData = {
    gan: ganYear,
    zhi: zhiYear,
    ganVi: ganYear,
    zhiVi: zhiYear,
    element: CAN_WUXING[ganYear]?.vi || 'Thổ',
    elementEn: CAN_WUXING[ganYear]?.en || 'earth'
  };

  const monthPillar: PillarData = {
    gan: monthGan,
    zhi: monthZhi,
    ganVi: monthGan,
    zhiVi: monthZhi,
    element: CAN_WUXING[monthGan]?.vi || 'Thổ',
    elementEn: CAN_WUXING[monthGan]?.en || 'earth'
  };

  const dayPillar: PillarData = {
    gan: dayGan,
    zhi: dayZhi,
    ganVi: dayGan,
    zhiVi: dayZhi,
    element: CAN_WUXING[dayGan]?.vi || 'Thổ',
    elementEn: CAN_WUXING[dayGan]?.en || 'earth'
  };

  const yearPair = `${ganYear} ${zhiYear}`;
  const napAm = NAP_AM_MAP[yearPair] || 'Bản mệnh Sa Trung Kim';
  const napAmElement = napAm.split(' ').pop() || 'Kim';

  const cungPhiData = getCungPhi(year, gender);

  return {
    fullName,
    birthDate: birthDateStr,
    gender,
    yearPillar,
    monthPillar,
    dayPillar,
    dayMaster: dayGan,
    dayMasterElement: CAN_WUXING[dayGan]?.vi || 'Mộc',
    spousalPalace: dayZhi,
    spousalPalaceElement: CHI_WUXING[dayZhi]?.vi || 'Hỏa',
    napAmYear: napAm,
    napAmElement,
    cungPhi: cungPhiData.name,
    cungPhiElement: cungPhiData.element,
    cungPhiGroup: cungPhiData.group
  };
}

// -------------------------------------------------------------
// BAZI LOVE SYNASTRY EVALUATION
// -------------------------------------------------------------

export function evaluateTuViBaziLove(
  personAChart: PersonTuViBaziChart,
  personBChart: PersonTuViBaziChart
): TuViBaziSynastryResult {
  let score = 70; // Base score

  // 1. Cung Phu Thê (Nhật Chi A ✕ Nhật Chi B)
  const branchA = personAChart.spousalPalace;
  const branchB = personBChart.spousalPalace;

  let spousalInteraction: TuViBaziSynastryResult['spousalInteraction'] = {
    type: 'neutral',
    labelVi: 'Bình hòa Cung Phu Thê',
    description: `Cung Phu Thê (${branchA} & ${branchB}) giữ thế trung lập, cần nuôi dưỡng qua sự đồng cảm hàng ngày.`
  };

  if (LIU_HE_MAP[branchA]?.pair === branchB) {
    score += 15;
    spousalInteraction = {
      type: 'liu_he',
      labelVi: 'Lục Hợp Quý Cách',
      description: `Cung Phu Thê đạt ${LIU_HE_MAP[branchA].vi}. ${LIU_HE_MAP[branchA].desc}`
    };
  } else {
    const sanHe = SAN_HE_GROUPS.find(
      g => g.branches.includes(branchA) && g.branches.includes(branchB)
    );
    if (sanHe) {
      score += 12;
      spousalInteraction = {
        type: 'san_he',
        labelVi: `Tam Hợp (${sanHe.cục})`,
        description: `Hai bạn có sự tương hỗ tự nhiên trong cung tình cảm: ${sanHe.desc}`
      };
    } else if (LIU_CHONG_MAP[branchA] === branchB) {
      score -= 12;
      spousalInteraction = {
        type: 'chong',
        labelVi: 'Tương Xung Cung Phu Thê',
        description: `Nhật Chi (${branchA} - ${branchB}) trực xung, dễ nảy sinh bất đồng về lối sống nếu thiếu sự nhẫn nại.`
      };
    } else if (LIU_HAI_MAP[branchA] === branchB) {
      score -= 8;
      spousalInteraction = {
        type: 'hai',
        labelVi: 'Tương Hại Cung Phu Thê',
        description: `Cung Phu Thê (${branchA} - ${branchB}) tương hại: Đôi khi nhạy cảm quá mức, cần chia sẻ thẳng thắn.`
      };
    }
  }

  // 2. Thiên Can Nhật Chủ (Day Master A ✕ Day Master B)
  const stemA = personAChart.dayMaster;
  const stemB = personBChart.dayMaster;

  let stemInteraction: TuViBaziSynastryResult['stemInteraction'] = {
    type: 'neutral',
    labelVi: 'Độc lập tự chủ',
    description: `Nhật Chủ ${stemA} và ${stemB} tôn trọng ranh giới cá nhân của nhau.`
  };

  if (CAN_HE_MAP[stemA]?.partner === stemB) {
    score += 14;
    stemInteraction = {
      type: 'he',
      labelVi: 'Thiên Can Ngũ Hợp',
      description: `${CAN_HE_MAP[stemA].vi}. ${CAN_HE_MAP[stemA].desc}`
    };
  }

  // 3. Ngũ Hành Tương Sinh Tương Khắc (Day Master Elements)
  const elemA = personAChart.dayMasterElement;
  const elemB = personBChart.dayMasterElement;

  let elementHarmony: TuViBaziSynastryResult['elementHarmony'] = {
    relationship: 'dong_hanh',
    description: `Hai bên cùng mang năng lượng ${elemA}, dễ tìm thấy tiếng nói chung nhưng cần tránh bướng bỉnh.`
  };

  const shengMap: Record<string, string> = {
    'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim', 'Kim': 'Thủy', 'Thủy': 'Mộc'
  };
  const keMap: Record<string, string> = {
    'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim', 'Kim': 'Mộc'
  };

  if (shengMap[elemA] === elemB) {
    score += 8;
    elementHarmony = {
      relationship: 'sinh',
      description: `Nhật Chủ ${elemA} tương sinh cho ${elemB}: ${personAChart.fullName} mang lại sự hỗ trợ và nguồn năng lượng tích cực cho ${personBChart.fullName}.`
    };
  } else if (shengMap[elemB] === elemA) {
    score += 8;
    elementHarmony = {
      relationship: 'sinh',
      description: `Nhật Chủ ${elemB} tương sinh cho ${elemA}: ${personBChart.fullName} là điểm tựa tinh thần vững chãi cho ${personAChart.fullName}.`
    };
  } else if (keMap[elemA] === elemB || keMap[elemB] === elemA) {
    score -= 5;
    elementHarmony = {
      relationship: 'khac',
      description: `Tương khắc ngũ hành giữa ${elemA} và ${elemB}: Cần học cách tiết chế cái tôi và lắng nghe đối phương.`
    };
  }

  // 4. Ngũ Hành Nạp Âm Bản Mệnh Năm Sinh
  const napA = personAChart.napAmElement;
  const napB = personBChart.napAmElement;
  let napAmHarmony: TuViBaziSynastryResult['napAmHarmony'] = {
    relationship: 'dong_hanh',
    labelVi: `Đồng Hành (${personAChart.napAmYear} • ${personBChart.napAmYear})`,
    description: `Hai bản mệnh cùng nạp âm ${napA}, cùng chung góc nhìn cuộc sống và dễ đồng hành lâu dài.`
  };

  if (shengMap[napA] === napB) {
    score += 10;
    napAmHarmony = {
      relationship: 'sinh',
      labelVi: `Tương Sinh (${napA} sinh ${napB})`,
      description: `Bản mệnh ${personAChart.napAmYear} tương sinh cho ${personBChart.napAmYear}: Khí vận nâng đỡ, gia đạo hưng thịnh tài lộc sung túc.`
    };
  } else if (shengMap[napB] === napA) {
    score += 10;
    napAmHarmony = {
      relationship: 'sinh',
      labelVi: `Tương Sinh (${napB} sinh ${napA})`,
      description: `Bản mệnh ${personBChart.napAmYear} tương sinh cho ${personAChart.napAmYear}: Điểm tựa vững bền, trợ duyên cho nhau vượt qua khó khăn.`
    };
  } else if (keMap[napA] === napB || keMap[napB] === napA) {
    score -= 6;
    napAmHarmony = {
      relationship: 'khac',
      labelVi: `Tương Khắc (${napA} ✕ ${napB})`,
      description: `Bản mệnh ${personAChart.napAmYear} và ${personBChart.napAmYear} có sự khắc chế: Nên dùng màu sắc phong thủy tương sinh để dung hòa.`
    };
  }

  // 5. Cung Phi Bát Trạch Phối Hôn
  const cungPhiBatTrach = evaluateBatTrachPair(personAChart.cungPhi, personBChart.cungPhi);
  if (cungPhiBatTrach.isAuspicious) {
    score += 12;
  } else {
    score -= 8;
  }

  // 6. Địa Chi Con Giáp Năm Sinh
  const zhiYearA = personAChart.yearPillar.zhi;
  const zhiYearB = personBChart.yearPillar.zhi;
  let yearAnimalHarmony: TuViBaziSynastryResult['yearAnimalHarmony'] = {
    labelVi: 'Bình Hòa Con Giáp',
    description: `Tuổi ${zhiYearA} và ${zhiYearB} không xung không khắc, gia đạo bình yên phát triển thuận tự nhiên.`
  };

  if (LIU_HE_MAP[zhiYearA]?.pair === zhiYearB) {
    score += 8;
    yearAnimalHarmony = {
      labelVi: 'Lục Hợp Con Giáp',
      description: `Tuổi ${zhiYearA} và ${zhiYearB} đạt Lục Hợp quý cách, vận may nhân đôi khi về chung một nhà.`
    };
  } else {
    const sanHeYear = SAN_HE_GROUPS.find(g => g.branches.includes(zhiYearA) && g.branches.includes(zhiYearB));
    if (sanHeYear) {
      score += 6;
      yearAnimalHarmony = {
        labelVi: `Tam Hợp Con Giáp (${sanHeYear.cục})`,
        description: `Tuổi ${zhiYearA} và ${zhiYearB} thuộc bộ Tam Hợp: Cùng chí hướng, dễ xây dựng sự nghiệp chung hưng thịnh.`
      };
    } else if (LIU_CHONG_MAP[zhiYearA] === zhiYearB) {
      score -= 8;
      yearAnimalHarmony = {
        labelVi: 'Tứ Hành Xung (Trực Xung)',
        description: `Tuổi ${zhiYearA} và ${zhiYearB} đối xung trực diện: Cần bao dung, tránh tranh cãi những lúc căng thẳng.`
      };
    }
  }

  // Normalize final score between 60% and 98%
  const finalScore = Math.max(60, Math.min(98, score));

  const summaryVi = `Theo Tử Vi Đẩu Số & Bát Tự Tứ Trụ, mức độ tương hợp giữa ${personAChart.fullName} (${personAChart.napAmYear}, Cung ${personAChart.cungPhi}) và ${personBChart.fullName} (${personBChart.napAmYear}, Cung ${personBChart.cungPhi}) đạt ${finalScore}%. ${spousalInteraction.description} Về Bát Trạch Quái Mệnh: ${cungPhiBatTrach.labelVi} - ${cungPhiBatTrach.description}. Về Ngũ Hành Nạp Âm: ${napAmHarmony.description}`;

  const adviceVi = finalScore >= 80
    ? `Lá số Tử Vi của hai bạn kết hợp rất đẹp (${cungPhiBatTrach.labelVi} & ${napAmHarmony.labelVi}). Hãy cùng nhau duy trì sự tôn trọng, đồng hành phát triển sự nghiệp và chăm sóc gia đạo viên mãn.`
    : `Tử Vi khuyên hai bạn: Dù có điểm khắc chế (${cungPhiBatTrach.labelVi}), nhưng có thể hóa giải trọn vẹn qua việc chọn hướng nhà/bếp cát lành, kiềm chế tính nóng nảy và thực hành lắng nghe chân thành mỗi ngày.`;

  return {
    personA: personAChart,
    personB: personBChart,
    compatibilityScore: finalScore,
    spousalInteraction,
    stemInteraction,
    elementHarmony,
    napAmHarmony,
    cungPhiBatTrach,
    yearAnimalHarmony,
    summaryVi,
    adviceVi
  };
}
