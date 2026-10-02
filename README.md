# NUMELYRA Mobile App

Ứng dụng di động dành cho trải nghiệm phong thủy, tử vi, thần số học, lịch âm dương, tarot và game giải trí theo phong cách cá nhân hóa.

Dự án được xây dựng bằng React Native + Expo SDK 57, tập trung vào trải nghiệm người dùng tối ưu trên iOS/Android và web.

## Tổng quan

NUMELYRA là một ứng dụng “trải nghiệm cuộc sống theo vận mệnh” với các thành phần chính:

- Chat / tư vấn cá nhân hóa theo profile người dùng
- Tính toán thần số học và chỉ số numerology
- Tarot / trải bài / diễn giải trực quan
- Lịch âm dương, can chi, ngày tốt, giờ hoàng đạo / hắc đạo
- Studio hình nền tùy chỉnh theo phong cách cá nhân
- Hệ thống tài khoản/guest mode
- Mini-game hub cho trải nghiệm giải trí và thử thách hằng ngày
- Thông báo nhắc nhở và tích hợp deep linking

## Stack công nghệ

- React Native
- Expo SDK 57
- React 19.2.3
- React Native 0.86.3
- TypeScript
- Supabase
- Async Storage
- React Navigation
- Expo modules: Notifications, Location, Media Library, Speech, SQLite, Haptics, Linking, Screen Orientation
- Jotai / Zustand
- Jest + jest-expo

## Cấu trúc dự án

```text
mobile_app/
├── android/                  # Project Android native
├── ios_native/               # Mã native / engine bổ sung cho iOS
├── assets/                   # Hình ảnh, icon, card, theme, sprite
├── src/
│   ├── components/          # UI reusable, modal, animation, card view
│   ├── config/              # cấu hình lịch, art, numerology cards
│   ├── db/                  # service tương tác dữ liệu local
│   ├── games/               # các mini game và logic game hub
│   ├── screens/             # màn hình chính: Chat, Calendar, Wallpaper, Login...
│   ├── services/            # numerology, tarot, lunar, notification, API, engine
│   ├── store/               # auth, user profile, state management
│   └── ...
├── App.tsx                   # Entry point của app
├── app.json                  # Cấu hình Expo app
├── package.json              # Dependencies + scripts
├── metro.config.js           # Metro config
├── tsconfig.json             # TypeScript config
├── index.ts                 # App bootstrap
├── eas.json                  # EAS build config
├── README.md                # Hướng dẫn dự án
├── AGENTS.md                 # Quy tắc/metadata cho AI agent
└── LICENSE                  # License
```

## Yêu cầu môi trường

Trước khi chạy dự án, cần:

- Node.js >= 22.13.x (theo Expo SDK 57)
- npm hoặc yarn
- Android Studio / emulator hoặc Xcode (nếu build native)
- Expo CLI (cài qua package local hoặc npx)

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

### 1) Khởi động Metro bundler

```bash
npm start
```

Hoặc:

```bash
npx expo start
```

### 2) Chạy trên Android

```bash
npm run android
```

### 3) Chạy trên iOS

```bash
npm run ios
```

### 4) Chạy trên web

```bash
npm run web
```

## Luồng xử lý chính

### 1) Khởi động ứng dụng

Khi app mở, component gốc trong [App.tsx](App.tsx) thực hiện các bước sau:

1. Khởi tạo `SafeAreaProvider` và `AuthProvider`.
2. Kiểm tra trạng thái xác thực người dùng thông qua `useAuth()`.
3. Gọi `hasProfile()` và `loadProfile()` để kiểm tra xem user đã có hồ sơ cá nhân chưa.
4. Nếu `isAuthReady` chưa sẵn sàng hoặc dữ liệu profile chưa load xong, hiển thị màn hình loading với mascot.
5. Dựa trên trạng thái `user`, `profile`, `continueAsGuest`, `loginRequested`, app sẽ điều hướng sang:
   - `LoginScreen` nếu chưa đăng nhập và chưa có profile
   - `OnboardingScreen` nếu user chưa tạo profile
   - `NavigationContainer` với tab app chính nếu đã có profile hợp lệ

### 2) Luồng đăng nhập / guest mode

Tại [src/screens/LoginScreen.tsx](src/screens/LoginScreen.tsx), người dùng có 3 lựa chọn:

- Đăng nhập bằng email / mật khẩu
- Đăng nhập bằng Google
- Tiếp tục với tư cách Khách

Các bước xử lý:

- `signIn`, `signUp`, `signInWithGoogle` được gọi từ `useAuth()`.
- Nếu đăng nhập thành công, callback `onAuthenticated()` sẽ được gọi.
- App sau đó re-check profile và điều hướng tới màn hình phù hợp.
- Nếu chưa có cấu hình Supabase, hệ thống vẫn cho phép tiếp tục dưới dạng khách.

### 3) Luồng onboarding

Tại [src/screens/OnboardingScreen.tsx](src/screens/OnboardingScreen.tsx), người dùng nhập:

- Họ tên
- Ngày sinh dương lịch
- Giới tính

Sau đó:

- Validate dữ liệu đầu vào: tên không rỗng, ngày sinh hợp lệ
- Tạo object `UserProfile`
- Gọi `saveProfile(profile)` lưu vào storage/local state
- Gọi `onComplete()` để quay lại app chính và kích hoạt flow tiếp theo

Thông tin này là dữ liệu nền để các engine khác như numerology, calendar, tarot, lunar có thể tính toán cá nhân hóa.

