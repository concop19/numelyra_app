import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Image, type ImageSource } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canSetAudioPlayerVolume } from '../services/audioPlatform';
import { TAROT_AMBIENT_AUDIO } from '../services/tarotAssets';

import ThreeDButton from '../components/ThreeDButton';
import { useBirthPlaceSuggestions } from '../features/astrology/useBirthPlaceSuggestions';
import {
  resolveBirthLocation,
  resolveBirthPlaceSuggestion,
  type BirthPlaceSuggestion,
} from '../services/astro/birthLocation';
import { beginCheckout, getGooglePlayMonthlyDisplayPrice, getGooglePlayProduct } from '../services/billingService';
import {
  saveProfile,
  type ProfileGender,
  type ResolvedBirthLocation,
  type UserProfile,
} from '../store/userProfile';
import { useLocalization } from '../i18n/LocalizationContext';
import type { AppLocale, TranslationKey } from '../i18n/translations';
import { formatBirthDateInput, formatBirthTimeInput } from '../utils/birthInputFormatting';

interface Props {
  onComplete: () => void | Promise<void>;
}

type Draft = {
  fullName: string;
  gender: ProfileGender | null;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  birthLocation?: ResolvedBirthLocation;
};

type ProfileFieldName = 'fullName' | 'birthDate' | 'gender' | 'birthTime' | 'birthPlace';
type ProfileErrors = Partial<Record<ProfileFieldName, string>>;

const PROFILE_FIELD_NAMES: ProfileFieldName[] = [
  'fullName',
  'birthDate',
  'gender',
  'birthTime',
  'birthPlace',
];

type FeatureSlide = {
  id: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  image: ImageSource;
};

type StoredProgress = {
  version?: number;
  step: number;
  draft: Draft;
};

const ONBOARDING_PROGRESS_VERSION = 2;
const LANGUAGE_STEP = 0;
const FEATURE_START_STEP = 1;
const PROFILE_STEP = 7;
const PLAN_LIMITS_STEP = 8;
const MONTHLY_PLAN_STEP = 9;
const FINAL_STEP = 10;
const TOTAL_STEPS = FINAL_STEP + 1;
const PROGRESS_KEY = '@numelyra_onboarding_progress_v1';

const BACKGROUND = require('../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index1.png');
const HERO_FLAME_GUIDE = require('../../assets/onboarding/heroes/flame-guide-hug.png');
const HERO_CHAT = require('../../assets/onboarding/heroes/chat-720.png');
const HERO_LOVE = require('../../assets/onboarding/heroes/love-720.png');
const HERO_CALENDAR = require('../../assets/onboarding/heroes/calendar-720.png');
const HERO_WALLPAPER = require('../../assets/onboarding/heroes/wallpaper-720.png');
const HERO_ASTROLOGY = require('../../assets/onboarding/heroes/astrology-720.png');
const HERO_PROFILE = require('../../assets/onboarding/heroes/profile-720.png');
const HERO_CROWN = require('../../assets/onboarding/heroes/crown-720.png');

const FEATURE_SLIDES: FeatureSlide[] = [
  { id: 'welcome', titleKey: 'onboarding.welcome.title', descriptionKey: 'onboarding.welcome.description', image: HERO_FLAME_GUIDE },
  { id: 'chat', titleKey: 'onboarding.chat.title', descriptionKey: 'onboarding.chat.description', image: HERO_CHAT },
  { id: 'love', titleKey: 'onboarding.love.title', descriptionKey: 'onboarding.love.description', image: HERO_LOVE },
  { id: 'calendar', titleKey: 'onboarding.calendar.title', descriptionKey: 'onboarding.calendar.description', image: HERO_CALENDAR },
  { id: 'wallpaper', titleKey: 'onboarding.wallpaper.title', descriptionKey: 'onboarding.wallpaper.description', image: HERO_WALLPAPER },
  { id: 'astrology', titleKey: 'onboarding.astrology.title', descriptionKey: 'onboarding.astrology.description', image: HERO_ASTROLOGY },
];

const STEP_HEROES: ImageSource[] = [
  HERO_FLAME_GUIDE,
  HERO_FLAME_GUIDE,
  HERO_CHAT,
  HERO_LOVE,
  HERO_CALENDAR,
  HERO_WALLPAPER,
  HERO_ASTROLOGY,
  HERO_PROFILE,
  HERO_CROWN,
  HERO_CROWN,
  HERO_FLAME_GUIDE,
];

const EMPTY_DRAFT: Draft = {
  fullName: '',
  gender: null,
  birthDate: '',
  birthTime: '',
  birthPlace: '',
};

const MIN_BIRTH_DATE = new Date(1920, 0, 1);

function parseBirthDate(value: string): Date | null {
  const parts = value.trim().split(/[\/-]/).map(Number);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : null;
}

