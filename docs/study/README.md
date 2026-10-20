# HỆ THỐNG HÀNH TRÌNH BẬC THẦY TÂM LINH (SPIRITUAL MASTERY JOURNEY)
> **Dự án:** Numelyra Mobile App  
> **Tài liệu:** Tổng quan Kiến trúc, Triết lý Sản phẩm & Hệ sinh thái 4 Engine Huyền Học  
> **Thư mục lưu trữ:** `assets/study/`  
> **Phiên bản:** v1.0.0 (Production Blueprint)

---

## 1. TỔNG QUAN VÀ TRIẾT LÝ SẢN PHẨM

### 1.1. Bối cảnh & Vấn đề của thị trường App Huyền học
Phần lớn các ứng dụng Thần số học, Tử vi, Chiêm tinh và Tarot trên thị trường hiện nay vận hành theo mô hình **Thụ Động (Passive Reading)**:
- Người dùng nhập ngày sinh $\rightarrow$ Nhận một sớ kết quả dài $\rightarrow$ Đọc lướt qua một lần $\rightarrow$ Tỷ lệ rời bỏ (Churn rate) rất cao sau 3–7 ngày vì không còn lý do quay lại.
- Người dùng chỉ xem cho bản thân mình vài lần là hết dữ liệu để khám phá.

### 1.2. Giải pháp Đột phá: Game Hóa Trở Thành Bậc Thầy (Active Mastery RPG)
Numelyra chuyển đổi hoàn toàn mô hình từ **"Khách đi coi bói"** sang **"Bậc thầy hành nghề chiêm đoán"**:
1. **Nghi thức hàng ngày (Daily Ritual):** Mỗi ngày người dùng chỉ cần dành 3–5 phút để tiếp thu **1–2 quy tắc/công thức thuật số**.
2. **Thực chiến nhập vai (Role-playing Game):** Một vị khách NPC (với tên tuổi, ngày sinh, hoàn cảnh cuộc đời và trăn trở có thật) bước vào tiệm chiêm đoán của người chơi.
3. **Vận dụng 4 Engine cốt lõi:** Người chơi vận dụng kiến thức vừa học (kết hợp các công cụ hỗ trợ của Numelyra) để tính toán, bốc bài và đưa ra lời giải đoán.
4. **Giám định kép (Hybrid Scoring):**
   - **Engine Kiểm định (Rule-based):** So khớp chính xác số học / cung sao / ngũ hành với Ground Truth tính từ thuật toán trong app.
   - **Hội đồng Giám khảo AI (LLM Oracle):** Chấm điểm chiều sâu thấu cảm, văn phong chữa lành và tính xác đáng của lời khuyên.
5. **Thăng cấp & Tiến trình lâu dài:** Hệ thống danh vị từ *Học Đồ Vô Danh* đến *Đại Tông Sư Vô Vi*, chuỗi Streak, bảo vật phong thủy và quán trà tâm linh ngày càng thịnh vượng.

---

## 2. LIÊN KẾT 4 ENGINE NỘI TẠI CỦA NUMELYRA

Hệ thống học tập và thử thách được xây dựng **100% dựa trên mã nguồn đã lập trình sẵn** trong thư mục `src/services/`:

```
                               ┌────────────────────────────────────────────────────────┐
                               │           HÀNH TRÌNH BẬC THẦY TÂM LINH                 │
                               │               (Mastery Journey UI)                     │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
          ┌───────────────────────┬───────────────────────┴───────────────────────┬───────────────────────┐
          │                       │                                               │                       │
          ▼                       ▼                                               ▼                       ▼
┌──────────────────┐    ┌──────────────────┐                            ┌──────────────────┐    ┌──────────────────┐
│  HỌC VIỆN I:     │    │  HỌC VIỆN II:    │                            │  HỌC VIỆN III:   │    │  HỌC VIỆN IV:    │
│  THẦN SỐ HỌC     │    │  BÍ THUẬT TAROT  │                            │  CHIÊM TINH HỌC  │    │ TỬ VI & BÁT TỰ   │
│  PYTHAGORAS      │    │  RIDER-WAITE     │                            │  TÂY PHƯƠNG      │    │ ĐÔNG PHƯƠNG      │
└─────────┬────────┘    └─────────┬────────┘                            └─────────┬────────┘    └─────────┬────────┘
          │                       │                                               │                       │
          ▼                       ▼                                               ▼                       ▼
┌──────────────────┐    ┌──────────────────┐                            ┌──────────────────┐    ┌──────────────────┐
│ Mã nguồn lõi:    │    │ Mã nguồn lõi:    │                            │ Mã nguồn lõi:    │    │ Mã nguồn lõi:    │
│ numerology24-    │    │ tarotService.ts  │                            │ astroEngine.ts   │    │ tuViBaziService  │
│ Service.ts &     │    │ minorArcana.gen- │                            │ aspectCalculator │    │ lunarService.ts  │
│ numerologyEngine │    │ erated.ts &      │                            │ astroVectorEngine│    │ cadaoService.ts  │
│ (24 Chỉ số)      │    │ tarotAssets.ts   │                            │ (Góc & Hành tinh)│    │ (Can Chi, Nạp Âm)│
└──────────────────┘    └──────────────────┘                            └──────────────────┘    └──────────────────┘
```

