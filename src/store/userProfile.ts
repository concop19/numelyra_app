/**
 * userProfile.ts - Lưu/đọc profile người dùng từ AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { getNguHanh as getNapAmElement } from '../services/lunarService';

const PROFILE_KEY = '@tieu_linh_mieu_profile';

export type BirthTimeAccuracy = 'exact' | 'unknown';
export type ProfileGender = 'male' | 'female';

export function isProfileGender(value: unknown): value is ProfileGender {
  return value === 'male' || value === 'female';
}

export function isMissingGenderColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return text.includes('gender')
    && (text.includes('column') || text.includes('schema cache'));
}

export function isMissingPrimaryColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return text.includes('is_primary')
    && (text.includes('column') || text.includes('schema cache'));
}

export function isMissingProfileDetailColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return ['birth_time', 'birth_place', 'birth_location', 'birth_time_accuracy'].some((column) => (
    text.includes(column) && (text.includes('column') || text.includes('schema cache'))
  ));
}

/**
 * Dữ liệu đã phân giải từ tên nơi sinh. Chỉ được lưu cục bộ để dựng lá số;
 * request AI chỉ nhận các kết quả đã suy ra (ASC/MC/nhà), không nhận tọa độ thô.
 */
export interface ResolvedBirthLocation {
  placeId: string;
  userLabel: string;
  latitude: number;
  longitude: number;
  timeZoneIdentifier: string;
  resolvedAt: string;
}

export interface UserProfile {
  fullName: string;
  birthDate: string; // ISO string (dương lịch), vd: '1998-10-20'
  gender: ProfileGender;
  birthTime?: string; // vd: '14:30' (tùy chọn)
  birthPlace?: string; // vd: 'Hà Nội' (tùy chọn)
  birthLocation?: ResolvedBirthLocation;
  birthTimeAccuracy?: BirthTimeAccuracy;
}

export interface ProfileItem {
  id: string;
  fullName: string;
  birthDate: string; // ISO string (dương lịch), vd: '1998-10-20'
  gender?: ProfileGender;
  isDefault?: boolean;
  isPrimary?: boolean;
  birthTime?: string; // vd: '14:30' (tùy chọn)
  birthPlace?: string; // vd: 'Hà Nội' (tùy chọn)
  birthLocation?: ResolvedBirthLocation;
  birthTimeAccuracy?: BirthTimeAccuracy;
}

const PROFILES_LIST_KEY = '@numelyra_profiles_list';
const ACTIVE_PROFILE_ID_KEY = '@numelyra_active_profile_id';
const PRIMARY_PROFILE_STATE_KEY = '@numelyra_primary_profile:v1';
const PROFILE_CACHE_OWNER_KEY = '@numelyra_profiles_owner:v1';

export interface PrimaryProfileState {
  id: string;
  pendingCloudSync: boolean;
}

