# GIÁO TRÌNH LỘ TRÌNH HỌC THUẬT SỐ & CHIÊM ĐOÁN (CURRICULUM ROADMAP)
> **Dự án:** Numelyra Mobile App  
> **Tài liệu:** Lộ trình bài giảng 125 ngày từ Tập Sự đến Bậc Thầy Tâm Linh  
> **Tham chiếu mã nguồn:** `numerologyEngine.ts`, `tuViBaziService.ts`, `astroEngine.ts`, `tarotService.ts`

---

## MỤC LỤC LỘ TRÌNH

1. **CHẶNG 1: HỌC VIỆN THẦN SỐ HỌC PYTHAGORAS (20 NGÀY)**  
   *Khám phá trọn vẹn kho 24 chỉ số nhân mệnh, chu kỳ thời gian và nợ nghiệp.*
2. **CHẶNG 2: HỌC VIỆN BÍ THUẬT TAROT RIDER-WAITE (30 NGÀY)**  
   *Làm chủ 22 lá Ẩn chính, 56 lá Ẩn phụ và 4 cấu trúc trải bài đại cương.*
3. **CHẶNG 3: HỌC VIỆN CHIÊM TINH HỌC HOÀNG ĐẠO (30 NGÀY)**  
   *Bản đồ sao cá nhân, 12 Cung, 10 Hành tinh, 12 Nhà và 5 Góc chiếu tương tác.*
4. **CHẶNG 4: HỌC VIỆN TỬ VI, BÁT TỰ & LỊCH VẠN NIÊN (45 NGÀY)**  
   *Can Chi tứ trụ, Ngũ Hành Nạp Âm 60 Hoa Giáp, Cung Phi Bát Trạch, Giờ Hoàng Đạo.*
5. **CHẶNG 5: ĐẠI THÀNH TỰU - CHẾ ĐỘ VÔ TẬN (INFINITE MASTER MODE)**  
   *Đón tiếp các vị khách ngẫu nhiên xuyên suốt 365 ngày trong năm.*

---

# CHẶNG 1: HỌC VIỆN THẦN SỐ HỌC PYTHAGORAS (20 NGÀY)
> **Mục tiêu:** Rèn luyện phản xạ tính toán nhẩm, nhớ bảng số Pythagoras A-Z, hiểu sâu 24 chỉ số.  
> **Source code:** [`numerologyEngine.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/numerologyEngine.ts), [`numerology24Service.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/numerology24Service.ts).

### Bảng Chuyển Đổi Số Pythagoras Tiêu Chuẩn (Nhớ Nằm Lòng)
```
1: A, J, S    2: B, K, T    3: C, L, U
4: D, M, V    5: E, N, W    6: F, O, X
7: G, P, Y    8: H, Q, Z    9: I, R
Nguyên âm: A, E, I, O, U (và Y khi không có nguyên âm khác)
```

---

### Tuần 1: Bộ Tứ Trụ Nhân Cách (Core Numbers)

#### **Ngày 1: Số Đường Đời (Life Path Number - walksOfLife)**
- **Công thức:** Cộng rút gọn từng thành phần Ngày, Tháng, Năm sinh dương lịch. Bảo tồn số Master (11, 22, 33).
  $$\text{LifePath} = \text{reduce}(\text{reduce}(Day) + \text{reduce}(Month) + \text{reduce}(Year))$$
- **Mã nguồn:** `NumerologyCalculator.getWalksOfLife()`, `numerologyEngine.ts` (dòng 140–154).
- **Ý nghĩa:** Trục xương sống của cuộc đời, bài học tiến hóa lớn nhất của linh hồn.
- **Thử thách NPC:** Khách hàng Nguyễn Văn An sinh ngày 14/08/1995. Người chơi phải tính đúng Đường đời = $5+8+(1+9+9+5=24\rightarrow 6) = 19 \rightarrow 1+9 = 10/1$. Giải mã ý nghĩa người tiên phong.