### Chi tiết các Engine kết nối:
1. **Engine Thần Số Học (`numerology24Service.ts` & `numerologyEngine.ts`):**
   - 24 chỉ số toàn diện: *Đường đời (Walks of Life), Sứ mệnh (Mission), Linh hồn (Soul Urge), Nhân cách (Personality), Ngày sinh (Birthday), Trưởng thành (Maturity), Cân bằng (Balance), Tư duy lý trí (Rational Thought), Đam mê ẩn giấu (Hidden Passion), Thái độ (Attitude), Nợ nghiệp (Karmic Debts 13/4, 14/5, 16/7, 19/1), Cầu nối (Bridges), 4 Đỉnh cao (Pinnacles), 4 Thách thức (Challenges), 8 Mũi tên cá tính (Arrows), Năm/Tháng/Ngày cá nhân (Cycles).*
2. **Engine Tarot (`tarotService.ts` & `minorArcana.generated.ts`):**
   - Đầy đủ 78 lá bài Rider-Waite chuẩn (22 lá Đại bí tích Major Arcana + 56 lá Tiểu bí tích Minor Arcana: Gậy/Wands, Cốc/Cups, Kiếm/Swords, Tiền/Pentacles).
   - 4 kiểu trải bài chuẩn hóa: 1 lá (Single), 3 lá (Quá khứ - Hiện tại - Tương lai), 5 lá (Hai lựa chọn A/B), 5 lá (Mối quan hệ đôi lứa).
3. **Engine Chiêm Tinh Học (`src/services/astro/*`):**
   - Tọa độ 10 thiên thể (Mặt Trời, Mặt Trăng, Thủy, Kim, Hỏa, Mộc, Thổ, Thiên Vương, Hải Vương, Diêm Vương) tính bằng `astronomy-engine`.
   - Hệ thống 12 Cung Hoàng Đạo (Zodiac Signs), Phân loại 4 Nguyên tố (Lửa, Đất, Khí, Nước) và 3 Tính chất (Tiên phong, Kiên định, Biến đổi).
   - Hệ thống 12 Cung Địa Bàn (Houses Porphyry), Điểm mọc Ascendant, Thiên đỉnh Midheaven.
   - Góc chiếu Major Aspects: Trùng tụ ($0^\circ$), Lục hợp ($60^\circ$), Vuông góc ($90^\circ$), Tam hợp ($120^\circ$), Đối đỉnh ($180^\circ$) với định lượng Tension/Harmony Score.
4. **Engine Tử Vi & Bát Tự Đông Phương (`tuViBaziService.ts` & `lunarService.ts`):**
   - Can Chi Tứ Trụ (Năm, Tháng, Ngày, Giờ), Ngũ Hành Can Chi tương sinh tương khắc.
   - Lục Hợp, Tam Hợp, Lục Xung, Tương Hại của 12 Địa Chi.
   - Thiên Can Ngũ Hợp (Giáp Kỷ, Ất Canh, Bính Tân, Đinh Nhâm, Mậu Quý).
   - 60 Hoa Giáp Ngũ Hành Nạp Âm.
   - Cung Phi Bát Trạch Quái Mệnh phối hôn & hướng (Sinh Khí, Diên Niên, Thiên Y, Phục Vị vs Tuyệt Mệnh, Họa Hại, Lục Sát, Ngũ Quỷ).
   - Âm lịch Hồ Ngọc Đức, Giờ Hoàng Đạo/Hắc Đạo, Lục Diệu Lý Thuần Phong, 12 Trực, 28 Nhị thập bát tú.

---

## 3. CẤU TRÚC TÀI LIỆU TRONG THƯ MỤC `assets/study/`

Bộ tài liệu này bao gồm 4 phần hoàn chỉnh, độc lập và chi tiết để lập trình viên và thiết kế giao diện có thể bắt tay thi công ngay:

