import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { isSupabaseConfigured, mobileEnv } from '../config/env';

/**
 * The auth session is persisted in AsyncStorage, allowing a signed-in user to
 * remain signed in after closing the app. This client intentionally uses only
 * the public Supabase key; RLS protects user data on the server.
 */
export const supabase = isSupabaseConfigured
  ? createClient(mobileEnv.supabaseUrl, mobileEnv.supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export { isSupabaseConfigured };