#### **Ngày 2: Số Sứ Mệnh (Destiny / Mission Number - mission)**
- **Công thức:** Tổng tất cả các chữ cái trong Họ và Tên đầy đủ chuyển hóa qua bảng Pythagoras.
  $$\text{Mission} = \text{reduce}(\sum \text{PYTHAGOREAN\_TABLE}[c])$$
- **Mã nguồn:** `NumerologyCalculator.getMission()`, `numerologyEngine.ts` (dòng 156–161).
- **Ý nghĩa:** Công cụ và năng lực vũ trụ trang bị cho bạn để hoàn thành bài học cuộc đời.
- **Thử thách NPC:** Khách hàng Trần Mai Hương. Người chơi chuyển đổi từng ký tự sang số và tính ra kết quả.

#### **Ngày 3: Số Linh Hồn (Soul Urge Number - soul)**
- **Công thức:** Tổng các chữ cái là **Nguyên âm** (A, E, I, O, U; xử lý chữ Y theo quy tắc `isVowelChar()`).
  $$\text{Soul} = \text{reduce}(\sum_{c \in \text{Vowels}} \text{PYTHAGOREAN\_TABLE}[c])$$
- **Mã nguồn:** `NumerologyCalculator.getSoul()`, `numerologyEngine.ts` (dòng 163–172).
- **Ý nghĩa:** Khao khát thầm kín nhất, động lực thúc đẩy nội tâm sau mọi quyết định.
- **Thử thách NPC:** Khách hàng tên "LÝ MỸ THẢO" (kiểm tra quy tắc nhận diện nguyên âm Y).

#### **Ngày 4: Số Nhân Cách (Personality Number - personality)**
- **Công thức:** Tổng các chữ cái là **Phụ âm** trong họ tên.
  $$\text{Personality} = \text{reduce}(\sum_{c \in \text{Consonants}} \text{PYTHAGOREAN\_TABLE}[c])$$
- **Mã nguồn:** `NumerologyCalculator.getPersonality()`, `numerologyEngine.ts` (dòng 174–183).
- **Ý nghĩa:** Bộ y phục bên ngoài, ấn tượng đầu tiên mà người khác cảm nhận về bạn.
- **Thử thách NPC:** Khách hàng cảm thấy người khác hay hiểu lầm mình khó gần dù bên trong rất ấm áp (So sánh Linh hồn vs Nhân cách).

#### **Ngày 5: Số Ngày Sinh & Số Thái Độ (dateOfBirth & attitude)**
- **Công thức:** 
  - Số Ngày Sinh: Rút gọn ngày (giữ 11, 22). Món quà tài năng tự nhiên.
  - Số Thái Độ: $\text{reduce}(\text{Day} + \text{Month})$. Phản xạ tức thời trước biến cố.
- **Mã nguồn:** `getBirthdayNumber()`, `getAttitude()`, `numerologyEngine.ts` (dòng 185, 233).
- **Thử thách NPC:** Khách sinh ngày 29/11 (Ngày sinh $2+9=11$, Thái độ $11+11\rightarrow 2+2=4$).

---

### Tuần 2: Năng Lực Phát Triển & Bản Đồ Chiều Sâu

#### **Ngày 6: Số Trưởng Thành & Số Cân Bằng (mature & balance)**
- **Công thức:**
  - Số Trưởng Thành: $\text{reduce}(\text{LifePath} + \text{Mission})$. Nở rộ sau tuổi 35–40.
  - Số Cân Bằng: Tổng các chữ cái **đầu tiên** của mỗi từ trong họ tên.
- **Mã nguồn:** `getMaturity()`, `numerologyEngine.ts` (dòng 188, 191–195).
- **Thử thách NPC:** Khách hàng bước sang tuổi 36 đang đổi hướng sự nghiệp, cần kích hoạt năng lượng Trưởng Thành.

#### **Ngày 7: Số Tư Duy Lý Trí & Sức Mạnh Tiềm Thức (rationalThinking & subconsciousPower)**
- **Công thức:**
  - Tư duy lý trí: $\text{reduce}(\text{reduce}(Day) + \text{reduce}(\text{Tên riêng}))$.
  - Tiềm thức: $9 - \text{Số lượng con số bị khuyết}$.
