# Kho luận giải song ngữ v5

Kho đóng gói có đúng **304 trạng thái × 2 ngôn ngữ**, thuộc 24 indicators. Không gọi dịch vụ dịch lúc chạy app.

Nguồn Việt được lưu đầy đủ trong `src/data/numerologyKnowledge.vi.json`; các chỉnh sửa biên tập nằm trong `numerologyKnowledge.vi.overrides.json`. Đợt v5 tách riêng bốn bài Master 33, lời khuyên số 0 và sửa tiêu đề bị chép sai ở nhóm Thách thức/Đỉnh cao. 16 key legacy nằm ngoài contract đã được loại khỏi database đóng gói.

Các bản Anh được tác giả/agent đối chiếu với toàn văn Việt trong `src/data/numerologyTranslations/*.en.json`, bao gồm FAQ và các danh sách thực hành lặp có chủ ý trong cùng bài. `reviewed_by` ghi rõ người/agent duyệt; trạng thái `approved` không có nghĩa là đã được người dùng hoặc một biên tập viên bên ngoài phê duyệt. Không tự đổi nháp thành approved bằng script.

## Khi sửa nội dung

1. Sửa bài Việt trong overrides, rồi đọc lại bài Anh tương ứng.
2. Chuyển ngữ đầy đủ, giữ nguyên số section, heading, mục danh sách và câu hỏi FAQ. Kiểm tra ý nghĩa, con số, vai trò indicator và thuật ngữ trong glossary.
3. Sau khi đối chiếu và biên tập, ghi `review_status: approved`, `reviewed_by` và `source_revision`. Revision là 16 ký tự đầu của SHA-256 trên `title + "\n" + content` của bản Việt cuối cùng. Thay đổi nguồn Việt làm bản Anh cũ mất hiệu lực.
4. Cập nhật đồng bộ `assets/cadao.db` và `src/data/numerologyKnowledgeManifest.json` bằng quy trình tạo dữ liệu bên ngoài dự án.
5. Chạy `npm run verify:release` trước khi phát hành. Lệnh này chỉ cần Node.js và không còn chạy công cụ Python trong EAS Build.

Các công cụ tạo và audit database bằng Python đã được loại khỏi dự án. Vì vậy mọi thay đổi nội dung phải đi kèm một bộ `cadao.db` và manifest đã được tạo, kiểm tra ở bên ngoài trước khi đưa vào repository. Database v5 tự thay bản local v4 lúc app mở lại; không thay profile hoặc lịch sử chat.

## Quality gate

- Đủ đúng key/value, không thừa/thiếu/trùng; tất cả bài đã duyệt và revision khớp nguồn.
- Bản Anh không có ký tự Việt chưa dịch hoặc Unicode hỏng; cấu trúc Markdown/FAQ không bị cắt.
- Không chấp nhận article hoặc nguyên section giống nhau giữa các indicator. FAQ và bài thực hành nhắc lại trong cùng article được giữ theo nguồn.
- Độ tương đồng là Jaccard của các nhóm 5 từ sau khi chuẩn hóa chữ thường và dấu câu; các cặp trên 85% cần review có lý do, người duyệt và hai revision trong `numerologyKnowledge.similarityReviews.json`. Sửa nội dung làm review cũ mất hiệu lực.
- Trước khi thay asset, kiểm tra nội dung thực tế trong SQLite khớp với catalog và manifest runtime bằng quy trình tạo dữ liệu bên ngoài.

## Locale và fallback

Onboarding bắt đầu bằng màn chọn Tiếng Việt / English riêng, dùng chung preference với Settings; tùy chọn Auto vẫn có trong Settings. Lựa chọn được lưu ngay, toàn bộ các bước onboarding sau đổi theo ngôn ngữ đã chọn và việc đổi locale không reset bước hoặc bản nháp. Nội dung chat cũ giữ ngôn ngữ lúc tạo.

Sau khi đổi `supportedLocales` trong app config, chạy `npx expo prebuild --platform android --no-install` cho checkout có native folder sẵn và tạo binary mới. Cấu hình hệ điều hành không thể cập nhật chỉ bằng JavaScript/OTA.

Luận giải trả `source` là `local-sqlite`, `computed-overview` hoặc `fallback`. Khi không thể đọc bài đầy đủ, `fallbackReason` phân biệt `db-error`, `missing-row`, `unsupported-value`; UI hiển thị thông báo phù hợp, log chỉ ghi locale/indicator/value/reason. Không thay bằng bài archetype chung.

Checklist thiết bị trước release: clean install với locale Việt/Anh/khác; đổi ngôn ngữ và mở lại app; mở nhóm core, composite, cả ba charts; tắt mạng; kiểm tra chat, TTS, notification; nâng cấp từ bản có database v4 và xác nhận profile/lịch sử không mất.
