/**
 * tarotService.ts - Dịch vụ bốc bài & diễn giải Tarot Rider-Waite cho Mobile App
 * Hỗ trợ các kiểu trải bài chuẩn: 1 lá (Single), 3 lá (Quá khứ - Hiện tại - Tương lai),
 * 5 lá (Hai Lựa Chọn A vs B), 5 lá (Mối Quan Hệ Tình Cảm).
 */
import { MINOR_ARCANA_DATA } from './minorArcana.generated.ts';

export interface TarotCardData {
  id: string;
  nameVi: string;
  nameEn: string;
  number: number;
  emoji: string;
  keywordsUpright: string[];
  keywordsReversed: string[];
  meaningUpright: string;
  meaningReversed: string;
}

export interface TarotPosition {
  id: string;
  nameVi: string;
  descVi: string;
}

export interface TarotSpreadConfig {
  id: string;
  nameVi: string;
  descVi: string;
  positions: TarotPosition[];
}

export interface DrawnCardResult {
  card: TarotCardData;
  isReversed: boolean;
  position: TarotPosition;
}

export const TAROT_SPREADS: Record<string, TarotSpreadConfig> = {
  'single': {
    id: 'single',
    nameVi: 'Trải bài 1 Lá (Thông điệp Trọng Tâm)',
    descVi: 'Một thông điệp dẫn lối rõ ràng và tức thời cho thời điểm hiện tại.',
    positions: [
      { id: 'single-1', nameVi: 'Thông điệp Trực Giác', descVi: 'Điều quan trọng nhất vũ trụ muốn bạn lưu tâm lúc này.' }
    ]
  },
  'three-card': {
    id: 'three-card',
    nameVi: 'Trải bài 3 Lá (Quá Khứ · Hiện Tại · Tương Lai)',
    descVi: 'Nhìn lại cội nguồn, nhận diện thách thức hiện tại và xu hướng tương lai gần.',
    positions: [
      { id: 'pos-1', nameVi: 'Quá Khứ (Gốc rễ)', descVi: 'Nguyên nhân và ảnh hưởng đã định hình tình thế hiện tại.' },
      { id: 'pos-2', nameVi: 'Hiện Tại (Thực trạng)', descVi: 'Năng lượng cốt lõi và bài học bạn đang đối diện.' },
      { id: 'pos-3', nameVi: 'Tương Lai Gần (Xu hướng)', descVi: 'Xu hướng phát triển sắp tới nếu tiếp tục hướng đi này.' }
    ]
  },
  'two-options': {
    id: 'two-options',
    nameVi: 'Trải bài 5 Lá (Hai Lựa Chọn A vs B)',
    descVi: 'So sánh chi tiết 2 ngã rẽ và định lượng phương án được vũ trụ ủng hộ hơn.',
    positions: [
      { id: 'opt-1', nameVi: 'Tình Trạng Nền Tảng', descVi: 'Bản chất thực sự phía sau câu hỏi phân vân của bạn.' },
      { id: 'opt-2', nameVi: 'Phương Án A (Tiến trình)', descVi: 'Trải nghiệm và thử thách trên con đường lựa chọn A.' },
      { id: 'opt-3', nameVi: 'Phương Án A (Kết quả)', descVi: 'Xu hướng thành quả nếu bạn chọn phương án A.' },
      { id: 'opt-4', nameVi: 'Phương Án B (Tiến trình)', descVi: 'Trải nghiệm và thử thách trên con đường lựa chọn B.' },
      { id: 'opt-5', nameVi: 'Phương Án B (Kết quả)', descVi: 'Xu hướng thành quả nếu bạn chọn phương án B.' }
    ]
  },
  'relationship': {
    id: 'relationship',
    nameVi: 'Trải bài 5 Lá (Mối Quan Hệ Tình Cảm & Kết Nối)',
    descVi: 'Khám phá sự giao thoa năng lượng giữa 2 người, nút thắt và tiềm năng gắn kết.',
    positions: [
      { id: 'rel-1', nameVi: 'Năng Lượng Của Bạn', descVi: 'Tâm thế, cảm xúc và góc nhìn của bạn trong mối quan hệ.' },
      { id: 'rel-2', nameVi: 'Năng Lượng Phản Chiếu Đối Phương', descVi: 'Thái độ và năng lượng đối phương phản chiếu tới bạn.' },
      { id: 'rel-3', nameVi: 'Sợi Dây Kết Nối', descVi: 'Bản chất mẫu hình tương tác hiện tại giữa hai người.' },
      { id: 'rel-4', nameVi: 'Nút Thắt Cần Hóa Giải', descVi: 'Thử thách lớn nhất hoặc điều chưa được giãi bày.' },
      { id: 'rel-5', nameVi: 'Tiềm Năng Phát Triển', descVi: 'Tương lai của mối quan hệ nếu cả hai cùng nỗ lực.' }
    ]
  }
};

