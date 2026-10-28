import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../services/supabaseClient';
import { useAuth } from './authContext';
import {
  ensurePrimaryProfileId,
  loadAllProfiles,
  markPrimaryProfileSynced,
  profileItemToUserProfile,
  setPrimaryProfileId as persistPrimaryProfileId,
  type ProfileItem,
  type UserProfile,
} from './userProfile';

interface ProfileContextValue {
  isReady: boolean;
  profiles: ProfileItem[];
  primaryProfileId: string | null;
  primaryProfileItem: ProfileItem | null;
  primaryProfile: UserProfile | null;
  refreshProfiles(): Promise<void>;
  setPrimaryProfile(id: string): Promise<{ synced: boolean }>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

let isSetPrimaryRpcSupported = true;

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady: isAuthReady, syncLocalProfiles } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    const nextProfiles = await loadAllProfiles();
    const nextPrimaryId = await ensurePrimaryProfileId(nextProfiles);
    setProfiles(nextProfiles);
    setPrimaryProfileId(nextPrimaryId);
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    let mounted = true;
    setIsReady(false);
    void (async () => {
      if (user) await syncLocalProfiles();
      const nextProfiles = await loadAllProfiles();
      const nextPrimaryId = await ensurePrimaryProfileId(nextProfiles);
      if (!mounted) return;
      setProfiles(nextProfiles);
      setPrimaryProfileId(nextPrimaryId);
      setIsReady(true);
    })().catch(() => {
      if (mounted) setIsReady(true);
    });
    return () => { mounted = false; };
  }, [isAuthReady, syncLocalProfiles, user?.id]);

  const primaryProfileItem = useMemo(
    () => profiles.find((profile) => profile.id === primaryProfileId) ?? profiles[0] ?? null,
    [primaryProfileId, profiles],
  );
  const primaryProfile = useMemo(
    () => primaryProfileItem ? profileItemToUserProfile(primaryProfileItem) : null,
    [primaryProfileItem],
  );

  const setPrimaryProfile = useCallback(async (id: string): Promise<{ synced: boolean }> => {
    const selected = profiles.find((profile) => profile.id === id);
    if (!selected) throw new Error('Profile not found');

    await persistPrimaryProfileId(id, { pendingCloudSync: Boolean(user) });
    setPrimaryProfileId(id);

    let synced = !user;
    if (user && supabase) {
      try {
        if (isSetPrimaryRpcSupported) {
          const { error } = await supabase.rpc('set_primary_numerology_profile', { profile_id: id });
          if (error) {
            if (error.code === 'PGRST202' || (error as any).status === 404) {
              isSetPrimaryRpcSupported = false;
            }
          }
        }
        const { error: accountError } = await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email || null,
          full_name: selected.fullName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (accountError) throw accountError;
        await markPrimaryProfileSynced(id);
        synced = true;
      } catch {
        synced = false;
      }
    }

    return { synced };
  }, [profiles, user]);

  const value = useMemo<ProfileContextValue>(() => ({
    isReady,
    profiles,
    primaryProfileId,
    primaryProfileItem,
    primaryProfile,
    refreshProfiles,
    setPrimaryProfile,
  }), [isReady, primaryProfile, primaryProfileId, primaryProfileItem, profiles, refreshProfiles, setPrimaryProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfiles must be used inside ProfileProvider.');
  return context;
}