- **Mã nguồn:** `getRationalThinking()`, `numerologyEngine.ts` (dòng 198–204, 218).
- **Thử thách NPC:** Khách hàng hay do dự khi đưa ra quyết định kinh doanh.

#### **Ngày 8: Đam Mê Ẩn Giấu & Con Số Thiếu (passion & missingNumbers)**
- **Công thức:** Thống kê tần suất xuất hiện của các số 1–9 trong toàn bộ họ tên.
  - Số có tần suất xuất hiện nhiều nhất $\rightarrow$ Đam Mê Ẩn Giấu.
  - Số có tần suất = 0 $\rightarrow$ Bài học nghiệp quả (Karmic Lessons).
- **Mã nguồn:** `numerologyEngine.ts` (dòng 206–230).
- **Thử thách NPC:** Kiểm tra họ tên khách hàng để tìm ra năng khiếu vượt trội và lỗ hổng cần bồi đắp.

#### **Ngày 9: Nhận Diện 4 Nợ Nghiệp Cốt Lõi (Karmic Debts 13/4, 14/5, 16/7, 19/1)**
- **Quy tắc nhận diện:** Xuất hiện tại Ngày sinh, Đường đời trước khi rút gọn hoặc Sứ mệnh trước khi rút gọn.
  - $13/4$: Nghiệp lười biếng / cản trở $\rightarrow$ Học bài học kiên trì, kỷ luật.
  - $14/5$: Nghiệp lạm dụng tự do $\rightarrow$ Học bài học tiết chế, thích nghi.
  - $16/7$: Nghiệp cái tôi & đổ vỡ tình cảm $\rightarrow$ Học bài học thức tỉnh tâm linh.
  - $19/1$: Nghiệp độc đoán / phụ thuộc $\rightarrow$ Học bài học tự lập và biết lắng nghe.
- **Mã nguồn:** `numerologyEngine.ts` (dòng 236–256).
- **Thử thách NPC:** Khách hàng sinh ngày 16/04 liên tục trải qua đổ vỡ tình cảm đột ngột.

#### **Ngày 10: Ba Cầu Nối Năng Lượng (Energy Bridges)**
- **Công thức:**
  - Cầu nối Đường Đời - Sứ Mệnh: $|\text{reduce}(\text{LifePath}) - \text{reduce}(\text{Mission})|$.
  - Cầu nối Linh Hồn - Nhân Cách: $|\text{reduce}(\text{Soul}) - \text{reduce}(\text{Personality})|$.
  - Cầu nối Trưởng Thành - Đam Mê: $|\text{reduce}(\text{Maturity}) - \text{reduce}(\text{Passion})|$.
- **Mã nguồn:** `numerologyEngine.ts` (dòng 259–268).
- **Ý nghĩa:** Con số giúp hóa giải sự xung đột giữa khát vọng bên trong và hoàn cảnh bên ngoài.

---

### Tuần 3: Vận Hạn Thời Gian & Biểu Đồ 3x3

#### **Ngày 11: Vận Hạn Cá Nhân (Năm - Tháng - Ngày Cá Nhân)**
- **Công thức:**
  $$\text{YearPersonal} = \text{reduce}(\text{CurrentYear} + \text{Day} + \text{Month})$$
  $$\text{MonthPersonal} = \text{reduce}(\text{YearPersonal} + \text{CurrentMonth})$$
  $$\text{DayPersonal} = \text{reduce}(\text{MonthPersonal} + \text{CurrentDay})$$
- **Mã nguồn:** `getPersonalYear()`, `numerologyEngine.ts` (dòng 271–274).
- **Thử thách NPC:** Khách hàng hỏi "Năm nay em có nên khởi nghiệp mở công ty hay không?" (Phân tích Năm số 1/8 vs Năm số 7/9).

