/**
 * apiConfig.ts - Cấu hình Base URL kết nối Backend API cho Mobile App
 * Tự động nhận diện môi trường:
 * - Web Browser: http://localhost:3200
 * - Android Emulator: http://10.0.2.2:3200
 * - iOS Simulator: http://localhost:3200
 * - Thiết bị thật (Expo Go / Production): EXPO_PUBLIC_API_URL hoặc IP LAN máy chủ
 */
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

const DEFAULT_PORT = 3200;
const PRODUCTION_API_URL = 'https://numelyra.online';

export const getApiBaseUrl = (): string => {
  // 1. Nếu có biến môi trường chỉ định từ file .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    let url = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    url = url.replace('loca1lhost', 'localhost');
    return url;
  }

  // 2. Tự động nhận diện trong môi trường phát triển (DEV)
  if (__DEV__) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:${DEFAULT_PORT}`;
    }
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${DEFAULT_PORT}`;
    }
    return `http://localhost:${DEFAULT_PORT}`;
  }

  // 3. Mặc định luôn kết nối tới Backend Production chính thức
  return PRODUCTION_API_URL;
};

export const API_ENDPOINTS = {
  get CHAT_AGENT() { return `${getApiBaseUrl()}/api/chat/agent`; },
  get CLASSIFY() { return `${getApiBaseUrl()}/api/chat/classify`; },
  get BAZI_LOVE() { return `${getApiBaseUrl()}/api/bazi-love/reading`; },
  get LUCKY_WALLPAPER() { return `${getApiBaseUrl()}/api/lucky-wallpaper/generate`; },
  get ASTRO_FORTUNE() { return `${getApiBaseUrl()}/api/astro/fortune`; },
  get BILLING_SUBSCRIPTION() { return `${getApiBaseUrl()}/api/billing/subscription`; },
  get PAYOS_CHECKOUT() { return `${getApiBaseUrl()}/api/billing/payos/checkout`; },
  get PAYPAL_CHECKOUT() { return `${getApiBaseUrl()}/api/billing/paypal/checkout`; },
};

/** Adds the mobile Supabase JWT so Next.js can associate a request with its user. */
export async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const headers: Record<string, string> = {
    ...((init.headers || {}) as Record<string, string>),
  };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return fetch(url, { ...init, headers });
}

/** Turns backend paths such as `/api/...` into URLs usable by native Image. */
export const resolveApiUrl = (url: string): string => {
  if (/^(https?:|data:)/i.test(url)) return url;
  return `${getApiBaseUrl()}${url.startsWith('/') ? url : `/${url}`}`;
};
