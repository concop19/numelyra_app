/**
 * numerologyKnowledge.ts
 * Dịch vụ tra cứu Luận giải Tri thức Thần số học Fallback.
 * Không cần AI sinh text, phản hồi tức thì < 50ms.
 * Ưu tiên tra cứu kho kiến thức 212 bài từ Supabase, tự động fallback về
 * bộ từ điển Archetype & Cycle tích hợp sẵn khi ngoại tuyến.
 */

import { supabase } from './supabaseClient';

export interface KnowledgeReadingResult {
  title: string;
  source: 'supabase-knowledge' | 'offline-archetype';
  overview: string;
  strengths: string[];
  challenges: string[];
  advice: string;
  fullContent?: string;
}

// Từ điển Archetype 1–9, 11, 22, 33 chuẩn trường phái Pythagoras
const ARCHETYPE_MAP: Record<number, { title: string; str: string[]; cha: string[]; adv: string; overview: string }> = {
  1: {
    title: 'Nhà Lãnh Đạo Tiên Phong',
    overview: 'Năng lượng khởi nguyên của sự độc lập, quyết đoán, ý chí sắt đá và bản lĩnh tự thân khai mở những con đường mới.',
    str: ['Độc lập và tự chủ vượt trội', 'Khả năng khởi xướng và ra quyết định dứt khoát', 'Tư duy tiên phong, sáng tạo nguyên bản'],
    cha: ['Dễ rơi vào độc đoán hoặc thiếu kiên nhẫn', 'Khó thỏa hiệp hoặc khó lắng nghe ý kiến người khác', 'Xu hướng ôm đồm một mình'],
    adv: 'Rèn luyện sự khiêm nhường và học cách dẫn dắt bằng cảm hứng thay vì áp đặt quyền uy. Sức mạnh vĩ đại nhất của người lãnh đạo là nâng đỡ người khác.'
  },
  2: {
    title: 'Sứ Giả Hòa Bình & Trực Giác',
    overview: 'Năng lượng dịu êm của sự thấu cảm, khả năng kết nối, lắng nghe sâu sắc và cân bằng mọi mối quan hệ xung quanh.',
    str: ['Trực giác nhạy bén, đồng cảm tinh tế', 'Năng khiếu ngoại giao, hòa giải bất hòa', 'Khả năng lắng nghe chân thành và xây dựng niềm tin'],
    cha: ['Dễ nhạy cảm thái quá trước lời phán xét', 'Xu hướng né tránh xung đột dẫn đến kìm nén cảm xúc', 'Dễ phụ thuộc vào tâm trạng người khác'],
    adv: 'Thiết lập ranh giới cảm xúc lành mạnh và tin tưởng vào tiếng nói nội tâm của chính bạn. Hòa hợp không có nghĩa là đánh mất chính mình.'
  },
  3: {
    title: 'Nghệ Sĩ Biểu Đạt & Sáng Tạo',
    overview: 'Năng lượng rạng rỡ của niềm vui sống, trí tưởng tượng phong phú, tài hoa ngôn từ và khả năng lan tỏa cảm hứng tích cực.',
    str: ['Lạc quan tự nhiên, thu hút và truyền cảm hứng', 'Khả năng biểu đạt xuất sắc qua lời nói, câu chữ hoặc nghệ thuật', 'Tâm hồn phong phú, hòa đồng'],
    cha: ['Dễ phân tán năng lượng vào quá nhiều thứ cùng lúc', 'Khó kiên trì hoàn thành mục tiêu dài hạn', 'Đôi khi trốn tránh nỗi buồn bằng sự vui vẻ bề nổi'],
    adv: 'Neo giữ những tia sáng sáng tạo vào kỷ luật hành động mỗi ngày. Hãy dám đối diện với chiều sâu nội tâm để tác phẩm và cuộc sống thêm sâu sắc.'
  },
  4: {
    title: 'Người Xây Dựng & Kỷ Luật',
    overview: 'Năng lượng vững chãi của đất mẹ, sự kiên định, kỷ luật thép, tư duy tổ chức hệ thống và trách nhiệm tuyệt đối.',
    str: ['Kỷ luật vững vàng, tỉ mỉ, cực kỳ đáng tin cậy', 'Tư duy logic, quản trị hệ thống và thực thi bài bản', 'Kiên trì bền bỉ vượt nghịch cảnh'],
    cha: ['Cứng nhắc, khó thích ứng trước thay đổi bất ngờ', 'Đôi khi quá thận trọng hoặc nghi ngờ cái mới', 'Dễ làm việc kiệt sức vì trách nhiệm'],
    adv: 'Đón nhận sự linh hoạt như một phần tự nhiên của dòng chảy cuộc sống. Hãy cho phép bản thân nghỉ ngơi và tận hưởng thành quả.'
  },
  5: {
    title: 'Nhà Thám Hiểm Tự Do',
    overview: 'Năng lượng năng động của sự bứt phá, khao khát tự do, thích nghi nhanh nhạy và lòng dũng cảm bước ra khỏi vùng an toàn.',
    str: ['Thích ứng phi thường trong mọi hoàn cảnh mới', 'Khát khao phiêu lưu, khám phá thế giới và học hỏi đa chiều', 'Năng lượng đổi mới, lan tỏa sức sống'],
    cha: ['Dễ bồn chồn, chóng chán khi mọi thứ lặp lại', 'Sợ sự ràng buộc lâu dài, dễ phân tán cam kết', 'Thiếu kiên nhẫn khi phải làm việc tiểu tiết'],
    adv: 'Tự do đích thực đến từ sự làm chủ bản thân; hãy tìm kiếm tự do trong mục đích thay vì chỉ trốn chạy cam kết.'
  },
  6: {
    title: 'Người Nuôi Dưỡng & Tình Yêu Vô Điều Kiện',
    overview: 'Năng lượng ấm áp của tình mẫu tử/phụ tử, trách nhiệm gia đình, sự chăm sóc, chữa lành và tạo dựng mái ấm bình an.',
    str: ['Tình yêu thương sâu sắc, hướng về gia đình và cộng đồng', 'Trách nhiệm cao, gu thẩm mỹ tinh tế và khả năng bao bọc', 'Tài năng chữa lành và hòa giải'],
    cha: ['Dễ can thiệp quá sâu hoặc kiểm soát người thân', 'Hay hy sinh quên mình dẫn đến kiệt sức và oán trách ngầm', 'Khó buông bỏ lo âu'],
    adv: 'Yêu thương bản thân là điều kiện tiên quyết để chăm sóc người khác trọn vẹn. Hãy cho người thân không gian để họ tự trưởng thành.'
  },
  7: {
    title: 'Nhà Hiền Triết & Khai Phóng Tri Thức',
    overview: 'Năng lượng sâu sắc của tư duy triết học, trực giác tâm linh, hành trình tìm kiếm chân lý tối thượng và sự tĩnh lặng nội tại.',
    str: ['Tư duy phân tích sắc bén, nhìn thấu bản chất vấn đề', 'Trực giác tâm linh sâu sắc, độc lập và tinh tế', 'Khát khao học hỏi và đúc kết tri thức gốc'],
    cha: ['Khép kín, hoài nghi, khó mở lòng chia sẻ cảm xúc', 'Dễ cảm thấy cô đơn hoặc xa cách với thực tại', 'Có xu hướng phán xét khi người khác không hiểu mình'],
    adv: 'Kết hợp tri thức trí tuệ với sự kết nối con người. Đừng để hành trình tìm kiếm biến thành ốc đảo cô độc; hãy chia sẻ ánh sáng hiểu biết cho đời.'
  },
  8: {
    title: 'Nhà Kiến Tạo Thịnh Vượng & Quyền Lực',
    overview: 'Năng lượng uy quyền của vật chất, tư duy chiến lược, khả năng điều hành vĩ mô và sự cân bằng nhân quả trong kinh tế.',
    str: ['Tầm nhìn chiến lược lớn, tài năng kinh doanh và điều hành', 'Lực hút thịnh vượng và năng lượng dồi dào', 'Công bằng, kiên cường và khí chất tự tin'],
    cha: ['Dễ bị cuốn vào chủ nghĩa vật chất hoặc áp lực danh tiếng', 'Khắc nghiệt với bản thân và người dưới quyền', 'Sợ mất kiểm soát'],
    adv: 'Sức mạnh và tài chính là phương tiện phụng sự; khi bạn tạo ra giá trị bền vững cho cộng đồng, sự thịnh vượng tự khắc sẽ theo sau.'
  },
  9: {
    title: 'Nhà Nhân Đạo Bác Ái & Trí Huệ',
    overview: 'Năng lượng bao dung của lòng vị tha toàn nhân loại, sự giác ngộ, tấm lòng phụng sự vô vị lợi và tinh thần buông bỏ.',
    str: ['Tấm lòng vị tha, bao dung và trách nhiệm xã hội cao', 'Tầm nhìn rộng mở, trực giác tâm linh trưởng thành', 'Khả năng truyền cảm hứng và nâng đỡ'],
    cha: ['Dễ thất vọng trước thực tế trần tục không như lý tưởng', 'Khó buông bỏ quá khứ hoặc những tổn thương cũ', 'Đôi khi thiếu thực tế trong tài chính'],
    adv: 'Cống hiến với tâm thế an nhiên; chấp nhận sự không hoàn hảo như một phần của hành trình tiến hóa.'
  },
  10: {
    title: 'Nhà Lãnh Đạo Đa Tài & Thích Ứng (Số 10)',
    overview: 'Sự kết hợp giữa ngọn lửa độc lập (1) và tiềm năng vô hạn (0), sở hữu tính linh hoạt cao, dũng cảm và thu hút.',
    str: ['Thích ứng phi thường, đa tài và dũng cảm', 'Dễ thành công trong nhiều lĩnh vực khác nhau', 'Phong thái tự tin, cuốn hút'],
    cha: ['Dễ tự mãn hoặc dao động khi gặp thất bại nhỏ', 'Cần tránh phân tán tài năng vào quá nhiều hướng'],
    adv: 'Tập trung năng lượng vào lĩnh vực bạn đam mê nhất; sự nhất quán sẽ biến tài năng thành di sản bền vững.'
  },
  11: {
    title: 'Bậc Thầy Trực Giác & Soi Sáng (Master 11)',
    overview: 'Con số bậc thầy sở hữu tần số trực giác thần bí phi thường, chiếc cầu nối giữa thế giới ý niệm và thực tại trần gian.',
    str: ['Trực giác thần bí siêu nhạy, khả năng thức tỉnh người khác', 'Tầm nhìn đi trước thời đại, tâm hồn nhạy cảm tinh khôi', 'Khả năng thắp sáng hy vọng'],
    cha: ['Năng lượng quá tải dễ gây căng thẳng thần kinh', 'Dao động giữa nghi ngờ bản thân và gánh nặng sứ mệnh lớn', 'Cảm giác lạc lõng'],
    adv: 'Giữ vững sự cân bằng thân-tâm-trí qua thiền định và lối sống gần gũi thiên nhiên; bạn là sứ giả mang ánh sáng cho những người tìm đường.'
  },
  22: {
    title: 'Bậc Thầy Kiến Thiết Thế Giới (Master 22/4)',
    overview: 'Con số bậc thầy quyền năng nhất, biến những lý tưởng vĩ đại thành các công trình thực tế phụng sự nhân loại.',
    str: ['Biến lý tưởng vĩ đại thành hiện thực cụ thể', 'Tầm nhìn không giới hạn kết hợp kỷ luật phi thường', 'Khả năng lãnh đạo các dự án mang tính di sản'],
    cha: ['Áp lực khổng lồ từ kỳ vọng bản thân', 'Sợ thất bại khi gánh vác trách nhiệm lớn', 'Dễ kiệt sức nếu không phân quyền'],
    adv: 'Xây dựng từng viên gạch với sự nhẫn nại; di sản vĩ đại nhất được tạo nên từ sự kiên định mỗi ngày.'
  },
  33: {
    title: 'Bậc Thầy Nâng Đỡ & Tình Yêu Phổ Quát (Master 33/6)',
    overview: 'Con số bậc thầy của tình thương vị tha cao quý nhất, mang sứ mệnh chữa lành và nâng đỡ tâm hồn con người.',
    str: ['Tình yêu thương vô điều kiện ở tầng thứ cao nhất', 'Khả năng chữa lành, dẫn dắt tâm linh và truyền dạy', 'Hiện thân của lòng tận tụy'],
    cha: ['Gánh nặng cảm xúc của tha nhân đè nặng', 'Dễ kiệt quệ nếu không biết tự bảo vệ năng lượng cá nhân'],
    adv: 'Soi sáng bằng chính sự an lạc nội tại của bạn; hãy là ngọn hải đăng bình yên, đừng gánh thay số phận của người khác.'
  }
};

