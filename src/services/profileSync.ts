import type {
  BirthTimeAccuracy,
  ProfileItem,
  ResolvedBirthLocation,
} from '../store/userProfile';

export interface CloudNumerologyProfileRow {
  id: string;
  user_id?: string;
  name: string;
  birth_date: string;
  gender?: unknown;
  is_primary?: unknown;
  birth_time?: unknown;
  birth_place?: unknown;
  birth_location?: unknown;
  birth_time_accuracy?: unknown;
  created_at?: string;
  updated_at?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCloudProfileId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function profileIdentityKey(profile: Pick<ProfileItem, 'fullName' | 'birthDate'>): string {
  return `${profile.fullName.trim().toLocaleLowerCase('vi-VN')}|${profile.birthDate.trim()}`;
}

function isBirthTimeAccuracy(value: unknown): value is BirthTimeAccuracy {
  return value === 'exact' || value === 'unknown';
}

function isProfileGender(value: unknown): value is NonNullable<ProfileItem['gender']> {
  return value === 'male' || value === 'female';
}

function isResolvedBirthLocation(value: unknown): value is ResolvedBirthLocation {
  if (!value || typeof value !== 'object') return false;
  const location = value as Partial<ResolvedBirthLocation>;
  return typeof location.placeId === 'string'
    && typeof location.userLabel === 'string'
    && typeof location.latitude === 'number'
    && typeof location.longitude === 'number'
    && typeof location.timeZoneIdentifier === 'string'
    && typeof location.resolvedAt === 'string';
}

export function cloudRowToProfileItem(row: CloudNumerologyProfileRow): ProfileItem {
  return {
    id: row.id,
    fullName: row.name,
    birthDate: row.birth_date,
    gender: isProfileGender(row.gender) ? row.gender : undefined,
    isPrimary: row.is_primary === true,
    birthTime: typeof row.birth_time === 'string' ? row.birth_time : undefined,
    birthPlace: typeof row.birth_place === 'string' ? row.birth_place : undefined,
    birthLocation: isResolvedBirthLocation(row.birth_location) ? row.birth_location : undefined,
    birthTimeAccuracy: isBirthTimeAccuracy(row.birth_time_accuracy) ? row.birth_time_accuracy : undefined,
  };
}

export function profileItemToCloudPayload(profile: ProfileItem, userId: string) {
  return {
    user_id: userId,
    name: profile.fullName.trim(),
    birth_date: profile.birthDate,
    gender: profile.gender || null,
    birth_time: profile.birthTime || null,
    birth_place: profile.birthPlace || null,
    birth_location: profile.birthLocation || null,
    birth_time_accuracy: profile.birthTimeAccuracy || null,
  };
}

export interface ProfileMergeResult {
  profiles: ProfileItem[];
  pendingLocalCreates: ProfileItem[];
}

/**
 * Supabase rows are authoritative for signed-in accounts. Local rows are
 * retained only when they are clearly offline/guest creations (non-UUID ids).
 * This prevents a profile deleted on another device from being recreated by a
 * stale cache while still allowing guest profiles to be claimed at sign-in.
 */
export function mergeCloudAndLocalProfiles(
  remoteProfiles: ProfileItem[],
  localProfiles: ProfileItem[],
  allowLocalCreates: boolean,
): ProfileMergeResult {
  const localById = new Map(localProfiles.map((profile) => [profile.id, profile]));
  const localByIdentity = new Map(localProfiles.map((profile) => [profileIdentityKey(profile), profile]));
  const remoteIdentityKeys = new Set(remoteProfiles.map(profileIdentityKey));

  const profiles = remoteProfiles.map((remote) => {
    const local = localById.get(remote.id) ?? localByIdentity.get(profileIdentityKey(remote));
    if (!local) return remote;
    return {
      ...local,
      ...remote,
      // Preserve legacy local-only details while the detail-column migration
      // is rolling out. Once cloud values exist they always win.
      birthTime: remote.birthTime ?? local.birthTime,
      birthPlace: remote.birthPlace ?? local.birthPlace,
      birthLocation: remote.birthLocation ?? local.birthLocation,
      birthTimeAccuracy: remote.birthTimeAccuracy ?? local.birthTimeAccuracy,
      gender: remote.gender ?? local.gender,
    };
  });

  const pendingLocalCreates = allowLocalCreates
    ? localProfiles.filter((local) => (
      !isCloudProfileId(local.id) && !remoteIdentityKeys.has(profileIdentityKey(local))
    ))
    : [];

  return {
    profiles: [...profiles, ...pendingLocalCreates],
    pendingLocalCreates,
  };
}
