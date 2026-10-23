import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

export const MAX_CACHED_WALLPAPERS = 8;

const STORAGE_KEY = '@numelyra/wallpaper-history/v1';
const CACHE_DIRECTORY_NAME = 'lucky-wallpapers';

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

interface StoredWallpaperItem extends Omit<CachedWallpaperItem, 'imageUri'> {
  localUri?: string;
}

const cacheDirectory = new Directory(Paths.cache, CACHE_DIRECTORY_NAME);
let writeQueue: Promise<CachedWallpaperItem[]> = Promise.resolve([]);

function imageExtension(uri: string): string {
  try {
    const extension = new URL(uri).pathname.match(/\.(jpe?g|png|webp|heic|avif)$/i)?.[1];
    return extension?.toLowerCase() === 'jpeg' ? 'jpg' : extension?.toLowerCase() || 'jpg';
  } catch {
    return 'jpg';
  }
}

function safeFileName(item: CachedWallpaperItem, index: number): string {
  const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  const sourceUri = item.remoteUri || item.imageUri;
  return `${String(index).padStart(2, '0')}-${safeId}.${imageExtension(sourceUri)}`;
}

function resolveStoredItem(item: StoredWallpaperItem): CachedWallpaperItem | null {
  if (item.localUri) {
    try {
      const localFile = new File(item.localUri);
      if (localFile.exists) {
        return { ...item, imageUri: item.localUri };
      }
    } catch {
      // The OS may clear Paths.cache when storage is low; fall back to the remote URL.
    }
  }

  if (item.remoteUri) {
    return { ...item, imageUri: item.remoteUri };
  }

  return null;
}

async function readStoredItems(): Promise<StoredWallpaperItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredWallpaperItem[]).slice(0, MAX_CACHED_WALLPAPERS) : [];
  } catch (error) {
    console.warn('[LuckyWallpaper] Unable to read cached history:', error);
    return [];
  }
}

export async function loadWallpaperHistory(): Promise<CachedWallpaperItem[]> {
  const storedItems = await readStoredItems();
  return storedItems
    .map(resolveStoredItem)
    .filter((item): item is CachedWallpaperItem => item !== null)
    .slice(0, MAX_CACHED_WALLPAPERS);
}

async function writeWallpaperHistory(items: CachedWallpaperItem[]): Promise<CachedWallpaperItem[]> {
  cacheDirectory.create({ intermediates: true, idempotent: true });

  const limitedItems = items.slice(0, MAX_CACHED_WALLPAPERS);
  const storedItems = await Promise.all(
    limitedItems.map(async (item, index): Promise<StoredWallpaperItem> => {
      const remoteUri = item.remoteUri || (/^https?:\/\//i.test(item.imageUri) ? item.imageUri : undefined);
      let localUri = item.imageUri.startsWith('file://') ? item.imageUri : undefined;

      if (!localUri && remoteUri) {
        const target = new File(cacheDirectory, safeFileName(item, index));
        try {
          const downloaded = await File.downloadFileAsync(remoteUri, target, { idempotent: true });
          localUri = downloaded.uri;
        } catch (error) {
          if (target.exists) {
            try {
              target.delete();
            } catch {
              // Ignore cleanup failures; the next cache write will retry.
            }
          }
          console.warn('[LuckyWallpaper] Unable to cache image:', remoteUri, error);
        }
      }

      const { imageUri: _imageUri, ...metadata } = item;
      return { ...metadata, remoteUri, localUri };
    })
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedItems));

  const retainedUris = new Set(storedItems.map((item) => item.localUri).filter(Boolean));
  for (const entry of cacheDirectory.list()) {
    if (entry instanceof File && !retainedUris.has(entry.uri)) {
      try {
        entry.delete();
      } catch {
        // A stale cache file is harmless and can be retried on the next write.
      }
    }
  }

  return storedItems
    .map(resolveStoredItem)
    .filter((item): item is CachedWallpaperItem => item !== null);
}

export function cacheWallpaperHistory(items: CachedWallpaperItem[]): Promise<CachedWallpaperItem[]> {
  writeQueue = writeQueue
    .catch(() => [])
    .then(() => writeWallpaperHistory(items));
  return writeQueue;
}
