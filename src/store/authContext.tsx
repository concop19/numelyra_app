import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import {
  loadAllProfiles,
  saveAllProfiles,
  getActiveProfileId,
  setActiveProfileId,
  type ProfileItem
} from './userProfile';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

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

async function syncProfilesForUser(user: User): Promise<void> {
  if (!supabase) return;

  try {
    const localProfiles = await loadAllProfiles();
    const primaryProfile = localProfiles.find((profile) => profile.isDefault) || localProfiles[0];

    // 1. Đồng bộ thông tin cơ bản tài khoản (profiles)
    const { error: accountError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email || null,
      full_name: primaryProfile?.fullName || user.user_metadata?.full_name || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (accountError) throw accountError;

    // 2. Kéo toàn bộ hồ sơ đám mây từ Supabase về (Cloud -> Local)
    const { data: remoteProfiles, error: selectError } = await supabase
      .from('user_numerology_profiles')
      .select('id, name, birth_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (selectError) throw selectError;

    const remoteItems: ProfileItem[] = (remoteProfiles || []).map((r) => ({
      id: r.id,
      fullName: r.name,
      birthDate: r.birth_date,
      gender: 'female',
    }));

    // 3. Tìm các hồ sơ ở máy cục bộ chưa có trên Cloud để đẩy lên (Local -> Cloud)
    const remoteKeySet = new Set(
      remoteItems.map((p) => `${p.fullName.trim().toLowerCase()}|${p.birthDate}`)
    );
    const localOnlyProfiles = localProfiles.filter((p: ProfileItem) =>
      !remoteKeySet.has(`${p.fullName.trim().toLowerCase()}|${p.birthDate}`)
    );

    if (localOnlyProfiles.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('user_numerology_profiles')
        .insert(
          localOnlyProfiles.map((p) => ({
            user_id: user.id,
            name: p.fullName,
            birth_date: p.birthDate,
          }))
        )
        .select('id, name, birth_date');

      if (!insertError && insertedData) {
        insertedData.forEach((ins) => {
          remoteItems.unshift({
            id: ins.id,
            fullName: ins.name,
            birthDate: ins.birth_date,
            gender: 'female',
          });
        });
      }
    }

    // 4. Hợp nhất 2 nguồn thành 1 danh sách duy nhất không trùng lặp và lưu vào máy
    const mergedMap = new Map<string, ProfileItem>();
    for (const item of remoteItems) {
      const key = `${item.fullName.trim().toLowerCase()}|${item.birthDate}`;
      mergedMap.set(key, item);
    }
    for (const item of localProfiles) {
      const key = `${item.fullName.trim().toLowerCase()}|${item.birthDate}`;
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        mergedMap.set(key, { ...existing, gender: item.gender || existing.gender });
      } else {
        mergedMap.set(key, item);
      }
    }

    const unifiedProfiles = Array.from(mergedMap.values());
    if (unifiedProfiles.length > 0) {
      await saveAllProfiles(unifiedProfiles);
      const activeId = await getActiveProfileId();
      if (!activeId || !unifiedProfiles.some((p) => p.id === activeId)) {
        await setActiveProfileId(unifiedProfiles[0].id);
      }
    }
  } catch (error) {
    console.warn('[Auth] Could not sync local profiles with Supabase:', error);
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
    },
    async signInWithGoogle() {
      if (!supabase) throw configurationError();

      if (Platform.OS === 'web') {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) throw error;
      } else {
        // Dynamic redirect URL: works in Expo Go (exp://...), dev client, and standalone (numelyra://...)
        const redirectUrl = Linking.createURL('auth-callback');
        console.log('[Auth] Google OAuth redirectUrl:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) throw error;
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (result.type === 'success' && result.url) {
            const url = result.url;
            console.log('[Auth] OAuth callback URL received:', url);
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