// Luận giải cho Năm cá nhân (Personal Year)
const PERSONAL_YEAR_DATA: Record<number, { title: string; overview: string; str: string[]; cha: string[]; adv: string }> = {
  1: {
    title: 'Năm Số 1: Khởi Đầu & Tiên Phong',
    overview: 'Năm mở đầu cho chu kỳ 9 năm mới. Thời điểm vàng để gieo hạt giống, bắt đầu dự án mới, tự tin bứt phá.',
    str: ['Ý chí mạnh mẽ, nhiều năng lượng tươi mới', 'Cơ hội khởi nghiệp, học kỹ năng mới, đổi mới hướng đi'],
    cha: ['Đòi hỏi tự lập, đôi lúc cảm thấy đơn độc'],
    adv: 'Dám hành động độc lập, chủ động nắm bắt cơ hội, đừng chần chừ do dự.'
  },
  2: {
    title: 'Năm Số 2: Hợp Tác & Kiên Nhẫn',
    overview: 'Giai đoạn nuôi dưỡng hạt giống trong tĩnh lặng. Tăng cường hợp tác, chăm sóc các mối quan hệ và lắng nghe trực giác.',
    str: ['Trực giác nhạy cảm, dễ hòa giải và kết nối đối tác', 'Bình an nội tâm, cảm xúc sâu lắng'],
    cha: ['Tiến độ công việc có thể chậm lại, cần kiên nhẫn'],
    adv: 'Lấy nhu thắng cương, học cách hợp tác chân thành và lắng nghe người đồng hành.'
  },
  3: {
    title: 'Năm Số 3: Mở Rộng & Sáng Tạo',
    overview: 'Năm nở hoa của trí tưởng tượng và giao tiếp. Thời điểm lý tưởng để kết nối xã hội, học hỏi, lan tỏa hình ảnh cá nhân.',
    str: ['Năng lượng lạc quan, nhiều ý tưởng đột phá', 'Giao lưu mở rộng, cơ hội kết nối cộng đồng'],
    cha: ['Dễ tiêu xài phân tán hoặc mất tập trung'],
    adv: 'Tận dụng tài năng biểu đạt và sáng tạo, nhưng hãy giữ vững kỷ luật tài chính.'
  },
  4: {
    title: 'Năm Số 4: Củng Cố & Kỷ Luật',
    overview: 'Năm đặt nền móng vững chắc. Trọng tâm là làm việc chăm chỉ, tổ chức lại công việc, củng cố sức khỏe và tài chính.',
    str: ['Tư duy thực tế, tính kỷ luật cao', 'Xây dựng quy trình bài bản, tiết kiệm tích lũy tốt'],
    cha: ['Áp lực công việc nhiều, cảm giác gò bó'],
    adv: 'Kiên trì từng bước một, chăm sóc cơ thể vật lý và không nên đầu tư mạo hiểm.'
  },
  5: {
    title: 'Năm Số 5: Thay Đổi & Tự Do',
    overview: 'Năm giữa chu kỳ mang theo luồng gió mới của sự chuyển dịch, du lịch, bứt phá giới hạn và mở ra cơ hội bất ngờ.',
    str: ['Thích ứng nhanh, nhiều trải nghiệm phiêu lưu', 'Cơ hội chuyển mình ngoạn mục'],
    cha: ['Biến động bất ngờ, dễ bồn chồn mất phương hướng'],
    adv: 'Linh hoạt đón nhận đổi mới, biến sự thay đổi thành bàn đạp phát triển.'
  },
  6: {
    title: 'Năm Số 6: Gia Đình & Phụng Sự',
    overview: 'Năm của tình yêu thương, chăm sóc gia đình, tổ ấm, chữa lành các mối quan hệ và phụng sự cộng đồng.',
    str: ['Tình cảm gia đình gắn kết, tổ ấm an yên', 'Khả năng chữa lành và nâng đỡ người thân'],
    cha: ['Gánh nặng trách nhiệm gia đình, dễ lo âu thái quá'],
    adv: 'Dành thời gian cho những người thân yêu, làm đẹp không gian sống và học cách lắng nghe.'
  },
  7: {
    title: 'Năm Số 7: Chiêm Nghiệm & Tri Thức',
    overview: 'Năm của nội tâm sâu sắc. Thời điểm tuyệt vời để học tập chuyên sâu, tu dưỡng tinh thần và nhìn lại bản thân.',
    str: ['Trí tuệ phát triển vượt bậc, thấu hiểu quy luật', 'Trực giác tâm linh sâu sắc'],
    cha: ['Không thuận lợi cho đầu tư lớn bề ngoài, cần tĩnh lặng'],
    adv: 'Đầu tư cho trí tuệ và sự an lạc nội tại; lắng nghe chính mình trước khi quyết định.'
  },
  8: {
    title: 'Năm Số 8: Thu Hoạch & Thịnh Vượng',
    overview: 'Năm gặt hái thành quả của chu kỳ 9 năm. Cơ hội lớn về tài chính, quyền lực cá nhân, sự nghiệp thăng hoa.',
    str: ['Khả năng thu hút tài chính và thành tựu lớn', 'Uy tín và năng lực điều hành vượt trội'],
    cha: ['Cần minh bạch tài chính và thận trọng pháp lý'],
    adv: 'Hành động quyết đoán, quản lý dòng tiền bài bản và chia sẻ giá trị cho mọi người.'
  },
  9: {
    title: 'Năm Số 9: Hoàn Tất & Tái Sinh',
    overview: 'Năm khép lại một chu kỳ 9 năm. Buông bỏ những điều không còn phù hợp, tha thứ, bao dung và chuẩn bị bước sang trang mới.',
    str: ['Tấm lòng bác ái rộng mở, thanh lọc tâm hồn', 'Hoàn tất trọn vẹn các mục tiêu lớn'],
    cha: ['Cảm giác chia tay, buông bỏ những điều quen thuộc'],
    adv: 'Bao dung tha thứ, dọn dẹp không gian sống và tâm trí để đón nhận chu kỳ rực rỡ tiếp theo.'
  }
};

