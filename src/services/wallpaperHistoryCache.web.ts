import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_CACHED_WALLPAPERS = 8;

const STORAGE_KEY = '@numelyra/wallpaper-history/v1';

export interface CachedWallpaperItem {
  id: string;
  imageUri: string;
  remoteUri?: string;
  title: string;
  affirmation_vi: string;
  affirmation_en?: string;
  explanation_vi: string;
  explanation_en?: string;
  luckyColors_vi: string[];
  luckyColors_en?: string[];
  styleName: string;
  styleNameEn?: string;
  intentionName: string;
  intentionNameEn?: string;
}

export async function loadWallpaperHistory(): Promise<CachedWallpaperItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedWallpaperItem[]).slice(0, MAX_CACHED_WALLPAPERS) : [];
  } catch (error) {
    console.warn('[LuckyWallpaper] Unable to read cached history:', error);
    return [];
  }
}

export async function cacheWallpaperHistory(items: CachedWallpaperItem[]): Promise<CachedWallpaperItem[]> {
  const limitedItems = items.slice(0, MAX_CACHED_WALLPAPERS).map((item) => ({
    ...item,
    imageUri: item.remoteUri || item.imageUri,
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limitedItems));
  return limitedItems;
}
