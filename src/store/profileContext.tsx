import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '../services/supabaseClient';
import { downloadAllCloudChatData } from '../services/chatSessionSyncService';
import { isProfileStateReadyForIdentity } from '../services/profileSync';
import { useAuth } from './authContext';
import {
  clearLocalProfiles,
  ensurePrimaryProfileId,
  getProfileCacheOwnerId,
  loadAllProfiles,
  markPrimaryProfileSynced,
  profileItemToUserProfile,
  setPrimaryProfileId as persistPrimaryProfileId,
  type ProfileItem,
  type UserProfile,
} from './userProfile';

export type CloudSyncStatus = 'idle' | 'syncing' | 'success' | 'partial-error' | 'error';

export type CloudSyncResult = {
  profilesCount: number;
  sessionsCount: number;
  messagesCount: number;
};

export type CloudSyncState = {
  status: CloudSyncStatus;
  userId: string | null;
  result: CloudSyncResult | null;
  error: string | null;
  revision: number;
};

interface ProfileContextValue {
  isReady: boolean;
  profiles: ProfileItem[];
  primaryProfileId: string | null;
  primaryProfileItem: ProfileItem | null;
  primaryProfile: UserProfile | null;
  cloudSyncState: CloudSyncState;
  chatRevision: number;
  refreshProfiles(): Promise<void>;
  syncNow(): Promise<CloudSyncResult>;
  setPrimaryProfile(id: string): Promise<{ synced: boolean }>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

let isSetPrimaryRpcSupported = true;

const EMPTY_SYNC_RESULT: CloudSyncResult = {
  profilesCount: 0,
  sessionsCount: 0,
  messagesCount: 0,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Cloud sync failed.';
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady: isAuthReady, syncLocalProfiles } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [readyIdentity, setReadyIdentity] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null);
  const [chatRevision, setChatRevision] = useState(0);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    status: 'idle',
    userId: null,
    result: null,
    error: null,
    revision: 0,
  });
  const mountedRef = useRef(true);
  const syncGenerationRef = useRef(0);
  const syncInFlightRef = useRef<{ userId: string; promise: Promise<CloudSyncResult> } | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const loadProfileSnapshot = useCallback(async (): Promise<{
    profiles: ProfileItem[];
    primaryProfileId: string | null;
  }> => {
    const nextProfiles = await loadAllProfiles();
    const nextPrimaryId = await ensurePrimaryProfileId(nextProfiles);
    return { profiles: nextProfiles, primaryProfileId: nextPrimaryId };
  }, []);

  const applyProfileSnapshot = useCallback((snapshot: {
    profiles: ProfileItem[];
    primaryProfileId: string | null;
  }) => {
    if (!mountedRef.current) return;
    setProfiles(snapshot.profiles);
    setPrimaryProfileId(snapshot.primaryProfileId);
  }, []);

  const refreshProfiles = useCallback(async () => {
    applyProfileSnapshot(await loadProfileSnapshot());
  }, [applyProfileSnapshot, loadProfileSnapshot]);

  const runUserDataSync = useCallback((targetUser: User, generation = syncGenerationRef.current): Promise<CloudSyncResult> => {
    const existing = syncInFlightRef.current;
    if (existing?.userId === targetUser.id) return existing.promise;

    if (mountedRef.current) {
      setCloudSyncState((current) => ({
        ...current,
        status: 'syncing',
        userId: targetUser.id,
        result: null,
        error: null,
      }));
    }

    const promise = (async (): Promise<CloudSyncResult> => {
      const [profileOutcome, chatOutcome] = await Promise.allSettled([
        syncLocalProfiles(targetUser),
        downloadAllCloudChatData(targetUser.id),
      ]);
      const snapshot = await loadProfileSnapshot();

      if (!mountedRef.current || generation !== syncGenerationRef.current) {
        return EMPTY_SYNC_RESULT;
      }

      applyProfileSnapshot(snapshot);

      const profileSucceeded = profileOutcome.status === 'fulfilled';
      const chatSucceeded = chatOutcome.status === 'fulfilled';
      const result: CloudSyncResult = {
        profilesCount: snapshot.profiles.length,
        sessionsCount: chatSucceeded ? chatOutcome.value.sessionsCount : 0,
        messagesCount: chatSucceeded ? chatOutcome.value.messagesCount : 0,
      };

      // A successful profile query, including a valid empty result, is what
      // allows App.tsx to decide between the main app and onboarding. A local
      // profile also keeps the app usable when the background refresh fails.
      const canUseResolvedProfiles = profileSucceeded || snapshot.profiles.length > 0;
      setIsReady(canUseResolvedProfiles);
      setReadyIdentity(canUseResolvedProfiles ? targetUser.id : null);
      if (chatSucceeded) setChatRevision((current) => current + 1);

      const errors = [
        profileOutcome.status === 'rejected' ? getErrorMessage(profileOutcome.reason) : null,
        chatOutcome.status === 'rejected' ? getErrorMessage(chatOutcome.reason) : null,
      ].filter((message): message is string => Boolean(message));
      const status: CloudSyncStatus = errors.length === 0
        ? 'success'
        : errors.length === 2
          ? 'error'
          : 'partial-error';

      setCloudSyncState((current) => ({
        status,
        userId: targetUser.id,
        result,
        error: errors.join('\n') || null,
        revision: current.revision + 1,
      }));
      return result;
    })().catch((error: unknown) => {
      if (mountedRef.current && generation === syncGenerationRef.current) {
        setCloudSyncState((current) => ({
          status: 'error',
          userId: targetUser.id,
          result: current.result,
          error: getErrorMessage(error),
          revision: current.revision + 1,
        }));
      }
      return { ...EMPTY_SYNC_RESULT };
    }).finally(() => {
      if (syncInFlightRef.current?.promise === promise) {
        syncInFlightRef.current = null;
      }
    });

    syncInFlightRef.current = { userId: targetUser.id, promise };
    return promise;
  }, [applyProfileSnapshot, loadProfileSnapshot, syncLocalProfiles]);

  useEffect(() => {
    if (!isAuthReady) return;
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    let cancelled = false;

    void (async () => {
      if (user) {
        const cacheOwnerId = await getProfileCacheOwnerId();
        if (cacheOwnerId && cacheOwnerId !== user.id) {
          await clearLocalProfiles();
        }
        const snapshot = await loadProfileSnapshot();
        if (cancelled || generation !== syncGenerationRef.current) return;
        applyProfileSnapshot(snapshot);
        const hasUsableLocalProfile = snapshot.profiles.length > 0;
        setIsReady(hasUsableLocalProfile);
        setReadyIdentity(hasUsableLocalProfile ? user.id : null);
        void runUserDataSync(user, generation);
        return;
      }

      if (await getProfileCacheOwnerId()) {
        // An authenticated cache must never silently become guest data after
        // a session expires or a different person opens the app.
        await clearLocalProfiles();
      }
      const snapshot = await loadProfileSnapshot();
      if (cancelled || generation !== syncGenerationRef.current) return;
      applyProfileSnapshot(snapshot);
      setIsReady(true);
      setReadyIdentity('guest');
      setCloudSyncState((current) => ({
        status: 'idle',
        userId: null,
        result: null,
        error: null,
        revision: current.revision,
      }));
    })().catch((error: unknown) => {
      if (cancelled || !mountedRef.current) return;
      if (!user) {
        setIsReady(true);
        setReadyIdentity('guest');
      } else {
        setIsReady(false);
        setReadyIdentity(null);
        setCloudSyncState((current) => ({
          status: 'error',
          userId: user.id,
          result: null,
          error: getErrorMessage(error),
          revision: current.revision + 1,
        }));
      }
    });
    return () => { cancelled = true; };
  }, [applyProfileSnapshot, isAuthReady, loadProfileSnapshot, runUserDataSync, user?.id]);

  const syncNow = useCallback(async (): Promise<CloudSyncResult> => {
    if (!user) {
      await refreshProfiles();
      return { ...EMPTY_SYNC_RESULT };
    }
    return runUserDataSync(user);
  }, [refreshProfiles, runUserDataSync, user]);

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
    isReady: isProfileStateReadyForIdentity(isReady, readyIdentity, user?.id ?? null),
    profiles,
    primaryProfileId,
    primaryProfileItem,
    primaryProfile,
    cloudSyncState,
    chatRevision,
    refreshProfiles,
    syncNow,
    setPrimaryProfile,
  }), [chatRevision, cloudSyncState, isReady, primaryProfile, primaryProfileId, primaryProfileItem, profiles, readyIdentity, refreshProfiles, setPrimaryProfile, syncNow, user?.id]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfiles must be used inside ProfileProvider.');
  return context;
}
