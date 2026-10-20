# CẤU TRÚC DỮ LIỆU & ĐẶC TẢ KỸ THUẬT API (DATA SCHEMA & API SPEC)
> **Dự án:** Numelyra Mobile App  
> **Tài liệu:** Cấu trúc TypeScript Interfaces, Database Models, API Endpoints & System Prompts cho AI Evaluator  
> **Thư mục lưu trữ:** `assets/study/DATA_SCHEMA_AND_API.md`

---

## 1. TYPESCRIPT INTERFACES (CLIENT & SERVER DATA MODELS)

Các mô hình dữ liệu này có thể đặt trực tiếp vào `src/types/mastery.ts` trong Mobile App.

```typescript
// ============================================================================
// 1. TIẾN TRÌNH NGƯỜI CHƠI (USER MASTERY PROFILE)
// ============================================================================

export type AcademyType = 'numerology' | 'tarot' | 'astrology' | 'tuvi_bazi' | 'infinite';

export type MasterTitleTier = 
  | 'novice'        // Tập Sự Vô Danh (Lv 1-10)
  | 'apprentice'    // Đồ Đệ Kỳ Tài (Lv 11-25)
  | 'tarot_reader'  // Thấu Thị Tarot (Lv 26-50)
  | 'cosmic_scholar'// Chiêm Tinh Học Giả (Lv 51-80)
  | 'eastern_adept' // Pháp Sư Bát Quái (Lv 81-120)
  | 'grandmaster';  // Đại Tông Sư Vô Vi (Lv 121+)

export interface MasteryUserProfile {
  userId: string;
  level: number;
  currentExp: number;
  expToNextLevel: number;
  reputation: number;          // Điểm Uy Tín Quán Trà
  title: MasterTitleTier;
  titleNameVi: string;
  streakCount: number;
  longestStreak: number;
  lastActiveDateKey: string;   // "YYYY-MM-DD"
  freezeShieldsRemaining: number;
  completedLessons: string[];  // Danh sách ID bài học đã hoàn thành
  unlockedDecorations: string[];// ID các bảo vật đã mở khóa
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 2. ĐỊNH NGHĨA BÀI HỌC HÀNG NGÀY (LESSON DEFINITION)
// ============================================================================

export interface MasteryLesson {
  id: string;                  // "num-day-01", "tarot-day-21"...
  dayIndex: number;            // 1 đến 125
  academy: AcademyType;
  title: string;
  subtitle: string;
  conceptName: string;         // "Số Đường Đời (Life Path)"
  formulaRule: string;         // Quy tắc tính toán hoặc triết lý
  engineSourceRef: string;     // "NumerologyCalculator.getWalksOfLife()"
  contentMarkdown: string;     // Nội dung bài giảng hiển thị trên Flashcard
  keywords: string[];
  quickQuiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

// ============================================================================
// 3. NHIỆM VỤ TIẾP KHÁCH HÀNG NGÀY (DAILY CLIENT QUEST)
// ============================================================================

export interface ClientDossier {
  npcId: string;
  fullName: string;
  gender: 'male' | 'female';
  birthDate: string;           // "1995-08-14"
  birthTime?: string;          // "10:15"
  occupation: string;
  avatarAssetKey: string;
  situationStory: string;      // Câu chuyện hoàn cảnh
  clientQuestion: string;      // Câu hỏi cụ thể cần giải đáp
}

export interface QuestGroundTruth {
  primaryTargetKey: string;    // "walksOfLife", "spousalPalace", "aspect"...
  expectedNumericOrString: string | number; // "1", "Tý Sửu Lục Hợp"...
  expectedCards?: string[];    // ID lá bài Tarot nếu có
  coreKeywords: string[];      // Từ khóa bắt buộc người chơi cần chạm tới
}

export interface DailyMasteryQuest {
  questId: string;
  dateKey: string;             // "YYYY-MM-DD"
  lessonId: string;
  client: ClientDossier;
  groundTruth: QuestGroundTruth;
  inputRequirements: {
    requiresCalculation: boolean;
    requiresTarotDraw: boolean;
    requiresAdviceText: boolean;
    minAdviceLength?: number;
  };
}

// ============================================================================
// 4. BÀI NỘP CỦA NGƯỜI CHƠI & KẾT QUẢ CHẤM ĐIỂM (SUBMISSION & EVALUATION)
// ============================================================================

export interface UserQuestSubmission {
  questId: string;
  userId: string;
  userCalculatedValue?: string | number;
  userDrawnCards?: Array<{
    cardId: string;
    isReversed: boolean;
    positionId: string;
  }>;
  userAdviceText: string;
  timeSpentSeconds: number;
}

export interface QuestEvaluationResult {
  questId: string;
  overallScore: number;         // 0 - 100
  grade: 'S' | 'A' | 'B' | 'C';
  scoreBreakdown: {
    mathAccuracyScore: number;  // Tối đa 40 điểm (Rule-based check)
    logicInsightScore: number;  // Tối đa 30 điểm (AI check)
    empathyHealingScore: number;// Tối đa 30 điểm (AI check)
  };
  aiFeedback: {
    compliment: string;         // Lời khen ngợi điểm sáng
    correctionOrTip: string;    // Gợi ý cải thiện hoặc chỉ ra chỗ thiếu sót
    clientReaction: string;     // Phản ứng tâm lý của NPC ("Khách hàng mỉm cười nhẹ nhõm...")
  };
  expGained: number;
  reputationGained: number;
  newStreak: number;
  levelUpInfo?: {
    isLevelUp: boolean;
    newLevel: number;
    newTitle?: MasterTitleTier;
  };
}
```

