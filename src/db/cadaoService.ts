/**
 * cadaoService.ts - Service truy vấn SQLite database ca dao tục ngữ cho Expo / React Native
 * 
 * Expo SDK 57+: expo-sqlite quản lý path tự động.
 * Database được chép từ bundle vào vùng SQLite ở lần chạy đầu tiên.
 */
import * as SQLite from 'expo-sqlite';

export interface CaDaoItem {
  id: number;
  title: string;
  content: string;
  category: string;
  url: string;
}

const DATABASE_NAME = 'cadao.db';
const BUNDLED_DATABASE_ASSET = require('../../assets/cadao.db');

let _db: SQLite.SQLiteDatabase | null = null;
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getStoredCaDaoCount(db: SQLite.SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM cadao');
  return result?.total ?? 0;
}

async function importBundledDatabase(forceOverwrite = false): Promise<void> {
  await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, {
    assetId: BUNDLED_DATABASE_ASSET,
    forceOverwrite,
  });
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  // With forceOverwrite=false this only installs the bundled DB if no local
  // copy exists, preserving the normal fast path on subsequent launches.
  await importBundledDatabase();
  let db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    const count = await getStoredCaDaoCount(db);
    if (count > 0) return db;
  } catch {
    // Older app versions created an empty cadao.db. Replace that invalid copy.
  }

  await db.closeAsync();
  await importBundledDatabase(true);
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  if (await getStoredCaDaoCount(db) === 0) {
    await db.closeAsync();
    throw new Error('Bundled ca dao database is empty.');
  }
  return db;
}

/**
 * Mở database ca dao. Đồng thời sửa các bản cài cũ từng có file SQLite rỗng.
 */
export async function openCaDaoDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (!_dbPromise) {
    _dbPromise = initializeDatabase()
      .then((db) => {
        _db = db;
        return db;
      })
      .catch((error) => {
        _dbPromise = null;
        throw error;
      });
  }
  return _dbPromise;
}

/**
 * Lấy tổng số bài ca dao trong DB
 */
export async function getCaDaoCount(): Promise<number> {
  try {
    const db = await openCaDaoDatabase();
    return await getStoredCaDaoCount(db);
  } catch {
    return 0;
  }
}

/**
 * Lấy 1 câu ca dao theo ngày — seed theo ngày để cùng ngày luôn ra cùng câu
 * Thuật toán: chọn theo vị trí đã sắp xếp, vì ID trong database không liên tục.
 */
export async function getDailyCaDao(date: Date): Promise<CaDaoItem | null> {
  try {
    const db = await openCaDaoDatabase();
    const total = await getCaDaoCount();
    if (total === 0) {
      // DB chưa có data → trả về câu ca dao mặc định
      return {
        id: 0,
        title: '',
        content: 'Tốt gỗ hơn tốt nước sơn',
        category: 'Ca dao dân gian',
        url: ''
      };
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Deterministic seed — cùng ngày ra cùng câu
    const seed = (day * 31 + month * 37 + year * 7);
    const targetOffset = seed % total;

    const result = await db.getFirstAsync<CaDaoItem>(
      'SELECT id, title, content, category, url FROM cadao ORDER BY id LIMIT 1 OFFSET ?',
      [targetOffset]
    );

    return result ?? {
      id: 0,
      title: '',
      content: 'Đi một ngày đàng, học một sàng khôn',
      category: 'Ca dao dân gian',
      url: ''
    };
  } catch {
    // Fallback nếu DB lỗi
    return {
      id: 0,
      title: '',
      content: 'Uống nước nhớ nguồn',
      category: 'Ca dao dân gian',
      url: ''
    };
  }
}

/**
 * Lấy 1 câu ca dao ngẫu nhiên (không seed)
 */
export async function getRandomCaDao(): Promise<CaDaoItem | null> {
  try {
    const db = await openCaDaoDatabase();
    const result = await db.getFirstAsync<CaDaoItem>(
      'SELECT id, title, content, category, url FROM cadao ORDER BY RANDOM() LIMIT 1'
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export const CADAO_CATEGORIES = [
  'Vũ trụ, con người và xã hội',
  'Tình yêu đôi lứa',
  'Tình cảm gia đình, bạn bè',
  'Quê hương đất nước',
  'Lịch sử',
  'Đấu tranh, phản kháng',
  'Trào phúng, phê phán đả kích',
  'Quan hệ thiên nhiên',
  'Lao động sản xuất',
  'Than thân trách phận',
  'Ru con'
];
