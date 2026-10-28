import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import ProfilePickerModal from '../components/ProfilePickerModal';
import { AstrologyDetailView } from '../features/astrology/AstrologyDetailView';
import { AstrologyInsightSheet } from '../features/astrology/AstrologyInsightSheet';
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
  const primaryProfileRef = useRef<UserProfile | null>(profile ?? null);
  primaryProfileRef.current = profile ?? null;
  const {
    currentDate,
    fortune,
    metadata,
    loading,
    error,
    calculationError,
    retry,
    share,
  } = useDailyAstroFortune(activeProfile, viewProfileId);
  const selectedProfileItem = profiles.find((item) => item.id === viewProfileId)
    ?? profiles.find((item) => item.id === primaryProfileId)
    ?? null;
  const selectedProfiles = useMemo(
    () => selectedProfileItem ? [selectedProfileItem] : [],
    [selectedProfileItem],
  );

  useFocusEffect(useCallback(() => {
    setViewProfileId(primaryProfileId);
    setActiveProfile(primaryProfileRef.current);
    setInsightVisible(false);
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

  const saveBirthData = useCallback(async (next: UserProfile) => {
    await saveAstrologyBirthData(next, viewProfileId ?? undefined);
    await refreshProfiles();
    setActiveProfile(next);
    setInsightVisible(false);
  }, [refreshProfiles, viewProfileId]);

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
              onShare={() => void share()}
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
          if (selected) applySelectedProfile(selected);
        }}
        managementMode="add-only"
        onProfilesChanged={refreshProfiles}
        primaryProfileId={primaryProfileId}
        title={l('Xem chiêm tinh cho ai?', 'Whose astrology?')}
      />

      {!!activeProfile && (
        <BirthDataModal
          visible={birthDataVisible}
          profile={activeProfile}
          onSave={saveBirthData}
          onClose={() => setBirthDataVisible(false)}
        />
      )}

      <AstrologyInsightSheet
        visible={insightVisible}
        fortune={fortune}
        metadata={metadata}
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
