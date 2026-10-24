import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import { beginCheckout } from '../services/billingService';
import {
  saveProfile,
  type ProfileGender,
  type ResolvedBirthLocation,
  type UserProfile,
} from '../store/userProfile';
import { useLocalization } from '../i18n/LocalizationContext';

interface Props {
  onComplete: () => void;
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
  title: string;
  description: string;
  image: ImageSource;
};

type StoredProgress = {
  step: number;
  draft: Draft;
  rewardClaimed: boolean;
};

const TOTAL_STEPS = 12;
const PROFILE_STEP = 6;
const PROGRESS_KEY = '@numelyra_onboarding_progress_v1';

const BACKGROUND = require('../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index1.png');
const HERO_MASCOT = require('../../assets/onboarding/heroes/mascot-720.png');
const HERO_CHAT = require('../../assets/onboarding/heroes/chat-720.png');
const HERO_LOVE = require('../../assets/onboarding/heroes/love-720.png');
const HERO_CALENDAR = require('../../assets/onboarding/heroes/calendar-720.png');
const HERO_WALLPAPER = require('../../assets/onboarding/heroes/wallpaper-720.png');
const HERO_ASTROLOGY = require('../../assets/onboarding/heroes/astrology-720.png');
const HERO_PROFILE = require('../../assets/onboarding/heroes/profile-720.png');
const HERO_COINS = require('../../assets/onboarding/heroes/coins-720.png');
const HERO_REWARD_CALENDAR = require('../../assets/onboarding/heroes/reward-calendar-720.png');
const HERO_CROWN = require('../../assets/onboarding/heroes/crown-720.png');
const REWARD_SOUND = require('../../assets/onboarding/sound/finish_1_o_dot.mp3');

const COIN_PARTICLES = [
  { delay: 0, rotate: 180, size: 30, x: -124, y: -235 },
  { delay: 45, rotate: -220, size: 36, x: -72, y: -300 },
  { delay: 90, rotate: 250, size: 32, x: -24, y: -255 },
  { delay: 20, rotate: -190, size: 40, x: 22, y: -330 },
  { delay: 70, rotate: 210, size: 34, x: 76, y: -270 },
  { delay: 120, rotate: -260, size: 29, x: 126, y: -225 },
  { delay: 150, rotate: 160, size: 25, x: 48, y: -205 },
] as const;

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    id: 'welcome',
    title: 'Chào mừng đến với\ntrợ lý phong thủy AI',
    description: 'Trò chuyện, xem vận mệnh, tạo hình nền và khám phá thế giới chiêm tinh ngay trên một ứng dụng.',
    image: HERO_MASCOT,
  },
  {
    id: 'chat',
    title: 'Trò chuyện với AI\nbất cứ điều gì',
    description: 'Đặt câu hỏi về cuộc sống, công việc, học tập hay những thắc mắc đời thường.',
    image: HERO_CHAT,
  },
  {
    id: 'love',
    title: 'Hỏi tình duyên',
    description: 'Nhận lời giải đáp về chuyện tình cảm, mối quan hệ và duyên phận.',
    image: HERO_LOVE,
  },
  {
    id: 'calendar',
    title: 'Xem lịch Can Chi',
    description: 'Tra cứu ngày âm dương, Can Chi, ngày tốt xấu và các thông tin phong thủy quan trọng.',
    image: HERO_CALENDAR,
  },
  {
    id: 'wallpaper',
    title: 'Tạo hình nền theo ý thích',
    description: 'Tạo những hình nền mang dấu ấn riêng theo chủ đề phong thủy, thiên nhiên hoặc chiêm tinh.',
    image: HERO_WALLPAPER,
  },
  {
    id: 'astrology',
    title: 'Xem chiêm tinh',
    description: 'Khám phá bản đồ sao, tính cách, định hướng và vận hạn theo chiêm tinh học.',
    image: HERO_ASTROLOGY,
  },
];

