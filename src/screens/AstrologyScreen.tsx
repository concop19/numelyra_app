import React, { useCallback, useEffect, useState } from 'react';
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
  getActiveProfile,
  saveAstrologyBirthData,
  type ProfileItem,
  type UserProfile,
} from '../store/userProfile';

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
  onProfileChange?: (profile: UserProfile) => void;
}

function profileItemToUserProfile(item: ProfileItem): UserProfile {
  return {
    fullName: item.fullName,
    birthDate: item.birthDate,
    gender: item.gender ?? 'female',
    birthTime: item.birthTime,
    birthPlace: item.birthPlace,
    birthLocation: item.birthLocation,
    birthTimeAccuracy: item.birthTimeAccuracy,
  };
}

export default function AstrologyScreen({ profile, onBack, onProfileChange }: Props) {
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(profile ?? null);
  const [selectedProfiles, setSelectedProfiles] = useState<ProfileItem[]>([]);
  const [profilePickerVisible, setProfilePickerVisible] = useState(false);
  const [birthDataVisible, setBirthDataVisible] = useState(false);
  const [insightVisible, setInsightVisible] = useState(false);
  const {
    currentDate,
    fortune,
    metadata,
    loading,
    error,
    calculationError,
    retry,
    share,
  } = useDailyAstroFortune(activeProfile);

  useEffect(() => {
    if (profile) setActiveProfile(profile);
  }, [
    profile?.birthDate,
    profile?.birthLocation?.placeId,
    profile?.birthTime,
    profile?.birthTimeAccuracy,
    profile?.fullName,
  ]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    void getActiveProfile().then((item) => {
      if (!mounted || !item) return;
      setSelectedProfiles([item]);
      setActiveProfile(profileItemToUserProfile(item));
    });
    return () => { mounted = false; };
  }, []));

  const applySelectedProfile = useCallback((item: ProfileItem) => {
    const next = profileItemToUserProfile(item);
    setSelectedProfiles([item]);
    setActiveProfile(next);
    setInsightVisible(false);
    onProfileChange?.(next);
  }, [onProfileChange]);

  const saveBirthData = useCallback(async (next: UserProfile) => {
    await saveAstrologyBirthData(next);
    setActiveProfile(next);
    setSelectedProfiles((current) => current.length > 0 ? [{ ...current[0], ...next }] : current);
    setInsightVisible(false);
    onProfileChange?.(next);
  }, [onProfileChange]);

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
              currentDate={currentDate}
              metadata={metadata}
              fortune={fortune}
              loading={loading}
              error={error}
              calculationError={calculationError}
              onBack={() => onBack?.()}
              onOpenProfile={() => afterWebFocusReleased(() => setProfilePickerVisible(true))}
              onOpenBirthData={() => afterWebFocusReleased(() => { if (activeProfile) setBirthDataVisible(true); })}
              onOpenNatal={() => afterWebFocusReleased(() => navigation.navigate('NatalChart'))}
              onOpenDetail={(target) => afterWebFocusReleased(() => navigation.navigate('Detail', {
                target,
                initialMode: target.kind === 'planet' ? 'transit' : undefined,
              }))}
              onOpenInterpretation={() => afterWebFocusReleased(() => setInsightVisible(true))}
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
