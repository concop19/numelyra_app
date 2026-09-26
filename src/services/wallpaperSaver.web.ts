import type { ImageSourcePropType } from 'react-native';

export interface WallpaperSaveTarget {
  source: ImageSourcePropType | { uri: string };
  isUri: boolean;
}

/**
 * Tải và lưu hình nền trong môi trường Web (trình duyệt)
 */
export async function saveWallpaper(item: WallpaperSaveTarget): Promise<{ success: boolean; message: string }> {
  try {
    if (item.isUri && typeof item.source === 'object' && 'uri' in item.source && typeof item.source.uri === 'string') {
      const url = item.source.uri;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `numelyra-wallpaper-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return { success: true, message: '✨ Đã tải hình nền may mắn về máy!' };
      } catch {
        // Fallback khi gặp CORS: mở trực tiếp ảnh trong tab mới để người dùng lưu
        window.open(url, '_blank');
        return { success: true, message: '✨ Đang mở ảnh trong tab mới để bạn lưu!' };
      }
    }

    return { success: false, message: 'Ảnh mẫu này đã được tích hợp sẵn trong ứng dụng.' };
  } catch (error) {
    console.error('[LuckyWallpaper] Web save error:', error);
    return { success: false, message: 'Không thể tải hình nền trên trình duyệt. Vui lòng thử lại.' };
  }
}
