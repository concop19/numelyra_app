/**
 * representativeService.ts - Service truy vấn bảng `representatives` (Nhân vật đại diện Thần số học)
 * được lưu chung trong database cadao.db của ứng dụng.
 */
import type * as SQLite from 'expo-sqlite';
import { openCaDaoDatabase } from './cadaoService';

export interface RepresentativeItem {
  id: number;
  life_path: number;
  expression: number;
  soul_urge: number;
  name_used: string;
  name_source: string;
  display_name: string;
  display_name_vi?: string | null;
  birth_date: string;
  death_date?: string | null;
  description?: string | null;
  wikidata_qid: string;
  wikidata_url: string;
  wikipedia_url?: string | null;
  source_name: string;
  source_lang: string;
  sitelinks: number;
  collected_at: string;
  image_url?: string | null;
  biography?: string | null;
  biography_vi?: string | null;
  biography_en?: string | null;
  matchType?: 'exact_3' | 'core_2' | 'lifepath_1';
}

/**
 * Chuẩn hóa số về chuẩn Pythagoras trong DB (số 10 rút gọn thành 1 nếu chưa rút gọn)
 */
function normalizeToDbNumber(num: number): number {
  if (num === 10) return 1;
  return num;
}

/**
 * Lấy tổng số nhân vật đại diện trong database
 */
export async function getRepresentativeCount(): Promise<number> {
  try {
    const db = await openCaDaoDatabase();
    const result = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM representatives'
    );
    return result?.total ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Tìm nhân vật đại diện theo bộ 3 số: Số Đường đời (Life Path), Số Sứ mệnh (Expression), Số Linh hồn (Soul Urge)
 * Ưu tiên:
 * 1. Khớp chính xác cả 3 số (exact_3)
 * 2. Khớp 2 số cốt lõi: Đường đời + Sứ mệnh (core_2)
 * 3. Khớp 1 số: Đường đời (lifepath_1)
 */
export async function getRepresentativeByTriple(
  lifePath: number,
  expression: number,
  soulUrge: number
): Promise<RepresentativeItem | null> {
  try {
    const db = await openCaDaoDatabase();
    const lp = normalizeToDbNumber(lifePath);
    const exp = normalizeToDbNumber(expression);
    const su = normalizeToDbNumber(soulUrge);

    // 1. Tìm khớp chính xác 3 chỉ số
    const exact = await db.getFirstAsync<RepresentativeItem>(
      `SELECT * FROM representatives 
       WHERE life_path = ? AND expression = ? AND soul_urge = ?
       LIMIT 1`,
      [lp, exp, su]
    );
    if (exact) {
      return { ...exact, matchType: 'exact_3' };
    }

    // 2. Dự phòng 1: Khớp Đường đời + Sứ mệnh
    const core2 = await db.getFirstAsync<RepresentativeItem>(
      `SELECT * FROM representatives 
       WHERE life_path = ? AND expression = ?
       ORDER BY sitelinks DESC
       LIMIT 1`,
      [lp, exp]
    );
    if (core2) {
      return { ...core2, matchType: 'core_2' };
    }

    // 3. Dự phòng 2: Khớp Đường đời
    const life1 = await db.getFirstAsync<RepresentativeItem>(
      `SELECT * FROM representatives 
       WHERE life_path = ?
       ORDER BY sitelinks DESC
       LIMIT 1`,
      [lp]
    );
    if (life1) {
      return { ...life1, matchType: 'lifepath_1' };
    }

    return null;
  } catch (error) {
    console.warn('Lỗi khi truy vấn nhân vật đại diện theo bộ 3 số:', error);
    return null;
  }
}

/**
 * Lấy danh sách các nhân vật tiêu biểu theo Số Đường đời (Life Path), sắp xếp theo độ nổi tiếng (sitelinks giảm dần)
 */
export async function getRepresentativesByLifePath(
  lifePath: number,
  limit = 5
): Promise<RepresentativeItem[]> {
  try {
    const db = await openCaDaoDatabase();
    const results = await db.getAllAsync<RepresentativeItem>(
      `SELECT * FROM representatives 
       WHERE life_path = ? 
       ORDER BY sitelinks DESC 
       LIMIT ?`,
      [lifePath, limit]
    );
    return results;
  } catch (error) {
    console.warn('Lỗi khi truy vấn nhân vật đại diện theo đường đời:', error);
    return [];
  }
}

/**
 * Tìm kiếm nhân vật theo tên (display_name hoặc display_name_vi)
 */
export async function searchRepresentativesByName(
  query: string,
  limit = 10
): Promise<RepresentativeItem[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  try {
    const db = await openCaDaoDatabase();
    const results = await db.getAllAsync<RepresentativeItem>(
      `SELECT * FROM representatives 
       WHERE display_name LIKE ? OR display_name_vi LIKE ? OR name_used LIKE ?
       ORDER BY sitelinks DESC 
       LIMIT ?`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, limit]
    );
    return results;
  } catch (error) {
    console.warn('Lỗi khi tìm kiếm nhân vật đại diện:', error);
    return [];
  }
}