export function profileItemToUserProfile(item: ProfileItem): UserProfile | null {
  if (!item.fullName || !item.birthDate) return null;
  return {
    fullName: item.fullName,
    birthDate: item.birthDate,
    gender: item.gender || 'female',
    birthTime: item.birthTime,
    birthPlace: item.birthPlace,
    birthLocation: item.birthLocation,
    birthTimeAccuracy: item.birthTimeAccuracy,
  };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  try {
    const rawList = await AsyncStorage.getItem(PROFILES_LIST_KEY);
    let list: ProfileItem[] = [];
    if (rawList) {
      try {
        const parsed = JSON.parse(rawList);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }
    const primaryId = await getPrimaryProfileId();
    let index = list.findIndex((item) => item.id === primaryId);
    if (index < 0) {
      index = list.findIndex(
        (item) => item.fullName === profile.fullName && item.birthDate === profile.birthDate
      );
    }
    if (index < 0) {
      index = list.findIndex((item) => item.isPrimary || item.isDefault || item.id === 'default-profile');
    }

    if (index >= 0) {
      list[index] = {
        ...list[index],
        fullName: profile.fullName,
        birthDate: profile.birthDate,
        gender: profile.gender,
        birthTime: profile.birthTime,
        birthPlace: profile.birthPlace,
        birthLocation: profile.birthLocation,
        birthTimeAccuracy: profile.birthTimeAccuracy,
      };
      await saveAllProfiles(list);
      await setPrimaryProfileId(list[index].id, { pendingCloudSync: true, syncLegacy: false });
    } else if (list.length > 0) {
      list[0] = {
        ...list[0],
        fullName: profile.fullName,
        birthDate: profile.birthDate,
        gender: profile.gender,
        birthTime: profile.birthTime,
        birthPlace: profile.birthPlace,
        birthLocation: profile.birthLocation,
        birthTimeAccuracy: profile.birthTimeAccuracy,
      };
      await saveAllProfiles(list);
      await setPrimaryProfileId(list[0].id, { pendingCloudSync: true, syncLegacy: false });
    } else {
      const initial: ProfileItem = {
        id: 'default-profile',
        fullName: profile.fullName,
        birthDate: profile.birthDate,
        gender: profile.gender,
        isDefault: true,
        isPrimary: true,
        birthTime: profile.birthTime,
        birthPlace: profile.birthPlace,
        birthLocation: profile.birthLocation,
        birthTimeAccuracy: profile.birthTimeAccuracy,
      };
      await saveAllProfiles([initial]);
      await setPrimaryProfileId(initial.id, { pendingCloudSync: true, syncLegacy: false });
    }
  } catch (err) {
    console.warn('[userProfile] saveProfile sync to list failed:', err);
  }
}

/** Lưu dữ liệu lá số và đồng bộ vào hồ sơ đang hoạt động nếu danh sách đã tồn tại. */
export async function saveAstrologyBirthData(profile: UserProfile, profileId?: string): Promise<void> {
  const rawList = await AsyncStorage.getItem(PROFILES_LIST_KEY);
  if (!rawList) return;
  try {
    const profiles = JSON.parse(rawList) as ProfileItem[];
    if (!Array.isArray(profiles) || profiles.length === 0) return;
    const primaryId = await getPrimaryProfileId();
    const targetId = profileId || primaryId;
    const matchIndex = profiles.findIndex((item) => item.id === targetId);
    const fallbackIndex = profiles.findIndex(
      (item) => item.fullName === profile.fullName && item.birthDate === profile.birthDate
    );
    const index = matchIndex >= 0 ? matchIndex : fallbackIndex;
    if (index < 0) return;
    profiles[index] = {
      ...profiles[index],
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      birthLocation: profile.birthLocation,
      birthTimeAccuracy: profile.birthTimeAccuracy,
    };
    await saveAllProfiles(profiles);
    if (profiles[index].id === primaryId) await saveProfile(profile);

    if (supabase && profiles[index].id.length === 36 && profiles[index].id.includes('-')) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (user) {
          const { error } = await supabase
            .from('user_numerology_profiles')
            .update({
              birth_time: profile.birthTime || null,
              birth_place: profile.birthPlace || null,
              birth_location: profile.birthLocation || null,
              birth_time_accuracy: profile.birthTimeAccuracy || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profiles[index].id)
            .eq('user_id', user.id);
          if (error && !isMissingProfileDetailColumnError(error)) throw error;
        }
      } catch (error) {
        console.warn('[userProfile] Astrology profile details remain local until the next sync:', error);
      }
    }
  } catch {
    // Legacy profile remains valid even if a stale profile-list payload is corrupt.
  }
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
        isDefault: true,
        birthTime: legacy.birthTime,
        birthPlace: legacy.birthPlace,
        birthLocation: legacy.birthLocation,
        birthTimeAccuracy: legacy.birthTimeAccuracy,
      };
      await saveAllProfiles([initial]);
      await setPrimaryProfileId(initial.id, { pendingCloudSync: true });
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

