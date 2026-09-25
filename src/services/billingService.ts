import * as WebBrowser from 'expo-web-browser';

import { API_ENDPOINTS, authenticatedFetch } from './apiConfig';

export type BillingProvider = 'payos' | 'paypal';

export type BillingStatus = {
  authenticated: boolean;
  plan: 'free' | 'pro';
  canManageBilling?: boolean;
  checkoutPending?: boolean;
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
export async function beginCheckout(provider: BillingProvider): Promise<void> {
  const endpoint = provider === 'payos' ? API_ENDPOINTS.PAYOS_CHECKOUT : API_ENDPOINTS.PAYPAL_CHECKOUT;
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale: 'vi' }),
  });
  const data = await readPayload(response);
  const checkoutUrl = provider === 'payos' ? data.checkoutUrl : data.approvalUrl;
  if (!response.ok || !checkoutUrl) throw new Error(data.error || 'Không thể mở trang thanh toán.');

  await WebBrowser.openBrowserAsync(checkoutUrl);
}
