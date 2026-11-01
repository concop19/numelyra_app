import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import ProfilePickerModal from '../components/ProfilePickerModal';
import { AstrologyDetailView } from '../features/astrology/AstrologyDetailView';
import { AstrologyInsightSheet } from '../features/astrology/AstrologyInsightSheet';
import { AstrologyProfileFortunePrompt } from '../features/astrology/AstrologyProfileFortunePrompt';
import { AstrologyTodayView } from '../features/astrology/AstrologyTodayView';
import { BirthDataModal } from '../features/astrology/BirthDataModal';
import { NatalChartView } from '../features/astrology/NatalChartView';
import type {
  AstrologyDetailTarget,
  PlanetDetailMode,
} from '../features/astrology/astrologyPresentation';
import { useDailyAstroFortune } from '../features/astrology/useDailyAstroFortune';
import {
  profileItemToUserProfile,
  saveAstrologyBirthData,
  type ProfileItem,
  type UserProfile,
} from '../store/userProfile';
import { useProfiles } from '../store/profileContext';
import { useLocalization } from '../i18n/LocalizationContext';

type AstrologyStackParamList = {
  Today: undefined;
  NatalChart: undefined;
  Detail: {
    target: AstrologyDetailTarget;
    initialMode?: PlanetDetailMode;
  };
};

const Stack = createNativeStackNavigator<AstrologyStackParamList>();

function blurWebFocus(): void {
  if (Platform.OS !== 'web') return;
  const browserDocument = (globalThis as {
    document?: { activeElement?: { blur?: () => void } | null };
  }).document;
  browserDocument?.activeElement?.blur?.();
}

function afterWebFocusReleased(action: () => void): void {
  blurWebFocus();
  if (Platform.OS === 'web' && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(action);
    return;
  }
  action();
}

interface Props {
  profile?: UserProfile | null;
  onBack?: () => void;
  onOpenCalendar?: () => void;
}

