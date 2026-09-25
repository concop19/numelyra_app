/** Public runtime configuration for the Expo app. Do not add service-role keys here. */
export const mobileEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '',
  supabasePublishableKey: (
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim(),
};

export const isSupabaseConfigured = Boolean(
  mobileEnv.supabaseUrl && mobileEnv.supabasePublishableKey
);
