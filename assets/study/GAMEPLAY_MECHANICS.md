# THIẾT KẾ GAMEPLAY: QUÁN KỲ ĐÀI CHIÊM ĐOÁN (GAMEPLAY MECHANICS)
> **Dự án:** Numelyra Mobile App  
> **Tài liệu:** Cơ chế trò chơi nhập vai (RPG), Sinh khách hàng NPC, Chấm điểm AI và Tiến trình  
> **Thư mục lưu trữ:** `assets/study/GAMEPLAY_MECHANICS.md`

---

## 1. VÒNG LẶP CHƠI HÀNG NGÀY (CORE GAME LOOP)

Mỗi ngày, trải nghiệm của người chơi được thiết kế như một **Nghi Thức Tâm Linh 5 Phút** với 4 bước liền mạch:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ BƯỚC 1: KHAI TÂM│ ───►  │ BƯỚC 2: KHÁCH ĐẾN │ ───►  │ BƯỚC 3: BIỆN GIẢI│ ───►  │ BƯỚC 4: PHÁN XÉT│
│  (1-2 phút)     │       │   (30 giây)     │       │   (2-3 phút)    │       │   (Tức thì)     │
│ Học 1 quy tắc   │       │ Đọc nỗi niềm &  │       │ Nhập số tính    │       │ AI & Engine     │
│ Flashcard mới   │       │ hồ sơ của NPC   │       │ Rút bài / Khuyên│       │ trả điểm & EXP  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Bước 1: Khai Tâm (Bite-sized Lesson)
- Xuất hiện giao diện sách cổ hoặc thẻ Flashcard thần bí có hoạt họa nhẹ.
- Trình bày trực quan 1 công thức tính toán hoặc 1 ý nghĩa biểu tượng (Ví dụ: *"Hôm nay học: Cách tính Con Số Linh Hồn từ các nguyên âm"*).
- Có 1 câu hỏi tương tác mini (Mini-quiz 10 giây) để đảm bảo người chơi hiểu quy tắc trước khi tiếp khách.

### Bước 2: Khách Hàng Gõ Cửa (NPC Consultation)
- Hiệu ứng âm thanh chuông gió hoặc gõ cửa gỗ.
- Một vị khách NPC xuất hiện với:
  - Hình đại diện (Avatar minh họa nét vẽ phong cách Á Đông hoặc Tarot huyền bí).
  - Tên họ, Ngày sinh dương lịch, Giờ sinh (nếu có), Giới tính.
  - Câu chuyện và trăn trở đời thực (Background story & Query).
  - Yêu cầu mong muốn (Ví dụ: *"Xin thầy chỉ ra con số linh hồn của em để em hiểu vì sao mình luôn cô đơn"*).

### Bước 3: Biện Giải & Hành Nghề (The Divination Stage)
Người chơi thao tác trên bàn chiêm đoán gồm 2 phần:
1. **Phần Thuật Số (Kỹ thuật):**
   - Người chơi nhập kết quả tính nhẩm (hoặc dùng bàn phím số/bảng chọn).
   - Nếu là bài Tarot: Người chơi tự tay xáo và lật lá bài từ bộ 78 lá (dùng component `TarotCard` sẵn có).
   - Nếu là Tử vi/Chiêm tinh: Người chơi chọn Cung/Sao/Góc chiếu phù hợp.
2. **Phần Lời Khuyên (Biện chứng & Chữa lành):**
   - Người chơi nhập 1 đoạn giải thích ngắn (1–3 câu) hoặc chọn cấu trúc lời khuyên để trả lời cho khách hàng.

### Bước 4: Giám Khảo & Phán Quyết (AI & Engine Verdict)
- Màn hình chuyển sang trạng thái thẩm định bởi **Hội Đồng Trọng Tài Vũ Trụ (The Cosmic Council)**.
- Kết quả trả về gồm:
  - Điểm tổng quan (0–100) và xếp hạng (S, A, B, C).
  - Lời nhận xét chi tiết của AI: Chỉ rõ chỗ tính đúng/sai, khen ngợi góc nhìn nhân văn hoặc nhắc nhở quy tắc thuật số bị quên.
  - Phần thưởng: Điểm kinh nghiệm **EXP**, Điểm **Uy Tín Quán Trà**, và cập nhật chuỗi **Streak Ngày**.

---

## 2. HỆ THỐNG SINH KHÁCH HÀNG NPC (PROCEDURAL NPC ENGINE)

Hệ thống sinh khách hàng bảo đảm tính chân thực, đa dạng và luôn có **Đáp án chuẩn xác ngầm (Ground Truth Metadata)** được sinh ra từ chính 4 Engine lõi của app.