export default function AstrologyScreen({ profile, onBack, onOpenCalendar }: Props) {
  const { l } = useLocalization();
  const { profiles, primaryProfileId, refreshProfiles } = useProfiles();
  const [viewProfileId, setViewProfileId] = useState(primaryProfileId);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(profile ?? null);
  const [profilePickerVisible, setProfilePickerVisible] = useState(false);
  const [birthDataVisible, setBirthDataVisible] = useState(false);
  const [insightVisible, setInsightVisible] = useState(false);
  const [pendingProfileItem, setPendingProfileItem] = useState<ProfileItem | null>(null);
  const [generationProfileId, setGenerationProfileId] = useState<string | null>(null);
  const primaryProfileRef = useRef<UserProfile | null>(profile ?? null);
  const viewProfileIdRef = useRef(viewProfileId);
  primaryProfileRef.current = profile ?? null;
  viewProfileIdRef.current = viewProfileId;
  const {
    currentDate,
    fortune,
    quota: fortuneQuota,
    metadata,
    loading,
    error,
    calculationError,
    retry,
  } = useDailyAstroFortune(activeProfile, viewProfileId, {
    // Chat owns the automatic primary-profile generation. Astrology only
    // reads local cache until the user explicitly opens the Fortune panel.
    autoGenerate: false,
    loadQuota: true,
  });
  const selectedProfileItem = profiles.find((item) => item.id === viewProfileId)
    ?? profiles.find((item) => item.id === primaryProfileId)
    ?? null;
  const selectedProfiles = useMemo(
    () => selectedProfileItem ? [selectedProfileItem] : [],
    [selectedProfileItem],
  );
  const birthDataProfile = useMemo(
    () => pendingProfileItem ? profileItemToUserProfile(pendingProfileItem) : activeProfile,
    [activeProfile, pendingProfileItem],
  );
  const astrologyDataQuality = useMemo(() => {
    const hasExactBirthTime = activeProfile?.birthTimeAccuracy
      ? activeProfile.birthTimeAccuracy === 'exact' && !!activeProfile.birthTime?.trim()
      : !!activeProfile?.birthTime?.trim();
    const missingBirthTime = !hasExactBirthTime;
    const missingBirthLocation = !activeProfile?.birthLocation;
    return {
      isEstimated: missingBirthTime || missingBirthLocation,
      missingBirthTime,
      missingBirthLocation,
    };
  }, [activeProfile?.birthLocation, activeProfile?.birthTime, activeProfile?.birthTimeAccuracy]);

  useFocusEffect(useCallback(() => {
    setViewProfileId(primaryProfileId);
    setActiveProfile(primaryProfileRef.current);
    setInsightVisible(false);
    setPendingProfileItem(null);
    setGenerationProfileId(null);
  }, [primaryProfileId]));

  useEffect(() => {
    if (profile && viewProfileId === primaryProfileId) setActiveProfile(profile);
  }, [
    profile?.birthDate,
    profile?.birthLocation?.placeId,
    profile?.birthTime,
    profile?.birthTimeAccuracy,
    profile?.fullName,
    primaryProfileId,
    viewProfileId,
  ]);

  useEffect(() => {
    if (selectedProfileItem) {
      const next = profileItemToUserProfile(selectedProfileItem);
      if (next) setActiveProfile(next);
      return;
    }
    if (primaryProfileId) setViewProfileId(primaryProfileId);
  }, [primaryProfileId, selectedProfileItem]);

  const applySelectedProfile = useCallback((item: ProfileItem) => {
    const next = profileItemToUserProfile(item);
    if (!next) return;
    setViewProfileId(item.id);
    setActiveProfile(next);
    setInsightVisible(false);
  }, []);

  const createFortuneForProfile = useCallback((item: ProfileItem) => {
    if (!profileItemToUserProfile(item)) return;
    applySelectedProfile(item);
    setPendingProfileItem(null);
    setGenerationProfileId(item.id);
  }, [applySelectedProfile]);

  const saveBirthData = useCallback(async (next: UserProfile) => {
    const targetProfileId = pendingProfileItem?.id ?? viewProfileId ?? undefined;
    await saveAstrologyBirthData(next, targetProfileId);
    await refreshProfiles();

    if (pendingProfileItem) {
      const updatedItem: ProfileItem = {
        ...pendingProfileItem,
        birthTime: next.birthTime,
        birthPlace: next.birthPlace,
        birthLocation: next.birthLocation,
        birthTimeAccuracy: next.birthTimeAccuracy,
      };
      createFortuneForProfile(updatedItem);
      return;
    }

    setActiveProfile(next);
    setInsightVisible(false);
  }, [createFortuneForProfile, pendingProfileItem, refreshProfiles, viewProfileId]);

  useEffect(() => {
    if (!generationProfileId || generationProfileId !== viewProfileId) return;
    const requestedProfileId = generationProfileId;
    setGenerationProfileId(null);
    void retry().then((availableFortune) => {
      if (availableFortune && viewProfileIdRef.current === requestedProfileId) {
        setInsightVisible(true);
      }
    });
  }, [generationProfileId, retry, viewProfileId]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Today"
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
          contentStyle: styles.navigatorContent,
        }}
      >
        <Stack.Screen name="Today">
          {({ navigation }) => (
            <AstrologyTodayView
              profile={activeProfile}
              isPrimaryProfile={viewProfileId === primaryProfileId}
              currentDate={currentDate}
              metadata={metadata}
              fortune={fortune}
              loading={loading}
              fortuneQuota={fortuneQuota}
              error={error}
              calculationError={calculationError}
              onBack={() => onBack?.()}
              onOpenCalendar={onOpenCalendar}
              onOpenProfile={() => afterWebFocusReleased(() => setProfilePickerVisible(true))}
              onOpenBirthData={() => afterWebFocusReleased(() => { if (activeProfile) setBirthDataVisible(true); })}
              onOpenNatal={() => afterWebFocusReleased(() => navigation.navigate('NatalChart'))}
              onOpenDetail={(target) => afterWebFocusReleased(() => navigation.navigate('Detail', {
                target,
                initialMode: target.kind === 'planet' ? 'transit' : undefined,
              }))}
              onOpenInterpretation={() => afterWebFocusReleased(() => {
                void (async () => {
                  const availableFortune = fortune ?? await retry();
                  if (availableFortune) setInsightVisible(true);
                })();
              })}
              onRetry={() => void retry()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="NatalChart">
          {({ navigation }) => (
            <NatalChartView
              profile={activeProfile}
              metadata={metadata}
              calculationError={calculationError}
              onBack={() => afterWebFocusReleased(() => navigation.goBack())}
              onEditBirthData={() => afterWebFocusReleased(() => { if (activeProfile) setBirthDataVisible(true); })}
              onOpenDetail={(target) => afterWebFocusReleased(() => navigation.navigate('Detail', {
                target,
                initialMode: target.kind === 'planet' ? 'natal' : undefined,
              }))}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Detail">
          {({ navigation, route }) => (
            <AstrologyDetailView
              target={route.params.target}
              initialMode={route.params.initialMode}
              metadata={metadata}
              onBack={() => afterWebFocusReleased(() => navigation.goBack())}
              onEditBirthData={() => afterWebFocusReleased(() => { if (activeProfile) setBirthDataVisible(true); })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>

      <ProfilePickerModal
        visible={profilePickerVisible}
        selectedProfiles={selectedProfiles}
        allowCoupleMode={false}
        onClose={() => setProfilePickerVisible(false)}
        onProfilesSelected={(items) => {
          const selected = items[0];
          if (!selected || selected.id === viewProfileId) return;
          setPendingProfileItem(selected);
        }}
        managementMode="add-only"
        onProfilesChanged={refreshProfiles}
        primaryProfileId={primaryProfileId}
        title={l('Xem chiêm tinh cho ai?', 'Whose astrology?')}
        promptNotice={l(
          'Mỗi hồ sơ có một Fortune riêng. Chọn hồ sơ để xem thông tin trước khi tạo Fortune hôm nay.',
          "Each profile has its own Fortune. Choose one to review its details before creating today's Fortune.",
        )}
      />

      {!!pendingProfileItem && !birthDataVisible && (
        <AstrologyProfileFortunePrompt
          profile={pendingProfileItem}
          quota={fortuneQuota}
          onCancel={() => setPendingProfileItem(null)}
          onCompleteBirthData={() => setBirthDataVisible(true)}
          onCreate={() => createFortuneForProfile(pendingProfileItem)}
        />
      )}

      {!!birthDataProfile && (
        <BirthDataModal
          visible={birthDataVisible}
          profile={birthDataProfile}
          onSave={saveBirthData}
          onClose={() => {
            setBirthDataVisible(false);
            if (pendingProfileItem) setPendingProfileItem(null);
          }}
        />
      )}

      <AstrologyInsightSheet
        visible={insightVisible}
        fortune={fortune}
        metadata={metadata}
        dataQuality={astrologyDataQuality}
        onClose={() => setInsightVisible(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#080C43',
  },
  navigatorContent: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#080C43',
  },
});
