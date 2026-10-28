import type { UserProfile } from '../../store/userProfile';

export type DailyProfile = UserProfile & { id?: string | null };

/** Daily/proactive content is owned exclusively by the account primary profile. */
export function resolvePrimaryDailyProfile(
  primaryProfile?: UserProfile | null,
  primaryProfileId?: string | null,
): DailyProfile | null {
  return primaryProfile ? { ...primaryProfile, id: primaryProfileId } : null;
}