export async function getProfileCacheOwnerId(): Promise<string | null> {
  return AsyncStorage.getItem(PROFILE_CACHE_OWNER_KEY);
}

export async function setProfileCacheOwnerId(userId: string): Promise<void> {
  await AsyncStorage.setItem(PROFILE_CACHE_OWNER_KEY, userId);
}

/**
 * Removes the active local profile cache without touching Supabase. This is
 * used on sign-out/account switches so one account can never inherit another
 * account's cached family profiles.
 */
export async function clearLocalProfiles(options: { preserveOwner?: boolean } = {}): Promise<void> {
  const keys = [
    PROFILE_KEY,
    PROFILES_LIST_KEY,
    ACTIVE_PROFILE_ID_KEY,
    PRIMARY_PROFILE_STATE_KEY,
  ];
  if (!options.preserveOwner) keys.push(PROFILE_CACHE_OWNER_KEY);
  await AsyncStorage.multiRemove(keys);
}

export async function addProfile(
  profileData: Omit<ProfileItem, 'id' | 'gender'> & { gender: ProfileGender },
): Promise<ProfileItem> {
  const all = await loadAllProfiles();
  let generatedId = `prof-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  // Nếu người dùng đã đăng nhập Supabase, tạo luôn trên Supabase cloud
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        let { data: inserted, error } = await supabase
          .from('user_numerology_profiles')
          .insert({
            user_id: user.id,
            name: profileData.fullName,
            birth_date: profileData.birthDate,
            gender: profileData.gender,
            birth_time: profileData.birthTime || null,
            birth_place: profileData.birthPlace || null,
            birth_location: profileData.birthLocation || null,
            birth_time_accuracy: profileData.birthTimeAccuracy || null,
          })
          .select('id')
          .single();
        if (error && (isMissingGenderColumnError(error) || isMissingProfileDetailColumnError(error))) {
          const legacyInsert = await supabase
            .from('user_numerology_profiles')
            .insert({
              user_id: user.id,
              name: profileData.fullName,
              birth_date: profileData.birthDate,
              gender: profileData.gender,
            })
            .select('id')
            .single();
          inserted = legacyInsert.data;
          error = legacyInsert.error;
        }
        if (error && isMissingGenderColumnError(error)) {
          const oldestInsert = await supabase
            .from('user_numerology_profiles')
            .insert({
              user_id: user.id,
              name: profileData.fullName,
              birth_date: profileData.birthDate,
            })
            .select('id')
            .single();
          inserted = oldestInsert.data;
          error = oldestInsert.error;
        }
        if (!error && inserted?.id) {
          generatedId = inserted.id;
        }
      }
    } catch (err) {
      console.warn('[userProfile] Supabase addProfile fallback to local:', err);
    }
  }

  const newProfile: ProfileItem & { gender: ProfileGender } = {
    id: generatedId,
    ...profileData
  };
  const updated = [newProfile, ...all.filter(p => p.id !== generatedId)];
  await saveAllProfiles(updated);
  if (all.length === 0) {
    await setPrimaryProfileId(newProfile.id, { pendingCloudSync: true });
  }

  return newProfile;
}

export async function updateProfile(
  id: string,
  changes: Pick<
    ProfileItem,
    'fullName' | 'birthDate' | 'birthTime' | 'birthPlace' | 'birthLocation' | 'birthTimeAccuracy'
  > & { gender: ProfileGender },
): Promise<ProfileItem> {
  const all = await loadAllProfiles();
  const index = all.findIndex((profile) => profile.id === id);
  if (index < 0) throw new Error('Profile not found');

  const updatedProfile: ProfileItem & { gender: ProfileGender } = {
    ...all[index],
    fullName: changes.fullName,
    birthDate: changes.birthDate,
    gender: changes.gender,
    birthTime: changes.birthTime,
    birthPlace: changes.birthPlace,
    birthLocation: changes.birthLocation,
    birthTimeAccuracy: changes.birthTimeAccuracy,
  };
  const updatedProfiles = all.map((profile, profileIndex) => (
    profileIndex === index ? updatedProfile : profile
  ));
  await saveAllProfiles(updatedProfiles);

  const primaryId = await getPrimaryProfileId();
  if (primaryId === id) {
    await saveProfile({
      fullName: updatedProfile.fullName,
      birthDate: updatedProfile.birthDate,
      gender: updatedProfile.gender,
      birthTime: updatedProfile.birthTime,
      birthPlace: updatedProfile.birthPlace,
      birthLocation: updatedProfile.birthLocation,
      birthTimeAccuracy: updatedProfile.birthTimeAccuracy,
    });
  }

  const supabaseClient = supabase;
  if (supabaseClient) {
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        const applyRemoteUpdate = async (includeGender: boolean, includeDetails: boolean) => {
          const payload: Record<string, unknown> = {
            name: updatedProfile.fullName,
            birth_date: updatedProfile.birthDate,
          };
          if (includeGender) payload.gender = updatedProfile.gender;
          if (includeDetails) {
            payload.birth_time = updatedProfile.birthTime || null;
            payload.birth_place = updatedProfile.birthPlace || null;
            payload.birth_location = updatedProfile.birthLocation || null;
            payload.birth_time_accuracy = updatedProfile.birthTimeAccuracy || null;
          }
          const query = supabaseClient
            .from('user_numerology_profiles')
            .update(payload)
            .eq('user_id', user.id);
          return id.length === 36 && id.includes('-')
            ? await query.eq('id', id)
            : await query
              .eq('name', all[index].fullName)
              .eq('birth_date', all[index].birthDate);
        };

        let includeGender = true;
        let includeDetails = true;
        let { error } = await applyRemoteUpdate(includeGender, includeDetails);
        if (error && isMissingProfileDetailColumnError(error)) {
          includeDetails = false;
          ({ error } = await applyRemoteUpdate(includeGender, includeDetails));
        }
        if (error && isMissingGenderColumnError(error)) {
          includeGender = false;
          ({ error } = await applyRemoteUpdate(includeGender, includeDetails));
        }
        if (error) throw error;
        if (primaryId === id) {
          const { error: accountError } = await supabaseClient.from('profiles').update({
            full_name: updatedProfile.fullName,
            updated_at: new Date().toISOString(),
          }).eq('id', user.id);
          if (accountError) throw accountError;
        }
      }
    } catch (err) {
      console.warn('[userProfile] Supabase updateProfile kept local changes only:', err);
    }
  }

  return updatedProfile;
}

export async function deleteProfile(id: string): Promise<ProfileItem[]> {
  const all = await loadAllProfiles();
  const target = all.find(p => p.id === id);
  if (!target) return all;
  const updated = all.filter(p => p.id !== id);

  // For cloud-backed rows, delete remotely first. A failed request must keep
  // the local row visible, otherwise the next cloud pull would resurrect it.
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (user && id.length === 36 && id.includes('-')) {
      const { error } = await supabase
        .from('user_numerology_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.warn('[userProfile] Supabase deleteProfile failed:', error);
        throw error;
      }
    }
  }

  await saveAllProfiles(updated);
  const primaryId = await getPrimaryProfileId();
  if (primaryId === id && updated.length > 0) {
    await setPrimaryProfileId(updated[0].id, { pendingCloudSync: true });
  }
  return updated;
}

function parsePrimaryProfileState(raw: string | null): PrimaryProfileState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PrimaryProfileState>;
    return typeof parsed.id === 'string' && parsed.id
      ? { id: parsed.id, pendingCloudSync: parsed.pendingCloudSync === true }
      : null;
  } catch {
    return null;
  }
}

export async function getPrimaryProfileState(): Promise<PrimaryProfileState | null> {
  return parsePrimaryProfileState(await AsyncStorage.getItem(PRIMARY_PROFILE_STATE_KEY));
}

export async function ensurePrimaryProfileId(profiles?: ProfileItem[]): Promise<string | null> {
  const list = profiles ?? await loadAllProfiles();
  if (list.length === 0) return null;

  const stored = await getPrimaryProfileState();
  if (stored && list.some((item) => item.id === stored.id)) return stored.id;

  const legacyActiveId = await AsyncStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  const legacyProfile = await loadProfile();
  const candidate = list.find((item) => item.isDefault)
    ?? list.find((item) => item.id === 'default-profile')
    ?? list.find((item) => (
      legacyProfile
      && item.fullName === legacyProfile.fullName
      && item.birthDate === legacyProfile.birthDate
    ))
    ?? list.find((item) => item.id === legacyActiveId)
    ?? list[0];

  await setPrimaryProfileId(candidate.id, { pendingCloudSync: true });
  return candidate.id;
}

export async function getPrimaryProfileId(): Promise<string | null> {
  const stored = await getPrimaryProfileState();
  if (stored?.id) return stored.id;
  return ensurePrimaryProfileId();
}

export async function setPrimaryProfileId(
  id: string,
  options: { pendingCloudSync?: boolean; syncLegacy?: boolean } = {},
): Promise<void> {
  const all = await loadAllProfiles();
  const found = all.find((item) => item.id === id);
  if (!found) throw new Error('Profile not found');

  await AsyncStorage.setItem(PRIMARY_PROFILE_STATE_KEY, JSON.stringify({
    id,
    pendingCloudSync: options.pendingCloudSync ?? true,
  } satisfies PrimaryProfileState));

  if (options.syncLegacy !== false && found.gender) {
    await saveProfile({
      fullName: found.fullName,
      birthDate: found.birthDate,
      gender: found.gender,
      birthTime: found.birthTime,
      birthPlace: found.birthPlace,
      birthLocation: found.birthLocation,
      birthTimeAccuracy: found.birthTimeAccuracy,
    });
  }
}

export async function markPrimaryProfileSynced(id: string): Promise<void> {
  const current = await getPrimaryProfileState();
  if (current?.id !== id) return;
  await AsyncStorage.setItem(PRIMARY_PROFILE_STATE_KEY, JSON.stringify({
    id,
    pendingCloudSync: false,
  } satisfies PrimaryProfileState));
}

export async function getPrimaryProfile(): Promise<ProfileItem | null> {
  const all = await loadAllProfiles();
  if (all.length === 0) return null;
  const primaryId = await ensurePrimaryProfileId(all);
  return all.find((item) => item.id === primaryId) ?? all[0];
}

/** @deprecated Compatibility alias. New code must use getPrimaryProfileId. */
export async function getActiveProfileId(): Promise<string | null> {
  return getPrimaryProfileId();
}

/** @deprecated Compatibility alias. Only Settings may change the primary profile. */
export async function setActiveProfileId(id: string): Promise<void> {
  await setPrimaryProfileId(id, { pendingCloudSync: true });
}

/** @deprecated Compatibility alias. New code must use getPrimaryProfile. */
export async function getActiveProfile(): Promise<ProfileItem | null> {
  return getPrimaryProfile();
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

/** Thiên Can năm sinh. */
const THIEN_CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];

export function getThienCanYear(year: number): string {
  const idx = ((year - 4) % 10 + 10) % 10;
  return THIEN_CAN[idx];
}

export function getNguHanh(year: number): string {
  return getNapAmElement(year);
}

export function getNguHanhEmoji(nguHanh: string): string {
  const map: Record<string, string> = {
    'Kim': '🪙', 'Mộc': '🌿', 'Thủy': '💧', 'Hỏa': '🔥', 'Thổ': '🪨'
  };
  return map[nguHanh] || '✨';
}
