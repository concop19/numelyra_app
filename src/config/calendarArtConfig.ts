/**
 * calendarArtConfig.ts - Cấu hình kho tranh 4 Mùa & Điển tích Văn học cho Tờ Lịch Blốc
 * 
 * CHIẾN LƯỢC 1: Thuật toán Phân tán Bước Nhảy Nguyên Tố (Coprime-Stride Cycling)
 * - Tự động nhận diện 4 Mùa theo Âm Lịch truyền thống Việt Nam:
 *    + Xuân (Tháng 1, 2, 3): Kho 122 tranh (tối đa 91 tranh độc bản không lặp trong mùa)
 *    + Hạ (Tháng 4, 5, 6): Kho 73 tranh (khoảng cách lặp tối thiểu 73 ngày ~ 2.5 tháng)
 *    + Thu (Tháng 7, 8, 9): Kho 42 tranh (khoảng cách lặp tối thiểu 42 ngày ~ 1.5 tháng)
 *    + Đông (Tháng 10, 11, 12): Kho 60 tranh (khoảng cách lặp tối thiểu 60 ngày ~ 2 tháng)
 * - Bước nhảy nguyên tố STRIDE = 17 (nguyên tố cùng nhau với cả 122, 73, 42, 60)
 * - Year Seed Offset: Mỗi năm dịch chuyển vị trí khởi đầu, luân phiên nhóm tranh dự phòng.
 */
import {
  SPRING_IMAGES,
  SUMMER_IMAGES,
  AUTUMN_IMAGES,
  WINTER_IMAGES,
  type CalendarImageSource
} from './calendarImages';
import { solarToLunar } from '../services/lunarService';

export interface CalendarArtItem {
  id: string;
  seasonKey: 'spring' | 'summer' | 'autom' | 'winter';
  seasonName: string;
  seasonHan: string;
  seasonEmoji: string;
  title: string;
  hanTitle?: string;
  author: string;
  period?: string;
  imageUri: CalendarImageSource;
  excerpt: string;
  fullContent?: string;
  description: string;
  location?: string;
}

export const DEFAULT_CALENDAR_ARTS: Omit<CalendarArtItem, 'imageUri' | 'seasonKey' | 'seasonName' | 'seasonHan' | 'seasonEmoji'>[] = [
  {
    id: 'art-nguc-trung-nhat-ky',
    title: 'NHẬT KÝ TRONG TÙ',
    hanTitle: '獄中日記',
    author: 'CHỦ TỊCH HỒ CHÍ MINH',
    period: '1890 - 1969',
    excerpt: 'Thân thể ở trong lao,\nTinh thần ở ngoài lao;\nMuốn nên sự nghiệp lớn,\nTinh thần càng phải cao.',
    fullContent: 'Thân tại ngục trung thân bất tự do,\nTinh thần dĩ tại ngục môn ngoại;\nDục thành đại sự nghiệp,\nTinh thần cánh yếu cao.\n\n(Dịch thơ: Thân thể ở trong lao / Tinh thần ở ngoài lao / Muốn nên sự nghiệp lớn / Tinh thần càng phải cao)',
    description: 'Nhật ký trong tù là tập thơ chữ Hán gồm 134 bài theo thể Đường luật do Chủ tịch Hồ Chí Minh sáng tác trong thời gian bị giam giữ tại Quảng Tây (1942 - 1943). Tác phẩm được công nhận là Bảo vật Quốc gia.',
    location: 'Bảo tàng Lịch sử Quốc gia — Hà Nội'
  },
  {
    id: 'art-truyen-kieu',
    title: 'ĐOẠN TRƯỜNG TÂN THANH',
    hanTitle: '斷腸新聲',
    author: 'ĐẠI THI HÀO NGUYỄN DU',
    period: '1765 - 1820',
    excerpt: 'Trăm năm trong cõi người ta,\nChữ tài chữ mệnh khéo là ghét nhau.\nTrải qua một cuộc bể dâu,\nNhững điều trông thấy mà đau đớn lòng.',
    fullContent: 'Thiện căn ở tại lòng ta,\nChữ tâm kia mới bằng ba chữ tài.\nLời quê chắp nhặt dông dài,\nMua vui cũng được một vài trống canh.',
    description: 'Truyện Kiều là kiệt tác văn học kinh điển của dân tộc Việt Nam, được UNESCO vinh danh danh nhân văn hóa thế giới. Tác phẩm đúc kết triết lý nhân sinh sâu sắc về chữ Tâm và chữ Tài.',
    location: 'Di sản Văn hóa Phi vật thể Nhân loại'
  },
  {
    id: 'art-nam-quoc-son-ha',
    title: 'NAM QUỐC SƠN HÀ',
    hanTitle: '南國山河',
    author: 'THÁI ÚY LÝ THƯỜNG KIỆT',
    period: '1019 - 1105',
    excerpt: 'Nam quốc sơn hà Nam đế cư,\nTiệt nhiên định phận tại thiên thư.\nNhư hà nghịch lỗ lai xâm phạm,\nNhữ đẳng hành khan thủ bại hư.',
    fullContent: 'Sông núi nước Nam vua Nam ở,\nRành rành định phận tại sách trời.\nCớ sao lũ giặc sang xâm phạm,\nChúng bay sẽ bị đánh tơi bời!',
    description: 'Bản tuyên ngôn độc lập đầu tiên của nước Việt Nam, vang vọng bên dòng sông Như Nguyệt năm 1077, khẳng định chủ quyền thiêng liêng và ý chí bất khuất của dân tộc.',
    location: 'Chiến tuyến sông Như Nguyệt (Bắc Ninh)'
  },
  {
    id: 'art-binh-ngo-dai-cao',
    title: 'BÌNH NGÔ ĐẠI CÁO',
    hanTitle: '平吳大誥',
    author: 'QUÂN SƯ NGUYỄN TRÃI',
    period: '1380 - 1442',
    excerpt: 'Việc nhân nghĩa cốt ở yên dân,\nQuân điếu phạt trước lo trừ bạo.\nNhư nước Đại Việt ta từ trước,\nVốn xưng nền văn hiến đã lâu.',
    fullContent: 'Đem đại nghĩa để thắng hung tàn,\nLấy chí nhân để thay cường bạo.\n... Xã tắc từ đây vững bền,\nGiang sơn từ đây đổi mới.',
    description: 'Áng thiên cổ hùng văn tổng kết cuộc kháng chiến chống quân Minh thắng lợi của nghĩa quân Lam Sơn, khẳng định nền văn hiến và tinh thần nhân đạo sâu sắc của dân tộc.',
    location: 'Lam Sơn — Thanh Hóa'
  }
];