#### **Ngày 12: Bốn Đỉnh Cao Cuộc Đời (4 Pinnacles / Kim Tự Tháp)**
- **Công thức:**
  - Đỉnh 1: $\text{reduce}(Month + Day)$ (Độ tuổi: $36 - LifePath$).
  - Đỉnh 2: $\text{reduce}(Day + Year)$ (Độ tuổi: Đỉnh $1 + 9$).
  - Đỉnh 3: $\text{reduce}(\text{Đỉnh 1} + \text{Đỉnh 2})$ (Độ tuổi: Đỉnh $2 + 9$).
  - Đỉnh 4: $\text{reduce}(Month + Year)$ (Độ tuổi: Đỉnh $3 + 9$).
- **Mã nguồn:** `numerologyEngine.ts` (dòng 277–291).
- **Thử thách NPC:** Lập đỉnh cao cho một người 32 tuổi để chỉ dẫn thời điểm gặt hái thành công.

#### **Ngày 13: Bốn Thách Thức Cuộc Đời (4 Challenges)**
- **Công thức:**
  - Thách thức 1: $|Month - Day|$.
  - Thách thức 2: $|Year - Day|$.
  - Thách thức 3: $|\text{Thách thức 1} - \text{Thách thức 2}|$.
  - Thách thức 4: $|Month - Year|$.
- **Mã nguồn:** `numerologyEngine.ts` (dòng 294–298).

#### **Ngày 14: Tám Mũi Tên Cá Tính Trên Biểu Đồ Ngày Sinh (Part 1 - Trục Ngang)**
- **Quy tắc:** Lập ma trận $3 \times 3$ của ngày sinh dương lịch:
  - Trục thể chất: 1-4-7 (Thực tế vs Trống: Hỗn loạn).
  - Trục tâm hồn: 2-5-8 (Cân bằng cảm xúc vs Trống: Nhạy cảm).
  - Trục trí não: 3-6-9 (Trí nhớ sáng suốt vs Trống: Hay quên).
- **Mã nguồn:** `checkArrow()`, `numerologyEngine.ts` (dòng 301–326).

#### **Ngày 15: Tám Mũi Tên Cá Tính (Part 2 - Trục Dọc & Chéo)**
- **Quy tắc:**
  - Trục dọc: 1-2-3 (Kế hoạch), 4-5-6 (Ý chí), 7-8-9 (Hoạt động).
  - Trục chéo: 1-5-9 (Quyết tâm), 3-5-7 (Tâm linh / Thấu hiểu).
- **Mã nguồn:** `numerologyEngine.ts` (dòng 321–326).

#### **Ngày 16 - Ngày 20: Tốt Nghiệp Học Viện Thần Số Học (Master Quests)**
- **Ngày 16:** Luận giải hồ sơ phức hợp (Khách hàng có nhiều số Master 11/22).
- **Ngày 17:** Luận giải ghép đôi tương hợp 2 hồ sơ Thần số học.
- **Ngày 18:** Hóa giải năng lượng thiếu bằng cách đặt tên bổ trợ / danh xưng.
- **Ngày 19:** Chiến lược đón đầu Năm Cá Nhân kết hợp 4 Đỉnh Cao.
- **Ngày 20: THI TỐT NGHIỆP BẬC THẦY SỐ HỌC:** Tiếp đón 3 vị khách liên tiếp với các tình huống khó khăn, đạt trên 85 điểm để nhận danh hiệu *Nhà Toán Học Huyền Bí (Pythagorean Sage)*.

---

