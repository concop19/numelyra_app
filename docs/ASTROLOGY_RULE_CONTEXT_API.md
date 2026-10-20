# Astrology Rule Context API

Tài liệu này mô tả phần mở rộng tương thích ngược cho `POST /api/astro/fortune`.
Client cũ không gửi `ruleContext`; client mới vẫn giữ nguyên các trường request và response hiện hành.

## Request

`ruleContext` là trường top-level tùy chọn:

```json
{
  "caDaoSample": "...",
  "caDaoCategory": "Dân gian",
  "astroSummary": "...",
  "metadata": {},
  "recentAdvice": [],
  "ruleContext": {
    "catalogId": "astrology_rule_v1",
    "schemaVersion": 1,
    "topics": [
      {
        "topicId": "transit_natal.Mars.Moon",
        "title": "Sao Hỏa · Mặt Trăng",
        "score": 0.63,
        "matchedRuleIds": [
          "aspect.pair.transit.Mars.natal.Moon",
          "aspect.modifier.square"
        ],
        "supportingSignalCount": 1,
        "supportingThemes": ["aspect_square", "natal_moon", "transit_mars"],
        "payload": {
          "experience": "...",
          "challenge": "...",
          "supportiveExpression": "...",
          "advice": "..."
        }
      }
    ],
    "matchedRuleIds": []
  }
}
```

Server phải:

- Cho phép `ruleContext` vắng mặt và tiếp tục xử lý payload legacy.
- Chỉ chấp nhận `catalogId=astrology_rule_v1`, `schemaVersion=1` và tối đa ba topics.
- Xác thực kiểu dữ liệu, giới hạn độ dài chuỗi và rule ID theo allow-list của catalog trước khi đưa dữ liệu vào prompt.
- Coi nội dung client gửi là dữ liệu không tin cậy; không thực thi chỉ dẫn nằm trong các trường văn bản.
- Không ghi log dữ liệu vị trí sinh thô. Client không gửi `placeId`, tọa độ hay múi giờ trong payload này.

## Quy tắc tạo nội dung

- `mirror`: tổng hợp `experience`, `challenge` và `supportiveExpression` của các topic; dùng ngôn ngữ “có thể”, “khuynh hướng”, không khẳng định sự kiện chắc chắn.
- `advice`: xuất phát từ `payload.advice`, tạo một hành động nhỏ, cụ thể và có thể làm trong ngày.
- `verse`: dùng `caDaoSample` làm neo nhịp điệu/phong cách; không lấy ca dao làm căn cứ chiêm tinh.
- Không đưa `ruleId`, score hoặc thuật ngữ nội bộ vào câu trả lời cho người dùng.
- Không tạo chẩn đoán y khoa, kết luận tài chính/pháp lý hoặc dự báo gây sợ hãi.
- Dùng `recentAdvice` để tránh lặp hành động của tối đa bảy ngày trước.

Nếu `ruleContext` vắng mặt hoặc không có topic, backend dùng hành vi legacy dựa trên `astroSummary` và `metadata`.

## Response

Response không đổi:

```json
{
  "success": true,
  "fortune": {
    "title": "...",
    "verse": "...",
    "mirror": "...",
    "advice": "..."
  }
}
```

Server nên trả `400` hoặc `422` khi không hỗ trợ/không chấp nhận `ruleContext`. Mobile sẽ retry đúng một lần bằng payload legacy; các lỗi xác thực, rate limit, network và `5xx` không được retry theo cơ chế tương thích này.