### 2.1. Cấu trúc Hồ sơ một Khách hàng NPC
```typescript
interface ClientNPC {
  id: string;
  name: string;
  gender: 'male' | 'female';
  birthDate: string;        // "1997-08-15"
  birthTime?: string;       // "14:30"
  occupation: string;       // "Kỹ sư phần mềm", "Chủ tiệm bánh", "Họa sĩ tự do"...
  avatarUrl: string;
  emotionalState: 'anxious' | 'heartbroken' | 'confused' | 'hopeful' | 'ambitious';
  dialogue: {
    greeting: string;
    story: string;
    mainQuestion: string;
  };
  domain: 'numerology' | 'tarot' | 'astrology' | 'tuvi_bazi' | 'hybrid';
  challengeType: 'calculate_metric' | 'interpret_spread' | 'aspect_analysis' | 'compatibility';
  groundTruth: {
    expectedValue: string | number;  // Giá trị tính toán chuẩn từ Engine
    explanationKey: string;          // Key ý nghĩa trong kho kiến thức
    favorableElements?: string[];    // Cung, sao hoặc hành tương ứng
  };
}
```

### 2.2. Các Nhóm Khách Hàng Tiêu Biểu (Archetypes)
1. **Khách hàng Tình duyên lận đận (The Romantic Seeker):**
   - Gặp trắc trở trong hôn nhân, phân vân giữa 2 người, hoặc vừa chia tay.
   - Thường yêu cầu: Bốc bài Tarot 5 lá `relationship`, xem Cung Phu Thê trong Bát Tự, hoặc tính chỉ số Linh Hồn & Cầu Nối.
2. **Khách hàng Ngã rẽ Sự nghiệp (The Career Nomad):**
   - Chán công việc văn phòng, muốn khởi nghiệp, áp lực tài chính.
   - Thường yêu cầu: Xem Năm Cá Nhân, Đỉnh Cao Kim Tự Tháp, Nhà 10 Thiên Đỉnh trong Chiêm tinh, hoặc trải bài 5 lá `two-options`.
3. **Khách hàng Khủng hoảng Danh tính (The Soul Searcher):**
   - Cảm thấy mất phương hướng, không biết mình sinh ra để làm gì.
   - Thường yêu cầu: Số Đường Đời, Số Sứ Mệnh, Nợ Nghiệp tiền kiếp, Tam Trụ (Sun - Moon - Rising).
4. **Khách hàng Cầu Tài & Chọn Ngày Lành (The Auspicious Planner):**
   - Chuẩn bị ký hợp đồng, mua xe, xây nhà, khai trương tiệm.
   - Thường yêu cầu: Giờ Hoàng Đạo, Lục Diệu, Trực cát hung từ Lịch Vạn Niên.

---

## 3. CƠ CHẾ CHẤM ĐIỂM KÉP (HYBRID SCORING ENGINE)

Để giải quyết bài toán: **Vừa chấm điểm chính xác tuyệt đối theo công thức thuật số, vừa thấu hiểu cảm xúc tự nhiên của người chơi, đồng thời tiết kiệm chi phí và tối ưu tốc độ**, Numelyra áp dụng cơ chế chấm điểm 3 Trụ Cột (Thang điểm 100):

```
                                  TỔNG ĐIỂM (100 ĐIỂM)
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐              ┌──────────────────┐
│   TRỤ CỘT 1:     │             │   TRỤ CỘT 2:     │              │   TRỤ CỘT 3:     │
│ ĐỘ CHUẨN XUẤT    │             │ KHẢ NĂNG BIỆN    │              │ TÂM LÝ CHỮA LÀNH │
│   THUẬT SỐ       │             │ GIẢI & LẬP LUẬN  │              │ & NĂNG LƯỢNG TÍCH│
│   (40 Điểm)      │             │   (30 Điểm)      │              │   CỰC (30 Điểm)  │
└────────┬─────────┘             └────────┬─────────┘              └────────┬─────────┘
         │                                │                                 │
         ▼                                ▼                                 ▼
Kiểm tra bằng Code               Kiểm tra bằng AI                  Kiểm tra bằng AI
(Rule-based Check)               (LLM Oracle Prompt)               (LLM Empathy Rubric)
- Tính đúng chỉ số?              - Có liên kết ý nghĩa             - Giọng văn ấm áp?
- Chọn đúng lá bài?                với câu hỏi khách?              - Không gieo rắc sợ hãi?
- Khớp Ground Truth?             - Logic chặt chẽ?                 - Định hướng giải pháp?
```

### Chi tiết Tiêu chí Chấm điểm:

| Trụ cột | Trọng số | Cơ chế đánh giá | Tiêu chí chi tiết |
| :--- | :---: | :--- | :--- |
| **1. Độ Chuẩn Thuật Số** | **40 điểm** | Code Engine tự động (0ms, 100% khách quan) | So khớp trực tiếp số liệu người dùng nhập với `groundTruth.expectedValue`.<br>• Đúng hoàn hảo: **40/40 điểm**.<br>• Sai lệch nhỏ (VD: quên giữ Master number 11/22): **20/40 điểm**.<br>• Sai hoàn toàn: **0/40 điểm**. |
| **2. Năng Lực Biện Giải** | **30 điểm** | AI LLM (Prompt có Rubric chặt chẽ) | Đánh giá mức độ người chơi vận dụng kiến thức bài học để giải thích cho khách:<br>• Nêu được từ khóa năng lượng trọng tâm của con số/lá bài.<br>• Gắn kết logic giữa bài học với hoàn cảnh thực tế của NPC. |
| **3. Trí Tuệ Chữa Lành** | **30 điểm** | AI LLM (Kiểm soát đạo đức tâm linh) | Numelyra đề cao triết lý **"Huyền học vị nhân sinh"**:<br>• **Cộng điểm:** Lời khuyên chân thành, khuyến khích tự lực, bình tĩnh, bao dung.<br>• **Trừ điểm nặng (-20 điểm):** Hù dọa khách hàng, mang tính chất mê tín dị đoan hoặc xúi giục hành vi tiêu cực. |

