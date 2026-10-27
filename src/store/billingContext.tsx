import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  getBillingStatus,
  type BillingStatus,
  type QuotaFeature,
} from '../services/billingService';
import { useAuth } from './authContext';

export type BillingLoadState = 'loading' | 'ready' | 'guest' | 'error';

interface BillingContextValue {
  billing: BillingStatus | null;
  loadState: BillingLoadState;
  error: string;
  /** Explicit reloads are reserved for retry and completed purchase/restore actions. */
  reloadBilling(): Promise<void>;
  consumeQuota(feature: QuotaFeature, amount?: number): boolean;
  restoreQuota(feature: QuotaFeature, amount?: number): void;
  markQuotaEmpty(feature: QuotaFeature): void;
}

const BillingContext = createContext<BillingContextValue | null>(null);

// Survives provider remounts during the current JS runtime and prevents duplicate
// bootstrap requests for the same signed-in account.
let cachedAccountId: string | null = null;
let cachedBilling: BillingStatus | null = null;
let bootstrapRequest: { accountId: string; promise: Promise<BillingStatus> } | null = null;

export function BillingProvider({ children }: React.PropsWithChildren) {
  const { isReady: isAuthReady, user } = useAuth();
  const accountId = user?.id ?? null;
  const [billing, setBillingState] = useState<BillingStatus | null>(
    accountId && cachedAccountId === accountId ? cachedBilling : null,
  );
  const [loadState, setLoadState] = useState<BillingLoadState>(accountId ? 'loading' : 'guest');
  const [error, setError] = useState('');

  const storeBilling = useCallback((next: BillingStatus | null) => {
    cachedAccountId = accountId;
    cachedBilling = next;
    setBillingState(next);
  }, [accountId]);

  const loadOnce = useCallback(async (force = false) => {
    if (!accountId) {
      cachedAccountId = null;
      cachedBilling = null;
      setBillingState(null);
      setLoadState('guest');
      setError('');
      return;
    }

    if (!force && cachedAccountId === accountId && cachedBilling) {
      setBillingState(cachedBilling);
      setLoadState('ready');
      setError('');
      return;
    }

    setLoadState('loading');
    setError('');
    try {
      if (!bootstrapRequest || bootstrapRequest.accountId !== accountId) {
        bootstrapRequest = { accountId, promise: getBillingStatus() };
      }
      const result = await bootstrapRequest.promise;
      storeBilling(result);
      setLoadState(result.authenticated ? 'ready' : 'guest');
    } catch (caught) {
      setLoadState('error');
      setError(caught instanceof Error ? caught.message : 'Không thể tải hạn mức tài khoản.');
    } finally {
      if (bootstrapRequest?.accountId === accountId) bootstrapRequest = null;
    }
  }, [accountId, storeBilling]);

  useEffect(() => {
    if (!isAuthReady) return;
    void loadOnce(false);
  }, [isAuthReady, loadOnce]);

  const updateQuota = useCallback((feature: QuotaFeature, delta: number) => {
    setBillingState((current) => {
      const quota = current?.quota?.[feature];
      if (!current || !current.quota || !quota) return current;
      const nextUsed = Math.max(0, quota.used + delta);
      const nextRemaining = Math.max(0, Math.min(quota.limit, quota.remaining - delta));
      const next: BillingStatus = {
        ...current,
        quota: {
          ...current.quota,
          [feature]: { ...quota, used: nextUsed, remaining: nextRemaining },
        },
      };
      cachedAccountId = accountId;
      cachedBilling = next;
      return next;
    });
  }, [accountId]);

  const consumeQuota = useCallback((feature: QuotaFeature, amount = 1) => {
    const quota = billing?.quota?.[feature];
    if (!quota || amount <= 0 || quota.remaining < amount) return false;
    updateQuota(feature, amount);
    return true;
  }, [billing, updateQuota]);

  const restoreQuota = useCallback((feature: QuotaFeature, amount = 1) => {
    if (amount > 0) updateQuota(feature, -amount);
  }, [updateQuota]);

  const markQuotaEmpty = useCallback((feature: QuotaFeature) => {
    setBillingState((current) => {
      const quota = current?.quota?.[feature];
      if (!current || !current.quota || !quota) return current;
      const next: BillingStatus = {
        ...current,
        quota: {
          ...current.quota,
          [feature]: { ...quota, remaining: 0 },
        },
      };
      cachedAccountId = accountId;
      cachedBilling = next;
      return next;
    });
  }, [accountId]);

  const value = useMemo<BillingContextValue>(() => ({
    billing,
    loadState,
    error,
    reloadBilling: () => loadOnce(true),
    consumeQuota,
    restoreQuota,
    markQuotaEmpty,
  }), [billing, consumeQuota, error, loadOnce, loadState, markQuotaEmpty, restoreQuota]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used inside BillingProvider.');
  return context;
}