const FEATURE_SLIDES_EN: FeatureSlide[] = [
  { id: 'welcome', title: 'Welcome to your\nAI spiritual guide', description: 'Chat, explore your path, create wallpapers and discover astrology in one app.', image: HERO_MASCOT },
  { id: 'chat', title: 'Ask AI\nabout anything', description: 'Ask about life, work, learning or the questions on your mind.', image: HERO_CHAT },
  { id: 'love', title: 'Explore relationships', description: 'Reflect on love, relationships and meaningful connections.', image: HERO_LOVE },
  { id: 'calendar', title: 'Explore the Can Chi calendar', description: 'View lunar dates, Can Chi, favorable days and traditional guidance.', image: HERO_CALENDAR },
  { id: 'wallpaper', title: 'Create a personal wallpaper', description: 'Generate wallpapers inspired by feng shui, nature or astrology.', image: HERO_WALLPAPER },
  { id: 'astrology', title: 'Explore astrology', description: 'Discover your birth chart, personality themes and current transits.', image: HERO_ASTROLOGY },
];

const STEP_HEROES: ImageSource[] = [
  HERO_MASCOT,
  HERO_CHAT,
  HERO_LOVE,
  HERO_CALENDAR,
  HERO_WALLPAPER,
  HERO_ASTROLOGY,
  HERO_PROFILE,
  HERO_COINS,
  HERO_REWARD_CALENDAR,
  HERO_COINS,
  HERO_CROWN,
  HERO_MASCOT,
];

const EMPTY_DRAFT: Draft = {
  fullName: '',
  gender: null,
  birthDate: '',
  birthTime: '',
  birthPlace: '',
};

const MIN_BIRTH_DATE = new Date(1920, 0, 1);
const DEFAULT_BIRTH_DATE = new Date(2000, 0, 1);

function formatBirthDate(date: Date): string {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
}

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