---

## 2. ĐẶC TẢ BACKEND API ENDPOINTS

Các API này sẽ được định tuyến qua Backend Express/Next.js tại địa chỉ URL base trong [`apiConfig.ts`](file:///c:/Users/Admin/.gemini/antigravity/scratch/NumerologyWebApp/mobile_app/src/services/apiConfig.ts):

### 2.1. `GET /api/mastery/daily-ritual`
Lấy dữ liệu ngày hiện tại bao gồm bài học (Flashcard) và hồ sơ khách hàng NPC.

- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response:**
```json
{
  "status": "success",
  "data": {
    "dateKey": "2026-10-09",
    "dayIndex": 1,
    "userProfile": {
      "level": 1,
      "currentExp": 0,
      "streakCount": 0,
      "title": "novice"
    },
    "lesson": {
      "id": "num-day-01",
      "dayIndex": 1,
      "academy": "numerology",
      "title": "Khai Mở Số Đường Đời (Life Path)",
      "conceptName": "Số Đường Đời (Life Path)",
      "formulaRule": "Cộng rút gọn toàn bộ ngày, tháng, năm sinh dương lịch. Giữ lại số Master 11, 22, 33.",
      "contentMarkdown": "Số Đường Đời là la bàn định hướng quan trọng nhất trong Thần số học...",
      "quickQuiz": {
        "question": "Nếu sinh ngày 14/08/1995, con số đường đời rút gọn là bao nhiêu?",
        "options": ["7", "1", "10", "4"],
        "correctIndex": 1,
        "explanation": "14 -> 5; 08 -> 8; 1995 -> 24 -> 6. Tổng: 5+8+6 = 19 -> 1+9 = 10 -> 1."
      }
    },
    "quest": {
      "questId": "quest-20261009-001",
      "client": {
        "fullName": "Nguyễn Văn An",
        "gender": "male",
        "birthDate": "1995-08-14",
        "occupation": "Lập trình viên",
        "situationStory": "Tôi cảm thấy công việc hiện tại quá gò bó và muốn tự mình tạo nên một sản phẩm mới...",
        "clientQuestion": "Xin bậc thầy cho biết con số đường đời của tôi là bao nhiêu và sứ mệnh tôi nên theo đuổi?"
      },
      "requirements": {
        "requiresCalculation": true,
        "requiresAdviceText": true
      }
    }
  }
}
```

---

### 2.2. `POST /api/mastery/evaluate-consultation`
Gửi bài giải của người chơi để hệ thống chấm điểm và lưu tiến trình.

- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
```json
{
  "questId": "quest-20261009-001",
  "userCalculatedValue": "1",
  "userAdviceText": "Đường đời của bạn là số 1, con số của người tiên phong và lãnh đạo độc lập. Việc bạn muốn bứt phá tự xây dựng sản phẩm riêng là hoàn toàn phù hợp với năng lượng nội tại, hãy tự tin khởi đầu từng bước vững chắc.",
  "timeSpentSeconds": 145
}
```

- **Response:**
```json
{
  "status": "success",
  "data": {
    "overallScore": 95,
    "grade": "S",
    "scoreBreakdown": {
      "mathAccuracyScore": 40,
      "logicInsightScore": 28,
      "empathyHealingScore": 27
    },
    "aiFeedback": {
      "compliment": "Tuyệt vời! Bạn tính toán chính xác tuyệt đối số Đường Đời 1 và nắm bắt hoàn hảo bản chất tiên phong của vị khách này.",
      "correctionOrTip": "Có thể nhắc thêm vị khách này chú ý lắng nghe đồng đội để tránh cái tôi quá lớn của số 1.",
      "clientReaction": "Khách hàng Nguyễn Văn An mỉm cười rạng rỡ, ánh mắt bừng sáng như tìm lại được niềm tin đã mất."
    },
    "expGained": 150,
    "reputationGained": 20,
    "newStreak": 1,
    "levelUpInfo": {
      "isLevelUp": false,
      "newLevel": 1
    }
  }
}
```

---

## 3. PROMPT CHUẨN HÓA DÀNH CHO AI GIÁM KHẢO (ORACLE SCORING PROMPT)

Đây là System Prompt được sử dụng trong backend service (`agentDecisionEngine` hoặc endpoint `/api/mastery/evaluate`) để LLM trả về cấu trúc JSON chuẩn mực:

```markdown
Bạn là "Hội Đồng Trọng Tài Vũ Trụ" (The Cosmic Council) trong ứng dụng huyền học Numelyra.
Nhiệm vụ của bạn là đánh giá lời giải đoán của một học viên đóng vai "Bậc thầy tâm linh" khi tiếp đón một vị khách NPC.

### THÔNG TIN ĐẦU VÀO:
- Hồ sơ khách hàng (NPC):
  + Tên: {{CLIENT_NAME}}, Giới tính: {{CLIENT_GENDER}}, Ngày sinh: {{CLIENT_BIRTH_DATE}}
  + Hoàn cảnh: {{CLIENT_STORY}}
  + Câu hỏi: {{CLIENT_QUESTION}}
- Ground Truth (Đáp án chuẩn thuật toán đã tính trước):
  + Chỉ số/Lá bài kỳ vọng: {{EXPECTED_VALUE}}
  + Từ khóa cốt lõi: {{CORE_KEYWORDS}}
- Bài làm của học viên:
  + Giá trị học viên tính/chọn: {{USER_CALCULATED_VALUE}}
  + Lời khuyên học viên gửi khách: {{USER_ADVICE_TEXT}}

### RUBRIC CHẤM ĐIỂM (TỔNG 100 ĐIỂM):
1. mathAccuracyScore (Tối đa 40 điểm):
   - So khớp giữa USER_CALCULATED_VALUE và EXPECTED_VALUE.
   - Nếu đúng: 40 điểm. Nếu gần đúng/lệch nhỏ: 20 điểm. Nếu sai: 0 điểm.
2. logicInsightScore (Tối đa 30 điểm):
   - Học viên có giải thích đúng ý nghĩa và các từ khóa cốt lõi của con số/lá bài cho khách không?
   - Lập luận có logic, mạch lạc, giải quyết đúng băn khoăn của khách không?
3. empathyHealingScore (Tối đa 30 điểm):
   - Văn phong có chân thành, thấu cảm, văn minh và mang tính chữa lành không?
   - Tuyệt đối nghiêm cấm và TRỪ NẶNG nếu học viên hù dọa, gieo rắc sợ hãi, mê tín dị đoan.

### YÊU CẦU ĐẦU RA (OUTPUT FORMAT):
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ không có markdown bọc ngoài, cấu trúc:
{
  "mathAccuracyScore": number,
  "logicInsightScore": number,
  "empathyHealingScore": number,
  "overallScore": number,
  "grade": "S" | "A" | "B" | "C",
  "compliment": "Lời khen cụ thể...",
  "correctionOrTip": "Góp ý nâng cao...",
  "clientReaction": "Mô tả sinh động phản ứng của khách..."
}
```
