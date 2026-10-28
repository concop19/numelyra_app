import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { ProductSubscription, Purchase } from 'expo-iap';

import { API_ENDPOINTS, authenticatedFetch } from './apiConfig';
import type { AppLocale } from '../i18n/translations';

export type BillingProvider = 'payos' | 'paypal' | 'google_play';
export const GOOGLE_PLAY_PRODUCT_ID = 'numelyra_pro_monthly';
export const GOOGLE_PLAY_BASE_PLAN_ID = 'monthly';

export type QuotaFeature = 'ai_response' | 'daily_ca_dao' | 'daily_insight_back' | 'wallpaper';
export type QuotaStatus = Record<QuotaFeature, { limit: number; used: number; reserved: number; remaining: number }>;

export type BillingStatus = {
  authenticated: boolean;
  plan: 'free' | 'pro';
  canManageBilling?: boolean;
  checkoutPending?: boolean;
  periodStart?: string;
  periodEnd?: string;
  quota?: QuotaStatus | null;
  googlePlayObfuscatedAccountId?: string;
  subscription?: {
    provider?: BillingProvider;
    status?: string;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  } | null;
};

async function readPayload(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const response = await authenticatedFetch(API_ENDPOINTS.BILLING_SUBSCRIPTION, { cache: 'no-store' });
  const data = await readPayload(response);
  if (!response.ok) throw new Error(data.error || 'Không thể tải trạng thái gói Pro.');
  return data as BillingStatus;
}

/** Requests a checkout URL from the same Next.js APIs used by the website. */
export async function beginCheckout(provider: BillingProvider, locale: AppLocale = 'vi'): Promise<void> {
  if (Platform.OS === 'android') {
    if (provider !== 'google_play') throw new Error('Ứng dụng Android chỉ hỗ trợ thanh toán qua Google Play.');
    await purchaseGooglePlaySubscription();
    return;
  }
  if (provider === 'google_play') throw new Error('Google Play Billing chỉ khả dụng trên Android.');
  const endpoint = provider === 'payos' ? API_ENDPOINTS.PAYOS_CHECKOUT : API_ENDPOINTS.PAYPAL_CHECKOUT;
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  });
  const data = await readPayload(response);
  const checkoutUrl = provider === 'payos' ? data.checkoutUrl : data.approvalUrl;
  if (!response.ok || !checkoutUrl) throw new Error(data.error || 'Không thể mở trang thanh toán.');

  await WebBrowser.openBrowserAsync(checkoutUrl);
}

async function loadIap() {
  if (Platform.OS !== 'android') throw new Error('Google Play Billing chỉ khả dụng trên Android.');
  try {
    return await import('expo-iap');
  } catch {
    throw new Error('Google Play Billing cần development build hoặc EAS build; Expo Go không hỗ trợ IAP.');
  }
}

export async function getGooglePlayProduct(): Promise<ProductSubscription | null> {
  const iap = await loadIap();
  await iap.initConnection();
  const products = await iap.fetchProducts({ skus: [GOOGLE_PLAY_PRODUCT_ID], type: 'subs' });
  return (products?.find((product) => product.id === GOOGLE_PLAY_PRODUCT_ID) as ProductSubscription | undefined) || null;
}

export function getGooglePlayMonthlyDisplayPrice(product: ProductSubscription | null): string | null {
  if (!product) return null;
  if (product.platform !== 'android') return product.displayPrice || null;
  return product.subscriptionOffers.find((offer) => offer.basePlanIdAndroid === GOOGLE_PLAY_BASE_PLAN_ID)?.displayPrice
    || null;
}

async function verifyGooglePlayPurchase(purchase: Purchase): Promise<void> {
  if (purchase.productId !== GOOGLE_PLAY_PRODUCT_ID || purchase.purchaseState !== 'purchased' || !purchase.purchaseToken) {
    throw new Error('Giao dịch Google Play chưa hoàn tất.');
  }
  const response = await authenticatedFetch(API_ENDPOINTS.GOOGLE_PLAY_VERIFY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: GOOGLE_PLAY_PRODUCT_ID, purchaseToken: purchase.purchaseToken }),
  });
  const data = await readPayload(response);
  if (!response.ok || !data.verified) throw new Error(data.error || 'Không thể xác minh giao dịch Google Play.');
}

export async function purchaseGooglePlaySubscription(): Promise<void> {
  const status = await getBillingStatus();
  if (!status.authenticated || !status.googlePlayObfuscatedAccountId) throw new Error('Bạn cần đăng nhập trước khi mua gói Pro.');
  if (status.plan === 'pro') throw new Error('Bạn đang có một gói Pro hoạt động.');
  const iap = await loadIap();
  await iap.initConnection();
  const products = await iap.fetchProducts({ skus: [GOOGLE_PLAY_PRODUCT_ID], type: 'subs' });
  const product = products?.find((item) => item.id === GOOGLE_PLAY_PRODUCT_ID) as ProductSubscription | undefined;
  const selectedOffer = product?.platform === 'android'
    ? product.subscriptionOffers?.find((offer) => offer.basePlanIdAndroid === GOOGLE_PLAY_BASE_PLAN_ID)
    : undefined;
  const offerToken = selectedOffer?.offerTokenAndroid;
  if (!product || !offerToken) throw new Error('Gói NUMELYRA Pro chưa khả dụng trên Google Play cho tài khoản này.');

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('Google Play không phản hồi kịp thời.')); }, 120_000);
    const success = iap.purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== GOOGLE_PLAY_PRODUCT_ID) return;
      void (async () => {
        try {
          await verifyGooglePlayPurchase(purchase);
          await iap.finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
          cleanup();
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
    });
    const failure = iap.purchaseErrorListener((error) => { cleanup(); reject(new Error(error.message)); });
    const cleanup = () => { clearTimeout(timer); success.remove(); failure.remove(); };
    void iap.requestPurchase({
      request: {
        google: {
          skus: [GOOGLE_PLAY_PRODUCT_ID],
          subscriptionOffers: [{ sku: GOOGLE_PLAY_PRODUCT_ID, offerToken }],
          obfuscatedAccountId: status.googlePlayObfuscatedAccountId,
        },
      },
      type: 'subs',
    }).catch((error) => { cleanup(); reject(error); });
  });
}

export async function restoreGooglePlayPurchases(): Promise<boolean> {
  const iap = await loadIap();
  await iap.initConnection();
  const purchases = await iap.getAvailablePurchases();
  const candidates = purchases.filter((purchase) => purchase.productId === GOOGLE_PLAY_PRODUCT_ID && purchase.purchaseState === 'purchased');
  for (const purchase of candidates) {
    await verifyGooglePlayPurchase(purchase);
    await iap.finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
    return true;
  }
  return false;
}

export async function unlockDailyInsightBack(input: { profileKey: string; localDate: string; locale: AppLocale }) {
  const response = await authenticatedFetch(API_ENDPOINTS.DAILY_INSIGHT_UNLOCK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, requestId: `insight-${input.profileKey}-${input.localDate}` }),
  });
  const data = await readPayload(response);
  if (!response.ok || !data.unlocked) throw new Error(data.error || 'Không thể mở Daily Insight hôm nay.');
  return data as { unlocked: true; cached: boolean };
}
