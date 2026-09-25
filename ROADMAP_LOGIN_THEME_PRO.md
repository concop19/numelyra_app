# Đặc tả & Lộ trình Triển khai: Login Supabase, Theme System & Mua gói Pro

Tài liệu này lưu trữ toàn bộ phương án kỹ thuật, thiết kế giao diện từ asset và logic hệ thống đã được thống nhất, sẵn sàng để thực thi khi bước vào giai đoạn phát triển.

---

## 1. Màn hình Đăng nhập (Login with Supabase)

### 1.1. Asset & Thiết kế tham chiếu
- **Thư mục chứa asset**: `mobile_app/assets/giao_dien/`
  - `Magical NUMELYRA Login Portal.png`: Thiết kế tổng thể giao diện đăng nhập phong cách huyền bí, ấm áp của NUMELYRA.
  - `Whimsical Flame Mascot Reading a Grimoire.png`: Hình ảnh linh thú Ngọn Lửa ma thuật ngồi đọc sách cổ (Grimoire) với các trang sách phát sáng và chồng sách thần số học.
- **Phong cách visual**:
  - Tông màu: Nền sáng kem ấm pha ánh lửa / hoàng hôn ma thuật (`#FFF9F5` / `#FFEADF`), gradient lửa cam-đỏ (`#FF5722` → `#FF7A00`).
  - Typography: Tiêu đề "Welcome to **NUMELYRA**" với ngôi sao lấp lánh ✦ và thông điệp "Unlock your magic ♡".

### 1.2. Luồng hoạt động (Auth Flow)
- **Phương thức hỗ trợ**: Đăng ký / Đăng nhập qua Email & Mật khẩu chuẩn Supabase (`@supabase/supabase-js`).
- **Lưu trữ session**: `@react-native-async-storage/async-storage` tự động duy trì đăng nhập qua các lần mở app.
- **Đồng bộ Profile**: Khi đăng nhập, tự động liên kết dữ liệu hồ sơ cá nhân (Họ tên, ngày sinh, bát tự) với bảng `profiles` trên Supabase.
- **Chế độ Guest**: Cho phép người dùng trải nghiệm cục bộ trước và đăng nhập khi vào mục Cài đặt hoặc khi nâng cấp Pro.

---

## 2. Hệ thống Tùy biến Màu sắc Giao diện (Theme System)

### 2.1. Kiến trúc Theme Engine
- Tạo `ThemeContext` và hook `useTheme()` cung cấp bộ mã màu token động:
  - `bgPrimary`, `bgSecondary`, `cardBg`
  - `textPrimary`, `textSecondary`, `textMuted`
  - `accentPrimary` (màu chính), `accentSecondary`
  - `borderColor`, `tabBarBg`, `tabBarActive`
- **Lưu trữ cấu hình**: Lưu `themeId` và màu tùy chọn vào `AsyncStorage` (`@app_theme_id`).

### 2.2. Bộ Theme mẫu & Khả năng cắm-rút
- Thiết lập sẵn cấu trúc theme để khi bạn cung cấp giao diện/bảng màu chi tiết, hệ thống có thể tích hợp tức thì mà không cần sửa đổi logic bên trong các màn hình (ChatScreen, CalendarScreen, TabBar).

---

## 3. Mua gói Pro (Dựa trên Logic Code Gốc Web)

### 3.1. Kế thừa từ Web App
- **Gói cước**:
  - **VietQR / PayOS**: 79.000 VNĐ / 30 ngày (Quét mã mọi ứng dụng ngân hàng Việt Nam).
  - **PayPal**: $3.99 USD / tháng (Tự động gia hạn thẻ quốc tế).
- **Backend Endpoints**:
  - `POST /api/billing/payos/checkout` → trả về `checkoutUrl`.
  - `POST /api/billing/paypal/checkout` → trả về `approvalUrl`.
  - Bảng Supabase: `subscriptions` lưu `plan = 'pro'`, `status = 'active'`, `current_period_end`.

### 3.2. Trải nghiệm trên Mobile App
- Gọi API checkout và mở trang thanh toán qua `expo-web-browser` hoặc `Linking.openURL`.
- Tự động kích hoạt kiểm tra trạng thái quyền lợi Pro khi người dùng quay trở lại app.
- Mở khóa toàn bộ đặc quyền: Huy hiệu Pro, tăng hạn mức lượt luận giải AI, xem trải bài Tarot chuyên sâu.

---

## 4. Cấu trúc Điều hướng (Navigation)
- Thêm Tab thứ 3 vào Bottom Tab Navigator: `Cài đặt` (Settings / ⚙️).
- Nút ⚙️ trên header của `ChatScreen` điều hướng trực tiếp sang Tab Cài đặt.
- Màn hình Cài đặt bao gồm 3 khối:
  1. Trạng thái Tài khoản & Đăng nhập Supabase.
  2. Trạng thái Gói Pro & Nút nâng cấp.
  3. Khu vực chọn bảng màu / giao diện.

---

## 5. Danh sách file dự kiến
| STT | Đường dẫn file | Mục đích |
|---|---|---|
| 1 | `mobile_app/src/config/env.ts` | Khai báo URL Supabase, Anon Key, Web API URL |
| 2 | `mobile_app/src/services/supabaseClient.ts` | Khởi tạo Supabase client cho React Native |
| 3 | `mobile_app/src/services/billingService.ts` | Service checkout PayOS/PayPal và kiểm tra gói Pro |
| 4 | `mobile_app/src/theme/colors.ts` | Định nghĩa tokens và các bộ preset màu sắc |
| 5 | `mobile_app/src/theme/ThemeContext.tsx` | Quản lý state màu sắc và lưu trữ bộ nhớ |
| 6 | `mobile_app/src/store/authContext.tsx` | Quản lý đăng ký, đăng nhập, đăng xuất Supabase |
| 7 | `mobile_app/src/store/billingContext.tsx` | Quản lý trạng thái Pro và kích hoạt thanh toán |
| 8 | `mobile_app/src/screens/LoginScreen.tsx` | Giao diện đăng nhập theo đúng asset đã cung cấp |
| 9 | `mobile_app/src/screens/SettingsScreen.tsx` | Màn hình Cài đặt tích hợp 3 tính năng |
| 10 | `mobile_app/App.tsx` | Cập nhật bọc Providers và Tab Bar |