# CHẶNG 2: HỌC VIỆN BÍ THUẬT TAROT RIDER-WAITE (30 NGÀY)
> **Mục tiêu:** Nắm vững hình tượng biểu trưng của 78 lá bài, phân biệt chiều xuôi (Upright) và chiều ngược (Reversed), ứng dụng 4 kiểu trải bài chuẩn.  
> **Source code & Assets:** [`tarotService.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/tarotService.ts), [`minorArcana.generated.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/minorArcana.generated.ts), [`tarotAssets.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/tarotAssets.ts).

---

### Tuần 4 & 5: Đại Bí Tích (22 Major Arcana - Hành Trình Kẻ Khờ)

- **Ngày 21:** Lá số 0 - The Fool (Khởi đầu vô định) & Lá số 1 - The Magician (Năng lực kiến tạo).
- **Ngày 22:** Lá số 2 - The High Priestess (Trực giác huyền bí) & Lá số 3 - The Empress (Sinh sôi trù phú).
- **Ngày 23:** Lá số 4 - The Emperor (Kỷ luật quyền lực) & Lá số 5 - The Hierophant (Niềm tin giáo điều).
- **Ngày 24:** Lá số 6 - The Lovers (Lựa chọn & Đồng điệu) & Lá số 7 - The Chariot (Ý chí kiên định).
- **Ngày 25:** Lá số 8 - Strength (Sức mạnh nội tâm) & Lá số 9 - The Hermit (Soi đường tĩnh lặng).
- **Ngày 26:** Lá số 10 - Wheel of Fortune (Bánh xe số phận) & Lá số 11 - Justice (Công lý nhân quả).
- **Ngày 27:** Lá số 12 - The Hanged Man (Góc nhìn hy sinh) & Lá số 13 - Death (Tái sinh kết thúc).
- **Ngày 28:** Lá số 14 - Temperance (Dung hòa cân bằng) & Lá số 15 - The Devil (Ràng buộc dục vọng).
- **Ngày 29:** Lá số 16 - The Tower (Sụp đổ thức tỉnh) & Lá số 17 - The Star (Hy vọng chữa lành).
- **Ngày 30:** Lá số 18 - The Moon (Ảo ảnh vô thức) & Lá số 19 - The Sun (Ánh sáng thuần khiết).
- **Ngày 31:** Lá số 20 - Judgement (Hiệu triệu phán xét) & Lá số 21 - The World (Viên mãn chu kỳ).

---

### Tuần 6 & 7: Tiểu Bí Tích (56 Minor Arcana) & Kỹ Thuật Trải Bài

- **Ngày 32 - 34: Bộ Gậy (Wands - Nguyên tố Lửa):** Đam mê, hành động, ý chí và sáng tạo (từ Ace đến 10 và 4 lá Hoàng gia: Page, Knight, Queen, King).
- **Ngày 35 - 37: Bộ Cốc (Cups - Nguyên tố Nước):** Cảm xúc, tình yêu, mối quan hệ và trực giác (từ Ace đến King).
- **Ngày 38 - 40: Bộ Kiếm (Swords - Nguyên tố Khí):** Trí tuệ, xung đột, sự thật và tư duy lý tính (từ Ace đến King).
- **Ngày 41 - 43: Bộ Tiền (Pentacles - Nguyên tố Đất):** Vật chất, tài chính, công việc và sự nghiệp bền vững (từ Ace đến King).
- **Ngày 44: Kỹ thuật Trải Bài 1 Lá (`single`):** Thông điệp cốt lõi trong ngày.
- **Ngày 45: Kỹ thuật Trải Bài 3 Lá (`three-card`):** Quá khứ (Gốc rễ) $\rightarrow$ Hiện tại (Thực trạng) $\rightarrow$ Tương lai (Xu hướng).
- **Ngày 46: Kỹ thuật Trải Bài 5 Lá Hai Lựa Chọn (`two-options`):** So sánh ngã rẽ A vs B cho khách hàng đang phân vân.
- **Ngày 47: Kỹ thuật Trải Bài 5 Lá Mối Quan Hệ (`relationship`):** Năng lượng Bạn - Năng lượng Đối phương - Sợi dây kết nối - Nút thắt - Tiềm năng.
- **Ngày 48 - 49: Xử lý Lá Bài Ngược (Reversed Cards) & Đọc Liên Kết Nhiều Lá:** Nhận diện năng lượng tắc nghẽn hoặc biểu hiện thái quá.
- **Ngày 50: THI TỐT NGHIỆP HỌC VIỆN TAROT:** Khách hàng đến trải bài tình cảm phức tạp với kiểu trải bài 5 lá `relationship`.

---

# CHẶNG 3: HỌC VIỆN CHIÊM TINH HỌC TÂY PHƯƠNG (30 NGÀY)
> **Mục tiêu:** Đọc bản đồ sao Natal Chart, vị trí hành tinh theo độ, nhận diện các góc chiếu (Aspects) căng thẳng và hài hòa.  
> **Source code:** [`astroEngine.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/astro/astroEngine.ts), [`aspectCalculator.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/astro/aspectCalculator.ts), [`astroVectorEngine.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/astro/astroVectorEngine.ts).