// Bước nhảy nguyên tố phổ quát cùng nhau với cả 122, 73, 42, 60
const STRIDE = 17;

/**
 * Lấy tranh theo ngày dựa trên Âm lịch và Thuật toán bước nhảy nguyên tố
 */
export function getDailyCalendarArt(date: Date): CalendarArtItem {
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  const yy = date.getFullYear();

  const lunar = solarToLunar(dd, mm, yy);
  const lunarMonth = lunar.month;
  const lunarDay = lunar.day;
  const lunarYear = lunar.year;

  // 1. Xác định 4 Mùa theo Âm lịch truyền thống
  let seasonKey: 'spring' | 'summer' | 'autom' | 'winter' = 'spring';
  let seasonName = 'MÙA XUÂN';
  let seasonHan = '春';
  let seasonEmoji = '🌸';
  let seasonImages = SPRING_IMAGES;

  if (lunarMonth >= 1 && lunarMonth <= 3) {
    seasonKey = 'spring';
    seasonName = 'MÙA XUÂN';
    seasonHan = '春';
    seasonEmoji = '🌸';
    seasonImages = SPRING_IMAGES;
  } else if (lunarMonth >= 4 && lunarMonth <= 6) {
    seasonKey = 'summer';
    seasonName = 'MÙA HẠ';
    seasonHan = '夏';
    seasonEmoji = '☀️';
    seasonImages = SUMMER_IMAGES;
  } else if (lunarMonth >= 7 && lunarMonth <= 9) {
    seasonKey = 'autom';
    seasonName = 'MÙA THU';
    seasonHan = '秋';
    seasonEmoji = '🍁';
    seasonImages = AUTUMN_IMAGES;
  } else {
    seasonKey = 'winter';
    seasonName = 'MÙA ĐÔNG';
    seasonHan = '冬';
    seasonEmoji = '❄️';
    seasonImages = WINTER_IMAGES;
  }

  const totalImages = seasonImages.length;

  // 2. Tính số thứ tự ngày trong mùa (1..90 ngày)
  const seasonMonthOffset = (lunarMonth - 1) % 3; // 0, 1, hoặc 2
  let dayInSeason = seasonMonthOffset * 30 + lunarDay;
  if (lunar.leap) {
    dayInSeason += 15;
  }

  // 3. Áp dụng Thuật toán Bước Nhảy Nguyên Tố (Coprime Stride) + Year Offset
  const yearOffset = (lunarYear * 37) % totalImages;
  const imageIndex = Math.abs(((dayInSeason - 1) * STRIDE + yearOffset) % totalImages);

  const selectedImage = seasonImages[imageIndex];

  // 4. Lựa chọn áng văn học / điển tích đi kèm
  const litItem = DEFAULT_CALENDAR_ARTS[Math.abs(dayInSeason) % DEFAULT_CALENDAR_ARTS.length];

  return {
    ...litItem,
    id: `${seasonKey}-${imageIndex}`,
    seasonKey,
    seasonName,
    seasonHan,
    seasonEmoji,
    imageUri: selectedImage
  };
}
