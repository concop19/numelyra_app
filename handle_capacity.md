Đã tìm ra 115MB “thất lạc”: APK của bạn có  **3 phần nặng** , và hai phần trong đó (`lib`, `dex`) không liên quan đến thư mục `assets`.

| Phần                 | Dung lượng          | Nguyên nhân                                                         | Có thể giảm còn                   |
| --------------------- | --------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| `res`               | 168.5MB               | Ảnh PNG/JPG/WebP chưa nén, kèm`c2.db`12.9MB                     | khoảng 40-50MB                       |
| `lib`               | 125.9MB               | Đủ 4 kiến trúc CPU: arm64 33MB, armv7 23MB, x86 35MB, x86_64 35MB | 33MB (hoặc 56MB nếu giữ cả armv7) |
| `classes*.dex`      | khoảng 34MB (4 file) | Code chưa được minify                                             | khoảng 15-20MB                       |
| `assets`(JS bundle) | 5.6MB                 | Bình thường                                                        | giữ nguyên                          |

APK 325MB gần bằng tổng các thư mục này vì ảnh và `.so` hầu như không nén thêm được.

**Bước 1: bỏ x86 và x86_64 (làm ngay, giảm khoảng 70-93MB)**

Hai kiến trúc x86 chỉ dành cho máy ảo và máy Intel rất cũ. Điện thoại thật dùng `arm64-v8a`, và `armeabi-v7a` chỉ cần cho máy đời cũ (trước khoảng 2017).

powershell

```powershell
npx expo install expo-build-properties
```

Trong `app.json`, thêm vào `plugins`:

json

```json
["expo-build-properties", {
  "android": {
    "buildArchs": ["arm64-v8a", "armeabi-v7a"],
    "enableProguardInReleaseBuilds": true,
    "enableShrinkResourcesInReleaseBuilds": true
  }
}]
```

Nếu muốn nhỏ nhất và chấp nhận bỏ máy cũ, chỉ để `["arm64-v8a"]`. Bước này cũng bật minify code nên `dex` sẽ nhỏ đi.

**Bước 2: nén ảnh (giảm khoảng 100-120MB)**

Đây là phần lớn nhất. Lọc PNG nhỏ và lớn, rồi nén WebP trên bản sao như mình đã gửi:

powershell

```powershell
Copy-Item assets assets_webp -Recurse
Get-ChildItem assets_webp -Recurse -Filter *.png | ForEach-Object {
  $out = [System.IO.Path]::ChangeExtension($_.FullName, ".webp")
  cwebp -q 80 -resize 1080 0 $_.FullName -o $out
  if (Test-Path $out) { Remove-Item $_.FullName }
}
```

Thứ tự ưu tiên là 138 PNG (142.8MB), rồi 26 WebP đang nặng 1.2MB/file (nén lại `-q 75`). Nhớ sửa `require('...png')` thành `.webp`.

**Bước 3: kiểm tra `react-native-skia` (tùy chọn, giảm khoảng 11MB mỗi kiến trúc)**

`librnskia.so` là file lớn nhất trong `lib`. Nếu bạn chỉ dùng Skia cho một hiệu ứng nhỏ (glow, blur, gradient), có thể thay bằng `expo-linear-gradient` và View mờ, rồi gỡ thư viện. Nếu Skia là cốt lõi của giao diện thì giữ lại.

**Bước 4: cơ sở dữ liệu `c2.db` (12.9MB)**

Chạy `VACUUM` trong SQLite, bỏ cột và bảng thừa. Hoặc tải về lần đầu mở app nếu muốn app gốc nhẹ hơn.

**Bước 5: dùng AAB cho Google Play**

Sau khi làm các bước trên, build `app-bundle` để Play tự cấp đúng kiến trúc cho từng máy:

json

```json
"production": { "android": { "buildType": "app-bundle" } }
```

**Kết quả dự kiến:** Bước 1 và 2 đưa APK từ 325MB xuống khoảng 90-110MB. Thêm Bước 3, 4 và chỉ giữ arm64 thì còn khoảng 60-80MB. Bản tải về từ Play (AAB) thường còn khoảng 50-70MB.

Bạn gửi mình nội dung `eas.json` và phần `plugins` trong `app.json`, mình sẽ viết lại đúng file cho bạn.