---

### Tuần 8: 12 Cung Hoàng Đạo & 4 Nguyên Tố

- **Ngày 51:** Bản đồ 360 độ Hoàng Đạo và 4 Nguyên tố: Lửa (Bạch Dương, Sư Tử, Nhân Mã), Đất (Kim Ngưu, Xử Nữ, Ma Kết).
- **Ngày 52:** Nguyên tố Khí (Song Tử, Thiên Bình, Bảo Bình), Nước (Cự Giải, Bọ Cạp, Song Ngư) và 3 Tính chất (Cardinal, Fixed, Mutable).
- **Ngày 53 - 56: Tam Trụ Bản Thể (The Big Three):**
  - Mặt Trời (Sun): Bản ngã, mục đích sống cốt lõi.
  - Mặt Trăng (Moon): Cảm xúc tiềm thức và nhu cầu an toàn nội tâm.
  - Cung Mọc (Ascendant / AC): Chiếc mặt nạ xã hội và lăng kính nhìn đời.

---

### Tuần 9: Hệ Thống 10 Thiên Thể & 12 Nhà Địa Bàn (Houses)

- **Ngày 57 - 60: Các Hành Tinh Cá Nhân & Xã Hội:**
  - Sao Thủy (Mercury): Giao tiếp và xử lý thông tin.
  - Sao Kim (Venus): Thẩm mỹ, giá trị và cách yêu.
  - Sao Hỏa (Mars): Động lực hành động và bản năng chiến đấu.
  - Sao Mộc (Jupiter) & Sao Thổ (Saturn): May mắn, mở rộng vs Kỷ luật, nghiệp quả.
  - 3 Ngoại hành tinh: Thiên Vương (Đột phá), Hải Vương (Mơ mộng), Diêm Vương (Chuyển hóa sâu sắc).
- **Ngày 61 - 65: Hệ Thống 12 Cung Địa Bàn (Porphyry House System):**
  - Trục AC-DC (Bản thân vs Đối tác) và Trục MC-IC (Sự nghiệp công chúng vs Cội nguồn gia đình).
  - Phân bổ 12 lĩnh vực đời sống: Nhà 2 (Tài chính), Nhà 5 (Sáng tạo/Tình ái), Nhà 7 (Hôn nhân), Nhà 10 (Danh vọng).

---

### Tuần 10: Nghệ Thuật Đọc Góc Chiếu (Aspects & Synastry)

- **Ngày 66: Góc Trùng Tụ (Conjunction - $0^\circ$):** Hợp nhất năng lượng với Orb $\le 8^\circ$.
- **Ngày 67: Góc Lục Hợp (Sextile - $60^\circ$) & Tam Hợp (Trine - $120^\circ$):** Dòng chảy may mắn và tài năng bẩm sinh (Orb $\le 7^\circ$).
- **Ngày 68: Góc Vuông Góc (Square - $90^\circ$):** Căng thẳng, áp lực nội tâm tạo động lực chuyển biến (Orb $\le 7^\circ$).
- **Ngày 69: Góc Đối Đỉnh (Opposition - $180^\circ$):** Xung đột lưỡng phân, cần sự cân bằng giữa 2 cực (Orb $\le 8^\circ$).
- **Ngày 70: Tính toán Chỉ Số Căng Thẳng & Hài Hòa (`tensionScore` vs `harmonyScore`):**
  - Vận dụng thuật toán trong `aspectCalculator.ts` để lượng hóa mức độ thuận lợi trong ngày.