### 4) Luồng app chính

Sau khi profile hợp lệ, app hiển thị bottom tab navigation gồm:

- Chat
- Calendar
- WallpaperStudio
- Settings

Ngoài ra, app còn có màn hình `Games` được mở từ Game Hub.

Các navigation chính:

- `ChatScreen` nhận `profile` để cá nhân hóa phản hồi
- `CalendarScreen` dùng profile để hiển thị lịch cá nhân và các chỉ số âm dương
- `WallpaperStudioScreen` có thể render background theo sở thích / phong cách
- `SettingsScreen` cho phép người dùng yêu cầu login hoặc cập nhật cấu hình
- `GameHubScreen` quản lý trò chơi và tiến độ daily challenge

### 5) Luồng xử lý chat và numerology / tarot

Màn hình [src/screens/ChatScreen.tsx](src/screens/ChatScreen.tsx) là trung tâm xử lý tương tác người dùng. Flow phổ biến:

1. User nhập câu hỏi / prompt.
2. Hệ thống kiểm tra xem có cần rút tarot hay không dựa trên nội dung đầu vào.
3. Nếu cần, app gọi bộ dịch vụ tarot và numerology để tạo không gian đọc bài phù hợp.
4. Kết quả được hiển thị dưới dạng:
   - câu trả lời chat
   - thẻ tarot lật 3D
   - modal xem chi tiết bói / chỉ số
   - các tính toán dựa trên thông tin sinh nhật, tên, ngày/tháng/năm
5. App có thể lưu lịch sử trò chuyện và trạng thái pending reveal cho tarot.

Triết lý chính ở đây là: profile người dùng được dùng như “seed dữ liệu” cho các engine dự đoán và tư vấn.

### 6) Luồng lịch và âm dương

[src/services/lunarService.ts](src/services/lunarService.ts) và các cấu hình lịch trong [src/config/calendarArtConfig.ts](src/config/calendarArtConfig.ts) xử lý:

- chuyển đổi dương lịch sang âm lịch
- tính can chi, giờ hoàng đạo / hắc đạo
- gắn màu sắc, hình ảnh và biểu tượng theo ngày / mùa / yếu tố
- hiển thị ở `CalendarScreen` như một màn hình “lịch cá nhân” thay vì lịch đơn thuần

### 7) Luồng game hub

[src/screens/GameHubScreen.tsx](src/screens/GameHubScreen.tsx) và thư mục [src/games](src/games) quản lý:

- danh sách trò chơi
- tiến độ người dùng
- daily challenge
- route vào từng game cụ thể

Game hub là tầng giải trí bổ sung, giúp app không chỉ là hệ thống bói tính mà còn có trải nghiệm tương tác hằng ngày.

### 8) Luồng deep linking và thông báo

Trong [App.tsx](App.tsx), app thiết lập:

- `Linking` để bắt URL từ hệ thống
- `notifications.getLastNotificationResponseAsync()` để xử lý notification mở từ background
- `config: { screens: { Games: 'games/:entry?' } }` để route tới game hub qua deep link

Điều này cho phép mở app hoặc điều hướng trực tiếp tới một chức năng từ URL / notification.

### 9) Luồng dữ liệu tổng quát

Có thể tóm tắt dưới dạng:

```text
App start
  → Auth check
  → Profile check
  → Login / Guest / Onboarding
  → Main Navigation
      → Chat / Calendar / Wallpaper / Settings
      → Game Hub
  → Services generate personalized data
      → Numerology engine
      → Lunar calendar
      → Tarot callout
      → Notification / deep link
```

Như vậy, luồng xử lý chính của dự án là: xác thực và profile → onboarding → render app chính → tương tác người dùng → gọi các engine cá nhân hóa → trả kết quả UI theo từng màn hình.

## Scripts có sẵn

```bash
npm start
npm run android
npm run ios
npm run web
npm test
npm run typecheck
```

## Kiểm tra và build

### Test

```bash
npm test
```

### Type check

```bash
npm run typecheck
```

### Build native với EAS

```bash
npx eas build --platform android
npx eas build --platform ios
```

## Môi trường dữ liệu / cấu hình

- Dự án đang dùng Expo với `scheme: "numelyra"`
- `app.json` cấu hình ứng dụng, quyền truy cập thư viện ảnh, vị trí, thông báo, orientation
- Supabase và local storage được dùng để quản lý hồ sơ người dùng và dữ liệu tùy chỉnh

## Lưu ý quan trọng

- Dự án hiện đang dựa trên Expo SDK 57 theo tài liệu chính thức của Expo tương ứng.
- Khi làm việc với cấu hình hoặc dependency mới, nên kiểm tra đúng phiên bản Expo đang dùng để tránh xung đột React Native / Native module.
- Một số tính năng nhạy cảm với quyền truy cập thiết bị (location, media library, notification) cần được kiểm tra trên emulator/device thực tế.

## Tài liệu tham khảo

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- React Native: https://reactnative.dev/
- Expo docs: https://docs.expo.dev/
- Supabase: https://supabase.com/docs

## Giấy phép

Dự án này được phân phối theo giấy phép trong file LICENSE.

---

Nếu bạn muốn, tôi có thể tiếp tục viết thêm:

1. README phiên bản ngắn gọn dành cho GitHub
2. README phiên bản chi tiết cho team/dev
3. Mẫu hướng dẫn setup cho Android/iOS riêng biệt
4. File CHANGELOG.md và CONTRIBUTING.md theo chuẩn dự án