/**
 * Tách nội dung markdown từ Supabase thành các phần có cấu trúc
 */
function parseKnowledgeMarkdown(content: string, titleFallback: string): KnowledgeReadingResult {
  const lines = content.split('\n');
  const strengths: string[] = [];
  const challenges: string[] = [];
  let currentSection = '';
  let overviewText = '';
  let adviceText = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#') || line.includes('BẢN CHẤT') || line.includes('TỔNG QUAN') || line.includes('Ý NGHĨA')) {
      currentSection = 'overview';
      continue;
    } else if (line.includes('ĐIỂM MẠNH') || line.includes('ƯU ĐIỂM') || line.includes('NĂNG LỰC')) {
      currentSection = 'strengths';
      continue;
    } else if (line.includes('THÁCH THỨC') || line.includes('BÓNG TỐI') || line.includes('CẠM BẪY') || line.includes('ĐIỂM YẾU')) {
      currentSection = 'challenges';
      continue;
    } else if (line.includes('LỜI KHUYÊN') || line.includes('HÀNH ĐỘNG') || line.includes('BÀI HỌC')) {
      currentSection = 'advice';
      continue;
    }

    if (currentSection === 'overview' && !overviewText) {
      if (!line.startsWith('#')) overviewText = line.replace(/^\*+\s*/, '');
    } else if (currentSection === 'strengths') {
      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
        strengths.push(line.replace(/^[-*•]\s*/, ''));
      }
    } else if (currentSection === 'challenges') {
      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
        challenges.push(line.replace(/^[-*•]\s*/, ''));
      }
    } else if (currentSection === 'advice' && !adviceText) {
      if (!line.startsWith('#')) adviceText = line.replace(/^\*+\s*/, '');
    }
  }

  return {
    title: titleFallback,
    source: 'supabase-knowledge',
    overview: overviewText || content.slice(0, 260) + '...',
    strengths: strengths.slice(0, 3),
    challenges: challenges.slice(0, 2),
    advice: adviceText || 'Phát huy điểm mạnh bẩm sinh và giữ vững sự cân bằng nội tại.',
    fullContent: content
  };
}

