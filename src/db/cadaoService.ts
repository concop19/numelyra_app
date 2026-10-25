/**
 * cadaoService.ts - Service truy vấn SQLite database ca dao tục ngữ cho Expo / React Native
 * 
 * Expo SDK 57+: expo-sqlite quản lý path tự động.
 * Database được chép từ bundle vào vùng SQLite ở lần chạy đầu tiên.
 */
import * as SQLite from 'expo-sqlite';
import { isKnowledgeCatalogValid, NUMEROLOGY_DATABASE_VERSION, type KnowledgeCatalogRecord } from '../services/numerologyCatalogValidation';
import {
  buildContextualCaDaoSqlQuery,
  type CaDaoContextQuery,
} from './cadaoQuery';

export type { CaDaoContextQuery } from './cadaoQuery';

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

async function hasRepresentativesTable(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='representatives'"
    );
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function hasBiographiesVi(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM pragma_table_info('representatives') WHERE name='biography_vi'"
    );
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function hasNumerologyKnowledge(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const table = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='numerology_knowledge'"
    );
    if ((table?.count ?? 0) === 0) return false;
    const localeColumn = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM pragma_table_info('numerology_knowledge') WHERE name='locale'"
    );
    if ((localeColumn?.count ?? 0) === 0) return false;
    const rows = await db.getAllAsync<KnowledgeCatalogRecord>(
      'SELECT indicator_key, number_value, locale, title, content, review_status, source_revision, reviewed_by FROM numerology_knowledge'
    );
    return isKnowledgeCatalogValid(rows);
  } catch {
    return false;
  }
}

async function getDatabaseUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    return result?.user_version ?? 0;
  } catch {
    return 0;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Cài đặt bundle nếu chưa có bản local nào
  await importBundledDatabase();
  let db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    const count = await getStoredCaDaoCount(db);
    const hasReps = await hasRepresentativesTable(db);
    const hasVi = await hasBiographiesVi(db);
    const hasKnowledge = await hasNumerologyKnowledge(db);
    const version = await getDatabaseUserVersion(db);

    if (count > 0 && hasReps && hasVi && hasKnowledge && version === NUMEROLOGY_DATABASE_VERSION) return db;
  } catch {
    // Bản cài cũ có DB cũ hoặc thiếu bảng / thiếu cột biography_vi. Thay thế bản đó.
  }

  // Tự động ghi đè bản DB mới nhất từ bundle assets
  await db.closeAsync();
  await importBundledDatabase(true);
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  if ((await getStoredCaDaoCount(db)) === 0) {
    await db.closeAsync();
    throw new Error('Bundled ca dao database is empty.');
  }
  if (!(await hasNumerologyKnowledge(db)) || (await getDatabaseUserVersion(db)) !== NUMEROLOGY_DATABASE_VERSION) {
    await db.closeAsync();
    throw new Error('Bundled numerology knowledge database is incomplete.');
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
 * Chọn ca dao theo nhóm chủ đề và từ khóa chiêm tinh, nhưng vẫn ổn định trong
 * cùng một ngày/ngữ cảnh để cache và giao diện không thay đổi ngẫu nhiên.
 */
export async function getContextualDailyCaDao(
  date: Date,
  query: CaDaoContextQuery
): Promise<CaDaoItem | null> {
  const querySpec = buildContextualCaDaoSqlQuery(date, query);
  if (!querySpec) return null;

  try {
    const db = await openCaDaoDatabase();
    const result = await db.getFirstAsync<CaDaoItem>(
      querySpec.sql,
      querySpec.parameters
    );
    if (result) return result;

    if ((query.excludeIds?.length ?? 0) > 0 || (query.excludeContents?.length ?? 0) > 0) {
      const relaxedQuery = buildContextualCaDaoSqlQuery(date, {
        categories: query.categories,
        keywords: query.keywords,
        seed: query.seed,
      });
      if (relaxedQuery) {
        return await db.getFirstAsync<CaDaoItem>(relaxedQuery.sql, relaxedQuery.parameters);
      }
    }
    return null;
  } catch {
    return null;
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
