import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import {
  clearLocalProfiles,
  ensurePrimaryProfileId,
  getProfileCacheOwnerId,
  getPrimaryProfileState,
  isMissingProfileDetailColumnError,
  loadAllProfiles,
  markPrimaryProfileSynced,
  saveAllProfiles,
  isMissingGenderColumnError,
  setProfileCacheOwnerId,
  setPrimaryProfileId,
  type ProfileItem
} from './userProfile';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import {
  cloudRowToProfileItem,
  isCloudProfileId,
  mergeCloudAndLocalProfiles,
  profileIdentityKey,
  profileItemToCloudPayload,
  type CloudNumerologyProfileRow,
} from '../services/profileSync';

WebBrowser.maybeCompleteAuthSession();

type SignUpResult = { needsEmailConfirmation: boolean };

type AuthContextValue = {
  isReady: boolean;
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncLocalProfiles: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const configurationError = () => new Error(
  'Đăng nhập chưa được cấu hình. Hãy thêm EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_ANON_KEY vào mobile_app/.env.'
);

let isSetPrimaryRpcSupported = true;
const profileSyncInFlight = new Map<string, Promise<void>>();
let profileSyncQueue: Promise<void> = Promise.resolve();
let activeProfileSyncUserId: string | null = null;
let profileSyncGeneration = 0;

async function syncProfilesForUser(user: User): Promise<void> {
  if (!supabase) return;

  if (activeProfileSyncUserId !== user.id) {
    activeProfileSyncUserId = user.id;
    profileSyncGeneration += 1;
  }
  const generation = profileSyncGeneration;

  const existing = profileSyncInFlight.get(user.id);
  if (existing) return existing;

  const promise = profileSyncQueue.then(() => syncProfilesForUserInternal(user, generation)).finally(() => {
    if (profileSyncInFlight.get(user.id) === promise) profileSyncInFlight.delete(user.id);
  });
  profileSyncQueue = promise.catch(() => undefined);
  profileSyncInFlight.set(user.id, promise);
  return promise;
}

async function syncProfilesForUserInternal(user: User, generation: number): Promise<void> {
  if (!supabase) return;
  try {
    const cacheOwnerId = await getProfileCacheOwnerId();
    const canClaimLocalProfiles = cacheOwnerId === null || cacheOwnerId === user.id;
    if (cacheOwnerId && cacheOwnerId !== user.id) {
      await clearLocalProfiles();
    }

    const localProfiles = canClaimLocalProfiles ? await loadAllProfiles() : [];
    const localPrimaryId = await ensurePrimaryProfileId(localProfiles);
    const localPrimaryState = await getPrimaryProfileState();
    const localPrimary = localProfiles.find((profile) => profile.id === localPrimaryId) ?? localProfiles[0];

    // 1. Pull every cloud profile. RLS limits this result to the signed-in user.
    const { data: remoteProfiles, error: selectError } = await supabase
      .from('user_numerology_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (selectError) throw selectError;
    if (generation !== profileSyncGeneration || activeProfileSyncUserId !== user.id) return;

    let remoteItems = ((remoteProfiles || []) as CloudNumerologyProfileRow[])
      .map(cloudRowToProfileItem);
    let mergeResult = mergeCloudAndLocalProfiles(remoteItems, localProfiles, canClaimLocalProfiles);

    // 2. Upload only explicit offline/guest creations. UUID rows missing from
    // cloud are treated as remotely deleted and must not be resurrected.
    if (mergeResult.pendingLocalCreates.length > 0) {
      let { data: insertedData, error: insertError } = await supabase
        .from('user_numerology_profiles')
        .insert(mergeResult.pendingLocalCreates.map((profile) => profileItemToCloudPayload(profile, user.id)))
        .select('*');

      if (insertError && isMissingProfileDetailColumnError(insertError)) {
        const coreInsert = await supabase
          .from('user_numerology_profiles')
          .insert(mergeResult.pendingLocalCreates.map((profile) => ({
            user_id: user.id,
            name: profile.fullName,
            birth_date: profile.birthDate,
            gender: profile.gender,
          })))
          .select('*');
        insertedData = coreInsert.data;
        insertError = coreInsert.error;
      }

      if (insertError && isMissingGenderColumnError(insertError)) {
        const legacyInsert = await supabase
          .from('user_numerology_profiles')
          .insert(
            mergeResult.pendingLocalCreates.map((p) => ({
              user_id: user.id,
              name: p.fullName,
              birth_date: p.birthDate,
            }))
          )
          .select('*');
        insertedData = legacyInsert.data as typeof insertedData;
        insertError = legacyInsert.error;
      }

      if (!insertError && insertedData) {
        remoteItems = [
          ...(insertedData as CloudNumerologyProfileRow[]).map(cloudRowToProfileItem),
          ...remoteItems,
        ];
        mergeResult = mergeCloudAndLocalProfiles(remoteItems, localProfiles, true);
      } else if (insertError) {
        console.warn('[Auth] Offline profiles remain queued locally:', insertError);
      }
    }

    // 3. Atomically replace the active cache with this account's resolved set.
    const unifiedProfiles = mergeResult.profiles;
    if (generation !== profileSyncGeneration || activeProfileSyncUserId !== user.id) return;

    // Backfill portable details from an existing installation after the schema
    // migration. This makes those fields available to the next fresh device.
    const remoteById = new Map(remoteItems.map((profile) => [profile.id, profile]));
    const detailBackfills = unifiedProfiles.filter((profile) => {
      if (!isCloudProfileId(profile.id)) return false;
      const remote = remoteById.get(profile.id);
      if (!remote) return false;
      return Boolean(
        (!remote.birthTime && profile.birthTime)
        || (!remote.birthPlace && profile.birthPlace)
        || (!remote.birthLocation && profile.birthLocation)
        || (!remote.birthTimeAccuracy && profile.birthTimeAccuracy)
      );
    });
    await Promise.all(detailBackfills.map(async (profile) => {
      const { error } = await supabase!
        .from('user_numerology_profiles')
        .update({
          birth_time: profile.birthTime || null,
          birth_place: profile.birthPlace || null,
          birth_location: profile.birthLocation || null,
          birth_time_accuracy: profile.birthTimeAccuracy || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .eq('user_id', user.id);
      if (error && !isMissingProfileDetailColumnError(error)) {
        console.warn('[Auth] Could not backfill portable profile details:', error);
      }
    }));

    await saveAllProfiles(unifiedProfiles);
    await setProfileCacheOwnerId(user.id);

    if (unifiedProfiles.length > 0) {
      const mappedLocalPrimary = localPrimary
        ? unifiedProfiles.find((profile) => profileIdentityKey(profile) === profileIdentityKey(localPrimary))
        : undefined;
      const cloudPrimary = unifiedProfiles.find((profile) => profile.isPrimary);
      const shouldPushLocalPrimary = (
        canClaimLocalProfiles
        && localPrimaryState?.pendingCloudSync === true
        && Boolean(mappedLocalPrimary)
      ) || !cloudPrimary;
      const chosenPrimary = shouldPushLocalPrimary
        ? mappedLocalPrimary ?? cloudPrimary ?? unifiedProfiles[0]
        : cloudPrimary ?? mappedLocalPrimary ?? unifiedProfiles[0];

      await setPrimaryProfileId(chosenPrimary.id, {
        pendingCloudSync: shouldPushLocalPrimary,
      });

      if (shouldPushLocalPrimary && isSetPrimaryRpcSupported) {
        try {
          const { error: primaryError } = await supabase.rpc('set_primary_numerology_profile', {
            profile_id: chosenPrimary.id,
          });
          if (!primaryError) {
            await markPrimaryProfileSynced(chosenPrimary.id);
          } else if (primaryError.code === 'PGRST202' || (primaryError as any).status === 404) {
            isSetPrimaryRpcSupported = false;
          }
        } catch {
          isSetPrimaryRpcSupported = false;
        }
      }

      // 4. Thông tin tài khoản luôn phản ánh hồ sơ chính đã resolve.
      const { error: accountError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email || null,
        full_name: chosenPrimary.fullName || user.user_metadata?.full_name || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (accountError) throw accountError;
    } else {
      await clearLocalProfiles({ preserveOwner: true });
    }
  } catch (error) {
    console.warn('[Auth] Could not sync local profiles with Supabase:', error);
  }
}

async function performGoogleSignIn(): Promise<void> {
  if (!supabase) throw configurationError();

  const provider = 'google' as const;
  const queryParams = {
    access_type: 'offline',
    prompt: 'consent',
  };

  if (Platform.OS === 'web') {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams,
      },
    });
    if (error) throw error;
  } else {
    // Dynamic redirect URL: works in Expo Go (exp://...), dev client, and standalone (numelyra://...)
    const redirectUrl = Linking.createURL('auth-callback');
    console.log(`[Auth] ${provider} OAuth redirectUrl:`, redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams,
      },
    });
    if (error) throw error;
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const url = result.url;
        console.log(`[Auth] ${provider} OAuth callback URL received:`, url);
        const hash = url.includes('#') ? url.split('#')[1] : '';
        const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
        const params = new URLSearchParams(hash || query);

        // 1. If PKCE flow (returns code)
        const code = params.get('code');
        if (code) {
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) throw sessionError;
          if (sessionData.user) {
            await syncProfilesForUser(sessionData.user);
          }
          return;
        }

        // 2. If Implicit flow (returns access_token & refresh_token)
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          if (sessionData.user) {
            await syncProfilesForUser(sessionData.user);
          }
        }
      }
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsReady(true);
      if (data.session?.user) void syncProfilesForUser(data.session.user);
    }).catch(() => {
      if (active) setIsReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        activeProfileSyncUserId = null;
        profileSyncGeneration += 1;
        profileSyncInFlight.clear();
        void clearLocalProfiles().finally(() => setSession(null));
        return;
      }
      setSession(nextSession);
      if (nextSession?.user) void syncProfilesForUser(nextSession.user);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isReady,
    session,
    user: session?.user || null,
    isConfigured: isSupabaseConfigured,
    async signIn(email, password) {
      if (!supabase) throw configurationError();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.user) await syncProfilesForUser(data.user);
    },
    async signUp(email, password, fullName) {
      if (!supabase) throw configurationError();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName?.trim() || undefined } },
      });
      if (error) throw error;
      if (data.user) await syncProfilesForUser(data.user);
      return { needsEmailConfirmation: Boolean(data.user && !data.session) };
    },
    async signOut() {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      activeProfileSyncUserId = null;
      profileSyncGeneration += 1;
      profileSyncInFlight.clear();
      await clearLocalProfiles();
    },
    async signInWithGoogle() {
      await performGoogleSignIn();
    },
    async syncLocalProfiles() {
      if (session?.user) await syncProfilesForUser(session.user);
    },
  }), [isReady, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
