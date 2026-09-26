import type { ImageSourcePropType } from 'react-native';

export interface WallpaperSaveTarget {
  source: ImageSourcePropType | { uri: string };
  isUri: boolean;
}

function getImageExtension(uri: string): string {
  try {
    const extension = new URL(uri).pathname.match(/\.(jpe?g|png|webp|heic)$/i)?.[1];
    return extension === 'jpeg' ? 'jpg' : extension || 'jpg';
  } catch {
    return 'jpg';
  }
}

/**
 * Lưu hình nền vào thư viện ảnh thiết bị (iOS / Android)
 * Sử dụng lazy-load expo-media-library/legacy & expo-file-system/legacy
 * Tương thích 100% với Expo Go và ngăn chặn hoàn toàn lỗi crash runtime khi khởi động ứng dụng.
 */
export async function saveWallpaper(item: WallpaperSaveTarget): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Lazy-load MediaLibrary legacy (tương thích Expo Go, không gọi ExpoMediaLibraryNext)
    let MediaLibrary: any = null;
    try {
      MediaLibrary = await import('expo-media-library/legacy');
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        MediaLibrary = require('expo-media-library/legacy');
      } catch {
        MediaLibrary = null;
      }
    }

    if (!MediaLibrary || typeof MediaLibrary.createAssetAsync !== 'function') {
      return {
        success: false,
        message: 'Môi trường hiện tại chưa hỗ trợ lưu tự động. Bạn hãy chụp màn hình để làm hình nền nhé!',
      };
    }

    // 2. Yêu cầu quyền truy cập thư viện ảnh
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission || !permission.granted) {
      return { success: false, message: 'Cần cấp quyền thư viện ảnh để lưu hình nền.' };
    }

    // 3. Tải file về thư mục cache cục bộ
    let localUri: string;
    if (item.isUri && typeof item.source === 'object' && 'uri' in item.source && typeof item.source.uri === 'string') {
      const filename = `numelyra-wallpaper-${Date.now()}.${getImageExtension(item.source.uri)}`;
      
      let FileSystem: any = null;
      try {
        FileSystem = await import('expo-file-system/legacy');
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        FileSystem = require('expo-file-system/legacy');
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloaded = await FileSystem.downloadAsync(item.source.uri, fileUri);
      localUri = downloaded.uri;
    } else {
      const { Asset: ExpoAsset } = await import('expo-asset');
      const asset = ExpoAsset.fromModule(item.source as number);
      await asset.downloadAsync();
      if (!asset.localUri) {
        return { success: false, message: 'Không thể chuẩn bị ảnh mẫu để lưu.' };
      }
      localUri = asset.localUri;
    }

    // 4. Lưu vào thư viện ảnh thiết bị
    await MediaLibrary.createAssetAsync(localUri);
    return { success: true, message: '✨ Đã lưu hình nền may mắn vào bộ sưu tập!' };
  } catch (error) {
    console.error('[LuckyWallpaper] Native save error:', error);
    if (error instanceof Error && /download|network|unabletodownload/i.test(error.message)) {
      return { success: false, message: 'Không thể tải ảnh. Hãy kiểm tra kết nối mạng rồi thử lại.' };
    }
    return { success: false, message: 'Không thể lưu hình nền vào thư viện ảnh. Vui lòng thử lại.' };
  }
}
