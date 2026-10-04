/**
 * userProfile.ts - Lưu/đọc profile người dùng từ AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const PROFILE_KEY = '@tieu_linh_mieu_profile';

export interface UserProfile {
  fullName: string;
  birthDate: string; // ISO string (dương lịch), vd: '1998-10-20'
  gender: 'male' | 'female';
  birthTime?: string; // vd: '14:30' (tùy chọn)
  birthPlace?: string; // vd: 'Hà Nội' (tùy chọn)
}

export interface ProfileItem {
  id: string;
  fullName: string;
  birthDate: string; // ISO string (dương lịch), vd: '1998-10-20'
  gender?: 'male' | 'female';
  isDefault?: boolean;
  birthTime?: string; // vd: '14:30' (tùy chọn)
  birthPlace?: string; // vd: 'Hà Nội' (tùy chọn)
}

const PROFILES_LIST_KEY = '@numelyra_profiles_list';
const ACTIVE_PROFILE_ID_KEY = '@numelyra_active_profile_id';

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export async function hasProfile(): Promise<boolean> {
  const profile = await loadProfile();
  return profile !== null && !!profile.fullName && !!profile.birthDate;
}

/**
 * Lấy toàn bộ danh sách hồ sơ (tự động di chuyển profile cũ sang danh sách nếu có)
 */
export async function loadAllProfiles(): Promise<ProfileItem[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_LIST_KEY);
    if (raw) {
      const list = JSON.parse(raw) as ProfileItem[];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
    // Nếu chưa có danh sách, kiểm tra profile mặc định cũ để khởi tạo
    const legacy = await loadProfile();
    if (legacy && legacy.fullName) {
      const initial: ProfileItem = {
        id: 'default-profile',
        fullName: legacy.fullName,
        birthDate: legacy.birthDate,
        gender: legacy.gender,
        isDefault: true
      };
      await saveAllProfiles([initial]);
      await setActiveProfileId(initial.id);
      return [initial];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveAllProfiles(profiles: ProfileItem[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
}

export async function addProfile(profileData: Omit<ProfileItem, 'id'>): Promise<ProfileItem> {
  const all = await loadAllProfiles();
  let generatedId = `prof-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  // Nếu người dùng đã đăng nhập Supabase, tạo luôn trên Supabase cloud
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const { data: inserted, error } = await supabase
          .from('user_numerology_profiles')
          .insert({
            user_id: user.id,
            name: profileData.fullName,
            birth_date: profileData.birthDate,
          })
          .select('id')
          .single();
        if (!error && inserted?.id) {
          generatedId = inserted.id;
        }
      }
    } catch (err) {
      console.warn('[userProfile] Supabase addProfile fallback to local:', err);
    }
  }

  const newProfile: ProfileItem = {
    id: generatedId,
    ...profileData
  };
  const updated = [newProfile, ...all.filter(p => p.id !== generatedId)];
  await saveAllProfiles(updated);
  await setActiveProfileId(newProfile.id);

  // Đồng bộ sang legacy profile để tương thích các component cũ
  await saveProfile({
    fullName: newProfile.fullName,
    birthDate: newProfile.birthDate,
    gender: newProfile.gender || 'female'
  });

  return newProfile;
}

export async function deleteProfile(id: string): Promise<ProfileItem[]> {
  const all = await loadAllProfiles();
  const target = all.find(p => p.id === id);
  const updated = all.filter(p => p.id !== id);
  await saveAllProfiles(updated);

  // Nếu người dùng đã đăng nhập Supabase, xóa luôn trên Supabase cloud
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        if (id.length === 36 && id.includes('-')) {
          await supabase.from('user_numerology_profiles').delete().eq('id', id).eq('user_id', user.id);
        } else if (target) {
          await supabase.from('user_numerology_profiles').delete()
            .eq('user_id', user.id)
            .eq('name', target.fullName)
            .eq('birth_date', target.birthDate);
        }
      }
    } catch (err) {
      console.warn('[userProfile] Supabase deleteProfile failed:', err);
    }
  }

  const activeId = await getActiveProfileId();
  if (activeId === id && updated.length > 0) {
    await setActiveProfileId(updated[0].id);
    await saveProfile({
      fullName: updated[0].fullName,
      birthDate: updated[0].birthDate,
      gender: updated[0].gender || 'female'
    });
  }
  return updated;
}

export async function getActiveProfileId(): Promise<string | null> {
  return await AsyncStorage.getItem(ACTIVE_PROFILE_ID_KEY);
}

export async function setActiveProfileId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
  // Đồng bộ legacy profile
  const all = await loadAllProfiles();
  const found = all.find(p => p.id === id);
  if (found) {
    await saveProfile({
      fullName: found.fullName,
      birthDate: found.birthDate,
      gender: found.gender || 'female'
    });
  }
}

export async function getActiveProfile(): Promise<ProfileItem | null> {
  const all = await loadAllProfiles();
  if (all.length === 0) return null;
  const activeId = await getActiveProfileId();
  const found = all.find(p => p.id === activeId);
  return found || all[0];
}

/**
 * Tính tuổi con giáp từ năm sinh dương lịch
 * Lưu ý: Tuổi con giáp tính theo năm Âm lịch, nhưng vì sai lệch
 * chỉ ~1 tháng (Tết), ta dùng năm dương cho đơn giản.
 * Nếu sinh trước Tết Nguyên Đán → thuộc con giáp năm trước.
 */
const CON_GIAP = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ',
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'
] as const;

const CON_GIAP_EMOJI: Record<string, string> = {
  'Tý': '🐭', 'Sửu': '🐮', 'Dần': '🐯', 'Mão': '🐱',
  'Thìn': '🐉', 'Tỵ': '🐍', 'Ngọ': '🐴', 'Mùi': '🐐',
  'Thân': '🐵', 'Dậu': '🐔', 'Tuất': '🐶', 'Hợi': '🐷'
};

export function getZodiac(birthYear: number): string {
  // Năm 2020 = Tý (Canh Tý), offset = (year - 4) % 12
  const idx = ((birthYear - 4) % 12 + 12) % 12;
  return CON_GIAP[idx];
}

export function getZodiacEmoji(zodiac: string): string {
  return CON_GIAP_EMOJI[zodiac] || '🔮';
}

/**
 * Ngũ Hành theo Thiên Can năm sinh
 * Giáp/Ất → Mộc, Bính/Đinh → Hỏa, Mậu/Kỷ → Thổ,
 * Canh/Tân → Kim, Nhâm/Quý → Thủy
 */
const THIEN_CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const NGU_HANH_CAN: Record<string, string> = {
  'Giáp': 'Mộc', 'Ất': 'Mộc',
  'Bính': 'Hỏa', 'Đinh': 'Hỏa',
  'Mậu': 'Thổ', 'Kỷ': 'Thổ',
  'Canh': 'Kim', 'Tân': 'Kim',
  'Nhâm': 'Thủy', 'Quý': 'Thủy'
};

export function getThienCanYear(year: number): string {
  const idx = ((year - 4) % 10 + 10) % 10;
  return THIEN_CAN[idx];
}

export function getNguHanh(year: number): string {
  const can = getThienCanYear(year);
  return NGU_HANH_CAN[can] || '';
}

export function getNguHanhEmoji(nguHanh: string): string {
  const map: Record<string, string> = {
    'Kim': '🪙', 'Mộc': '🌿', 'Thủy': '💧', 'Hỏa': '🔥', 'Thổ': '🪨'
  };
  return map[nguHanh] || '✨';
}