/**
 * Tra cứu luận giải Tri thức cho 1 chỉ số
 */
export async function getIndicatorReading(
  indicatorKey: string,
  indicatorValue: string | number,
  cardNameVi: string
): Promise<KnowledgeReadingResult> {
  const valStr = String(indicatorValue).trim();
  const numVal = parseInt(valStr, 10);

  // 1. Tra cứu trực tiếp từ Supabase Database (O(1) search) nếu có mạng
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('numerology_knowledge')
        .select('*')
        .eq('indicator_key', indicatorKey)
        .eq('number_value', valStr)
        .maybeSingle();

      if (!error && data?.content) {
        return parseKnowledgeMarkdown(data.content, data.title || `${cardNameVi} ${valStr}`);
      }
    } catch (err) {
      console.warn('[numerologyKnowledge] Supabase query fallback to offline:', err);
    }
  }

  // 2. Fallback Tức thì Offline: Dành cho Vận hạn Năm cá nhân
  if (indicatorKey === 'yearIndividual' && !isNaN(numVal) && PERSONAL_YEAR_DATA[numVal]) {
    const yearData = PERSONAL_YEAR_DATA[numVal];
    return {
      title: `${cardNameVi}: ${yearData.title}`,
      source: 'offline-archetype',
      overview: yearData.overview,
      strengths: yearData.str,
      challenges: yearData.cha,
      advice: yearData.adv,
      fullContent: `${yearData.overview}\n\n**Điểm sáng năng lượng:**\n${yearData.str.map(s => `- ${s}`).join('\n')}\n\n**Thách thức:**\n${yearData.cha.map(c => `- ${c}`).join('\n')}\n\n**Lời khuyên:** ${yearData.adv}`
    };
  }

  // 3. Fallback Tức thì Offline: Dành cho các chỉ số con số (1-9, 11, 22, 33)
  const targetNum = !isNaN(numVal) ? numVal : 1;
  const arch = ARCHETYPE_MAP[targetNum] || ARCHETYPE_MAP[targetNum % 9 || 9] || ARCHETYPE_MAP[1];

  return {
    title: `${cardNameVi} ${valStr}: ${arch.title}`,
    source: 'offline-archetype',
    overview: arch.overview,
    strengths: arch.str,
    challenges: arch.cha,
    advice: arch.adv,
    fullContent: `${arch.overview}\n\n**Điểm mạnh cốt lõi:**\n${arch.str.map(s => `- ${s}`).join('\n')}\n\n**Vùng bóng tối cần lưu ý:**\n${arch.cha.map(c => `- ${c}`).join('\n')}\n\n**Lời khuyên chuyển hóa:** ${arch.adv}`
  };
}