- **Ngày 71 - 79: Phân Tích Quá Cảnh (Transit Chart) & Hạn Hàng Ngày:**
  - Đọc sự tương tác giữa các hành tinh chuyển động trên bầu trời hôm nay với bản đồ sao gốc của khách.
- **Ngày 80: THI TỐT NGHIỆP CHIÊM TINH SƯ:** Phân tích bản đồ sao một khách hàng có Mặt Trăng vuông góc Sao Hỏa đang bị khủng hoảng cảm xúc.

---

# CHẶNG 4: HỌC VIỆN TỬ VI, BÁT TỰ & LỊCH VẠN NIÊN (45 NGÀY)
> **Mục tiêu:** Thông thuộc 10 Thiên Can, 12 Địa Chi, Ngũ Hành Nạp Âm 60 Hoa Giáp, Cung Phi Bát Trạch, Can Chi Giờ Hoàng Đạo và thuật coi ngày lành.  
> **Source code:** [`tuViBaziService.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/tuViBaziService.ts), [`lunarService.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/lunarService.ts).

---

### Tuần 11 - 13: Nền Tảng Can Chi & Ngũ Hành Tứ Trụ

- **Ngày 81:** 10 Thiên Can (Giáp, Ất, Bính, Đinh, Mậu, Kỷ, Canh, Tân, Nhâm, Quý) & Phân định Ngũ Hành Âm Dương.
- **Ngày 82:** 12 Địa Chi (Tý đến Hợi), tính chất ngũ hành và giờ trong ngày (`GIO_INFO`).
- **Ngày 83:** Thuật toán quy đổi Dương lịch sang Âm lịch (Thuật toán Hồ Ngọc Đức trong `lunarService.ts`).
- **Ngày 84: Tứ Trụ Can Chi (Năm - Tháng - Ngày - Giờ):** Cách xác định Trụ Năm, Trụ Tháng, Trụ Ngày và Trụ Giờ.
- **Ngày 85: Nhật Chủ (Day Master):** Can của ngày sinh - Đại diện cho chính bản thân người xem.
- **Ngày 86: Cung Phu Thê (Spousal Palace):** Chi của ngày sinh - Đại diện cho cung phối ngẫu, tình duyên gia đạo.
- **Ngày 87 - 90: Địa Chi Tương Tác Cốt Lõi:**
  - **Lục Hợp (`LIU_HE_MAP`):** Tý-Sửu hóa Thổ, Dần-Hợi hóa Mộc, Mão-Tuất hóa Hỏa, Thìn-Dậu hóa Kim, Tỵ-Thân hóa Thủy, Ngọ-Mùi hóa Thổ.
  - **Tam Hợp (`SAN_HE_GROUPS`):** Thân-Tý-Thìn (Thủy cục), Hợi-Mão-Mùi (Mộc cục), Dần-Ngọ-Tuất (Hỏa cục), Tỵ-Dậu-Sửu (Kim cục).
  - **Lục Xung (`LIU_CHONG_MAP`):** Tý-Ngọ, Sửu-Mùi, Dần-Thân, Mão-Dậu, Thìn-Tuất, Tỵ-Hợi.
  - **Tương Hại (`LIU_HAI_MAP`):** Tý-Mùi, Sửu-Ngọ, Dần-Tỵ, Mão-Thìn, Thân-Hợi, Dậu-Tuất.
- **Ngày 91: Thiên Can Ngũ Hợp (`CAN_HE_MAP`):**
  - Giáp Kỷ hóa Thổ (Trung Chính chi hợp).
  - Ất Canh hóa Kim (Nhân Nghĩa chi hợp).
  - Bính Tân hóa Thủy (Uy Chế chi hợp).
  - Đinh Nhâm hóa Mộc (Nhân Thọ chi hợp).
  - Mậu Quý hóa Hỏa (Vô Tình chi hợp).

---

### Tuần 14 - 15: 60 Hoa Giáp Nạp Âm & Cung Phi Bát Trạch

