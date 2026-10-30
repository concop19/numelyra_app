import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocalization } from '../i18n/LocalizationContext';
import { useProfiles } from '../store/profileContext';

export default function CloudSyncPill() {
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const { cloudSyncState, syncNow } = useProfiles();
  const [dismissedRevision, setDismissedRevision] = useState(-1);

  useEffect(() => {
    if (cloudSyncState.status !== 'success') return;
    const revision = cloudSyncState.revision;
    const timer = setTimeout(() => setDismissedRevision(revision), 3000);
    return () => clearTimeout(timer);
  }, [cloudSyncState.revision, cloudSyncState.status]);

  if (
    cloudSyncState.status === 'idle'
    || (cloudSyncState.status === 'success' && dismissedRevision === cloudSyncState.revision)
  ) {
    return null;
  }

  const isSyncing = cloudSyncState.status === 'syncing';
  const hasError = cloudSyncState.status === 'error' || cloudSyncState.status === 'partial-error';
  const result = cloudSyncState.result;
  const message = isSyncing
    ? t('cloudSync.syncing')
    : hasError
      ? t('cloudSync.incomplete')
      : t('cloudSync.success')
        .replace('{{profiles}}', String(result?.profilesCount ?? 0))
        .replace('{{messages}}', String(result?.messagesCount ?? 0));

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
      <TouchableOpacity
        accessibilityRole={hasError ? 'button' : undefined}
        accessibilityLabel={message}
        activeOpacity={hasError ? 0.78 : 1}
        disabled={!hasError}
        onPress={() => { void syncNow(); }}
        style={[styles.pill, hasError && styles.pillError]}
      >
        {isSyncing ? (
          <ActivityIndicator color="#FFE2A6" size="small" />
        ) : (
          <Ionicons
            color={hasError ? '#FFD2DC' : '#FFE2A6'}
            name={hasError ? 'cloud-offline-outline' : 'sparkles'}
            size={17}
          />
        )}
        <Text numberOfLines={2} style={styles.text}>{message}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  pill: {
    maxWidth: 410,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 226, 166, 0.34)',
    backgroundColor: 'rgba(39, 25, 91, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#09031D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 9,
  },
  pillError: {
    borderColor: 'rgba(255, 164, 183, 0.42)',
    backgroundColor: 'rgba(83, 30, 73, 0.97)',
  },
  text: {
    flexShrink: 1,
    color: '#FFF7EA',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});
