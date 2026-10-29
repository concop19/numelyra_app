/**
 * agentDecisionEngine.ts - Trí tuệ điều phối (AI Agent Decision Engine)
 * Tự động phân tích câu hỏi + số lượng hồ sơ được chọn để đưa ra quyết định:
 * 1. Chế độ (Cá nhân vs Tương hợp 2 người)
 * 2. Có cần rút Tarot hay không, và mấy lá (0 lá, 1 lá, 3 lá, 5 lá)
 * 3. Chỉ định các chỉ số Thần số học mà chat có thể tính và truy xuất
 */
import { ProfileItem } from '../store/userProfile';
import { isColorQuestion } from './colorGuidanceService';
import { translate, type AppLocale } from '../i18n/translations';

export interface AgentDecision {
  mode: 'single' | 'compatibility';
  intent:
    | 'love_match'
    | 'two_choices'
    | 'timing_trajectory'
    | 'daily_guidance'
    | 'color_guidance'
    | 'where_to_go'
    | 'core_personality'
    | 'trash'
    | 'general';
  needsTarot: boolean;
  spreadId: 'single' | 'three-card' | 'two-options' | 'relationship' | null;
  cardCount: number;
  targetIndicators: string[];
  thoughtProcess: string;
  replyText?: string;
}

/**
 * Fallback ở thiết bị khi API classify không truy cập được. Server vẫn là nơi
 * phân loại chính; hàm này chỉ tránh việc app offline rút Tarot cho ký tự rác.
 */
function isLikelyTrashPrompt(question: string): boolean {
  const value = question.trim().toLowerCase();
  if (value.length <= 2 || /^(\d{1,8}|[!?.,\s]+)$/.test(value)) return true;
  if (/^(test|testing|alo|alô|hello|hi|hey|abc|xyz|không biết hỏi gì|chưa biết hỏi gì)$/.test(value)) return true;
  if (/(asdf|ghjk|qwerty|zxcv|poiuy|lkjh|mnbv)/.test(value)) return true;
  return /^(.)\1{2,}$/.test(value);
}