1. **[`README.md`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/README.md) (Tài liệu hiện tại):** Bản đồ tổng quan, triết lý và hệ sinh thái.
2. **[`CURRICULUM_ROADMAP.md`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/CURRICULUM_ROADMAP.md):** Giáo trình chi tiết từng ngày (120+ ngày học chia làm 4 học viện, công thức, ví dụ và hàm logic tương ứng).
3. **[`GAMEPLAY_MECHANICS.md`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/GAMEPLAY_MECHANICS.md):** Thiết kế chi tiết Game Nhập Vai Tiệm Chiêm Đoán, cơ chế đón khách NPC, hệ sinh thái chấm điểm Hybrid AI & Hệ thống thăng cấp.
4. **[`DATA_SCHEMA_AND_API.md`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/DATA_SCHEMA_AND_API.md):** Cấu trúc dữ liệu TypeScript Models, Schema lưu trữ Local Storage/Supabase, API Endpoints, và System Prompts chuẩn hóa cho AI chấm thi.

---

## 4. BỘ THIẾT KẾ GIAO DIỆN MẪU (VISUAL GALLERY - 10 MÀN HÌNH)

Bộ 10 hình ảnh UI mẫu chuẩn 9:16 phong cách Luxury Mystical (Cosmic Indigo & Royal Gold) đã được tạo sẵn trong thư mục này:

| STT | Tên file hình ảnh | Phân hệ màn hình | Mô tả chi tiết giao diện |
| :---: | :--- | :--- | :--- |
| **01** | [`01_mastery_roadmap.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/01_mastery_roadmap.jpg) | **Bản Đồ Lộ Trình Học** | Cây kỹ năng chòm sao kết nối 4 Học Viện (Thần Số Học, Tarot, Chiêm Tinh, Bát Tự) cùng thanh EXP, Level và Streak. |
| **02** | [`02_daily_flashcard.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/02_daily_flashcard.jpg) | **Thẻ Bài Khai Tâm** | Thẻ Flashcard vi mô hàng ngày: Công thức tính Số Đường Đời, bảng tra chữ cái Pythagoras và nút 'Vào Phòng Tiếp Khách'. |
| **03** | [`03_tea_house_consultation.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/03_tea_house_consultation.jpg) | **Quán Trà Chiêm Đoán** | Bàn trà ấm cúng, khói trầm hương, hồ sơ khách hàng NPC Nguyễn Văn An cùng lời tâm sự và nút luận giải. |
| **04** | [`04_tarot_reading_game.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/04_tarot_reading_game.jpg) | **Trải Bài Tarot Game** | Khăn nhung xanh ngọc bích, trải bài tình cảm 5 lá, lật lá bài The Lovers giữa vầng hào quang lấp lánh. |
| **05** | [`05_numerology_calc_game.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/05_numerology_calc_game.jpg) | **Bàn Tính Thần Số Học** | Tên khách hàng tách nguyên âm/phụ âm, bàn xoay số học tính Con Số Linh Hồn kèm các số Master 11, 22, 33. |
| **06** | [`06_ai_verdict_scoring.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/06_ai_verdict_scoring.jpg) | **Hội Đồng Phán Quyết AI** | Huy hiệu Hạng S (95/100), 3 thanh điểm (Thuật số, Biện giải, Chữa lành), trợ lý Tiểu Linh Miêu AI và quà tặng. |
| **07** | [`07_astrology_transit_game.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/07_astrology_transit_game.jpg) | **Chiêm Tinh & Quá Cảnh** | Vòng tròn 360° bản đồ sao Natal & Transit, các góc chiếu Square/Trine/Opposition, thước đo Căng Thẳng 0.82. |
| **08** | [`08_tuvi_bazi_synastry.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/08_tuvi_bazi_synastry.jpg) | **Bát Tự Duyên Nợ Đông Phương** | Bảng so sánh Tứ Trụ Can Chi 2 người, hiệu ứng Tý Sửu Lục Hợp, đồng hồ Âm Dương đo độ hòa hợp 88%. |
| **09** | [`09_mastery_profile_badges.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/09_mastery_profile_badges.jpg) | **Hồ Sơ Danh Vị & Bảo Vật** | Danh vị Pháp Sư Bát Quái Cấp 48, bộ 3 huy hiệu chiến tích và kệ bảo vật (Quả cầu thạch anh, Lư trầm, Chuông xoay). |
| **10** | [`10_endless_quest_hub.jpg`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/assets/study/10_endless_quest_hub.jpg) | **Sảnh Kỳ Nhân & Bảng Vàng** | Hàng đợi 3 vị khách đa dạng độ khó sao ngoài quán trà, cùng Bảng Phong Thần vinh danh Top 3 Đại Sư toàn quốc. |