function getProfileErrors(draft: Draft, english: boolean): ProfileErrors {
  const errors: ProfileErrors = {};
  const birthDate = parseBirthDate(draft.birthDate);
  const birthTime = draft.birthTime.trim();
  const birthPlace = draft.birthPlace.trim();

  if (!draft.fullName.trim()) {
    errors.fullName = english ? 'Enter your full name.' : 'Vui lòng nhập họ và tên.';
  }

  if (!draft.birthDate.trim()) {
    errors.birthDate = english ? 'Enter your birth date.' : 'Vui lòng nhập ngày sinh.';
  } else if (!birthDate) {
    errors.birthDate = english ? 'Use a valid date in DD/MM/YYYY format.' : 'Ngày sinh không hợp lệ, hãy dùng định dạng DD/MM/YYYY.';
  } else if (birthDate < MIN_BIRTH_DATE || birthDate > new Date()) {
    errors.birthDate = english ? 'Birth date must be between 1920 and today.' : 'Ngày sinh phải từ năm 1920 đến hôm nay.';
  }

  if (!draft.gender) {
    errors.gender = english ? 'Choose your gender.' : 'Vui lòng chọn giới tính.';
  }

  if (birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    errors.birthTime = english
      ? 'Enter 4 digits in 24-hour time, for example 0830.'
      : 'Hãy nhập 4 chữ số theo giờ 24h, ví dụ 0830.';
  }

  if (!birthPlace) {
    errors.birthPlace = english ? 'Enter your birth place.' : 'Vui lòng nhập nơi sinh.';
  } else if (birthPlace.length < 3) {
    errors.birthPlace = english ? 'Enter at least 3 characters.' : 'Nơi sinh cần có ít nhất 3 ký tự.';
  }

  return errors;
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon = 'arrow-forward',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <ThreeDButton
      disabled={disabled}
      fullWidth
      label={label}
      loading={loading}
      onPress={onPress}
      shape="pill"
      size="lg"
      trailingIcon={<Ionicons name={icon} size={18} color="#4A267D" />}
      variant="brand"
    />
  );
}

