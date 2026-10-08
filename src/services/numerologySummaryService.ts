/**
 * numerologySummaryService.ts
 * Cung cấp câu đúc kết triết lý ngắn gọn (1-2 câu) cho 24 chỉ số Thần số học
 * theo từng con số và trường năng lượng nguyên mẫu (Archetype),
 * đồng bộ với giao diện "Bản Đồ Linh Hồn" của Numelyra.
 */

import { CalculatedIndicator } from './numerologyEngine';

// Từ điển đúc kết nguyên mẫu theo con số (1-9, 10, 11, 22, 33)
const NUMBER_CORE_SUMMARIES: Record<string | number, string> = {
  1: 'Người tiên phong độc lập, mang ý chí kiên định khai phá những lối đi mới và dẫn dắt người khác bằng bản lĩnh tự thân.',
  2: 'Sứ giả của sự hòa hợp, sở hữu trái tim thấu cảm tinh tế, kết nối tình thân và lan tỏa năng lượng bình an.',
  3: 'Tâm hồn nghệ sĩ rạng rỡ, giàu trí tưởng tượng, thắp sáng cuộc đời bằng sự lạc quan, tiếng cười và tài hoa biểu đạt.',
  4: 'Người xây dựng vững chãi, hiện thân của tính kỷ luật, sự tỉ mỉ thực tế và nền tảng bền vững theo thời gian.',
  5: 'Nhà thám hiểm tự do, khao khát phá vỡ mọi giới hạn, đón nhận sự biến đổi và lan tỏa ngọn lửa phiêu lưu bất tận.',
  6: 'Người nuôi dưỡng tận tụy, mang tình yêu vô điều kiện che chở gia đình, vun đắp mái ấm và phụng sự cộng đồng.',
  7: 'Người tìm kiếm chân lý, mang trong mình trí tuệ sâu sắc và khát khao khám phá những điều bí ẩn của cuộc sống.',
  8: 'Nhà kiến tạo thịnh vượng, làm chủ sức mạnh vật chất và quyền uy với tầm nhìn chiến lược vĩ mô vượt trội.',
  9: 'Tâm hồn bác ái bao dung, mang lý tưởng phụng sự nhân loại, nâng đỡ tinh thần và hoàn thiện những bài học lớn.',
  10: 'Người dẫn đầu đa tài và linh hoạt, kết hợp ngọn lửa độc lập và tiềm năng vô tận để khai mở thành tựu lớn.',
  11: 'Bậc thầy trực giác tâm linh, chiếc cầu nối soi sáng giữa thế giới ý niệm và hiện thực cuộc đời.',
  22: 'Bậc thầy kiến thiết vĩ đại, biến những giấc mơ lý tưởng thành công trình thực tế phụng sự xã hội muôn đời.',
  33: 'Bậc thầy chữa lành từ bi, nâng tầm tâm thức nhân loại bằng tình thương bao la và trí tuệ khai sáng.',
};