export const MAJOR_ARCANA: TarotCardData[] = [
  {
    id: '0-fool', number: 0, nameVi: 'Chàng Khờ (The Fool)', nameEn: 'The Fool', emoji: '🎒',
    keywordsUpright: ['Khởi đầu mới', 'Tự do', 'Dấn thân'], keywordsReversed: ['Bốc đồng', 'Thiếu chuẩn bị'],
    meaningUpright: 'Một hành trình mới tinh khiết đang mở ra; hãy tiến bước với tâm thế rộng mở.',
    meaningReversed: 'Cần nhìn lại thực tế và chuẩn bị chu đáo trước khi lao vào rủi ro.'
  },
  {
    id: '1-magician', number: 1, nameVi: 'Nhà Ảo Thuật (The Magician)', nameEn: 'The Magician', emoji: '🪄',
    keywordsUpright: ['Ý chí', 'Tài năng bẩm sinh', 'Hành động'], keywordsReversed: ['Lãng phí tiềm năng', 'Thao túng'],
    meaningUpright: 'Bạn đang nắm giữ mọi công cụ để biến ý tưởng thành hiện thực.',
    meaningReversed: 'Năng lực đang bị phân tán hoặc sử dụng chưa đúng mục đích.'
  },
  {
    id: '2-high-priestess', number: 2, nameVi: 'Nữ Tư Tế (The High Priestess)', nameEn: 'The High Priestess', emoji: '🌙',
    keywordsUpright: ['Trực giác nhạy bén', 'Bí ẩn', 'Trí tuệ tĩnh lặng'], keywordsReversed: ['Phớt lờ trực giác', 'Rối bời'],
    meaningUpright: 'Câu trả lời nằm ở chiều sâu tĩnh lặng bên trong bạn; hãy lắng nghe trực giác.',
    meaningReversed: 'Bạn đang để tiếng ồn bên ngoài lấn át trực giác tự nhiên.'
  },
  {
    id: '3-empress', number: 3, nameVi: 'Hoàng Hậu (The Empress)', nameEn: 'The Empress', emoji: '👑',
    keywordsUpright: ['Nuôi dưỡng', 'Trù phú', 'Sáng tạo'], keywordsReversed: ['Cạn kiệt', 'Bỏ bê bản thân'],
    meaningUpright: 'Mùa bội thu và sáng tạo đang đến; nuôi dưỡng dự định bằng sự yêu thương kiên nhẫn.',
    meaningReversed: 'Bạn đang trao đi quá nhiều mà quên chăm sóc năng lượng của chính mình.'
  },
  {
    id: '4-emperor', number: 4, nameVi: 'Hoàng Đế (The Emperor)', nameEn: 'The Emperor', emoji: '🏛️',
    keywordsUpright: ['Kỷ luật vững vàng', 'Cấu trúc', 'Lãnh đạo'], keywordsReversed: ['Cứng nhắc', 'Mất kiểm soát'],
    meaningUpright: 'Sự thành công lúc này đòi hỏi kế hoạch bài bản, ranh giới và trách nhiệm cao.',
    meaningReversed: 'Đừng quá bảo thủ áp đặt; cần linh hoạt điều chỉnh cấu trúc công việc.'
  },
  {
    id: '5-hierophant', number: 5, nameVi: 'Giáo Hoàng (The Hierophant)', nameEn: 'The Hierophant', emoji: '📜',
    keywordsUpright: ['Học hỏi', 'Người dẫn lối', 'Giá trị bền vững'], keywordsReversed: ['Giáo điều', 'Cần phá khuôn'],
    meaningUpright: 'Lời khuyên từ tiền bối hoặc tri thức nền tảng sẽ giúp bạn gỡ bỏ khúc mắc.',
    meaningReversed: 'Đã đến lúc thoát khỏi những quy chuẩn cũ để tự tìm chân lý của mình.'
  },
  {
    id: '6-lovers', number: 6, nameVi: 'Tình Nhân (The Lovers)', nameEn: 'The Lovers', emoji: '❤️',
    keywordsUpright: ['Hòa hợp', 'Lựa chọn từ trái tim', 'Gắn kết'], keywordsReversed: ['Lệch giá trị', 'Mâu thuẫn ngầm'],
    meaningUpright: 'Sự gắn kết sâu sắc và lựa chọn đúng đắn dựa trên sự chân thành tuyệt đối.',
    meaningReversed: 'Cần nhìn thẳng vào sự khác biệt cốt lõi trước khi đi đến cam kết lâu dài.'
  },
  {
    id: '7-chariot', number: 7, nameVi: 'Cỗ Xe (The Chariot)', nameEn: 'The Chariot', emoji: '🛡️',
    keywordsUpright: ['Bứt phá', 'Kiên định', 'Chiến thắng'], keywordsReversed: ['Mất phương hướng', 'Cưỡng ép'],
    meaningUpright: 'Tập trung toàn bộ ý chí để vượt qua chướng ngại; bạn sắp cán đích.',
    meaningReversed: 'Cần hạ tốc độ và xác định rõ mục tiêu trước khi kiệt sức vì mất kiểm soát.'
  },
  {
    id: '8-strength', number: 8, nameVi: 'Sức Mạnh (Strength)', nameEn: 'Strength', emoji: '🦁',
    keywordsUpright: ['Nội lực bền bỉ', 'Dịu dàng', 'Làm chủ cảm xúc'], keywordsReversed: ['Tự nghi ngờ', 'Cạn kiệt'],
    meaningUpright: 'Sức mạnh lớn nhất đến từ lòng từ bi, kiên nhẫn và sự bình thản trước biến cố.',
    meaningReversed: 'Đừng để nỗi bất an làm lung lay niềm tin vào giá trị bản thân.'
  },
  {
    id: '9-hermit', number: 9, nameVi: 'Ẩn Sĩ (The Hermit)', nameEn: 'The Hermit', emoji: '🕯️',
    keywordsUpright: ['Chiêm nghiệm', 'Tĩnh lặng', 'Ngọn đèn nội tâm'], keywordsReversed: ['Cô lập', 'Trốn tránh'],
    meaningUpright: 'Lùi lại một bước để quan sát và thấu suốt bản thân; chân lý sẽ tự tỏ tường.',
    meaningReversed: 'Đừng tự giam mình trong nỗi đơn độc; hãy mở lòng đón nhận sự giúp đỡ.'
  },
  {
    id: '10-wheel-of-fortune', number: 10, nameVi: 'Bánh Xe Vận Mệnh (Wheel of Fortune)', nameEn: 'Wheel of Fortune', emoji: '☸️',
    keywordsUpright: ['Chu kỳ đổi mới', 'Cơ hội tốt', 'May mắn'], keywordsReversed: ['Kháng cự thay đổi', 'Trì hoãn'],
    meaningUpright: 'Bánh xe số phận đang xoay chuyển theo chiều hướng thuận lợi; hãy sẵn sàng đón nhận.',
    meaningReversed: 'Một bài học cũ đang quay trở lại vì bạn chưa thực sự chuyển hóa nó.'
  },
  {
    id: '11-justice', number: 11, nameVi: 'Công Lý (Justice)', nameEn: 'Justice', emoji: '⚖️',
    keywordsUpright: ['Công bằng', 'Sự thật sáng tỏ', 'Trách nhiệm'], keywordsReversed: ['Né tránh sự thật', 'Thiên lệch'],
    meaningUpright: 'Mọi chuyện sẽ được phân minh rõ ràng; gieo nhân nào gặt quả nấy.',
    meaningReversed: 'Đừng tìm cách che giấu sai lầm; sự minh bạch sẽ giải thoát cho bạn.'
  },
  {
    id: '12-hanged-man', number: 12, nameVi: 'Người Treo Ngược (The Hanged Man)', nameEn: 'The Hanged Man', emoji: '🙃',
    keywordsUpright: ['Tạm dừng', 'Góc nhìn mới', 'Buông xả'], keywordsReversed: ['Mắc kẹt', 'Hy sinh vô ích'],
    meaningUpright: 'Dừng lại để đổi góc nhìn 180 độ; sự nhẫn nại sẽ mở ra nút thắt kỳ diệu.',
    meaningReversed: 'Sự trì hoãn không còn mang lại ý nghĩa; đã đến lúc phải hành động dứt khoát.'
  },
  {
    id: '13-death', number: 13, nameVi: 'Cái Chết (Death / Chuyển Hóa)', nameEn: 'Death', emoji: '🦋',
    keywordsUpright: ['Chuyển hóa', 'Khép lại chu kỳ cũ', 'Tái sinh'], keywordsReversed: ['Bám víu quá khứ', 'Sợ đổi mới'],
    meaningUpright: 'Khép lại điều đã cũ để nhường chỗ cho chương mới rực rỡ hơn; sự tái sinh tất yếu.',
    meaningReversed: 'Việc cố chấp giữ lấy thứ đã tàn lụi chỉ kéo dài thêm mệt mỏi.'
  },
  {
    id: '14-temperance', number: 14, nameVi: 'Tiết Chế (Temperance)', nameEn: 'Temperance', emoji: '🏺',
    keywordsUpright: ['Cân bằng', 'Điều hòa', 'Hòa nhập nhẹ nhàng'], keywordsReversed: ['Thái quá', 'Mất nhịp sống'],
    meaningUpright: 'Hòa giải hai thái cực; sự điều độ và kiên nhẫn sẽ chữa lành tình thế.',
    meaningReversed: 'Sự vội vã hoặc cảm xúc cực đoan đang làm xáo trộn nhịp điệu của bạn.'
  },
  {
    id: '15-devil', number: 15, nameVi: 'Ác Quỷ (The Devil)', nameEn: 'The Devil', emoji: '⛓️',
    keywordsUpright: ['Ràng buộc', 'Cám dỗ', 'Ảo tưởng'], keywordsReversed: ['Giải phóng', 'Thức tỉnh', 'Tháo xích'],
    meaningUpright: 'Nhận diện điều đang trói buộc tâm trí bạn; nhận thức là bước đầu để tự do.',
    meaningReversed: 'Bạn đang dần nhìn thấu ảo tưởng và bắt đầu tháo bỏ xiềng xích gông cùm.'
  },
  {
    id: '16-tower', number: 16, nameVi: 'Tòa Tháp (The Tower)', nameEn: 'The Tower', emoji: '⚡',
    keywordsUpright: ['Đột biến', 'Sự thật thức tỉnh', 'Sụp đổ ảo tưởng'], keywordsReversed: ['Né tránh biến cố', 'Trì hoãn'],
    meaningUpright: 'Một cú sốc làm vỡ vụn vỏ bọc cũ để sự thật được lộ diện; giải phóng năng lượng kìm nén.',
    meaningReversed: 'Đang có một cuộc tái cấu trúc âm thầm bên trong; đừng cố níu giữ cấu trúc lung lay.'
  },
  {
    id: '17-star', number: 17, nameVi: 'Ngôi Sao (The Star)', nameEn: 'The Star', emoji: '⭐',
    keywordsUpright: ['Hy vọng', 'Chữa lành', 'Ánh sáng dẫn lối'], keywordsReversed: ['Mất niềm tin', 'Bi quan'],
    meaningUpright: 'Bình minh đang trở lại; niềm tin và sự an yên trong tâm hồn sẽ được hồi sinh.',
    meaningReversed: 'Đừng để nỗi sợ nhất thời dập tắt ngọn đèn hy vọng trong lòng bạn.'
  },
  {
    id: '18-moon', number: 18, nameVi: 'Mặt Trăng (The Moon)', nameEn: 'The Moon', emoji: '🌕',
    keywordsUpright: ['Trực giác mờ ảo', 'Tiềm thức', 'Cần quan sát'], keywordsReversed: ['Màn sương tan', 'Sự thật lộ'],
    meaningUpright: 'Mọi thứ chưa hoàn toàn rõ ràng; hãy phân biệt trực giác với nỗi sợ mơ hồ.',
    meaningReversed: 'Màn sương nghi ngờ đang tan dần; sự thật đang được đưa ra ánh sáng.'
  },
  {
    id: '19-sun', number: 19, nameVi: 'Mặt Trời (The Sun)', nameEn: 'The Sun', emoji: '☀️',
    keywordsUpright: ['Rực rỡ', 'Thành công', 'Niềm vui thuần khiết'], keywordsReversed: ['Niềm vui trì hoãn', 'Mệt mỏi'],
    meaningUpright: 'Năng lượng dương tích cực tột bậc; mọi nỗ lực đều được đón nhận thành quả ngọt ngào.',
    meaningReversed: 'Điều tốt lành vẫn ở đó, chỉ là bạn cần nghỉ ngơi để phục hồi năng lượng.'
  },
  {
    id: '20-judgement', number: 20, nameVi: 'Phán Xét (Judgement)', nameEn: 'Judgement', emoji: '🎺',
    keywordsUpright: ['Thức tỉnh', 'Tiếng gọi định mệnh', 'Tái sinh'], keywordsReversed: ['Tự dằn vặt', 'Chần chừ'],
    meaningUpright: 'Đã đến lúc nhìn nhận toàn diện bài học quá khứ và bước lên một tầng bậc tiến hóa mới.',
    meaningReversed: 'Ngừng phán xét bản thân về những lỗi lầm cũ; hãy dũng cảm đón nhận tiếng gọi mới.'
  },
  {
    id: '21-world', number: 21, nameVi: 'Thế Giới (The World)', nameEn: 'The World', emoji: '🌍',
    keywordsUpright: ['Viên mãn', 'Trọn vẹn', 'Hoàn thành sứ mệnh'], keywordsReversed: ['Dở dang', 'Chưa khép lại'],
    meaningUpright: 'Một chương vĩ đại đã hoàn tất xuất sắc; bạn đã sẵn sàng mở ra vũ trụ mới.',
    meaningReversed: 'Một mảnh ghép nhỏ cần được giải quyết nốt để cảm giác trọn vẹn được đủ đầy.'
  }
];

export const MINOR_ARCANA: TarotCardData[] = MINOR_ARCANA_DATA;

export const TAROT_DECK: TarotCardData[] = [...MAJOR_ARCANA, ...MINOR_ARCANA];

export function drawCardsForSpread(spreadId: string): DrawnCardResult[] {
  const spread = TAROT_SPREADS[spreadId] || TAROT_SPREADS['single'];
  const shuffled = [...TAROT_DECK];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return spread.positions.map((pos, idx) => ({
    card: shuffled[idx],
    isReversed: Math.random() > 0.65, // ~35% khả năng lá ngược
    position: pos
  }));
}