function HeroImage({ source, imageKey, compact = false }: { source: ImageSource; imageKey: string; compact?: boolean }) {
  const floatValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, { toValue: -7, duration: 2100, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(floatValue, { toValue: 0, duration: 2100, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [floatValue]);

  return (
    <Animated.View style={[compact ? styles.heroCompact : styles.hero, { transform: [{ translateY: floatValue }] }]}>
      <Image
        source={source}
        style={styles.heroImage}
        contentFit="contain"
        transition={0}
        recyclingKey={imageKey}
        cachePolicy="memory-disk"
        priority="high"
        loading="eager"
        enforceEarlyResizing
      />
    </Animated.View>
  );
}

function Pagination({ active, english = false }: { active: number; english?: boolean }) {
  return (
    <View style={styles.pagination} accessibilityLabel={english ? `Page ${active + 1} of ${FEATURE_SLIDES.length}` : `Trang ${active + 1} trên ${FEATURE_SLIDES.length}`}>
      {FEATURE_SLIDES.map((_, index) => (
        <View key={index} style={[styles.dot, index === active && styles.dotActive]} />
      ))}
    </View>
  );
}

function Field({
  icon,
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  maxLength,
  error,
  onBlur,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  maxLength?: number;
  error?: string;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldInvalid]}>
        <View style={styles.fieldIcon}><Ionicons name={icon} size={18} color={error ? '#FFB1C3' : '#FF91C5'} /></View>
        <View style={styles.fieldBody}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            accessibilityHint={error}
            accessibilityLabel={label}
            value={value}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            onFocus={() => setFocused(true)}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#A79BD3"
            keyboardType={keyboardType}
            inputMode={keyboardType === 'numeric' ? 'numeric' : 'text'}
            maxLength={maxLength}
            selectionColor="#FFD1E5"
            cursorColor="#FFD1E5"
            underlineColorAndroid="transparent"
            style={styles.fieldInput}
          />
        </View>
      </View>
      <FieldError message={error} />
    </View>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.fieldErrorRow}>
      <Ionicons name="alert-circle" size={14} color="#FFB1C3" />
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  );
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { locale, preference, setPreference, t } = useLocalization();
  const [languageSaveError, setLanguageSaveError] = useState(false);
  const en = locale === 'en';
  const { height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [googlePlayPrice, setGooglePlayPrice] = useState<string | null>(null);
  const [selectedPlaceSuggestion, setSelectedPlaceSuggestion] = useState<BirthPlaceSuggestion | null>(null);
  const [profileTouched, setProfileTouched] = useState<Partial<Record<ProfileFieldName, boolean>>>({});
  const [profileSubmitAttempted, setProfileSubmitAttempted] = useState(false);
  const [birthPlaceResolutionError, setBirthPlaceResolutionError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const ambientPlayer = useAudioPlayer(TAROT_AMBIENT_AUDIO, { keepAudioSessionActive: true });

  const compact = height < 720;
  const {
    suggestions: placeSuggestions,
    searching: searchingPlace,
    searchError: placeSearchError,
  } = useBirthPlaceSuggestions({
    query: draft.birthPlace,
    existingLabel: draft.birthLocation?.userLabel,
    selectedLabel: selectedPlaceSuggestion?.userLabel,
    enabled: ready && step === PROFILE_STEP,
    locale,
  });

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      let initialStep = 0;
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        if (raw) {
          const progress = JSON.parse(raw) as Partial<StoredProgress>;
          if (typeof progress.step === 'number') {
            const storedStep = Math.min(Math.max(progress.step, 0), TOTAL_STEPS - 1);
            // v1 had no dedicated language step, so shift saved users forward once.
            initialStep = progress.version === ONBOARDING_PROGRESS_VERSION
              ? storedStep
              : Math.min(storedStep + 1, TOTAL_STEPS - 1);
            if (mounted) setStep(initialStep);
          }
          if (progress.draft && mounted) setDraft({ ...EMPTY_DRAFT, ...progress.draft });
        }
        await Promise.all([
          Image.loadAsync(STEP_HEROES[initialStep]),
          Image.loadAsync(STEP_HEROES[Math.min(initialStep + 1, STEP_HEROES.length - 1)]),
        ]);
      } catch {
        // The UI still renders if storage or eager decoding is unavailable.
      } finally {
        if (mounted) setReady(true);
      }
    };
    void hydrate();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const progress: StoredProgress = {
      version: ONBOARDING_PROGRESS_VERSION,
      step,
      draft,
    };
    void AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [draft, ready, step]);

  useEffect(() => {
    if (!ready) return;
    const nextHero = STEP_HEROES[Math.min(step + 1, STEP_HEROES.length - 1)];
    void Image.loadAsync(nextHero).catch(() => undefined);
  }, [ready, step]);

  useEffect(() => {
    if (!ready || Platform.OS !== 'android' || step !== MONTHLY_PLAN_STEP) return;
    let mounted = true;
    void getGooglePlayProduct()
      .then((product) => { if (mounted) setGooglePlayPrice(getGooglePlayMonthlyDisplayPrice(product)); })
      .catch(() => { if (mounted) setGooglePlayPrice(null); });
    return () => { mounted = false; };
  }, [ready, step]);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [fade, step]);

  useEffect(() => {
    try {
      void setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      }).catch(() => undefined);
      ambientPlayer.loop = true;
      if (canSetAudioPlayerVolume()) ambientPlayer.volume = 0.09;
      void ambientPlayer.seekTo(0).catch(() => undefined);
      ambientPlayer.play();
    } catch {
      // Onboarding remains usable when audio playback is unavailable.
    }

    return () => {
      try {
        ambientPlayer.pause();
      } catch {}
    };
  }, [ambientPlayer]);

  const profileErrors = useMemo(() => getProfileErrors(draft, en), [draft, en]);
  const visibleProfileError = (field: ProfileFieldName) => (
    profileSubmitAttempted || profileTouched[field] ? profileErrors[field] : undefined
  );
  const touchProfileField = (field: ProfileFieldName) => {
    setProfileTouched((current) => ({ ...current, [field]: true }));
  };

  const parsedProfile = useMemo<UserProfile | null>(() => {
    const date = parseBirthDate(draft.birthDate);
    if (
      !date
      || date < MIN_BIRTH_DATE
      || date > new Date()
      || !draft.fullName.trim()
      || !draft.gender
      || draft.birthPlace.trim().length < 3
    ) return null;

    const normalizedTime = draft.birthTime.trim();
    if (normalizedTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(normalizedTime)) return null;

    return {
      fullName: draft.fullName.trim(),
      gender: draft.gender,
      birthDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      birthTime: normalizedTime || undefined,
      birthPlace: draft.birthPlace.trim() || undefined,
      birthLocation: draft.birthLocation,
      birthTimeAccuracy: normalizedTime ? 'exact' : 'unknown',
    };
  }, [draft]);

  const goTo = (nextStep: number) => {
    void Haptics.selectionAsync();
    setStep(Math.min(Math.max(nextStep, 0), TOTAL_STEPS - 1));
  };

  const selectBirthPlace = (suggestion: BirthPlaceSuggestion) => {
    const birthLocation = resolveBirthPlaceSuggestion(suggestion);
    setBirthPlaceResolutionError(null);
    touchProfileField('birthPlace');
    setSelectedPlaceSuggestion(suggestion);
    setDraft((value) => ({
      ...value,
      birthPlace: suggestion.userLabel,
      birthLocation,
    }));
  };

  const completeProfileStep = async () => {
    setProfileSubmitAttempted(true);
    setProfileTouched(Object.fromEntries(PROFILE_FIELD_NAMES.map((field) => [field, true])));
    setBirthPlaceResolutionError(null);

    if (Object.keys(profileErrors).length > 0 || !parsedProfile) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const normalizedPlace = parsedProfile.birthPlace?.trim() ?? '';
    const resolvedLabel = parsedProfile.birthLocation?.userLabel.trim();
    if (
      parsedProfile.birthLocation
      && normalizedPlace.toLocaleLowerCase('vi-VN') === resolvedLabel?.toLocaleLowerCase('vi-VN')
    ) {
      goTo(step + 1);
      return;
    }

    if (Platform.OS === 'web') {
      goTo(step + 1);
      return;
    }

    setResolvingPlace(true);
    try {
      const birthLocation = selectedPlaceSuggestion?.userLabel === normalizedPlace
        ? resolveBirthPlaceSuggestion(selectedPlaceSuggestion)
        : await resolveBirthLocation(normalizedPlace);
      setDraft((value) => ({
        ...value,
        birthPlace: birthLocation.userLabel,
        birthLocation,
      }));
      setBirthPlaceResolutionError(null);
      goTo(step + 1);
    } catch {
      setBirthPlaceResolutionError(
        en
          ? 'We could not identify this place. Choose one from the suggestions and try again.'
          : 'Chưa xác định được nơi này. Hãy chọn một địa điểm trong danh sách gợi ý rồi thử lại.',
      );
      touchProfileField('birthPlace');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResolvingPlace(false);
    }
  };

  const next = () => {
    if (step === PROFILE_STEP) {
      void completeProfileStep();
      return;
    }
    goTo(step + 1);
  };

  const finish = async () => {
    if (!parsedProfile) {
      setProfileSubmitAttempted(true);
      setProfileTouched(Object.fromEntries(PROFILE_FIELD_NAMES.map((field) => [field, true])));
      goTo(PROFILE_STEP);
      return;
    }
    setFinishing(true);
    try {
      await saveProfile(parsedProfile);
      await AsyncStorage.removeItem(PROGRESS_KEY);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onComplete();
    } catch {
      Alert.alert(en ? 'Unable to finish' : 'Không thể hoàn tất', en ? 'Your data was not saved. Please try again.' : 'Dữ liệu của bạn chưa được lưu. Vui lòng thử lại.');
    } finally {
      setFinishing(false);
    }
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await beginCheckout(Platform.OS === 'android' ? 'google_play' : (locale === 'vi' ? 'payos' : 'paypal'), locale);
      goTo(FINAL_STEP);
    } catch (error) {
      Alert.alert(en ? 'Unable to open payment' : 'Chưa thể mở thanh toán', error instanceof Error ? error.message : (en ? 'Please try again later.' : 'Vui lòng thử lại sau.'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color="#FFA2C8" size="large" />
      </View>
    );
  }

  const featureIndex = step >= FEATURE_START_STEP && step < PROFILE_STEP
    ? step - FEATURE_START_STEP
    : null;
  const feature = featureIndex === null ? null : FEATURE_SLIDES[featureIndex];
  const chooseLanguage = (value: AppLocale) => {
    setLanguageSaveError(false);
    void setPreference(value).catch(() => setLanguageSaveError(true));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={BACKGROUND} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <LinearGradient colors={['rgba(14,11,76,0.28)', 'rgba(29,18,105,0.62)', 'rgba(30,18,105,0.94)']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.screen}>
          {step > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goTo(step - 1)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={23} color="#FFF7FF" />
            </Pressable>
          )}

          <Animated.View style={[styles.animatedPage, { opacity: fade }]}>
            {step === LANGUAGE_STEP ? (
              <View style={styles.languagePage}>
                <View style={styles.languageCopy}>
                  <View style={styles.languageIcon}>
                    <Ionicons name="language-outline" size={28} color="#FFD4E5" />
                  </View>
                  <Text style={[styles.title, compact && styles.titleCompact]}>{t('onboarding.language.title')}</Text>
                  <Text style={styles.description}>{t('onboarding.language.description')}</Text>
                </View>
                <HeroImage source={HERO_FLAME_GUIDE} imageKey="language" compact={compact} />
                <View style={styles.languageFooter}>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={t('language.title')}
                    style={styles.languageCardList}
                  >
                    {([
                      { value: 'vi', label: 'Tiếng Việt', hint: 'Sử dụng tiếng Việt' },
                      { value: 'en', label: 'English', hint: 'Use English' },
                    ] as const).map((option) => {
                      const selected = preference === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          accessibilityLabel={option.label}
                          onPress={() => chooseLanguage(option.value)}
                          style={[styles.languageCard, selected && styles.languageCardSelected]}
                        >
                          <View style={[styles.languageBadge, selected && styles.languageBadgeSelected]}>
                            <Text style={[styles.languageBadgeText, selected && styles.languageBadgeTextSelected]}>
                              {option.value === 'vi' ? 'VI' : 'EN'}
                            </Text>
                          </View>
                          <View style={styles.languageCardCopy}>
                            <Text style={[styles.languageCardTitle, selected && styles.languageCardTitleSelected]}>
                              {option.label}
                            </Text>
                            <Text style={[styles.languageCardHint, selected && styles.languageCardHintSelected]}>
                              {option.hint}
                            </Text>
                          </View>
                          <Ionicons
                            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={23}
                            color={selected ? '#53257B' : '#B9ACD8'}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                  {languageSaveError && (
                    <Text accessibilityRole="alert" style={styles.languageError}>{t('language.saveError')}</Text>
                  )}
                  <PrimaryButton
                    disabled={preference === 'system'}
                    label={t('onboarding.language.continue')}
                    onPress={next}
                  />
                </View>
              </View>
            ) : feature ? (
              <View style={styles.featurePage}>
                <View style={styles.featureCopy}>
                  <Text style={[styles.title, compact && styles.titleCompact]}>{t(feature.titleKey)}</Text>
                  <Text style={styles.description}>{t(feature.descriptionKey)}</Text>
                </View>
                <HeroImage key={feature.id} source={feature.image} imageKey={feature.id} compact={compact} />
                <View style={styles.featureFooter}>
                  <Pagination active={featureIndex ?? 0} english={en} />
                  <PrimaryButton label={t('onboarding.next')} onPress={next} />
                </View>
              </View>
            ) : step === PROFILE_STEP ? (
              <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <ScrollView
                  automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                  contentContainerStyle={styles.formScroll}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sectionTitle}>{en ? 'Tell us about yourself' : 'Nhập thông tin của bạn'}</Text>
                  <Text style={styles.sectionDescription}>{en ? 'This helps Numelyra personalize numerology, Can Chi and your birth chart.' : 'Thông tin giúp Numelyra cá nhân hóa thần số học, lịch Can Chi và bản đồ sao.'}</Text>
                  {!compact && <HeroImage source={HERO_PROFILE} imageKey="profile-form" compact />}
                  <View style={styles.formCard}>
                    <Field
                      icon="person-outline"
                      label={en ? 'Full name *' : 'Họ và tên *'}
                      value={draft.fullName}
                      placeholder={en ? 'Your name' : 'Nguyễn Văn A'}
                      error={visibleProfileError('fullName')}
                      onBlur={() => touchProfileField('fullName')}
                      onChangeText={(fullName) => setDraft((value) => ({ ...value, fullName }))}
                    />
                    <Field
                      icon="calendar-outline"
                      label={en ? 'Birth date *' : 'Ngày sinh *'}
                      value={draft.birthDate}
                      placeholder="DD/MM/YYYY"
                      keyboardType="numeric"
                      maxLength={10}
                      error={visibleProfileError('birthDate')}
                      onBlur={() => touchProfileField('birthDate')}
                      onChangeText={(birthDate) => setDraft((current) => ({
                        ...current,
                        birthDate: formatBirthDateInput(birthDate, current.birthDate),
                      }))}
                    />
                    <View style={styles.fieldGroup}>
                      <Text style={styles.genderGroupLabel}>{en ? 'Gender *' : 'Giới tính *'}</Text>
                      <View style={styles.genderRow}>
                        {(['female', 'male'] as const).map((gender) => (
                          <TouchableOpacity
                            key={gender}
                            accessibilityRole="button"
                            accessibilityState={{ selected: draft.gender === gender }}
                            onPress={() => {
                              touchProfileField('gender');
                              setDraft((value) => ({ ...value, gender }));
                            }}
                            style={[
                              styles.genderButton,
                              !!visibleProfileError('gender') && styles.genderButtonInvalid,
                              draft.gender === gender && styles.genderButtonActive,
                            ]}
                          >
                            <Ionicons name={gender === 'female' ? 'female' : 'male'} size={17} color={draft.gender === gender ? '#41206F' : '#C8BDE8'} />
                            <Text style={[styles.genderText, draft.gender === gender && styles.genderTextActive]}>{gender === 'female' ? (en ? 'Female' : 'Nữ') : (en ? 'Male' : 'Nam')}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <FieldError message={visibleProfileError('gender')} />
                    </View>
                    <Field
                      icon="time-outline"
                      label={en ? 'Birth time' : 'Giờ sinh'}
                      value={draft.birthTime}
                      placeholder={en ? '4 digits, e.g. 0830 (optional)' : '4 chữ số, ví dụ 0830 (có thể bỏ qua)'}
                      keyboardType="numeric"
                      maxLength={5}
                      error={visibleProfileError('birthTime')}
                      onBlur={() => touchProfileField('birthTime')}
                      onChangeText={(birthTime) => setDraft((value) => ({
                        ...value,
                        birthTime: formatBirthTimeInput(birthTime, value.birthTime),
                      }))}
                    />
                    <Field
                      icon="location-outline"
                      label={en ? 'Birth place *' : 'Nơi sinh *'}
                      value={draft.birthPlace}
                      placeholder={en ? 'Enter a city, for example London' : 'Nhập tên thành phố, ví dụ: Hà Nội'}
                      error={birthPlaceResolutionError || visibleProfileError('birthPlace')}
                      onBlur={() => touchProfileField('birthPlace')}
                      onChangeText={(birthPlace) => {
                        setBirthPlaceResolutionError(null);
                        setSelectedPlaceSuggestion(null);
                        setDraft((value) => ({ ...value, birthPlace, birthLocation: undefined }));
                      }}
                    />
                    {(searchingPlace || placeSuggestions.length > 0 || placeSearchError) && (
                      <View style={styles.placeSuggestionPanel}>
                        {searchingPlace && (
                          <View style={styles.placeSearchStatus}>
                            <ActivityIndicator size="small" color="#FF9FC9" />
                            <Text style={styles.placeSearchStatusText}>{en ? 'Searching places…' : 'Đang tìm địa điểm…'}</Text>
                          </View>
                        )}
                        {!searchingPlace && placeSuggestions.map((suggestion) => (
                          <TouchableOpacity
                            key={suggestion.placeId}
                            activeOpacity={0.74}
                            style={styles.placeSuggestionRow}
                            onPress={() => selectBirthPlace(suggestion)}
                          >
                            <Ionicons name="location-outline" size={18} color="#FF9FC9" />
                            <View style={styles.placeSuggestionCopy}>
                              <Text style={styles.placeSuggestionPrimary}>{suggestion.primaryText}</Text>
                              {!!suggestion.secondaryText && (
                                <Text numberOfLines={1} style={styles.placeSuggestionSecondary}>
                                  {suggestion.secondaryText}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                        {!searchingPlace && !!placeSearchError && (
                          <Text style={styles.placeSearchError}>{placeSearchError}</Text>
                        )}
                      </View>
                    )}
                    {!!draft.birthLocation && (
                      <View style={styles.resolvedPlaceBadge}>
                        <Ionicons name="checkmark-circle" size={17} color="#8EF0CB" />
                        <Text numberOfLines={2} style={styles.resolvedPlaceText}>
                          {en ? 'Resolved' : 'Đã xác định'} {draft.birthLocation.userLabel} · {draft.birthLocation.timeZoneIdentifier}
                        </Text>
                      </View>
                    )}
                  </View>
                  <PrimaryButton
                    label={resolvingPlace ? (en ? 'Resolving birth place…' : 'Đang xác định nơi sinh…') : (en ? 'Complete profile' : 'Hoàn tất thông tin')}
                    onPress={next}
                    loading={resolvingPlace}
                  />
                </ScrollView>
              </KeyboardAvoidingView>
            ) : step === PLAN_LIMITS_STEP ? (
              <InfoPage title={en ? 'Clear monthly limits' : 'Hạn mức tháng rõ ràng'} description={en ? 'No coins and no hidden conversions. Each successful result uses one clearly stated allowance.' : 'Không dùng xu và không quy đổi mơ hồ. Mỗi kết quả thành công dùng đúng một lượt được hiển thị rõ.'} hero={HERO_CROWN} compact={compact}>
                <View style={styles.infoCard}>
                  <InfoRow icon="chatbubble-ellipses-outline" label={en ? 'AI responses' : 'Trả lời AI'} value={en ? 'Free 10 · Pro 200' : 'Free 10 · Pro 200'} />
                  <InfoRow icon="book-outline" label={en ? "Today's verse" : 'Ca dao hôm nay'} value={en ? 'Free 7 · Pro 31' : 'Free 7 · Pro 31'} />
                  <InfoRow icon="sparkles-outline" label="Daily Insight" value={en ? 'Free 10 · Pro 31' : 'Free 10 · Pro 31'} />
                  <InfoRow icon="image-outline" label={en ? 'Wallpapers' : 'Hình nền'} value={en ? 'Free 2 · Pro 30' : 'Free 2 · Pro 30'} />
                </View>
                <PrimaryButton label={en ? 'Got it' : 'Đã hiểu'} onPress={next} />
              </InfoPage>
            ) : step === MONTHLY_PLAN_STEP ? (
              <InfoPage title={en ? 'Monthly plan' : 'Gói tháng'} description={en ? 'Save more and enjoy every feature at a preferred price.' : 'Tiết kiệm hơn và trải nghiệm đầy đủ tính năng với mức giá ưu đãi.'} hero={HERO_CROWN} compact={compact}>
                <View style={styles.planCard}>
                  <View><Text style={styles.planLabel}>NUMELYRA Pro</Text><Text style={styles.planPrice}>{Platform.OS === 'android' ? (googlePlayPrice || (en ? 'Loading Play price…' : 'Đang tải giá Play…')) : (locale === 'vi' ? '249.000đ' : '$9.99')}<Text style={styles.planUnit}> / {en ? 'month' : 'tháng'}</Text></Text></View>
                  <Ionicons name="diamond" size={25} color="#FFD38F" />
                </View>
                <View style={styles.benefitList}>
                  {(en ? ['200 AI responses per period', '31 Ca Dao unlocks and 31 Daily Insight backs', '30 wallpapers per period', 'Full cloud sync and history'] : ['200 lượt AI mỗi kỳ', '31 lượt ca dao và 31 mặt sau Daily Insight', '30 hình nền mỗi kỳ', 'Đồng bộ và lịch sử cloud đầy đủ']).map((item) => (
                    <View key={item} style={styles.benefitRow}><Ionicons name="checkmark-circle" size={18} color="#FFB48E" /><Text style={styles.benefitText}>{item}</Text></View>
                  ))}
                </View>
                <PrimaryButton label={en ? 'Subscribe now' : 'Đăng ký ngay'} onPress={startCheckout} loading={checkoutLoading} icon="sparkles" />
                <TouchableOpacity onPress={next} style={styles.inlineLink}><Text style={styles.inlineLinkText}>{en ? 'Continue with the free plan' : 'Tiếp tục với gói miễn phí'}</Text></TouchableOpacity>
              </InfoPage>
            ) : (
              <InfoPage title={en ? 'Ready to explore!' : 'Sẵn sàng khám phá!'} description={en ? 'You can now chat, explore your fortune, create wallpapers and discover many more features.' : 'Giờ đây bạn có thể trò chuyện, xem tử vi, tạo hình nền và khám phá nhiều tính năng thú vị khác.'} hero={HERO_FLAME_GUIDE} compact={compact}>
                <View style={styles.readyBadge}><Ionicons name="sparkles" size={18} color="#FFD4A2" /><Text style={styles.readyBadgeText}>{en ? 'Your journey starts here' : 'Hành trình của bạn bắt đầu từ đây'}</Text></View>
                <PrimaryButton label={en ? 'Get started' : 'Bắt đầu sử dụng'} onPress={() => void finish()} loading={finishing} icon="arrow-forward" />
              </InfoPage>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function InfoPage({
  title,
  description,
  hero,
  compact = false,
  children,
}: {
  title: string;
  description: string;
  hero: ImageSource;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.infoPage} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
      <HeroImage key={title} source={hero} imageKey={title} compact={compact} />
      <View style={styles.infoContent}>{children}</View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}><Ionicons name={icon} size={17} color="#FF9FC9" /></View>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#171061' },
  safeArea: { flex: 1, alignItems: 'center' },
  screen: { flex: 1, width: '100%', maxWidth: 520, overflow: 'hidden' },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171061' },
  animatedPage: { flex: 1 },
  languagePage: { flex: 1, paddingTop: 30, paddingHorizontal: 22, paddingBottom: 12 },
  languageCopy: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  languageIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: 'rgba(255,169,207,0.16)', borderWidth: 1, borderColor: 'rgba(255,215,235,0.26)' },
  languageFooter: { gap: 12 },
  languageCardList: { flexDirection: 'row', gap: 10 },
  languageCard: { flex: 1, minHeight: 86, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderRadius: 17, backgroundColor: 'rgba(56,35,125,0.88)', borderWidth: 1, borderColor: 'rgba(221,194,255,0.18)' },
  languageCardSelected: { backgroundColor: '#FFD1E1', borderColor: '#FFF1F7' },
  languageBadge: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 9, backgroundColor: 'rgba(255,164,204,0.14)' },
  languageBadgeSelected: { backgroundColor: 'rgba(83,37,123,0.12)' },
  languageBadgeText: { color: '#FFD4E5', fontSize: 11, fontWeight: '900' },
  languageBadgeTextSelected: { color: '#53257B' },
  languageCardCopy: { flex: 1 },
  languageCardTitle: { color: '#FFF8FF', fontSize: 14, fontWeight: '800' },
  languageCardTitleSelected: { color: '#44216E' },
  languageCardHint: { color: '#BFB2DE', fontSize: 10, marginTop: 3 },
  languageCardHintSelected: { color: '#76598E' },
  languageError: { color: '#FFD0DA', fontSize: 12, textAlign: 'center', marginTop: 6 },
  backButton: { position: 'absolute', top: 2, left: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  featurePage: { flex: 1, paddingTop: 36, paddingHorizontal: 22, paddingBottom: 12 },
  featureCopy: { minHeight: 150, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: '#FFF9FE', fontSize: 27, lineHeight: 34, fontWeight: '800', textAlign: 'center', textShadowColor: 'rgba(30, 10, 75, 0.75)', textShadowRadius: 8 },
  titleCompact: { fontSize: 24, lineHeight: 29 },
  description: { color: '#E4DCF7', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 390, marginTop: 12 },
  hero: { flex: 1, minHeight: 255, maxHeight: 420, alignItems: 'center', justifyContent: 'center' },
  heroCompact: { height: 210, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
  featureFooter: { gap: 16 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(204,182,242,0.46)' },
  dotActive: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#FFD3B1', shadowColor: '#FF9DC5', shadowOpacity: 0.8, shadowRadius: 8 },
  disabled: { opacity: 0.56 },
  formScroll: { flexGrow: 1, paddingTop: 48, paddingHorizontal: 20, paddingBottom: 16 },
  sectionTitle: { color: '#FFF9FE', fontSize: 23, lineHeight: 29, fontWeight: '800', textAlign: 'center', paddingHorizontal: 32 },
  sectionDescription: { color: '#DED6F4', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7, paddingHorizontal: 22 },
  formCard: { backgroundColor: 'rgba(48, 35, 125, 0.82)', borderRadius: 20, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(210,180,255,0.14)' },
  fieldGroup: { marginBottom: 9 },
  field: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(104,79,190,0.34)', borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 12 },
  fieldFocused: { borderColor: '#FFD1E5', backgroundColor: 'rgba(116,88,204,0.58)' },
  fieldInvalid: { borderColor: '#FF91AA', backgroundColor: 'rgba(148,58,112,0.26)' },
  fieldIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: 'rgba(255,151,201,0.13)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fieldBody: { flex: 1, paddingVertical: 7 },
  fieldLabel: { color: '#F4EDFF', fontSize: 11, fontWeight: '700', marginBottom: 1 },
  fieldInput: { minHeight: 30, color: '#FFFFFF', fontSize: 14, lineHeight: 20, paddingHorizontal: 0, paddingVertical: 4, textAlignVertical: 'center' },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingHorizontal: 5, paddingTop: 5 },
  fieldErrorText: { flex: 1, color: '#FFD0DA', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  genderGroupLabel: { color: '#F4EDFF', fontSize: 11, fontWeight: '700', marginBottom: 6, marginLeft: 2 },
  genderRow: { flexDirection: 'row', gap: 9 },
  genderButton: { flex: 1, minHeight: 43, borderRadius: 12, backgroundColor: 'rgba(104,79,190,0.34)', flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  genderButtonInvalid: { borderColor: '#FF91AA', backgroundColor: 'rgba(148,58,112,0.26)' },
  genderButtonActive: { backgroundColor: '#FFAAC8', borderColor: '#FFD5E3' },
  genderText: { color: '#D9D0EF', fontSize: 13, fontWeight: '700' },
  genderTextActive: { color: '#41206F' },
  placeSuggestionPanel: { marginTop: -2, marginBottom: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,159,201,0.28)', backgroundColor: 'rgba(32,24,93,0.98)', overflow: 'hidden' },
  placeSearchStatus: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeSearchStatusText: { color: '#DED5F3', fontSize: 12, fontWeight: '600' },
  placeSuggestionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(226,196,255,0.14)' },
  placeSuggestionCopy: { flex: 1 },
  placeSuggestionPrimary: { color: '#FFF8FF', fontSize: 13, fontWeight: '800' },
  placeSuggestionSecondary: { color: '#BBAFD9', fontSize: 11, marginTop: 3 },
  placeSearchError: { color: '#FFD0DB', fontSize: 11, lineHeight: 16, paddingHorizontal: 13, paddingVertical: 11 },
  resolvedPlaceBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -1, marginBottom: 9, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(60,160,132,0.18)', borderWidth: 1, borderColor: 'rgba(142,240,203,0.25)' },
  resolvedPlaceText: { flex: 1, color: '#D8FFF0', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  infoPage: { flexGrow: 1, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 14, position: 'relative' },
  infoContent: { marginTop: 5, gap: 12 },
  infoCard: { backgroundColor: 'rgba(45, 31, 119, 0.86)', borderRadius: 18, padding: 9, borderWidth: 1, borderColor: 'rgba(224,195,255,0.13)' },
  infoRow: { minHeight: 48, borderRadius: 12, backgroundColor: 'rgba(105,78,190,0.3)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginVertical: 4 },
  infoRowIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: 'rgba(255,151,201,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  infoRowLabel: { flex: 1, color: '#F4EEFF', fontSize: 12, fontWeight: '600' },
  infoRowValue: { color: '#FFD1E5', fontSize: 12, fontWeight: '800' },
  note: { color: '#BDB3DB', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  planCard: { minHeight: 76, borderRadius: 16, backgroundColor: 'rgba(55,35,130,0.86)', borderWidth: 1, borderColor: '#EE8BB7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  planLabel: { color: '#FFF2FA', fontSize: 13, fontWeight: '700' },
  planPrice: { color: '#FF9FC7', fontSize: 22, fontWeight: '900', marginTop: 2 },
  planUnit: { color: '#DED4F2', fontSize: 11, fontWeight: '600' },
  benefitList: { gap: 9, paddingHorizontal: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { color: '#EDE6FA', fontSize: 12, flex: 1 },
  inlineLink: { minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  inlineLinkText: { color: '#E8DFF6', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  readyBadge: { minHeight: 45, borderRadius: 14, backgroundColor: 'rgba(68,47,147,0.72)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  readyBadgeText: { color: '#F3EBFF', fontSize: 12, fontWeight: '700' },
});