### Xếp loại kết quả (Grade Tiers):
- **Hạng S (Xuất Thần - 90–100 điểm):** Thưởng $150\%$ EXP, $+20$ Uy Tín, mở khóa lời khen đặc biệt của NPC.
- **Hạng A (Thấu Suốt - 75–89 điểm):** Thưởng $100\%$ EXP, $+10$ Uy Tín.
- **Hạng B (Đạt Chuẩn - 60–74 điểm):** Thưởng $70\%$ EXP, $+5$ Uy Tín.
- **Hạng C (Cần Rèn Luyện - Dưới 60 điểm):** Thưởng $30\%$ EXP, không tăng Uy Tín, gợi ý ôn lại bài học.

---

## 4. HỆ THỐNG TIẾN TRÌNH & ĐẲNG CẤP BẬC THẦY (PROGRESSION & TITLES)

### 4.1. Hệ thống 6 Bậc Đẳng Cấp Danh Vị
Người chơi tích lũy EXP qua từng ngày để thăng tiến trên nấc thang danh vọng:

1. **Bậc 1: Tập Sự Vô Danh (Novice Seeker)** — *Level 1 đến 10*  
   *Mở đầu con đường: Học cách cộng trừ các con số cơ bản.*
2. **Bậc 2: Đồ Đệ Kỳ Tài (Apprentice Diviner)** — *Level 11 đến 25*  
   *Thông hiểu trọn vẹn 24 chỉ số Thần số học Pythagoras.*
3. **Bậc 3: Thấu Thị Tarot (Tarot Reader)** — *Level 26 đến 50*  
   *Làm chủ 78 lá bài và các phép trải bài nhân sinh.*
4. **Bậc 4: Chiêm Tinh Học Giả (Cosmic Scholar)** — *Level 51 đến 80*  
   *Nhìn thấu vòng quay tinh tú, giải mã góc chiếu và bản đồ sao.*
5. **Bậc 5: Pháp Sư Bát Quái (Eastern Adept)** — *Level 81 đến 120*  
   *Quán triệt Âm Dương Ngũ Hành, 60 Hoa Giáp và Can Chi Tứ Trụ.*
6. **Bậc 6: Đại Tông Sư Vô Vi (Grandmaster Oracle)** — *Level 121 trở lên*  
   *Đỉnh cao giác ngộ: Kết hợp tứ môn tinh thông để phổ độ nhân sinh.*

### 4.2. Hệ thống Nâng Cấp Quán Trà Tâm Linh (Tea House Customization)
Điểm Uy Tín (Reputation) tích lũy cho phép người chơi mở khóa và trang hoàng không gian làm việc của mình trong game:
- **Bàn làm việc:** Bàn gỗ mộc $\rightarrow$ Bàn đá hoa cương $\rightarrow$ Bàn ngọc bích phong thủy.
- **Vật phẩm trợ lực:** 
  - *Quả cầu thạch anh tím:* Tăng $10\%$ EXP nhận được mỗi ngày.
  - *Lư hương trầm kiến:* Kéo thêm nhiều khách hàng thuộc giới doanh nhân / thượng lưu.
  - *Chuông xoay Tây Tạng:* Giúp thư giãn tinh thần, tăng điểm thấu cảm khi chấm điểm.

---

## 5. CƠ CHẾ DUY TRÌ THÓI QUEN (STREAK & RETENTION LOOPS)

1. **Ngọn Lửa Đạo (Sacred Streak Flame):**
   - Đếm liên tục số ngày người chơi vào học và tiếp khách.
   - Đạt các mốc 7 ngày, 30 ngày, 100 ngày, 365 ngày sẽ nhận được Huy hiệu đặc biệt (Vinh danh trên Profile).
2. **Bùa Hộ Mệnh Đóng Băng Chuỗi (Streak Freeze Talisman):**
   - Nếu bận rộn không thể vào app trong 1 ngày, bùa sẽ tự động kích hoạt để bảo tồn chuỗi không bị đứt.
   - Người chơi có thể kiếm bùa bằng cách đạt điểm S liên tiếp 5 ngày hoặc nhận quà hàng tuần.
3. **Thông Báo Đẩy Thông Minh (Smart Daily Push Notification):**
   - Gợi ý vào khung giờ vàng buổi sáng (07:30) hoặc tối (20:30):  
     *"✦ Bậc thầy ơi! Có một vị khách đang chờ ngoài cửa tiệm với một trăn trở đặc biệt về tình duyên..."*