- **Ngày 92 - 96: 60 Hoa Giáp Ngũ Hành Nạp Âm (`NAP_AM_MAP`):**
  - Phân tích tính chất cụ thể: Hải Trung Kim khác gì Kiếm Phong Kim; Đại Lâm Mộc khác gì Tùng Bách Mộc; v.v.
- **Ngày 97 - 100: Cung Phi Bát Trạch Quái Mệnh (`getCungPhi`):**
  - Thuật toán tính số quái mệnh nam/nữ từ năm sinh.
  - Phân biệt **Đông Tứ Mệnh** (Khảm, Ly, Chấn, Tốn) vs **Tây Tứ Mệnh** (Càn, Khôn, Cấn, Đoài).
- **Ngày 101 - 105: Bát Trạch Phối Mệnh Hôn Nhân & Hướng Nhà:**
  - 4 Cung Cát: Sinh Khí, Diên Niên, Thiên Y, Phục Vị.
  - 4 Cung Hung: Tuyệt Mệnh, Họa Hại, Lục Sát, Ngũ Quỷ.

---

### Tuần 16 - 17: Thuật Coi Ngày Lành & Trạch Cát Học

- **Ngày 106 - 110: Giờ Hoàng Đạo & Hắc Đạo (`TWELVE_DAY_STARS`):**
  - Cách tính vị trí sao Thanh Long theo Chi ngày (`THANH_LONG_START_HOUR_BY_DAY_CHI`).
  - 6 Sao Hoàng Đạo: Thanh Long, Minh Đường, Kim Quỹ, Thiên Đức, Ngọc Đường, Tư Mệnh.
  - 6 Sao Hắc Đạo: Thiên Hình, Chu Tước, Bạch Hổ, Thiên Lao, Huyền Vũ, Câu Trận.
- **Ngày 111 - 115: Lục Diệu Lý Thuần Phong (`LY_THUAN_PHONG_CUNG`):**
  - Đại An, Lưu Niên, Tốc Hỷ, Xích Khẩu, Tiểu Cát, Không Vong. Ứng dụng xuất hành và cầu tài.
- **Ngày 116 - 120: Nhị Thập Bát Tú & Thập Nhị Trực:**
  - 28 ngôi sao chiếu nhật & 12 Trực (Kiến, Trừ, Mãn, Bình, Định, Chấp, Phá, Nguy, Thành, Thâu, Khai, Bế).
- **Ngày 121 - 124: Luận Giải Tương Hợp Tình Duyên Toàn Diện (Bazi Synastry):**
  - Tích hợp đồng thời 6 lớp: Trụ Ngày, Cung Phu Thê, Thiên Can Hợp, Nạp Âm, Cung Phi và Con Giáp Năm.
- **Ngày 125: ĐẠI THI TỐT NGHIỆP - TẤN PHONG ĐẠI TÔNG SƯ:**
  - Tiếp đón 1 cặp đôi chuẩn bị kết hôn: Luận giải toàn diện Bát Tự, chọn ngày cưới Hoàng Đạo và hướng xuất hành.

---

# CHẶNG 5: ĐẠI THÀNH TỰU - CHẾ ĐỘ VÔ TẬN (INFINITE MASTER MODE)

Sau ngày 125, người dùng bước vào chế độ **Hành Nghề Tự Do (Consultation Mastery)**:
- Mỗi ngày hệ thống tự động sinh 1–3 vị khách NPC ngẫu nhiên với các chủ đề đa dạng (Tình duyên, Sự nghiệp, Đầu tư, Chọn ngày, Tìm kiếm nội tâm).
- Khách hàng có thể yêu cầu kết hợp đa môn phái (Ví dụ: Vừa bốc bài Tarot, vừa đối chiếu Thần số học và Bát tự).
- Duy trì chuỗi Streak hàng ngày, tích lũy điểm Uy tín để đua Top Bảng Xếp Hạng *Kỳ Nhân Dị Sĩ Toàn Quốc*.