// Từ điển đúc kết riêng cho các chỉ số đặc biệt (nợ nghiệp, bài học, biểu đồ...)
const SPECIAL_INDICATOR_SUMMARIES: Record<string, (indicator: CalculatedIndicator) => string> = {
  // Chỉ số nợ nghiệp
  karmicDebts: (ind) => {
    const val = String(ind.value);
    if (val.includes('13')) {
      return 'Nợ nghiệp 13/4: Bài học chuyển hóa sự chây lười thành tính kỷ luật thép và sự kiên trì bền bỉ.';
    }
    if (val.includes('14')) {
      return 'Nợ nghiệp 14/5: Bài học kiểm soát dục vọng, tìm thấy tự do đích thực trong sự chừng mực và làm chủ bản thân.';
    }
    if (val.includes('16')) {
      return 'Nợ nghiệp 16/7: Bài học thanh tẩy bản ngã kiêu hãnh, xây dựng lại niềm tin từ sự khiêm nhường sâu sắc.';
    }
    if (val.includes('19')) {
      return 'Nợ nghiệp 19/1: Bài học hóa giải tính độc đoán, học cách lắng nghe và nâng đỡ người xung quanh.';
    }
    return 'Lộ trình hóa giải những nợ duyên tiền kiếp để chuyển hóa nghiệp lực thành phúc báu trọn vẹn.';
  },

  // Bài học số thiếu
  missingNumbers: (ind) => {
    const val = String(ind.displayValue || ind.value);
    if (!val || val === 'Không có' || val === '0') {
      return 'Bạn sở hữu bộ năng lượng tương đối trọn vẹn, ít chướng ngại năng lượng thiếu hụt trong danh xưng.';
    }
    return `Bài học rèn luyện những phẩm chất còn khuyết (số ${val}) để hoàn thiện bức tranh năng lượng toàn diện của linh hồn.`;
  },

  // Cầu nối Đường đời - Sứ mệnh
  bridgeLifeMission: (ind) => {
    return `Chiếc cầu hòa giải giữa con đường thực tế và lý tưởng cao đẹp của cuộc đời bạn (Điểm nối số ${ind.displayValue}).`;
  },

  // Cầu nối Linh hồn - Nhân cách
  bridgeSoulPersonality: (ind) => {
    return `Nhịp cầu đồng nhất giữa khao khát sâu kín bên trong và diện mạo ứng xử bộc lộ ra thế giới (Số ${ind.displayValue}).`;
  },

  // Cầu nối Trưởng thành - Đam mê
  bridgeMaturityPassion: (ind) => {
    return `Chìa khóa chuyển hóa sở thích tự nhiên thành di sản vững vàng ở độ chín của cuộc đời (Số ${ind.displayValue}).`;
  },

  // 4 Đỉnh cao cuộc đời
  way: (ind) => {
    return `4 cột mốc đỉnh cao mở ra cánh cổng thành tựu và sự chuyển dịch tâm thức lớn theo từng chu kỳ 9 năm (Đỉnh hiện tại: ${ind.displayValue}).`;
  },

  // 4 Thách thức cuộc đời
  challenges: (ind) => {
    return `Những bài học thử thách đi kèm để rèn giũa ý chí và hoàn thiện sự can trường của bạn (Thách thức số ${ind.displayValue}).`;
  },

  // Mũi tên cá tính
  arrows: () => {
    return 'Các trục năng lượng vượt trội hoặc khoảng trống cần bồi đắp trong ma trận số học ngày sinh.';
  },

  // Biểu đồ tên
  nameChart: () => {
    return 'Ma trận phân bổ tần số âm rung của từng chữ cái, soi chiếu năng lực biểu đạt và khí chất nội tâm.';
  },

  // Biểu đồ ngày sinh
  birthChart: () => {
    return 'Bản đồ căn nguyên thể hiện 3 tầng thân - tâm - trí qua sự phân bố các con số trên ma trận 3x3.';
  },

  // Năm cá nhân
  yearIndividual: (ind) => {
    return `Dòng chảy năng lượng chủ đạo trong năm cá nhân số ${ind.displayValue}, dẫn lối thời cơ và hành động phù hợp.`;
  },

  // Tháng cá nhân
  monthIndividual: (ind) => {
    return `Nhịp điệu biến chuyển trong tháng cá nhân số ${ind.displayValue}, hỗ trợ định hướng mục tiêu ngắn hạn.`;
  },

  // Ngày cá nhân
  dayIndividual: (ind) => {
    return `Tần số rung động vi mô của ngày hôm nay (Số ${ind.displayValue}), chỉ dẫn tâm thái và hành vi cát tường.`;
  },
};

/**
 * Trả về câu đúc kết 1-2 câu sâu sắc, chuẩn xác cho từng lá bài chỉ số
 */
export function getIndicatorShortSummary(indicator: CalculatedIndicator): string {
  if (!indicator) return '';

  // 1. Kiểm tra nếu có xử lý riêng theo key
  if (SPECIAL_INDICATOR_SUMMARIES[indicator.key]) {
    return SPECIAL_INDICATOR_SUMMARIES[indicator.key](indicator);
  }

  // 2. Tra cứu theo giá trị số rút gọn
  const rawNum = typeof indicator.value === 'number' ? indicator.value : parseInt(String(indicator.value), 10);
  if (!isNaN(rawNum) && NUMBER_CORE_SUMMARIES[rawNum]) {
    return NUMBER_CORE_SUMMARIES[rawNum];
  }

  // 3. Fallback theo mô tả cơ bản của card
  if (indicator.description) {
    return indicator.description;
  }

  return 'Khám phá thông điệp năng lượng và bài học tiến hóa tâm thức mà vũ trụ gửi gắm qua con số này.';
}