export function evaluateAgentDecision(
  question: string,
  profiles: ProfileItem[],
  locale: AppLocale = 'vi',
): AgentDecision {
  const q = question.toLowerCase().trim();
  const english = locale === 'en';

  if (isLikelyTrashPrompt(q)) {
    return {
      mode: 'single',
      intent: 'trash',
      needsTarot: false,
      spreadId: null,
      cardCount: 0,
      targetIndicators: [],
      thoughtProcess: english
        ? 'The question has no clear topic or purpose. Ask for a more specific question.'
        : 'Câu hỏi chưa có chủ đề hoặc mục đích rõ ràng. Mời bạn đặt một câu hỏi cụ thể hơn.',
      replyText: translate(locale, 'mascot.trashGuidance')
    };
  }

  // 1. Trường hợp chọn 2 Profile -> Luôn kích hoạt THUẦN TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ (0 lá Tarot)
  if (profiles.length >= 2) {
    const p1 = profiles[0].fullName;
    const p2 = profiles[1].fullName;
    return {
      mode: 'compatibility',
      intent: 'love_match',
      needsTarot: false,
      spreadId: null,
      cardCount: 0,
      targetIndicators: ['walksOfLife', 'soul', 'tuvi_bazi'],
      thoughtProcess: english
        ? `Two profiles selected: ${p1} and ${p2}. Use the Bazi and Tu Vi compatibility reading without Tarot.`
        : `Phát hiện câu hỏi ghép đôi giữa 2 hồ sơ: ${p1} & ${p2}. Kích hoạt Luận giải THUẦN TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ TOÀN DIỆN (Cung Phu Thê, Ngũ Hành Bản Mệnh, Can Chi Hợp/Xung, Quái Mệnh Bát Trạch - không cần rút bài Tarot).`
    };
  }

  // 2. Trường hợp 1 Profile: Phân tích Ý định câu hỏi

  // A. Màu hợp mệnh: một lá Tarot là lớp trực giác để chọn hai màu trong
  // palette phong thủy đã tính ở client.
  if (isColorQuestion(q) || /\b(colou?r|palette|what should i wear|wear today)\b/i.test(q)) {
    return {
      mode: 'single',
      intent: 'color_guidance',
      needsTarot: true,
      spreadId: 'single',
      cardCount: 1,
      targetIndicators: [],
      thoughtProcess: translate(locale, 'mascot.thoughtColor')
    };
  }

  // B. Hai Lựa Chọn / Phân vân ngã rẽ (A vs B)
  const isTwoChoices =
    (/\b(hay|hoặc|vs|versus|hay là|hay nên|phân vân|lăn tăn|lựa chọn|chọn bên nào|ở lại hay|mua hay|đi hay ở)\b/i.test(q) &&
      /\b(nên|chọn|định|có nên|giữa|a hay b)\b/i.test(q)) ||
    (/\b(or|versus|vs|between|option|choice|choose)\b/i.test(q) && /\b(should|choose|decide|between|a or b)\b/i.test(q));

  if (isTwoChoices) {
    return {
      mode: 'single',
      intent: 'two_choices',
      needsTarot: true,
      spreadId: 'two-options',
      cardCount: 5,
      targetIndicators: ['rationalThinking', 'attitude'],
      thoughtProcess: english
        ? 'A choice between two paths. Use the five-card options spread with rational-thought context.'
        : 'Câu hỏi phân vân giữa 2 ngã rẽ. Kích hoạt Trải bài Hai Lựa Chọn (5 lá) và đối chiếu cách suy nghĩ, phản ứng của người hỏi.'
    };
  }

  // B. A real-world place search. This intentionally runs before the timeline
  // branch so "Cuối tuần này đi đâu?" is not mistaken for a future reading.
  const isWhereToGo =
    /(đi đâu|chỗ nào|nơi nào|quán nào|cà phê nào|cafe nào|địa điểm|đi chơi|hẹn hò ở đâu|dạo ở đâu|tham quan|where should (i|we) go|place to go|which (cafe|restaurant|place)|date spot|nearby place)/i.test(q);

  if (isWhereToGo) {
    return {
      mode: 'single',
      intent: 'where_to_go',
      needsTarot: true,
      spreadId: 'single',
      cardCount: 1,
      targetIndicators: ['attitude', 'soul'],
      thoughtProcess: translate(locale, 'mascot.thoughtWhereToGo')
    };
  }

  // C. Thuần Bản Mệnh / Tính cách cốt lõi / Sứ mệnh (KHÔNG CẦN TAROT - 0 lá)
  const isCorePersonality =
    /\b(tính cách|bản thân tôi|điểm mạnh|điểm yếu|sứ mệnh|nợ nghiệp|số thiếu|linh hồn|ý nghĩa tên|ngày sinh nói lên|con người tôi|phong cách|personality|my strengths|my weaknesses|life purpose|mission|soul urge|what does my (name|birth date) mean)\b/i.test(q) &&
    !/\b(tương lai|sau này|sắp tới|người yêu|hôm nay|future|soon|partner|today)\b/i.test(q);

  if (isCorePersonality) {
    return {
      mode: 'single',
      intent: 'core_personality',
      needsTarot: false,
      spreadId: null,
      cardCount: 0,
      targetIndicators: q.includes('sứ mệnh') || q.includes('mission') || q.includes('life purpose')
        ? ['mission', 'walksOfLife', 'soul']
        : ['walksOfLife', 'soul', 'personality', 'attitude', 'rationalThinking'],
      thoughtProcess: english
        ? 'A core-personality question. Use the directly relevant numerology indicators without Tarot.'
        : 'Câu hỏi về bản thân. Chọn các chỉ số liên quan trực tiếp tới nội dung được hỏi (không cần Tarot).'
    };
  }

  // D. Tiến trình / Tương lai gần / Xu hướng sắp tới (3 lá: Quá khứ - Hiện tại - Tương lai)
  const isTimingOrTrajectory =
    /\b(tương lai|sắp tới|tiến trình|dạo này|thời gian tới|xu hướng|phát triển|sau này|năm nay|tháng này|future|next few|coming|trajectory|progress|this year|this month|where is this going)\b/i.test(q);

  if (isTimingOrTrajectory) {
    return {
      mode: 'single',
      intent: 'timing_trajectory',
      needsTarot: true,
      spreadId: 'three-card',
      cardCount: 3,
      targetIndicators: ['attitude', 'rationalThinking'],
      thoughtProcess: english
        ? 'A trajectory question. Use the three-card spread with attitude and rational-thought context.'
        : 'Câu hỏi về diễn tiến. Kích hoạt Trải bài 3 Lá và dùng chỉ số về phản ứng, tư duy để cá nhân hóa lời khuyên.'
    };
  }

  // E. Lời khuyên tức thời / Thông điệp ngày / Có nên hay không (1 lá)
  const isDailyOrQuick =
    /\b(hôm nay|ngày mai|lúc này|bây giờ|có nên không|lời khuyên|thông điệp|dẫn lối|nhắn nhủ|today|tomorrow|right now|should i|advice|message|guidance)\b/i.test(q);

  if (isDailyOrQuick) {
    return {
      mode: 'single',
      intent: 'daily_guidance',
      needsTarot: true,
      spreadId: 'single',
      cardCount: 1,
      targetIndicators: ['attitude', 'soul'],
      thoughtProcess: english
        ? 'An immediate-guidance question. Use one card with attitude and soul context.'
        : 'Câu hỏi cần lời khuyên trước mắt. Kích hoạt Trải bài 1 Lá và chọn chỉ số Thái độ, Linh hồn để tham khảo.'
    };
  }

  // F. Mặc định: Rút 1 lá định hướng + chỉ số về phản ứng và nhu cầu nội tâm
  return {
    mode: 'single',
    intent: 'general',
    needsTarot: true,
    spreadId: 'single',
    cardCount: 1,
    targetIndicators: ['attitude', 'soul'],
    thoughtProcess: translate(locale, 'mascot.thoughtGeneral')
  };
}