function toHtmlDateValue(value: string): string {
  const date = parseBirthDate(value);
  if (!date) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function fromHtmlDateValue(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
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
    errors.birthDate = english ? 'Choose your birth date.' : 'Vui lòng chọn ngày sinh.';
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
      ? 'Use 24-hour HH:mm format, for example 08:30.'
      : 'Giờ sinh phải theo định dạng 24 giờ HH:mm, ví dụ 08:30.';
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
  return (
    <View style={styles.fieldGroup}>
      <View style={[styles.field, !!error && styles.fieldInvalid]}>
        <View style={styles.fieldIcon}><Ionicons name={icon} size={18} color={error ? '#FFB1C3' : '#FF91C5'} /></View>
        <View style={styles.fieldBody}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            accessibilityHint={error}
            accessibilityLabel={label}
            value={value}
            onBlur={onBlur}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#A79BD3"
            keyboardType={keyboardType}
            maxLength={maxLength}
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

function SelectionField({
  icon,
  label,
  value,
  placeholder,
  onPress,
  error,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={error}
        accessibilityLabel={label}
        activeOpacity={0.78}
        onPress={onPress}
        style={[styles.field, !!error && styles.fieldInvalid]}
      >
        <View style={styles.fieldIcon}><Ionicons name={icon} size={18} color={error ? '#FFB1C3' : '#FF91C5'} /></View>
        <View style={styles.fieldBody}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={[styles.selectionValue, !value && styles.selectionPlaceholder]}>
            {value || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#C8BDE8" />
      </TouchableOpacity>
      <FieldError message={error} />
    </View>
  );
}

function WebDateField({
  value,
  onChangeText,
  onBlur,
  error,
  english = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  english?: boolean;
}) {
  const maxDate = toHtmlDateValue(formatBirthDate(new Date()));

  return (
    <View style={styles.fieldGroup}>
      <View style={[styles.field, styles.webDateField, !!error && styles.fieldInvalid]}>
        <View style={styles.fieldIcon}><Ionicons name="calendar-outline" size={18} color={error ? '#FFB1C3' : '#FF91C5'} /></View>
        <View style={styles.fieldBody}>
          <Text style={styles.fieldLabel}>{english ? 'Birth date *' : 'Ngày sinh *'}</Text>
          <Text style={[styles.selectionValue, !value && styles.selectionPlaceholder]}>
            {value || (english ? 'Choose day/month/year' : 'Chọn ngày/tháng/năm')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#C8BDE8" />
        {React.createElement('input', {
          'aria-label': english ? 'Birth date' : 'Ngày sinh',
          'aria-invalid': Boolean(error),
          max: maxDate,
          min: '1920-01-01',
          onBlur,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            onChangeText(fromHtmlDateValue(event.currentTarget.value));
          },
          style: {
            border: 0,
            cursor: 'pointer',
            height: '100%',
            inset: 0,
            opacity: 0,
            position: 'absolute',
            width: '100%',
            zIndex: 3,
          },
          type: 'date',
          value: toHtmlDateValue(value),
        })}
      </View>
      <FieldError message={error} />
    </View>
  );
}

function CoinRewardBurst({ runId }: { runId: number }) {
  const particles = useRef(COIN_PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (runId === 0) return;
    particles.forEach((value) => value.setValue(0));
    Animated.parallel(
      particles.map((value, index) => (
        Animated.sequence([
          Animated.delay(COIN_PARTICLES[index].delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 820,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      )),
    ).start();
  }, [particles, runId]);

  if (runId === 0) return null;

  return (
    <View pointerEvents="none" style={styles.coinBurstLayer}>
      {COIN_PARTICLES.map((coin, index) => {
        const progress = particles[index];
        return (
          <Animated.View
            key={`${runId}-${index}`}
            style={[
              styles.flyingCoin,
              {
                height: coin.size,
                width: coin.size,
                borderRadius: coin.size / 2,
                opacity: progress.interpolate({
                  inputRange: [0, 0.08, 0.72, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0, coin.x * 0.2, coin.x],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 0.18, 1],
                      outputRange: [18, -42, coin.y],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.16, 0.7, 1],
                      outputRange: [0.35, 1.16, 0.92, 0.55],
                    }),
                  },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${coin.rotate}deg`],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="star" size={Math.round(coin.size * 0.48)} color="#9B5A15" />
          </Animated.View>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { locale, t } = useLocalization();
  const en = locale === 'en';
  const { height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [selectedCoinPack, setSelectedCoinPack] = useState(1);
  const [ready, setReady] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [selectedPlaceSuggestion, setSelectedPlaceSuggestion] = useState<BirthPlaceSuggestion | null>(null);
  const [profileTouched, setProfileTouched] = useState<Partial<Record<ProfileFieldName, boolean>>>({});
  const [profileSubmitAttempted, setProfileSubmitAttempted] = useState(false);
  const [birthPlaceResolutionError, setBirthPlaceResolutionError] = useState<string | null>(null);
  const [rewardAnimationRun, setRewardAnimationRun] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const rewardPulse = useRef(new Animated.Value(1)).current;
  const ambientPlayer = useAudioPlayer(TAROT_AMBIENT_AUDIO, { keepAudioSessionActive: true });
  const rewardSound = useAudioPlayer(REWARD_SOUND, { keepAudioSessionActive: true });

  const compact = height < 720;
  const selectedBirthDate = useMemo(
    () => parseBirthDate(draft.birthDate) ?? DEFAULT_BIRTH_DATE,
    [draft.birthDate],
  );
  const {
    suggestions: placeSuggestions,
    searching: searchingPlace,
    searchError: placeSearchError,
  } = useBirthPlaceSuggestions({
    query: draft.birthPlace,
    existingLabel: draft.birthLocation?.userLabel,
    selectedLabel: selectedPlaceSuggestion?.userLabel,
    enabled: ready && step === PROFILE_STEP,
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
            initialStep = Math.min(Math.max(progress.step, 0), TOTAL_STEPS - 1);
            if (mounted) setStep(initialStep);
          }
          if (progress.draft && mounted) setDraft({ ...EMPTY_DRAFT, ...progress.draft });
          if (mounted) setRewardClaimed(Boolean(progress.rewardClaimed));
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
    const progress: StoredProgress = { step, draft, rewardClaimed };
    void AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [draft, ready, rewardClaimed, step]);

  useEffect(() => {
    if (!ready) return;
    const nextHero = STEP_HEROES[Math.min(step + 1, STEP_HEROES.length - 1)];
    void Image.loadAsync(nextHero).catch(() => undefined);
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

  const handleBirthDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowBirthDatePicker(false);
    if (event.type === 'dismissed' || !date) return;
    touchProfileField('birthDate');
    setDraft((value) => ({ ...value, birthDate: formatBirthDate(date) }));
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

  const claimDailyReward = () => {
    if (rewardClaimed) {
      next();
      return;
    }

    setRewardClaimed(true);
    setRewardAnimationRun((value) => value + 1);
    rewardPulse.setValue(0.72);
    Animated.sequence([
      Animated.spring(rewardPulse, {
        toValue: 1.22,
        speed: 24,
        bounciness: 12,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(rewardPulse, {
        toValue: 1,
        speed: 22,
        bounciness: 7,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (canSetAudioPlayerVolume()) rewardSound.volume = 0.58;
      rewardSound.play();
    } catch {
      // Reward claiming still succeeds when audio playback is unavailable.
    }
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
      onComplete();
    } catch {
      Alert.alert(en ? 'Unable to finish' : 'Không thể hoàn tất', en ? 'Your data was not saved. Please try again.' : 'Dữ liệu của bạn chưa được lưu. Vui lòng thử lại.');
    } finally {
      setFinishing(false);
    }
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await beginCheckout('payos');
      goTo(11);
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

  const featureSlides = en ? FEATURE_SLIDES_EN : FEATURE_SLIDES;
  const feature = step < featureSlides.length ? featureSlides[step] : null;

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
            {feature ? (
              <View style={styles.featurePage}>
                <View style={styles.featureCopy}>
                  <Text style={[styles.title, compact && styles.titleCompact]}>{feature.title}</Text>
                  <Text style={styles.description}>{feature.description}</Text>
                </View>
                <HeroImage key={feature.id} source={feature.image} imageKey={feature.id} compact={compact} />
                <View style={styles.featureFooter}>
                  <Pagination active={step} english={en} />
                  <PrimaryButton label={en ? 'Next' : 'Tiếp theo'} onPress={next} />
                </View>
              </View>
            ) : step === 6 ? (
              <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                    {Platform.OS === 'web' ? (
                      <WebDateField
                        english={en}
                        value={draft.birthDate}
                        error={visibleProfileError('birthDate')}
                        onBlur={() => touchProfileField('birthDate')}
                        onChangeText={(birthDate) => {
                          touchProfileField('birthDate');
                          setDraft((current) => ({ ...current, birthDate }));
                        }}
                      />
                    ) : (
                      <SelectionField
                        icon="calendar-outline"
                        label={en ? 'Birth date *' : 'Ngày sinh *'}
                        value={draft.birthDate}
                        placeholder={en ? 'Choose day/month/year' : 'Chọn ngày/tháng/năm'}
                        error={visibleProfileError('birthDate')}
                        onPress={() => setShowBirthDatePicker(true)}
                      />
                    )}
                    {showBirthDatePicker && Platform.OS !== 'web' && (
                      <View style={styles.datePickerPanel}>
                        <DateTimePicker
                          value={selectedBirthDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'inline' : 'default'}
                          minimumDate={MIN_BIRTH_DATE}
                          maximumDate={new Date()}
                          onChange={handleBirthDateChange}
                          accentColor="#F47BB5"
                        />
                        {Platform.OS === 'ios' && (
                          <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowBirthDatePicker(false)}>
                            <Text style={styles.datePickerDoneText}>{en ? 'Done' : 'Xong'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
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
                      placeholder={en ? 'HH:mm (optional)' : 'HH:mm (có thể bỏ qua)'}
                      keyboardType="numeric"
                      maxLength={5}
                      error={visibleProfileError('birthTime')}
                      onBlur={() => touchProfileField('birthTime')}
                      onChangeText={(birthTime) => setDraft((value) => ({ ...value, birthTime }))}
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
            ) : step === 7 ? (
              <InfoPage title={en ? 'Coin system' : 'Hệ thống xu'} description={en ? 'Use coins to enjoy special app features.' : 'Sử dụng xu để trải nghiệm các tính năng đặc biệt của ứng dụng.'} hero={HERO_COINS} compact={compact}>
                <View style={styles.infoCard}>
                  <InfoRow icon="gift-outline" label={en ? 'Daily check-in' : 'Điểm danh hằng ngày'} value={en ? '+10 coins' : '+10 xu'} />
                  <InfoRow icon="chatbubble-ellipses-outline" label={en ? 'General questions' : 'Hỏi đáp thông thường'} value={en ? '-2 coins' : '-2 xu'} />
                  <InfoRow icon="heart-outline" label={en ? 'Relationship questions' : 'Hỏi đáp về tình duyên'} value={en ? '-3 coins' : '-3 xu'} />
                  <InfoRow icon="sparkles-outline" label={en ? 'Calendar, wallpaper and astrology' : 'Lịch, hình nền và chiêm tinh'} value={en ? 'Free' : 'Miễn phí'} />
                </View>
                <PrimaryButton label={en ? 'Got it' : 'Đã hiểu'} onPress={next} />
              </InfoPage>
            ) : step === 8 ? (
              <InfoPage title={en ? 'Daily check-in' : 'Điểm danh mỗi ngày'} description={en ? 'Come back every day to receive 10 free coins!' : 'Quay lại mỗi ngày để nhận 10 xu miễn phí!'} hero={HERO_REWARD_CALENDAR} compact={compact}>
                <View style={styles.rewardValueWrap}>
                  <CoinRewardBurst runId={rewardAnimationRun} />
                  <Animated.Text style={[styles.rewardValue, { transform: [{ scale: rewardPulse }] }]}>+10 <Text style={styles.rewardUnit}>{en ? 'coins' : 'xu'}</Text></Animated.Text>
                </View>
                <View style={styles.streakCard}>
                  <Text style={styles.streakTitle}>{en ? 'Daily streak' : 'Chuỗi ngày liên tiếp'}</Text>
                  <View style={styles.streakDays}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <View key={day} style={styles.streakDayWrap}>
                        <View style={[styles.streakDay, day === 1 && styles.streakDayActive]}>{day === 1 && <Ionicons name="checkmark" size={15} color="#472064" />}</View>
                        <Text style={styles.streakDayText}>{en ? 'D' : 'N'}{day}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <PrimaryButton label={rewardClaimed ? (en ? 'Continue' : 'Tiếp tục') : (en ? 'Check in now' : 'Điểm danh ngay')} icon={rewardClaimed ? 'arrow-forward' : 'checkmark'} onPress={claimDailyReward} />
                {rewardClaimed && <TouchableOpacity onPress={next} style={styles.inlineLink}><Text style={styles.inlineLinkText}>{en ? 'Continue' : 'Tiếp tục'}</Text></TouchableOpacity>}
              </InfoPage>
            ) : step === 9 ? (
              <InfoPage title={en ? 'Get more coins' : 'Mua thêm xu'} description={en ? 'Choose a pack to keep exploring without interruption.' : 'Chọn gói phù hợp để trải nghiệm không gián đoạn.'} hero={HERO_COINS} compact>
                <View style={styles.tabs}><View style={styles.tabActive}><Text style={styles.tabActiveText}>{en ? 'Coin packs' : 'Gói xu'}</Text></View><View style={styles.tab}><Text style={styles.tabText}>{en ? 'Monthly plan' : 'Gói tháng'}</Text></View></View>
                <View style={styles.packList}>
                  {[
                    [en ? '100 coins' : '100 xu', '29.000đ'],
                    [en ? '300 coins' : '300 xu', '79.000đ'],
                    [en ? '700 coins' : '700 xu', '179.000đ'],
                    [en ? '1,500 coins' : '1.500 xu', '349.000đ'],
                  ].map(([amount, price], index) => (
                    <TouchableOpacity key={amount} onPress={() => setSelectedCoinPack(index)} style={[styles.packRow, selectedCoinPack === index && styles.packRowSelected]}>
                      <View style={styles.coinBadge}><Ionicons name="star" size={16} color="#8B4E28" /></View>
                      <Text style={styles.packAmount}>{amount}</Text>
                      <Text style={styles.packPrice}>{price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.note}>{en ? 'Coin purchases will be available when the coin wallet is activated.' : 'Giao dịch xu sẽ được mở khi ví xu được kích hoạt.'}</Text>
                <PrimaryButton label={en ? 'Continue' : 'Tiếp tục'} onPress={next} />
              </InfoPage>
            ) : step === 10 ? (
              <InfoPage title={en ? 'Monthly plan' : 'Gói tháng'} description={en ? 'Save more and enjoy every feature at a preferred price.' : 'Tiết kiệm hơn và trải nghiệm đầy đủ tính năng với mức giá ưu đãi.'} hero={HERO_CROWN} compact={compact}>
                <View style={styles.planCard}>
                  <View><Text style={styles.planLabel}>{en ? 'Monthly plan' : 'Gói tháng'}</Text><Text style={styles.planPrice}>99.000đ<Text style={styles.planUnit}> / {en ? 'month' : 'tháng'}</Text></Text></View>
                  <Ionicons name="diamond" size={25} color="#FFD38F" />
                </View>
                <View style={styles.benefitList}>
                  {(en ? ['Receive 1,000 coins every month', 'Preferred price on extra coins', 'Access the full feature set', 'Early access to new features'] : ['Nhận 1.000 xu mỗi tháng', 'Ưu đãi khi mua thêm xu', 'Trải nghiệm đầy đủ các tính năng', 'Cập nhật tính năng mới sớm nhất']).map((item) => (
                    <View key={item} style={styles.benefitRow}><Ionicons name="checkmark-circle" size={18} color="#FFB48E" /><Text style={styles.benefitText}>{item}</Text></View>
                  ))}
                </View>
                <PrimaryButton label={en ? 'Subscribe now' : 'Đăng ký ngay'} onPress={startCheckout} loading={checkoutLoading} icon="sparkles" />
                <TouchableOpacity onPress={next} style={styles.inlineLink}><Text style={styles.inlineLinkText}>{en ? 'Continue with the free plan' : 'Tiếp tục với gói miễn phí'}</Text></TouchableOpacity>
              </InfoPage>
            ) : (
              <InfoPage title={en ? 'Ready to explore!' : 'Sẵn sàng khám phá!'} description={en ? 'You can now chat, explore your fortune, create wallpapers and discover many more features.' : 'Giờ đây bạn có thể trò chuyện, xem tử vi, tạo hình nền và khám phá nhiều tính năng thú vị khác.'} hero={HERO_MASCOT} compact={compact}>
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
  fieldInvalid: { borderColor: '#FF91AA', backgroundColor: 'rgba(148,58,112,0.26)' },
  fieldIcon: { width: 31, height: 31, borderRadius: 9, backgroundColor: 'rgba(255,151,201,0.13)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fieldBody: { flex: 1, paddingVertical: 7 },
  fieldLabel: { color: '#F4EDFF', fontSize: 11, fontWeight: '700', marginBottom: 1 },
  fieldInput: { color: '#FFFFFF', fontSize: 14, paddingVertical: 4 },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, paddingHorizontal: 5, paddingTop: 5 },
  fieldErrorText: { flex: 1, color: '#FFD0DA', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  selectionValue: { color: '#FFFFFF', fontSize: 14, paddingVertical: 4 },
  selectionPlaceholder: { color: '#A79BD3' },
  webDateField: { position: 'relative' },
  datePickerPanel: { marginTop: -2, marginBottom: 9, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(244,235,255,0.96)', padding: 6 },
  datePickerDone: { alignSelf: 'flex-end', minWidth: 70, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F47BB5', marginRight: 6, marginBottom: 4 },
  datePickerDoneText: { color: '#3F246E', fontSize: 13, fontWeight: '800' },
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
  rewardValueWrap: { minHeight: 58, alignItems: 'center', justifyContent: 'center', overflow: 'visible', zIndex: 20 },
  rewardValue: { color: '#FFF8F2', fontSize: 40, fontWeight: '900', textAlign: 'center', textShadowColor: '#7B3EBA', textShadowRadius: 10 },
  rewardUnit: { fontSize: 24 },
  coinBurstLayer: { position: 'absolute', left: '50%', bottom: 8, width: 1, height: 1, zIndex: 30, overflow: 'visible' },
  flyingCoin: { position: 'absolute', left: -16, top: -16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFC85F', borderWidth: 2, borderColor: '#FFE9A8', shadowColor: '#FFD35E', shadowOpacity: 0.9, shadowRadius: 9, elevation: 8 },
  streakCard: { backgroundColor: 'rgba(45, 31, 119, 0.86)', borderRadius: 17, padding: 14 },
  streakTitle: { color: '#FFF7FF', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  streakDays: { flexDirection: 'row', justifyContent: 'space-between' },
  streakDayWrap: { alignItems: 'center', gap: 5 },
  streakDay: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#5D48B2', alignItems: 'center', justifyContent: 'center' },
  streakDayActive: { backgroundColor: '#F58ABB' },
  streakDayText: { color: '#BEB3DF', fontSize: 9 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 13, backgroundColor: 'rgba(71,50,147,0.74)' },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabActive: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFA7C6' },
  tabText: { color: '#D8D0EE', fontSize: 12, fontWeight: '700' },
  tabActiveText: { color: '#40216E', fontSize: 12, fontWeight: '800' },
  packList: { gap: 8 },
  packRow: { height: 52, borderRadius: 13, backgroundColor: 'rgba(72,52,155,0.7)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: 'transparent' },
  packRowSelected: { borderColor: '#FF9FC9', backgroundColor: 'rgba(102,67,185,0.86)' },
  coinBadge: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#FFC36F', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  packAmount: { flex: 1, color: '#FFF8FF', fontSize: 13, fontWeight: '800' },
  packPrice: { color: '#EDE5FF', fontSize: 12, fontWeight: '700' },
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
