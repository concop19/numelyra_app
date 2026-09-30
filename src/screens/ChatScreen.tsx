/**
 * ChatScreen.tsx - Màn hình Chat với Tiểu Linh Miêu (Autonomous Spiritual AI Agent)
 * 
 * Tích hợp:
 * 1. AI Agent Decision Engine: Tự động phân tích câu hỏi + số lượng profile:
 *    - 2 người: TỰ ĐỘNG KÍCH HOẠT 5 LÁ TAROT + TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ (Cung Phu Thê, Ngũ Hành, Can Chi Hợp/Xung)
 *    - 1 người: Phân tích intent để quyết định (0 lá thuần 24 chỉ số, 1 lá thông điệp, 3 lá tiến trình, 5 lá A vs B)
 * 2. Profile Picker Modal (🔍) hỗ trợ chọn 1 hồ sơ hoặc chọn 2 hồ sơ để ghép đôi
 * 3. Voice-to-text (Speech-to-Text) tiếng Việt
 * 4. Hiển thị trực quan: Bảng Tứ Trụ Tử Vi, Thẻ bài Tarot, Option Split, Thần số học
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Keyboard,
  Animated, Easing, Image, Alert, ScrollView, Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { UserProfile, ProfileItem, getActiveProfile } from '../store/userProfile';
import { useAuth } from '../store/authContext';
import { startVoiceListening, stopVoiceListening, isVoiceSupported } from '../services/voiceService';
import ProfilePickerModal from '../components/ProfilePickerModal';
import { NumerologyCardsModal } from '../components/NumerologyCardsModal';
import TarotCardFlipView from '../components/TarotCardFlipView';
import { getTarotCardImage } from '../services/tarotAssets';
import { evaluateAgentDecision, AgentDecision } from '../services/agentDecisionEngine';
import { NumerologyCalculator, IndicatorInfo } from '../services/numerology24Service';
import { drawCardsForSpread, DrawnCardResult, TAROT_SPREADS } from '../services/tarotService';
import { computePersonTuViBazi, evaluateTuViBaziLove, TuViBaziSynastryResult } from '../services/tuViBaziService';
import { API_ENDPOINTS, authenticatedFetch } from '../services/apiConfig';
import { getBillingStatus } from '../services/billingService';
import ChatSceneBackground from '../components/chat/ChatSceneBackground';
import FlameMascot, { MascotState } from '../components/chat/FlameMascot';
import AnswerFlamePopup from '../components/chat/AnswerFlamePopup';
import ChatInputBar from '../components/chat/ChatInputBar';
import HighlightedAnswerText from '../components/chat/HighlightedAnswerText';
import { PlaceSearchContextModal } from '../components/chat/PlaceSearchContextModal';
import { PlaceSuggestionsCard } from '../components/chat/PlaceSuggestionsCard';
import { getOneTimePlaceLocation, type PlaceSearchContext, type PlaceSearchPreferences } from '../services/placeLocation';
import {
  clearChatHistory,
  loadChatHistory,
  MAX_STORED_CHAT_MESSAGES,
  saveChatHistory,
} from '../services/chatHistoryStorage';

const NORMAL_ACCOUNT_ICON = require('../../assets/giao_dien/normal.png');
const VIP_ACCOUNT_ICON = require('../../assets/giao_dien/vip.png');
const AMBIENT_GLOW_IMG = require('../../assets/giao_dien/ambient_glow.png');

export interface MessageItem {
  id: string;
  sender: 'user' | 'mascot';
  text: string;
  time: string;
  card?: any;
  isTypingCompleted?: boolean;
}

interface Props {
  profile?: UserProfile;
  onOpenSettings?: () => void;
}

const getRestoredFlippedCards = (history: MessageItem[]): Record<string, boolean> => {
  const restored: Record<string, boolean> = {};

  history.forEach((message) => {
    const drawnCards = message.card?.drawnCards;
    if (!Array.isArray(drawnCards)) return;

    drawnCards.forEach((_, index) => {
      restored[`${message.id}_${index}`] = true;
    });
  });

  return restored;
};

const IDLE_IMG = require('../../assets/char/idle.png');
const LISTENING_IMG = require('../../assets/char/listening.png');
const EXPLAIN_IMG = require('../../assets/char/explain.png');

const getCategoryFromText = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('tình cảm') || lower.includes('người yêu') || lower.includes('crush') || lower.includes('duyên') || lower.includes('kết hôn') || lower.includes('yêu') || lower.includes('hẹn hò') || lower.includes('chia tay')) return 'love';
  if (lower.includes('tiền') || lower.includes('tài lộc') || lower.includes('giàu') || lower.includes('tài chính') || lower.includes('đầu tư') || lower.includes('kinh doanh') || lower.includes('mua') || lower.includes('bán')) return 'money';
  if (lower.includes('công việc') || lower.includes('sự nghiệp') || lower.includes('làm ăn') || lower.includes('nghề') || lower.includes('học') || lower.includes('công ty') || lower.includes('sếp') || lower.includes('thăng tiến') || lower.includes('dự án')) return 'work';
  if (lower.includes('ngày xui') || lower.includes('kiêng') || lower.includes('cẩn thận') || lower.includes('vận hạn') || lower.includes('xui xẻo') || lower.includes('đen') || lower.includes('tai ương') || lower.includes('nguy hiểm')) return 'warning';
  if (lower.includes('quá khứ') || lower.includes('trước đây') || lower.includes('bài học') || lower.includes('tuổi thơ')) return 'past';
  if (lower.includes('tương lai') || lower.includes('năm tới') || lower.includes('sau này') || lower.includes('vận trình') || lower.includes('2026') || lower.includes('sắp tới') || lower.includes('tháng tới')) return 'future';
  if (lower.includes('gia đình') || lower.includes('người thân') || lower.includes('bố mẹ') || lower.includes('con cái') || lower.includes('cha mẹ') || lower.includes('nhà')) return 'family';
  if (lower.includes('sức khỏe') || lower.includes('bệnh') || lower.includes('khỏe') || lower.includes('ăn gì') || lower.includes('uống gì') || lower.includes('mệt') || lower.includes('thể chất') || lower.includes('tinh thần')) return 'health';
  if (lower.includes('quyết định') || lower.includes('lựa chọn') || lower.includes('nên hay không') || lower.includes('chọn') || lower.includes('hay là') || lower.includes('có nên') || lower.includes('phân vân')) return 'decision';
  return 'default';
};

const getFlameFilterStyle = (category: string) => {
  if (Platform.OS !== 'web') return {};

  if (category === 'future') {
    return { filter: 'grayscale(1) brightness(1.8) contrast(0.9)' };
  }

  const hueMap: Record<string, number> = {
    default: 0,
    past: 15,
    love: 300,
    warning: 245,
    work: 190,
    money: 150,
    family: 5,
    health: 95,
    decision: 165,
  };

  const hue = hueMap[category] || 0;
  if (hue === 0) return {};
  
  return { filter: `hue-rotate(${hue}deg) saturate(1.15) brightness(1.05)` };
};

const getFlameGlowColor = (category: string) => {
  switch (category) {
    case 'love': return '#FF3D8D';
    case 'money': return '#00CFA6';
    case 'warning': return '#8D45FF';
    case 'work': return '#3B82F6';
    case 'health': return '#22C55E';
    case 'future': return '#E2E8F0';
    case 'past': return '#FACC15';
    case 'family': return '#F97316';
    case 'decision': return '#06B6D4';
    default: return '#F5BA5B';
  }
};

const hexToRgba = (hex: string, alpha: number) => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SpriteAnimator = ({ source, frameWidth, frameHeight, columns = 4, rows = 3, fps = 12, filterStyle = {} }: any) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const totalFrames = columns * rows;

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % totalFrames);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [totalFrames, fps, source]);

  const col = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);

  return (
    <View style={{ width: frameWidth, height: frameHeight, overflow: 'hidden' }}>
      <Image 
        source={source} 
        style={[
          {
            width: frameWidth * columns,
            height: frameHeight * rows,
            transform: [
              { translateX: -col * frameWidth },
              { translateY: -row * frameHeight }
            ]
          },
          filterStyle as any
        ]}
        resizeMode="stretch"
      />
    </View>
  );
};

interface TypewriterMessageProps {
  text: string;
  hasTarot?: boolean;
  isCardsFlipped?: boolean;
  isAlreadyFinished?: boolean;
  onFlipCards?: () => void;
  onFinish?: () => void;
  onScrollRequest?: () => void;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  text,
  hasTarot = false,
  isCardsFlipped = false,
  isAlreadyFinished = false,
  onFlipCards,
  onFinish,
  onScrollRequest
}) => {
  const [displayedLength, setDisplayedLength] = useState(isAlreadyFinished ? text.length : 0);
  const [isWaiting, setIsWaiting] = useState(!isAlreadyFinished && hasTarot && !isCardsFlipped);
  const [isDone, setIsDone] = useState(isAlreadyFinished);
  const scrollCounterRef = useRef(0);
  const isDoneRef = useRef(isAlreadyFinished);
  const typingTimerRef = useRef<any>(null);
  const flipTimerRef = useRef<any>(null);

  const startTyping = () => {
    if (isDoneRef.current) return;
    setIsWaiting(false);

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    let currentLen = 0;
    const step = 3;
    const intervalMs = 20;

    typingTimerRef.current = setInterval(() => {
      if (isDoneRef.current) {
        clearInterval(typingTimerRef.current);
        return;
      }
      currentLen += step;
      if (currentLen >= text.length) {
        currentLen = text.length;
        setDisplayedLength(text.length);
        setIsDone(true);
        isDoneRef.current = true;
        clearInterval(typingTimerRef.current);
        onFinish?.();
        onScrollRequest?.();
      } else {
        setDisplayedLength(currentLen);
        scrollCounterRef.current += 1;
        if (scrollCounterRef.current % 12 === 0) {
          onScrollRequest?.();
        }
      }
    }, intervalMs);
  };

  useEffect(() => {
    if (isAlreadyFinished) {
      setDisplayedLength(text.length);
      setIsWaiting(false);
      setIsDone(true);
      isDoneRef.current = true;
      return;
    }

    if (!hasTarot) {
      // Không có bài Tarot: Bắt đầu gõ chữ sau 250ms
      const t = setTimeout(() => {
        startTyping();
      }, 250);
      return () => clearTimeout(t);
    } else {
      // CÓ BÀI TAROT: Tuyệt đối KHÔNG tự động gõ chữ khi chưa lật bài!
      if (isCardsFlipped) {
        setIsWaiting(false);
        startTyping();
      } else {
        setIsWaiting(true);
      }
    }

    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [text, isAlreadyFinished, hasTarot]);

  // KHI NGƯỜI DÙNG LẬT BÀI: Chờ 450ms cho hiệu ứng lật bài 3D xong rồi mới bắt đầu gõ chữ
  useEffect(() => {
    if (hasTarot && isCardsFlipped && !isDone && isWaiting) {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      flipTimerRef.current = setTimeout(() => {
        startTyping();
      }, 450);
    }
  }, [isCardsFlipped, hasTarot]);

  const handleSkip = () => {
    if (isWaiting && !isCardsFlipped) {
      // Nếu chưa lật bài mà chạm vào thông báo chờ, lật bài và bắt đầu gõ
      onFlipCards?.();
      return;
    }

    if (!isDone) {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedLength(text.length);
      setIsWaiting(false);
      setIsDone(true);
      isDoneRef.current = true;
      onFinish?.();
      onScrollRequest?.();
    }
  };

  const displayedText = isDone ? text : text.slice(0, displayedLength);

  return (
    <TouchableOpacity
      activeOpacity={isDone ? 1 : 0.85}
      onPress={handleSkip}
      style={styles.answerTextContainer}
    >
      {isWaiting && (
        <View style={styles.thinkingTextRow}>
          <Text style={styles.promptFlipIcon}>🃏</Text>
          <Text style={styles.thinkingTextPlaceholder}>
            Chạm vào lá bài phía trên để lật mở và xem luận giải...
          </Text>
        </View>
      )}

      {(!isWaiting || displayedLength > 0) && (
        <View>
          <HighlightedAnswerText
            text={displayedText}
            style={styles.messageText}
            emphasisStyle={styles.messageTextEmphasis}
          >
            {!isDone && <Text style={styles.typewriterCursor}> ▌</Text>}
          </HighlightedAnswerText>
          {!isDone && (
            <Text style={styles.skipHintText}>✦ Chạm để hiện nhanh toàn bộ</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function ChatScreen({ profile, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const chatHistoryOwner = user?.id || 'guest';
  const [isPro, setIsPro] = useState(false);

  const refreshPlan = useCallback(async () => {
    try {
      const billing = await getBillingStatus();
      setIsPro(billing.plan === 'pro');
    } catch {
      // Keep the regular flame if the user is a guest or the server is offline.
      setIsPro(false);
    }
  }, []);

  // Re-check whenever the Chat tab becomes visible, including after a user
  // completes checkout and returns from Cài đặt.
  useFocusEffect(useCallback(() => {
    void refreshPlan();
  }, [refreshPlan]));
  
  // Profile state (Multi-profile requirement: 1 profile or 2 profiles for couple match)
  const [selectedProfiles, setSelectedProfiles] = useState<ProfileItem[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profilePromptNotice, setProfilePromptNotice] = useState('');
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [showMascotPrompt, setShowMascotPrompt] = useState(false);
  const [isPlaceContextModalOpen, setIsPlaceContextModalOpen] = useState(false);
  const placeContextResolverRef = useRef<((context: PlaceSearchContext | null) => void) | null>(null);

  const activeTargetProfile: ProfileItem | { fullName: string; birthDate: string } | null = useMemo(() => {
    if (selectedProfiles && selectedProfiles.length > 0) return selectedProfiles[0];
    if (profile && profile.fullName) {
      return {
        id: 'default-profile',
        fullName: profile.fullName,
        birthDate: profile.birthDate,
        gender: profile.gender,
      };
    }
    return null;
  }, [selectedProfiles, profile]);

  const handleMascotPress = () => {
    if (!activeTargetProfile || !activeTargetProfile.fullName || !activeTargetProfile.birthDate) {
      setProfilePromptNotice('Vui lòng tạo hoặc chọn một hồ sơ để mở 24 lá bài Thần số học.');
      setIsProfileModalOpen(true);
      return;
    }
    setShowMascotPrompt(true);
  };

  const finishPlaceContextSelection = useCallback((context: PlaceSearchContext | null) => {
    setIsPlaceContextModalOpen(false);
    const resolve = placeContextResolverRef.current;
    placeContextResolverRef.current = null;
    resolve?.(context);
  }, []);

  const requestPlaceContext = useCallback(() => new Promise<PlaceSearchContext | null>((resolve) => {
    placeContextResolverRef.current = resolve;
    setIsPlaceContextModalOpen(true);
  }), []);

  const useCurrentPlaceLocation = useCallback(async (preferences: PlaceSearchPreferences) => {
    const context = await getOneTimePlaceLocation(preferences);
    finishPlaceContextSelection(context);
  }, [finishPlaceContextSelection]);

  useEffect(() => () => {
    placeContextResolverRef.current?.(null);
    placeContextResolverRef.current = null;
  }, []);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  // Messages & States
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  // Backend may finish before the user has revealed every Tarot card. Keep the
  // answer buffered in messages, but keep the scene in "thinking" until the
  // reveal gate below is complete.
  const [pendingTarotReveal, setPendingTarotReveal] = useState<{
    messageId: string;
    cards: DrawnCardResult[];
  } | null>(null);
  const [mascotState, setMascotState] = useState<'idle' | 'listening' | 'explain'>('idle');
  const [mascotCategory, setMascotCategory] = useState('default');
  const [viewMode, setViewMode] = useState<'current_state' | 'history_list'>('current_state');
  const [hydratedHistoryOwner, setHydratedHistoryOwner] = useState<string | null>(null);
  const skipNextHistoryPersistForOwnerRef = useRef<string | null>(null);
  const isHistoryReady = hydratedHistoryOwner === chatHistoryOwner;

  // Theo dõi trạng thái hiển thị bàn phím để tự động thu gọn Mascot và tối ưu không gian cho ô soạn thảo
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Tarot Flip State & Zoom Modal State
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [zoomedCard, setZoomedCard] = useState<DrawnCardResult | null>(null);

  const appendMessage = useCallback((message: MessageItem) => {
    setMessages(prev => [...prev, message].slice(-MAX_STORED_CHAT_MESSAGES));
  }, []);

  const markMessageTypingCompleted = useCallback((messageId: string) => {
    setMessages(prev => prev.map(message => (
      message.id === messageId && !message.isTypingCompleted
        ? { ...message, isTypingCompleted: true }
        : message
    )));
  }, []);

  const handleFlipCard = (messageId: string, cardIndex: number) => {
    const key = `${messageId}_${cardIndex}`;
    setFlippedCards(prev => ({ ...prev, [key]: true }));
  };

  const handleFlipAllCards = (messageId: string, totalCards: number) => {
    setFlippedCards(prev => {
      const next = { ...prev };
      for (let i = 0; i < totalCards; i++) {
        next[`${messageId}_${i}`] = true;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!pendingTarotReveal) return;

    const everyCardIsFlipped = pendingTarotReveal.cards.every(
      (_, index) => !!flippedCards[`${pendingTarotReveal.messageId}_${index}`]
    );
    if (!everyCardIsFlipped) return;

    // Leave a tiny beat for the final flip animation before the flame answer
    // is revealed. The Tarot deck is deliberately not carried into that view.
    const revealTimer = setTimeout(() => {
      setPendingTarotReveal(null);
      setLoading(false);
      setMascotState('explain');
    }, 360);

    return () => clearTimeout(revealTimer);
  }, [flippedCards, pendingTarotReveal]);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let isCurrentOwner = true;

    setHydratedHistoryOwner(null);
    setMessages([]);
    setFlippedCards({});
    setPendingTarotReveal(null);
    setLoading(false);
    setMascotState('idle');
    setMascotCategory('default');
    setViewMode('current_state');

    void loadChatHistory(chatHistoryOwner).then((storedHistory) => {
      if (!isCurrentOwner) return;

      const restoredHistory = storedHistory as MessageItem[];
      setMessages(restoredHistory);
      setFlippedCards(getRestoredFlippedCards(restoredHistory));
      setHydratedHistoryOwner(chatHistoryOwner);
    });

    return () => {
      isCurrentOwner = false;
    };
  }, [chatHistoryOwner]);

  useEffect(() => {
    if (!isHistoryReady) return;

    if (skipNextHistoryPersistForOwnerRef.current === chatHistoryOwner && messages.length === 0) {
      skipNextHistoryPersistForOwnerRef.current = null;
      return;
    }

    void saveChatHistory(chatHistoryOwner, messages);
  }, [chatHistoryOwner, isHistoryReady, messages]);

  // Load active profile on mount
  useEffect(() => {
    (async () => {
      const active = await getActiveProfile();
      if (active) {
        setSelectedProfiles([active]);
      } else if (profile) {
        setSelectedProfiles([{
          id: 'default-profile',
          fullName: profile.fullName,
          birthDate: profile.birthDate,
          gender: profile.gender
        }]);
      }
    })();
  }, [profile]);

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      stopVoiceRef.current?.();
      stopVoiceListening();
    };
  }, []);
  
  // Animation for Mascot
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15]
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1]
  });
  
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6]
  });

  const ambientWideScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.25]
  });

  const ambientPulse = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.0]
  });

  const getMascotImage = () => {
    switch(mascotState) {
      case 'listening': return LISTENING_IMG;
      case 'explain': return EXPLAIN_IMG;
      case 'idle':
      default: return IDLE_IMG;
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopVoiceRef.current?.();
      setIsListening(false);
      setMascotState('idle');
      return;
    }

    if (!isVoiceSupported()) {
      if (Platform.OS === 'web') {
        alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API hoặc chưa cấp quyền Micro.');
      } else {
        Alert.alert('Thông báo', 'Tính năng nhận diện giọng nói hỗ trợ tốt nhất trên nền tảng Web / trình duyệt.');
      }
      return;
    }

    setIsListening(true);
    setMascotState('listening');

    const stopFn = startVoiceListening({
      onTranscript: (text) => {
        setInputVal(text);
      },
      onError: (err) => {
        console.warn('[ChatScreen] Voice error:', err);
        setIsListening(false);
        setMascotState('idle');
      },
      onEnd: () => {
        setIsListening(false);
        setMascotState('idle');
      }
    });

    stopVoiceRef.current = stopFn;
  };

  // Local Spiritual Agent Response Generator (Autonomous Synthesis Engine)
  const generateLocalAgentSynthesis = (
    prompt: string,
    decision: AgentDecision,
    profiles: ProfileItem[],
    indicators1: IndicatorInfo[],
    indicators2?: IndicatorInfo[],
    drawnCards: DrawnCardResult[] = []
  ): { text: string; card: any } => {
    const p1 = profiles[0];
    const p2 = profiles[1];
    const p1Lp = indicators1.find(i => i.key === 'walksOfLife')?.value || 7;
    const yearVal = indicators1.find(i => i.key === 'yearIndividual')?.value || 1;
    const ratVal = indicators1.find(i => i.key === 'rationalThinking')?.value || 5;

    // 1. GHÉP ĐÔI TÌNH DUYÊN (2 PROFILES: 100% THUẦN TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ - KHÔNG DÙNG TAROT)
    if (decision.mode === 'compatibility' && p2) {
      const chartA = computePersonTuViBazi(p1.fullName, p1.birthDate, p1.gender);
      const chartB = computePersonTuViBazi(p2.fullName, p2.birthDate, p2.gender);
      const tuViBazi = evaluateTuViBaziLove(chartA, chartB);

      const text = [
        `✦ KẾT LUẬN TỔNG QUAN TỬ VI & BÁT TỰ:\nTheo phân tích Tử Vi Đẩu Số & Bát Tự Tứ Trụ, mức độ tương hợp duyên nợ giữa ${p1.fullName} (${chartA.napAmYear}, Cung ${chartA.cungPhi}) và ${p2.fullName} (${chartB.napAmYear}, Cung ${chartB.cungPhi}) đạt ${tuViBazi.compatibilityScore}%. Hai bạn có nhân duyên tương phối sâu sắc, hội tụ đủ khí vận để xây đắp gia đạo hạnh phúc.`,
        `\n✦ PHÂN TÍCH TỨ TRỤ & CUNG PHU THÊ:\n• Tứ Trụ ${p1.fullName}: Năm [${chartA.yearPillar.ganVi} ${chartA.yearPillar.zhiVi} - ${chartA.napAmYear}] • Tháng [${chartA.monthPillar.ganVi} ${chartA.monthPillar.zhiVi}] • Ngày [${chartA.dayPillar.ganVi} ${chartA.dayPillar.zhiVi} - Nhật Chủ: ${chartA.dayMaster} mang hành ${chartA.dayMasterElement}]\n• Tứ Trụ ${p2.fullName}: Năm [${chartB.yearPillar.ganVi} ${chartB.yearPillar.zhiVi} - ${chartB.napAmYear}] • Tháng [${chartB.monthPillar.ganVi} ${chartB.monthPillar.zhiVi}] • Ngày [${chartB.dayPillar.ganVi} ${chartB.dayPillar.zhiVi} - Nhật Chủ: ${chartB.dayMaster} mang hành ${chartB.dayMasterElement}]\n• Cung Phu Thê (Nhật Chi): ${chartA.spousalPalace} ✕ ${chartB.spousalPalace} ➔ ${tuViBazi.spousalInteraction.labelVi}. ${tuViBazi.spousalInteraction.description}\n• Thiên Can Nhật Chủ: ${chartA.dayMaster} ✕ ${chartB.dayMaster} ➔ ${tuViBazi.stemInteraction.labelVi}. ${tuViBazi.stemInteraction.description}`,
        `\n✦ CUNG PHI BÁT TRẠCH & BẢN MỆNH NẠP ÂM:\n• Bát Trạch Quái Mệnh: ${chartA.cungPhi} (${chartA.cungPhiGroup}) ✕ ${chartB.cungPhi} (${chartB.cungPhiGroup}) ➔ Phối Hôn đạt ${tuViBazi.cungPhiBatTrach.labelVi}: ${tuViBazi.cungPhiBatTrach.description}\n• Ngũ Hành Nạp Âm: ${tuViBazi.napAmHarmony.labelVi} - ${tuViBazi.napAmHarmony.description}\n• Địa Chi Con Giáp: ${tuViBazi.yearAnimalHarmony.labelVi} - ${tuViBazi.yearAnimalHarmony.description}`,
        `\n✦ VÌ SAO (BÀI HỌC VẬN MỆNH CẦN CHUYỂN HÓA):\n${tuViBazi.summaryVi}`,
        `\n✦ NÊN LÀM GÌ ĐỂ HÓA GIẢI & HẠNH PHÚC LÂU DÀI:\n${tuViBazi.adviceVi}`
      ].join('\n');

      return {
        text,
        card: {
          type: 'agent_synthesis',
          decision,
          profiles,
          indicators1,
          indicators2,
          drawnCards: [], // KHÔNG DÙNG BÀI TAROT
          tuViBazi,
          compatibilityScore: tuViBazi.compatibilityScore
        }
      };
    }

    // 2. HAI LỰA CHỌN PHÂN VÂN A vs B (5 LÁ TWO-OPTIONS)
    if (decision.intent === 'two_choices') {
      const optionAWeight = 65 + ((Number(ratVal) * 3) % 15);
      const optionBWeight = 100 - optionAWeight;
      const c1 = drawnCards[0];
      const cA1 = drawnCards[1];
      const cA2 = drawnCards[2];
      const cB1 = drawnCards[3];
      const cB2 = drawnCards[4];

      const text = [
        `✦ KẾT LUẬN NHANH:\nVũ trụ và quẻ bài ủng hộ Phương Án A (nghiêng ${optionAWeight}%) so với Phương Án B (${optionBWeight}%). Con đường A đem lại sự bền vững và giải phóng năng lượng bế tắc rõ nét hơn.`,
        `\n✦ VÌ SAO (PHÂN TÍCH 5 LÁ BÀI & TƯ DUY LÝ TRÍ):\n• Nền tảng hiện tại: Lá ${c1?.card.nameVi} (${c1?.isReversed ? 'Lá Ngược' : 'Lá Xuôi'}) - ${c1?.isReversed ? c1?.card.meaningReversed : c1?.card.meaningUpright}\n• Phương án A: Lá ${cA1?.card.nameVi} (Tiến trình) & Lá ${cA2?.card.nameVi} (Kết quả) - Tạo tiền đề bứt phá vững chắc.\n• Phương án B: Lá ${cB1?.card.nameVi} (Tiến trình) & Lá ${cB2?.card.nameVi} (Kết quả) - Dễ phát sinh rào cản và cảm giác hối tiếc ngầm.\n• Đối chiếu Tư duy lý trí (${ratVal}) & Năm cá nhân (${yearVal}): Bạn đã sẵn sàng để đón nhận sự đổi mới, không nên chần chừ.`,
        `\n✦ NÊN LÀM GÌ:\nHãy lập kế hoạch triển khai cụ thể cho Phương Án A trong 7 ngày tới. Giữ tâm trí kiên định và đừng để nỗi sợ vô cớ làm lung lay định hướng.`
      ].join('\n');

      return {
        text,
        card: {
          type: 'agent_synthesis',
          decision,
          profiles,
          indicators1,
          drawnCards,
          optionSplit: { optionA: optionAWeight, optionB: optionBWeight }
        }
      };
    }

    // 3. THUẦN BẢN MỆNH & TÍNH CÁCH (0 LÁ TAROT - TRUY XUẤT 5 CHỈ SỐ CỐT LÕI)
    if (decision.intent === 'core_personality' || !decision.needsTarot) {
      const indLines = indicators1.map(ind => `• ${ind.name} = ${ind.value}: ${ind.meaning}`).join('\n');
      const text = [
        `✦ KẾT LUẬN NHANH:\nBản đồ Thần số học chuyên sâu của ${p1.fullName} mang tần số rung động mạnh mẽ của người giàu lý tưởng, có trực giác nhạy bén và năng lực lãnh đạo tiềm ẩn.`,
        `\n✦ VÌ SAO (TRÍCH XUẤT 5 CHỈ SỐ CỐT LÕI TỪ BẢN ĐỒ 24 CHỈ SỐ):\n${indLines}`,
        `\n✦ NÊN LÀM GÌ:\nBạn nên tập trung phát huy sức mạnh của Số Đường Đời (${p1Lp}) và Số Sứ Mệnh, chủ động rèn luyện tính kỷ luật và đón nhận các thử thách lớn để khai mở toàn bộ tiềm năng bẩm sinh.`
      ].join('\n');

      return {
        text,
        card: {
          type: 'agent_synthesis',
          decision,
          profiles,
          indicators1,
          drawnCards: []
        }
      };
    }

    // 4. TIẾN TRÌNH & THỜI ĐIỂM (3 LÁ: QUÁ KHỨ - HIỆN TẠI - TƯƠNG LAI)
    if (decision.intent === 'timing_trajectory' && drawnCards.length >= 3) {
      const c1 = drawnCards[0];
      const c2 = drawnCards[1];
      const c3 = drawnCards[2];

      const text = [
        `✦ KẾT LUẬN NHANH:\nVận trình của bạn đang ở điểm chuyển giao then chốt. Những trở ngại của giai đoạn trước sắp khép lại để nhường bước cho chu kỳ thịnh vượng mới.`,
        `\n✦ VÌ SAO (QUÁ KHỨ · HIỆN TẠI · TƯƠNG LAI & NĂM CÁ NHÂN SỐ ${yearVal}):\n• Quá khứ: Lá ${c1?.card.nameVi} (${c1?.isReversed ? 'Lá Ngược' : 'Lá Xuôi'}) - ${c1?.isReversed ? c1?.card.meaningReversed : c1?.card.meaningUpright}\n• Hiện tại: Lá ${c2?.card.nameVi} (${c2?.isReversed ? 'Lá Ngược' : 'Lá Xuôi'}) - ${c2?.isReversed ? c2?.card.meaningReversed : c2?.card.meaningUpright}\n• Tương lai gần: Lá ${c3?.card.nameVi} (${c3?.isReversed ? 'Lá Ngược' : 'Lá Xuôi'}) - ${c3?.isReversed ? c3?.card.meaningReversed : c3?.card.meaningUpright}\n• Năm Cá Nhân (${yearVal}): Tạo điều kiện thuận hòa để bạn gieo mầm hoặc thu hoạch.`,
        `\n✦ NÊN LÀM GÌ:\nBám sát tiến độ công việc, dọn dẹp các mối quan hệ độc hại và chủ động mở rộng vòng kết nối trong thời gian này.`
      ].join('\n');

      return {
        text,
        card: {
          type: 'agent_synthesis',
          decision,
          profiles,
          indicators1,
          drawnCards
        }
      };
    }

    // 5. THÔNG ĐIỆP TỨC THỜI / MẶC ĐỊNH (1 LÁ TAROT)
    const c1 = drawnCards[0];
    const lowerPrompt = prompt.toLowerCase();
    const isFood = /ăn|món|thực đơn|uống|nấu|bữa|sáng|trưa|tối|đói/i.test(lowerPrompt);

    let text = '';
    if (isFood) {
      text = [
        `✦ KẾT LUẬN NHANH:\nHôm nay bạn nên thưởng thức một món ăn tươi mới, thanh nhẹ và kích thích vị giác như: Phở/bún nước dùng thanh ngọt, salad tôm bơ ngũ sắc, hoặc thử một món mới lạ mà trước giờ bạn chưa từng ăn!`,
        `\n✦ VÌ SAO (LÁ BÀI ${c1?.card.nameVi.toUpperCase()} & ĐƯỜNG ĐỜI SỐ ${p1Lp}):\nLá bài ${c1?.card.nameVi} (${c1?.isReversed ? 'Lá Ngược' : 'Lá Xuôi'}) mang nguồn năng lượng của sự khám phá và tái tạo. Kết hợp cùng Số Đường Đời ${p1Lp}, cơ thể đang cần nạp nguồn dinh dưỡng tươi mát, lành tính và dễ hấp thu để tinh thần luôn nhẹ nhõm, minh mẫn.`,
        `\n✦ NÊN LÀM GÌ:\nHãy chọn một quán ăn có không gian thoáng mát, ăn chậm nhai kỹ và thưởng thức kèm một ly nước ép hoa quả mát lành nhé!`
      ].join('\n');
    } else {
      text = [
        `✦ KẾT LUẬN NHANH:\nThông điệp trực giác dẫn lối cho bạn: "${c1?.isReversed ? c1?.card.meaningReversed : c1?.card.meaningUpright}".`,
        `\n✦ VÌ SAO (LÁ BÀI ${c1?.card.nameVi.toUpperCase()} & ĐƯỜNG ĐỜI SỐ ${p1Lp}):\n• Lá bài ${c1?.card.nameVi} (${c1?.isReversed ? 'Lá Ngược' : 'Lá Xuôi'}): ${c1?.isReversed ? c1?.card.meaningReversed : c1?.card.meaningUpright}\n• Từ khóa trọng tâm: ${(c1?.isReversed ? c1?.card.keywordsReversed : c1?.card.keywordsUpright)?.join(' • ')}\n• Năng lượng cộng hưởng: Đường Đời số ${p1Lp} và Năm Cá Nhân số ${yearVal} nhắc nhở bạn giữ vững tâm an trước mọi biến động.`,
        `\n✦ NÊN LÀM GÌ:\n${c1?.isReversed ? 'Dành chút thời gian tĩnh lặng, quan sát lại cảm xúc và không vội đưa ra phán xét.' : 'Mạnh dạn tiến về phía trước và tự tin vào trực giác của chính mình.'}`
      ].join('\n');
    }

    return {
      text,
      card: {
        type: 'agent_synthesis',
        decision,
        profiles,
        indicators1,
        drawnCards
      }
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputVal).trim();
    if (!prompt || loading || !isHistoryReady) return;

    // Yêu cầu: Phải chọn ít nhất 1 profile khi đặt câu hỏi
    if (selectedProfiles.length === 0) {
      setProfilePromptNotice('⚠️ Bạn cần chọn hoặc thêm ít nhất 1 hồ sơ trước khi hỏi Tiểu Linh Miêu!');
      setIsProfileModalOpen(true);
      return;
    }

    // Tắt voice nếu đang nghe
    if (isListening) {
      stopVoiceRef.current?.();
      setIsListening(false);
    }

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    appendMessage(userMsg);
    setInputVal('');
    setLoading(true);
    setMascotState('listening');

    // 1. Đổi màu lửa ngay lập tức theo câu hỏi của người dùng
    const preliminaryCat = getCategoryFromText(prompt);
    if (preliminaryCat !== 'default') {
      setMascotCategory(preliminaryCat);
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // 2. GỌI AI AGENT TỰ PHÂN LOẠI CÂU HỎI (AUTONOMOUS INTENT CLASSIFICATION)
    let decision: AgentDecision;
    let waitsForTarotReveal = false;

    try {
      const classRes = await authenticatedFetch(API_ENDPOINTS.CLASSIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          profiles: selectedProfiles
        })
      });
      const classData = await classRes.json();
      if (classData.ok && classData.data) {
        decision = classData.data;
      } else {
        throw new Error('Fallback to local decision engine');
      }
    } catch {
      // Nếu offline hoặc lỗi mạng: dùng Local Decision Engine dự phòng
      decision = evaluateAgentDecision(prompt, selectedProfiles);
    }

    // 3. Khóa màu lửa chính xác theo classification của AI Agent
    if (decision.mode === 'compatibility' || decision.intent === 'love_match') {
      setMascotCategory('love');
    } else if (decision.intent === 'two_choices') {
      setMascotCategory('decision');
    } else if (decision.intent === 'timing_trajectory') {
      setMascotCategory('future');
    } else if (decision.intent === 'core_personality') {
      setMascotCategory('past');
    } else {
      const finalCat = getCategoryFromText(prompt);
      setMascotCategory(finalCat);
    }

    // Câu rác được backend (hoặc fallback offline) nhận diện: trả lời ngay,
    // không tính chỉ số, không rút Tarot và không gọi thêm /agent.
    if (decision.intent === 'trash') {
      setMascotState('explain');
      appendMessage({
        id: `mascot-${Date.now()}`,
        sender: 'mascot',
        text: decision.replyText || 'Câu hỏi của bạn chưa có chủ đề rõ ràng. Bạn có thể cho Tiểu Linh Miêu biết điều bạn đang muốn tìm hiểu không?',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isTypingCompleted: false
      });
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      setTimeout(() => setMascotState('idle'), 6000);
      return;
    }

    // A place search requires a one-time, user-approved GPS location. Do not
    // fall back to IP geolocation or a manually typed area.
    let placeContext: PlaceSearchContext | undefined;
    if (decision.intent === 'where_to_go') {
      setLoading(false);
      const selectedContext = await requestPlaceContext();
      if (!selectedContext) {
        setMascotState('explain');
        appendMessage({
          id: `mascot-${Date.now()}`,
          sender: 'mascot',
          text: '✦ TIỂU LINH MIÊU CẦN VỊ TRÍ HIỆN TẠI:\nĐể lọc địa điểm theo khoảng cách thực tế, bạn hãy cho phép dùng vị trí một lần nhé.',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          isTypingCompleted: false,
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        setTimeout(() => setMascotState('idle'), 6000);
        return;
      }
      placeContext = selectedContext;
      setLoading(true);
    }

    // 2. Tính toán các chỉ số Thần số học mục tiêu
    const calc1 = new NumerologyCalculator(selectedProfiles[0].fullName, selectedProfiles[0].birthDate);
    const indicators1 = calc1.getRequestedIndicators(decision.targetIndicators);

    let indicators2: IndicatorInfo[] | undefined;
    if (selectedProfiles.length >= 2) {
      const calc2 = new NumerologyCalculator(selectedProfiles[1].fullName, selectedProfiles[1].birthDate);
      indicators2 = calc2.getRequestedIndicators(decision.targetIndicators);
    }

    // 3. Rút bài Tarot theo cấu hình trải bài
    const drawnCards: DrawnCardResult[] = decision.needsTarot && decision.spreadId
      ? drawCardsForSpread(decision.spreadId)
      : [];

    // 4. Tính toán Tử Vi Đẩu Số nếu ghép đôi 2 người
    let tuViBaziPayload: TuViBaziSynastryResult | undefined;
    if (selectedProfiles.length >= 2) {
      const chartA = computePersonTuViBazi(selectedProfiles[0].fullName, selectedProfiles[0].birthDate, selectedProfiles[0].gender);
      const chartB = computePersonTuViBazi(selectedProfiles[1].fullName, selectedProfiles[1].birthDate, selectedProfiles[1].gender);
      tuViBaziPayload = evaluateTuViBaziLove(chartA, chartB);
    }

    try {
      const res = await authenticatedFetch(API_ENDPOINTS.CHAT_AGENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          decision,
          profiles: selectedProfiles,
          indicators: {
            profile1: indicators1,
            profile2: indicators2
          },
          tarotCards: drawnCards,
          tuViBazi: tuViBaziPayload,
          ...(placeContext ? { placeContext } : {}),
        })
      });

      const data = await res.json();
      
      if (data.ok && data.data) {
        // The local draw is the source of truth for the reveal interaction.
        // Preserve it even when the backend omits it from cardPayload.
        const cardPayload = {
          ...(data.data.cardPayload || {}),
          drawnCards: data.data.cardPayload?.drawnCards?.length
            ? data.data.cardPayload.drawnCards
            : drawnCards,
        };
        const mascotMsg: MessageItem = {
          id: `mascot-${Date.now()}`,
          sender: 'mascot',
          text: data.data.replyText,
          card: cardPayload,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          isTypingCompleted: false
        };
        appendMessage(mascotMsg);

        if (cardPayload.drawnCards.length > 0) {
          waitsForTarotReveal = true;
          setPendingTarotReveal({
            messageId: mascotMsg.id,
            cards: cardPayload.drawnCards,
          });
        } else {
          setMascotState('explain');
        }
      } else {
        throw new Error('Fallback to local synthesis engine');
      }
    } catch {
      // Sử dụng Autonomous Spiritual Synthesis Engine
      const synthesis = generateLocalAgentSynthesis(
        prompt,
        decision,
        selectedProfiles,
        indicators1,
        indicators2,
        drawnCards
      );

      const mascotMsg: MessageItem = {
        id: `mascot-${Date.now()}`,
        sender: 'mascot',
        text: synthesis.text,
        card: synthesis.card,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isTypingCompleted: false
      };
      appendMessage(mascotMsg);

      const fallbackCards: DrawnCardResult[] = synthesis.card?.drawnCards || [];
      if (fallbackCards.length > 0) {
        waitsForTarotReveal = true;
        setPendingTarotReveal({
          messageId: mascotMsg.id,
          cards: fallbackCards,
        });
      } else {
        setMascotState('explain');
      }
    } finally {
      if (!waitsForTarotReveal) {
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        setTimeout(() => setMascotState('idle'), 6000);
      }
    }
  };

  const renderCardWidget = (card: any, messageId: string = 'msg_default') => {
    if (!card) return null;

    // 1. GIAO DIỆN TỔNG HỢP CỦA AI AGENT (Agent Synthesis)
    if (card.type === 'agent_synthesis') {
      const decision: AgentDecision = card.decision || {};
      if (card.isTrashPrompt || decision.intent === 'trash') return null;
      const profiles: ProfileItem[] = card.profiles || [];
      const drawnCards: DrawnCardResult[] = card.drawnCards || [];
      const indicators1: IndicatorInfo[] = card.indicators1 || [];
      const indicators2: IndicatorInfo[] = card.indicators2 || [];
      const optionSplit = card.optionSplit;
      const compatibilityScore = card.compatibilityScore;
      const tuViBazi: TuViBaziSynastryResult | undefined = card.tuViBazi;

      return (
        <View style={styles.agentCardContainer}>
          {/* Hộp Tư Duy Linh Miêu (Agent Thought Banner) */}
          <View style={styles.thoughtHeaderRow}>
            <View style={styles.thoughtTitleWrap}>
              <Text style={styles.thoughtIcon}>🧠</Text>
              <Text style={styles.thoughtTitle}>TIỂU LINH MIÊU ĐIỀU PHỐI</Text>
            </View>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {decision.mode === 'compatibility'
                  ? '☯ Tử Vi Đẩu Số & Bát Tự Toàn Diện'
                  : decision.intent === 'two_choices'
                  ? '⚖️ 2 Lựa Chọn (A vs B)'
                  : decision.intent === 'timing_trajectory'
                  ? '⏳ Vận Trình 3 Thời Điểm'
                  : decision.intent === 'core_personality'
                  ? '📜 Thuần 24 Chỉ Số'
                  : '🔮 Thông Điệp 1 Lá'}
              </Text>
            </View>
          </View>

          {/* Diễn giải lý do của Agent */}
          <Text style={styles.thoughtProcessText}>
            "{decision.thoughtProcess}"
          </Text>

          {/* Danh sách các chỉ số được AI Agent chọn lọc */}
          <View style={styles.indicatorChipsWrap}>
            <Text style={styles.chipsLabel}>Chỉ số mục tiêu (tối đa 5):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {indicators1.map((ind: any, idx) => (
                <View key={idx} style={styles.indicatorChip}>
                  <Text style={styles.indicatorChipName}>{((ind.nameVi || ind.name || '').split('(')[0].trim())}:</Text>
                  <Text style={styles.indicatorChipVal}>{ind.value}</Text>
                </View>
              ))}
              {indicators2 && indicators2.length > 0 && indicators2.map((ind: any, idx) => (
                <View key={`p2-${idx}`} style={[styles.indicatorChip, styles.indicatorChipP2]}>
                  <Text style={styles.indicatorChipName}>P2 {((ind.nameVi || ind.name || '').split('(')[0].trim())}:</Text>
                  <Text style={styles.indicatorChipVal}>{ind.value}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* BẢNG TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ (Khi ghép đôi 2 người) */}
          {tuViBazi && (
            <View style={styles.tuViContainer}>
              <View style={styles.tuViHeaderRow}>
                <Text style={styles.tuViHeaderTitle}>☯ TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ</Text>
                <View style={styles.tuViScoreBadge}>
                  <Text style={styles.tuViScoreVal}>{tuViBazi.compatibilityScore}%</Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${tuViBazi.compatibilityScore}%` }]} />
              </View>

              {/* Bảng so sánh Tứ Trụ 2 người */}
              <View style={styles.tuViChartsRow}>
                {/* Người A */}
                <View style={styles.tuViPersonBox}>
                  <View style={styles.tuViPersonHeader}>
                    <Text style={styles.tuViPersonName} numberOfLines={1}>{tuViBazi.personA.fullName}</Text>
                    <Text style={styles.tuViNapAmBadge}>{tuViBazi.personA.napAmYear}</Text>
                  </View>
                  <View style={styles.tuViPillarsGrid}>
                    <View style={styles.tuViPillarCell}>
                      <Text style={styles.tuViPillarLabel}>Năm</Text>
                      <Text style={styles.tuViPillarVal}>{tuViBazi.personA.yearPillar.ganVi} {tuViBazi.personA.yearPillar.zhiVi}</Text>
                    </View>
                    <View style={styles.tuViPillarCell}>
                      <Text style={styles.tuViPillarLabel}>Tháng</Text>
                      <Text style={styles.tuViPillarVal}>{tuViBazi.personA.monthPillar.ganVi} {tuViBazi.personA.monthPillar.zhiVi}</Text>
                    </View>
                    <View style={styles.tuViPillarCell}>
                      <Text style={styles.tuViPillarLabel}>Ngày</Text>
                      <Text style={styles.tuViPillarVal}>{tuViBazi.personA.dayPillar.ganVi} {tuViBazi.personA.dayPillar.zhiVi}</Text>
                    </View>
                  </View>
                  <View style={styles.tuViKeyRow}>
                    <Text style={styles.tuViKeyText}>Nhật Chủ: <Text style={styles.tuViGoldText}>{tuViBazi.personA.dayMaster} ({tuViBazi.personA.dayMasterElement})</Text></Text>
                    <Text style={styles.tuViKeyText}>Cung Phu Thê: <Text style={styles.tuViGoldText}>{tuViBazi.personA.spousalPalace}</Text></Text>
                    <Text style={styles.tuViKeyText}>Quái Mệnh: <Text style={styles.tuViGoldText}>{tuViBazi.personA.cungPhi} ({tuViBazi.personA.cungPhiElement})</Text></Text>
                  </View>
                </View>

                {/* Người B */}
                <View style={styles.tuViPersonBox}>
                  <View style={styles.tuViPersonHeader}>
                    <Text style={styles.tuViPersonName} numberOfLines={1}>{tuViBazi.personB.fullName}</Text>
                    <Text style={styles.tuViNapAmBadge}>{tuViBazi.personB.napAmYear}</Text>
                  </View>
                  <View style={styles.tuViPillarsGrid}>
                    <View style={styles.tuViPillarCell}>
                      <Text style={styles.tuViPillarLabel}>Năm</Text>
                      <Text style={styles.tuViPillarVal}>{tuViBazi.personB.yearPillar.ganVi} {tuViBazi.personB.yearPillar.zhiVi}</Text>
                    </View>
                    <View style={styles.tuViPillarCell}>
                      <Text style={styles.tuViPillarLabel}>Tháng</Text>
                      <Text style={styles.tuViPillarVal}>{tuViBazi.personB.monthPillar.ganVi} {tuViBazi.personB.monthPillar.zhiVi}</Text>
                    </View>
                    <View style={styles.tuViPillarCell}>
                      <Text style={styles.tuViPillarLabel}>Ngày</Text>
                      <Text style={styles.tuViPillarVal}>{tuViBazi.personB.dayPillar.ganVi} {tuViBazi.personB.dayPillar.zhiVi}</Text>
                    </View>
                  </View>
                  <View style={styles.tuViKeyRow}>
                    <Text style={styles.tuViKeyText}>Nhật Chủ: <Text style={styles.tuViGoldText}>{tuViBazi.personB.dayMaster} ({tuViBazi.personB.dayMasterElement})</Text></Text>
                    <Text style={styles.tuViKeyText}>Cung Phu Thê: <Text style={styles.tuViGoldText}>{tuViBazi.personB.spousalPalace}</Text></Text>
                    <Text style={styles.tuViKeyText}>Quái Mệnh: <Text style={styles.tuViGoldText}>{tuViBazi.personB.cungPhi} ({tuViBazi.personB.cungPhiElement})</Text></Text>
                  </View>
                </View>
              </View>

              {/* Tương tác Cung Phu Thê, Thiên Can, Bát Trạch, Nạp Âm & Con Giáp */}
              <View style={styles.tuViHighlightsWrap}>
                <View style={styles.tuViHighlightBadge}>
                  <Text style={styles.tuViHighlightLabel}>Phu Thê:</Text>
                  <Text style={styles.tuViHighlightVal}>{tuViBazi.spousalInteraction.labelVi}</Text>
                </View>
                <View style={styles.tuViHighlightBadge}>
                  <Text style={styles.tuViHighlightLabel}>Thiên Can:</Text>
                  <Text style={styles.tuViHighlightVal}>{tuViBazi.stemInteraction.labelVi}</Text>
                </View>
                {tuViBazi.cungPhiBatTrach && (
                  <View style={[styles.tuViHighlightBadge, !tuViBazi.cungPhiBatTrach.isAuspicious && styles.tuViHighlightWarning]}>
                    <Text style={styles.tuViHighlightLabel}>Bát Trạch:</Text>
                    <Text style={[styles.tuViHighlightVal, !tuViBazi.cungPhiBatTrach.isAuspicious && { color: '#F87171' }]}>
                      {tuViBazi.cungPhiBatTrach.labelVi}
                    </Text>
                  </View>
                )}
                {tuViBazi.napAmHarmony && (
                  <View style={styles.tuViHighlightBadge}>
                    <Text style={styles.tuViHighlightLabel}>Nạp Âm:</Text>
                    <Text style={styles.tuViHighlightVal}>{tuViBazi.napAmHarmony.labelVi}</Text>
                  </View>
                )}
                {tuViBazi.yearAnimalHarmony && (
                  <View style={styles.tuViHighlightBadge}>
                    <Text style={styles.tuViHighlightLabel}>Con Giáp:</Text>
                    <Text style={styles.tuViHighlightVal}>{tuViBazi.yearAnimalHarmony.labelVi}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Thanh tương hợp cơ bản nếu không có Bát Tự đầy đủ */}
          {!tuViBazi && compatibilityScore && (
            <View style={styles.compatibilityPanel}>
              <View style={styles.compatTopRow}>
                <Text style={styles.compatTitle}>Độ Hòa Hợp Tình Duyên</Text>
                <Text style={styles.compatScoreText}>{compatibilityScore}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${compatibilityScore}%` }]} />
              </View>
              <Text style={styles.compatProfilesSub}>
                {profiles[0]?.fullName} ♡ {profiles[1]?.fullName}
              </Text>
            </View>
          )}

          {/* Nếu là 2 Lựa chọn A vs B: Hiển thị phân bổ % phương án */}
          {optionSplit && (
            <View style={styles.splitPanel}>
              <View style={styles.splitLabelsRow}>
                <Text style={styles.splitOptALabel}>Phương Án A ({optionSplit.optionA}%)</Text>
                <Text style={styles.splitOptBLabel}>Phương Án B ({optionSplit.optionB}%)</Text>
              </View>
              <View style={styles.splitBarTrack}>
                <View style={[styles.splitBarA, { width: `${optionSplit.optionA}%` }]} />
                <View style={[styles.splitBarB, { width: `${optionSplit.optionB}%` }]} />
              </View>
              <Text style={styles.splitVerdict}>
                ✦ Phương án A được lá bài & năng lượng vũ trụ ủng hộ cao hơn
              </Text>
            </View>
          )}

          {/* Hiển thị các lá bài Tarot đã rút với hiệu ứng LẬT BÀI 3D & HÌNH ẢNH THẬT */}
          {drawnCards.length > 0 && (
            <View style={styles.tarotSpreadPanel}>
              <View style={styles.spreadHeaderRow}>
                <Text style={styles.spreadSectionTitle}>
                  {decision.spreadId ? TAROT_SPREADS[decision.spreadId]?.nameVi : 'Thông Điệp Tarot'} ({drawnCards.length} lá)
                </Text>
                <TouchableOpacity
                  style={styles.flipAllButton}
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleFlipAllCards(messageId, drawnCards.length); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles" size={16} color="#FFF0BB" /><Text style={styles.flipAllButtonText}>Lật tất cả</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tarotCardsScroll}>
                {drawnCards.map((item, idx) => {
                  const cardKey = `${messageId}_${idx}`;
                  const isFlipped = !!flippedCards[cardKey];
                  return (
                    <TarotCardFlipView
                      key={cardKey}
                      item={item}
                      index={idx}
                      isFlipped={isFlipped}
                      onFlip={() => handleFlipCard(messageId, idx)}
                      onPressCard={(c) => setZoomedCard(c)}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Nếu thuần 24 chỉ số Thần số học (0 lá Tarot): Hiển thị bản đồ chỉ số */}
          {drawnCards.length === 0 && (
            <View style={styles.numerologyDetailPanel}>
              <Text style={styles.spreadSectionTitle}>📜 Bản Đồ 24 Chỉ Số Pythagoras</Text>
              {indicators1.map((ind: any, idx) => (
                <View key={idx} style={styles.numDetailRow}>
                  <View style={styles.numBadge}>
                    <Text style={styles.numBadgeVal}>{ind.value}</Text>
                  </View>
                  <View style={styles.numTextWrap}>
                    <Text style={styles.numName}>{ind.nameVi || ind.name} {ind.archetypeVi ? `• ${ind.archetypeVi}` : ''}</Text>
                    <Text style={styles.numDesc}>{ind.summaryLine || ind.meaning}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    // 2. Tương thích các loại card cũ
    if (card.type === 'lunar_guidance') {
      return (
        <View style={styles.cardContainer}>
          <Text style={styles.cardBadge}>⛩️ XUẤT HÀNH</Text>
          <Text style={styles.highlightValue}>{card.suggestedDepartureTime}</Text>
          <Text style={styles.infoValue}>Nên: {(card.yi || []).slice(0, 3).join(' • ')}</Text>
        </View>
      );
    }
    if (card.type === 'tarot') {
      const firstCard = card.cards?.[0] || {};
      return (
        <View style={[styles.cardContainer, { borderColor: '#F5BA5B' }]}>
          <Text style={[styles.cardBadge, { color: '#F5BA5B' }]}>🔮 THÔNG ĐIỆP TAROT</Text>
          <Text style={styles.tarotCardName}>{firstCard.nameVi}</Text>
          <Text style={styles.tarotMeaningText}>{firstCard.meaning}</Text>
        </View>
      );
    }
    return null;
  };

  const clearCurrentHistory = useCallback(async () => {
    if (loading) return;

    const didClear = await clearChatHistory(chatHistoryOwner);
    if (!didClear) {
      Alert.alert('Không thể xóa lịch sử', 'Vui lòng thử lại.');
      return;
    }

    skipNextHistoryPersistForOwnerRef.current = chatHistoryOwner;
    setMessages([]);
    setFlippedCards({});
    setPendingTarotReveal(null);
    setLoading(false);
    setMascotState('idle');
    setZoomedCard(null);
  }, [chatHistoryOwner, loading]);

  const requestClearHistory = useCallback(() => {
    const confirmClear = () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      void clearCurrentHistory();
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Xóa toàn bộ lịch sử hội thoại trên thiết bị này?')) {
        confirmClear();
      }
      return;
    }

    Alert.alert(
      'Xóa lịch sử hội thoại?',
      'Toàn bộ lịch sử của tài khoản hiện tại trên thiết bị này sẽ bị xóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: confirmClear },
      ]
    );
  }, [clearCurrentHistory]);

  const isZeroState = messages.length === 0;
  const currentGlowColor = getFlameGlowColor(mascotCategory);

  const latestUserMsg = [...messages].reverse().find(m => m.sender === 'user');
  const latestMascotMsg = [...messages].reverse().find(m => m.sender === 'mascot');
  const pendingFlippedCount = pendingTarotReveal
    ? pendingTarotReveal.cards.filter(
        (_, index) => !!flippedCards[`${pendingTarotReveal.messageId}_${index}`]
      ).length
    : 0;

  return (
    <View style={styles.outerScreenWrap}>
      {/* 🌟 1. BỐI CẢNH ĐÊM 3 LỚP PARALLAX + MOON + STARS */}
      <ChatSceneBackground />

      <KeyboardAvoidingView 
        style={[styles.container, { paddingTop: insets.top }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* 🌟 2. HEADER BAR (HAMBURGER - NUMELYRA TITLE - CLOCK/HISTORY) */}
        <View style={styles.numelyraHeader}>
          {/* Nút Hamburger menu */}
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mở menu cài đặt"
            onPress={onOpenSettings}
            style={styles.headerCircleBtn}
          >
            <View style={styles.hamburgerStack}>
              <View style={styles.hamburgerLine} />
              <View style={[styles.hamburgerLine, { width: 14 }]} />
              <View style={styles.hamburgerLine} />
            </View>
          </TouchableOpacity>

          {/* Tiêu đề trung tâm giữ cố định trong cả ba trạng thái. */}
          <View style={styles.headerTitleWrap}>
            <Text style={styles.numelyraBrandTitle}>Numelyra</Text>
          </View>

          {/* Nút Clock / Xem lịch sử */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Lịch sử trò chuyện"
            onPress={() => { void Haptics.selectionAsync(); setViewMode(prev => prev === 'current_state' ? 'history_list' : 'current_state'); }}
            style={styles.headerCircleBtn}
          >
            <View style={styles.historyClock}>
              <View style={styles.historyClockHandVertical} />
              <View style={styles.historyClockHandHorizontal} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 🌟 3. MAIN CONTENT STAGE */}
        {viewMode === 'history_list' ? (
          // CHẾ ĐỘ XEM TOÀN BỘ LỊCH SỬ CHAT
          <View style={styles.historyListContainer}>
            <View style={styles.historyBannerRow}>
              <Text style={styles.historyBannerText}>Lịch sử hội thoại</Text>
              <View style={styles.historyBannerActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={requestClearHistory}
                  disabled={loading}
                  style={[styles.clearHistoryBtn, loading && styles.clearHistoryBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Xóa lịch sử hội thoại"
                >
                  <Ionicons name="trash-outline" size={16} color="#FF9AAC" />
                  <Text style={styles.clearHistoryBtnText}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { void Haptics.selectionAsync(); setViewMode('current_state'); }}
                  style={styles.returnStageBtn}
                >
                  <Text style={styles.returnStageBtnText}>Trở về giao diện ngọn lửa</Text><Ionicons name="arrow-forward" size={16} color="#FFD67C" />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.chatListContent}
              renderItem={({ item }) => {
                const isUser = item.sender === 'user';
                if (isUser) {
                  return (
                    <View style={[styles.messageRow, styles.messageRowUser]}>
                      <View style={[styles.messageBubble, styles.bubbleUser]}>
                        <Text style={styles.messageText}>{item.text}</Text>
                      </View>
                    </View>
                  );
                }

                const drawnCards: DrawnCardResult[] = item.card?.drawnCards || [];
                const totalCards = drawnCards.length;
                const hasTarot = totalCards > 0;
                const isCardsFlipped = totalCards > 0
                  ? drawnCards.some((_, idx) => !!flippedCards[`${item.id}_${idx}`])
                  : false;

                return (
                  <View style={[styles.messageRow, styles.messageRowMascot]}>
                    <View style={[styles.messageBubble, styles.bubbleMascot]}>
                      {item.card ? renderCardWidget(item.card, item.id) : null}
                      <TypewriterMessage
                        key={`typewriter-${item.id}`}
                        text={item.text}
                        hasTarot={hasTarot}
                        isCardsFlipped={isCardsFlipped}
                        onFlipCards={() => handleFlipAllCards(item.id, totalCards)}
                        isAlreadyFinished={!!item.isTypingCompleted}
                        onFinish={() => markMessageTypingCompleted(item.id)}
                        onScrollRequest={() => {
                          flatListRef.current?.scrollToEnd({ animated: true });
                        }}
                      />
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                loading ? (
                  <View style={styles.loadingRow}>
                    <Text style={styles.loadingText}>Ngọn lửa đang cảm nhận và tính toán...</Text>
                  </View>
                ) : null
              }
            />
          </View>
        ) : (
          // CHẾ ĐỘ 3 TRẠNG THÁI CHUẨN NUMELYRA
          <View style={styles.threeStateStage}>
            {/* TRẠNG THÁI 1: IDLE / WELCOME */}
            {isZeroState && !loading && (
              <View style={[styles.idleStageWrap, isKeyboardVisible && { paddingTop: 20 }]}>
                <View style={styles.welcomeTypography}>
                  <Text style={styles.welcomeHeading}>Hi, I’m Numelyra</Text>
                  <Text style={styles.welcomeParagraph}>
                    Ask me anything{'\n'}or share how you feel.
                  </Text>
                </View>

                {!isKeyboardVisible && (
                  <View style={styles.mascotBottomSpot}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleMascotPress}
                      accessibilityRole="button"
                      accessibilityLabel="Mở 24 lá bài Thần số học"
                    >
                      <FlameMascot state="idle" size={175} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* TRẠNG THÁI 2: THINKING */}
            {loading && (
              <View style={[styles.thinkingStageWrap, isKeyboardVisible && { paddingTop: 10 }]}>
                {latestUserMsg && (
                  <View style={styles.userBubbleWrapper}>
                    <View style={styles.userBubbleCard}>
                      <Text style={styles.userBubbleContent}>
                        {latestUserMsg.text}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.thinkingBubbleCard}>
                  <View style={styles.thinkingHeaderRow}>
                    <View style={styles.thinkingOrangeDot} />
                    <Text style={styles.thinkingSenderTitle}>Numelyra</Text>
                  </View>
                  <Text style={styles.thinkingMessageBody}>Thinking...</Text>
                </View>

                {pendingTarotReveal && (
                  <View style={styles.tarotRevealGate}>
                    <Text style={styles.tarotRevealTitle}>Các lá bài đã sẵn sàng</Text>
                    <Text style={styles.tarotRevealHint}>
                      Hãy chạm để lật mở từng lá trước khi Numelyra tiết lộ lời giải.
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tarotRevealCards}
                    >
                      {pendingTarotReveal.cards.map((item, index) => {
                        const cardKey = `${pendingTarotReveal.messageId}_${index}`;
                        return (
                          <TarotCardFlipView
                            key={cardKey}
                            item={item}
                            index={index}
                            isFlipped={!!flippedCards[cardKey]}
                            onFlip={() => handleFlipCard(pendingTarotReveal.messageId, index)}
                            onPressCard={(card) => setZoomedCard(card)}
                          />
                        );
                      })}
                    </ScrollView>
                    <Text style={styles.tarotRevealProgress}>
                      Đã mở {pendingFlippedCount}/{pendingTarotReveal.cards.length} lá bài
                    </Text>
                  </View>
                )}

                {!isKeyboardVisible && (
                  <View style={styles.mascotBottomSpot}>
                    <FlameMascot state="thinking" size={185} />
                  </View>
                )}
              </View>
            )}

            {/* TRẠNG THÁI 3: ANSWER / REVEAL */}
            {!isZeroState && !loading && (
              <View style={[styles.answerStageWrap, isKeyboardVisible && { paddingTop: 4 }]}>
                {latestUserMsg && (
                  <View style={[styles.userBubbleWrapper, isKeyboardVisible && { marginBottom: 2 }]}>
                    <View style={[styles.userBubbleCard, isKeyboardVisible && styles.userBubbleCardCompact]}>
                      <Text
                        style={[styles.userBubbleContent, isKeyboardVisible && styles.userBubbleContentCompact]}
                        numberOfLines={isKeyboardVisible ? 1 : undefined}
                      >
                        {latestUserMsg.text}
                      </Text>
                    </View>
                  </View>
                )}

                {latestMascotMsg && (
                  <View style={styles.answerPopupContainer}>
                    <AnswerFlamePopup
                      text={latestMascotMsg.text}
                      senderName="Numelyra"
                      isTypingCompleted={!!latestMascotMsg.isTypingCompleted}
                      onFinishTyping={() => markMessageTypingCompleted(latestMascotMsg.id)}
                      isCompact={isKeyboardVisible}
                    />
                    {!isKeyboardVisible && <PlaceSuggestionsCard data={latestMascotMsg.card?.placeSuggestions} />}
                  </View>
                )}

                {!isKeyboardVisible && (
                  <View style={styles.mascotBottomSpot}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleMascotPress}
                      accessibilityRole="button"
                      accessibilityLabel="Mở 24 lá bài Thần số học"
                    >
                      <FlameMascot state="answer" size={155} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* 🌟 4. INPUT BAR NUMELYRA */}
        <View style={[styles.bottomBarWrap, { paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 8 : 4) : Math.max(insets.bottom, 12) }]}>
          <ChatInputBar
            value={inputVal}
            onChangeText={(text) => {
              setInputVal(text);
              if (text.trim().length >= 2) {
                const cat = getCategoryFromText(text);
                if (cat !== 'default') setMascotCategory(cat);
              }
            }}
            onSend={() => handleSendMessage()}
            onPressPlus={() => {
              setProfilePromptNotice('');
              setIsProfileModalOpen(true);
            }}
            onPressVoice={handleToggleVoice}
            isVoiceListening={isListening}
            isLoading={loading}
            disabled={!isHistoryReady}
            placeholder="Type a message..."
          />
        </View>
      </KeyboardAvoidingView>

      {/* Profile Picker Modal (🔍) */}
      <ProfilePickerModal
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        selectedProfiles={selectedProfiles}
        onProfilesSelected={(list) => {
          setSelectedProfiles(list);
          setProfilePromptNotice('');
        }}
        promptNotice={profilePromptNotice}
      />

      <PlaceSearchContextModal
        visible={isPlaceContextModalOpen}
        onCancel={() => finishPlaceContextSelection(null)}
        onUseCurrentLocation={useCurrentPlaceLocation}
      />

      {/* Zoomed Tarot Card Modal */}
      <Modal
        visible={!!zoomedCard}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomedCard(null)}
      >
        <View style={styles.zoomModalBackdrop}>
          <TouchableOpacity 
            style={styles.zoomModalDismissArea} 
            activeOpacity={1} 
            onPress={() => setZoomedCard(null)} 
          />
          {zoomedCard && (
            <View style={styles.zoomModalCardBox}>
              {/* Header with Position & Close */}
              <View style={styles.zoomModalHeader}>
                <View style={styles.zoomModalPosBadge}>
                  <Text style={styles.zoomModalPosText}>
                    {zoomedCard.position?.nameVi || 'Lá Bài Tarot'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.zoomModalCloseBtn}
                  activeOpacity={0.7}
                  onPress={() => setZoomedCard(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={21} color="#F7CC6A" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.zoomModalScrollContent}
              >
                {/* Large Card Artwork */}
                <View style={styles.zoomCardArtWrap}>
                  <Image
                    source={getTarotCardImage(zoomedCard.card.id)}
                    style={[
                      styles.zoomCardImage,
                      zoomedCard.isReversed && styles.zoomCardImageReversed
                    ]}
                    resizeMode="cover"
                  />
                  <View style={[
                    styles.zoomOrientationBadge,
                    zoomedCard.isReversed ? styles.tagReversed : styles.tagUpright
                  ]}>
                    <Text style={styles.zoomOrientationText}>
                      {zoomedCard.isReversed ? '↷ LÁ NGƯỢC (Reversed)' : '↾ LÁ XUÔI (Upright)'}
                    </Text>
                  </View>
                </View>

                {/* Card Title & Roman Numeral */}
                <Text style={styles.zoomCardNameVi}>{zoomedCard.card.nameVi}</Text>
                <Text style={styles.zoomCardNameEn}>
                  {`Lá số ${zoomedCard.card.number} · ${zoomedCard.card.nameEn}`}
                </Text>

                {/* Position Description */}
                {zoomedCard.position?.descVi ? (
                  <View style={styles.zoomPosDescBox}>
                    <Text style={styles.zoomPosDescLabel}>Ý nghĩa vị trí này:</Text>
                    <Text style={styles.zoomPosDescText}>{zoomedCard.position.descVi}</Text>
                  </View>
                ) : null}

                {/* Keywords */}
                <View style={styles.zoomKeywordsWrap}>
                  {(zoomedCard.isReversed ? zoomedCard.card.keywordsReversed : zoomedCard.card.keywordsUpright).map((kw, kIdx) => (
                    <View key={kIdx} style={styles.zoomKeywordChip}>
                      <Text style={styles.zoomKeywordText}>#{kw}</Text>
                    </View>
                  ))}
                </View>

                {/* Detailed Meaning */}
                <View style={styles.zoomMeaningBox}>
                  <Text style={styles.zoomMeaningHeading}>
                    {zoomedCard.isReversed ? '✦ Luận giải góc độ Lá Ngược:' : '✦ Luận giải góc độ Lá Xuôi:'}
                  </Text>
                  <Text style={styles.zoomMeaningBody}>
                    {zoomedCard.isReversed ? zoomedCard.card.meaningReversed : zoomedCard.card.meaningUpright}
                  </Text>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Mascot 24-Cards Confirmation Dialog */}
      <Modal
        visible={showMascotPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMascotPrompt(false)}
      >
        <View style={styles.mascotPromptBackdrop}>
          <View style={styles.mascotPromptBox}>
            <View style={styles.mascotPromptHeader}>
              <Text style={styles.mascotPromptFlameIcon}>🔥</Text>
              <Text style={styles.mascotPromptTitle}>Linh Vật Ngọn Lửa</Text>
            </View>

            <View style={styles.mascotPromptBody}>
              <Text style={styles.mascotPromptText}>
                ✦ Chào <Text style={styles.mascotPromptName}>{activeTargetProfile?.fullName}</Text>! Bạn có muốn mở{' '}
                <Text style={styles.mascotPromptHighlight}>Bản đồ 24 Lá Bài Thần Số Học</Text> để khám phá trọn vẹn bản mệnh không?
              </Text>
              <Text style={styles.mascotPromptSub}>
                Ngày sinh: {activeTargetProfile?.birthDate} • 24 chỉ số năng lượng Pythagoras
              </Text>
            </View>

            <View style={styles.mascotPromptActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowMascotPrompt(false)}
                style={styles.mascotPromptCancelBtn}
              >
                <Text style={styles.mascotPromptCancelText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowMascotPrompt(false);
                  setIsCardsModalOpen(true);
                }}
                style={styles.mascotPromptConfirmBtn}
              >
                <Ionicons name="sparkles" size={17} color="#211438" /><Text style={styles.mascotPromptConfirmText}>Mở 24 Lá Bài</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 24 Numerology Cards Modal */}
      <NumerologyCardsModal
        visible={isCardsModalOpen}
        profile={activeTargetProfile}
        onClose={() => setIsCardsModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The scene is rendered by ChatSceneBackground behind this interactive layer.
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    zIndex: 2,
  },
  titleContainer: { alignItems: 'center' },
  starIcon: { color: '#E2B883', fontSize: 16, marginBottom: 2 },
  headerTitle: { color: '#E2B883', fontSize: 16, fontWeight: '500', letterSpacing: 2 },
  titleUnderline: { width: 30, height: 2, backgroundColor: '#E2B883', marginTop: 4, borderRadius: 1 },
  settingsBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  accountIcon: { width: 32, height: 32 },
  
  contentArea: { flex: 1, zIndex: 1 },

  // 🌟 VÙNG ÁNH ĐÈN LAN TỎA QUANH GIAO DIỆN
  ambientBackdropGlow: {
    position: 'absolute',
    top: 0,
    left: -50,
    right: -50,
    height: 440,
    zIndex: 0,
  },
  topFlameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  topFlameContainerZero: {
    paddingTop: 45,
    paddingBottom: 25,
  },
  topFlameContainerActive: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  ambientGlowWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ambientGlowImage: {
    position: 'absolute',
    alignSelf: 'center',
  },
  ambientWideHalo: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 55,
    elevation: 4,
    zIndex: 0,
  },
  ambientMidHalo: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 6,
    zIndex: 1,
  },
  ambientCoreHalo: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },
  typographyContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  mainHeading: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeading: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  chatScrollContainer: {
    flex: 1,
  },
  chatListContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginVertical: 8, maxWidth: '90%' },
  messageRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageRowMascot: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
  messageBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, width: '100%' },
  bubbleUser: { backgroundColor: '#1E1B29', borderBottomRightRadius: 4 },
  bubbleMascot: { backgroundColor: '#161424', borderWidth: 1, borderColor: '#2A2640', borderBottomLeftRadius: 4 },
  messageText: { color: '#F8FAFC', fontSize: 14, lineHeight: 22 },
  messageTextEmphasis: { fontWeight: '800' },
  loadingRow: { marginVertical: 10, marginLeft: 16 },
  loadingText: { color: '#E2B883', fontSize: 13, fontStyle: 'italic' },

  // INPUT
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#09090E'
  },
  topInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161424',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2F2A48',
    maxWidth: '80%'
  },
  profilePillWarning: {
    borderColor: '#F5BA5B',
    backgroundColor: 'rgba(245, 186, 91, 0.15)'
  },
  profilePillCouple: {
    borderColor: '#F472B6',
    backgroundColor: 'rgba(244, 114, 182, 0.15)'
  },
  profilePillSparkle: {
    color: '#F5BA5B',
    fontSize: 12,
    marginRight: 6
  },
  profilePillText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1
  },
  profilePillArrow: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 6
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4
  },
  listeningText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16141F',
    borderRadius: 30,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2739'
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1B2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#36304E'
  },
  searchIcon: {
    fontSize: 16,
    color: '#E2B883'
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 40,
    paddingHorizontal: 4
  },
  voiceButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1B2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#36304E'
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444'
  },
  voiceIcon: {
    fontSize: 16
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDB551',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendIcon: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold'
  },

  // --- AGENT SYNTHESIS WIDGET STYLES ---
  agentCardContainer: {
    marginBottom: 12,
    backgroundColor: '#12101E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2E2744',
  },
  answerTextContainer: {
    paddingTop: 4,
  },
  thinkingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 186, 91, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 186, 91, 0.25)',
    marginVertical: 4,
  },
  promptFlipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  thinkingTextPlaceholder: {
    color: '#F5BA5B',
    fontSize: 12.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  typewriterCursor: {
    color: '#F5BA5B',
    fontWeight: '900',
    fontSize: 14,
  },
  skipHintText: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'right',
  },
  thoughtHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6
  },
  thoughtTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  thoughtIcon: {
    fontSize: 14,
    marginRight: 6
  },
  thoughtTitle: {
    color: '#E2B883',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1
  },
  modeBadge: {
    backgroundColor: '#231E37',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#433A63'
  },
  modeBadgeText: {
    color: '#D8B4FE',
    fontSize: 10,
    fontWeight: '700'
  },
  thoughtProcessText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 10
  },
  indicatorChipsWrap: {
    marginBottom: 12
  },
  chipsLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  chipsScroll: {
    flexDirection: 'row'
  },
  indicatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A162B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#393153',
    marginRight: 6
  },
  indicatorChipP2: {
    borderColor: '#F472B6',
    backgroundColor: 'rgba(244, 114, 182, 0.1)'
  },
  indicatorChipName: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4
  },
  indicatorChipVal: {
    color: '#FDB551',
    fontSize: 11,
    fontWeight: '800'
  },

  // TỬ VI ĐẨU SỐ & BÁT TỰ TỨ TRỤ PANEL
  tuViContainer: {
    backgroundColor: '#18132B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3E305C'
  },
  tuViHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  tuViHeaderTitle: {
    color: '#E2B883',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  },
  tuViScoreBadge: {
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F472B6'
  },
  tuViScoreVal: {
    color: '#F472B6',
    fontSize: 13,
    fontWeight: '800'
  },
  tuViChartsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 10
  },
  tuViPersonBox: {
    flex: 1,
    backgroundColor: '#201938',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#342854'
  },
  tuViPersonHeader: {
    marginBottom: 6
  },
  tuViPersonName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2
  },
  tuViNapAmBadge: {
    color: '#D8B4FE',
    fontSize: 9,
    fontStyle: 'italic'
  },
  tuViPillarsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161126',
    borderRadius: 6,
    padding: 4,
    marginBottom: 6
  },
  tuViPillarCell: {
    alignItems: 'center',
    flex: 1
  },
  tuViPillarLabel: {
    color: '#64748B',
    fontSize: 9,
    marginBottom: 2
  },
  tuViPillarVal: {
    color: '#FDB551',
    fontSize: 10,
    fontWeight: '700'
  },
  tuViKeyRow: {
    marginTop: 2
  },
  tuViKeyText: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14
  },
  tuViGoldText: {
    color: '#FDB551',
    fontWeight: '700'
  },
  tuViHighlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2
  },
  tuViHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#241D3F',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#42356B'
  },
  tuViHighlightWarning: {
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderColor: '#7F1D1D'
  },
  tuViHighlightLabel: {
    color: '#A5B4FC',
    fontSize: 10,
    marginRight: 4
  },
  tuViHighlightVal: {
    color: '#FDB551',
    fontSize: 10,
    fontWeight: '700'
  },

  // Fallback Compatibility Panel
  compatibilityPanel: {
    backgroundColor: '#1F1528',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4A2345'
  },
  compatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  compatTitle: {
    color: '#F472B6',
    fontSize: 12,
    fontWeight: '700'
  },
  compatScoreText: {
    color: '#F472B6',
    fontSize: 16,
    fontWeight: '800'
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#301A3B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F472B6',
    borderRadius: 3
  },
  compatProfilesSub: {
    color: '#CBD5E1',
    fontSize: 11,
    fontStyle: 'italic'
  },

  // Two-Options Split Panel
  splitPanel: {
    backgroundColor: '#131A29',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F'
  },
  splitLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  splitOptALabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700'
  },
  splitOptBLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  splitBarTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 6
  },
  splitBarA: {
    height: '100%',
    backgroundColor: '#38BDF8'
  },
  splitBarB: {
    height: '100%',
    backgroundColor: '#64748B'
  },
  splitVerdict: {
    color: '#7DD3FC',
    fontSize: 11,
    fontWeight: '500'
  },

  // Tarot Spread Panel
  tarotSpreadPanel: {
    marginTop: 4
  },
  spreadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  spreadSectionTitle: {
    color: '#FDB551',
    fontSize: 12,
    fontWeight: '700'
  },
  flipAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 181, 81, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(253, 181, 81, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  flipAllButtonText: {
    color: '#FDB551',
    fontSize: 11,
    fontWeight: '700'
  },
  tarotCardsScroll: {
    flexDirection: 'row',
    paddingVertical: 2
  },
  tarotCardMiniBox: {
    width: 140,
    backgroundColor: '#181428',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#322849',
    marginRight: 10,
    overflow: 'hidden'
  },
  tarotPosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201A36',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#322849'
  },
  tarotPosNumber: {
    color: '#FDB551',
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4
  },
  tarotPosName: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1
  },
  tarotCardInner: {
    padding: 10,
    alignItems: 'center'
  },
  tarotEmoji: {
    fontSize: 26,
    marginBottom: 4
  },
  tarotCardTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4
  },
  orientationTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6
  },
  tagUpright: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: '#4ADE80'
  },
  tagReversed: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: '#FB923C'
  },
  orientationText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F1F5F9'
  },
  tarotSnippet: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center'
  },

  // Pure Numerology Detail Panel
  numerologyDetailPanel: {
    marginTop: 4
  },
  numDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19152B',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2F2648'
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#261F3D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDB551',
    marginRight: 10
  },
  numBadgeVal: {
    color: '#FDB551',
    fontSize: 14,
    fontWeight: '800'
  },
  numTextWrap: {
    flex: 1
  },
  numName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2
  },
  numDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15
  },

  // Old card types
  cardContainer: {
    marginBottom: 10, backgroundColor: '#121019', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#2D2839'
  },
  cardBadge: { color: '#A78BFA', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  highlightValue: { color: '#F5BA5B', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoValue: { color: '#F1F5F9', fontSize: 12 },
  tarotCardName: { color: '#F5BA5B', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tarotMeaningText: { color: '#E2E8F0', fontSize: 12, lineHeight: 18 },

  // Zoomed Tarot Card Modal Styles
  zoomModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  zoomModalDismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  zoomModalCardBox: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    backgroundColor: '#130F20',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F5BA5B',
    padding: 16,
    shadowColor: '#F5BA5B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12
  },
  zoomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  zoomModalPosBadge: {
    backgroundColor: 'rgba(245, 186, 91, 0.15)',
    borderWidth: 1,
    borderColor: '#F5BA5B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  zoomModalPosText: {
    color: '#F5BA5B',
    fontSize: 12,
    fontWeight: '700'
  },
  zoomModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#201A36',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A305A'
  },
  zoomModalCloseText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700'
  },
  zoomModalScrollContent: {
    alignItems: 'center',
    paddingBottom: 10
  },
  zoomCardArtWrap: {
    width: 150,
    height: 245,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2B883',
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8
  },
  zoomCardImage: {
    width: '100%',
    height: '100%'
  },
  zoomCardImageReversed: {
    transform: [{ rotate: '180deg' }]
  },
  zoomOrientationBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  zoomOrientationText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  zoomCardNameVi: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 3
  },
  zoomCardNameEn: {
    color: '#F5BA5B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12
  },
  zoomPosDescBox: {
    width: '100%',
    backgroundColor: '#1A152E',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2550'
  },
  zoomPosDescLabel: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2
  },
  zoomPosDescText: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 16
  },
  zoomKeywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12
  },
  zoomKeywordChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  zoomKeywordText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600'
  },
  zoomMeaningBox: {
    width: '100%',
    backgroundColor: '#181329',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#30264F'
  },
  zoomMeaningHeading: {
    color: '#F5BA5B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  zoomMeaningBody: {
    color: '#F1F5F9',
    fontSize: 12,
    lineHeight: 18
  },
  mascotPromptBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mascotPromptBox: {
    backgroundColor: '#0F1528',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 169, 60, 0.4)',
    padding: 22,
    width: '100%',
    maxWidth: 380,
    elevation: 12,
    shadowColor: '#E5A93C',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  mascotPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    justifyContent: 'center',
  },
  mascotPromptFlameIcon: {
    fontSize: 20,
  },
  mascotPromptTitle: {
    color: '#FCD34D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mascotPromptBody: {
    marginBottom: 20,
  },
  mascotPromptText: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  mascotPromptName: {
    color: '#FCD34D',
    fontWeight: '700',
  },
  mascotPromptHighlight: {
    color: '#FDE68A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  mascotPromptSub: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 8,
  },
  mascotPromptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotPromptCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotPromptCancelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13.5,
    fontWeight: '600',
  },
  mascotPromptConfirmBtn: {
    flex: 1.6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#E5A93C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    elevation: 4,
    shadowColor: '#E5A93C',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  mascotPromptConfirmText: {
    color: '#0A0E1A',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // --- NUMELYRA 3-STATE NEW STYLES ---
  outerScreenWrap: {
    flex: 1,
    backgroundColor: '#0F0926',
    position: 'relative',
  },
  numelyraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 8,
    minHeight: 54,
    zIndex: 10,
  },
  headerCircleBtn: {
    width: 32,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerStack: {
    width: 21,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 21,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(246, 239, 255, 0.9)',
  },
  headerTitleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numelyraBrandTitle: {
    fontSize: 19,
    fontWeight: '500',
    color: '#F4EFFC',
    letterSpacing: 0.15,
  },
  historyClock: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F2C5ED',
    position: 'relative',
  },
  historyClockHandVertical: {
    position: 'absolute',
    width: 1.5,
    height: 7,
    left: 10,
    top: 4.5,
    borderRadius: 1,
    backgroundColor: '#F2C5ED',
  },
  historyClockHandHorizontal: {
    position: 'absolute',
    width: 5,
    height: 1.5,
    left: 10.5,
    top: 10.5,
    borderRadius: 1,
    backgroundColor: '#F2C5ED',
  },
  threeStateStage: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 5,
  },
  idleStageWrap: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 104,
    paddingBottom: 0,
  },
  welcomeTypography: {
    alignItems: 'center',
    marginTop: 0,
  },
  welcomeHeading: {
    fontSize: 31,
    fontWeight: '500',
    color: '#FBF7FF',
    textAlign: 'center',
    letterSpacing: 0,
    marginBottom: 9,
  },
  welcomeParagraph: {
    fontSize: 20,
    lineHeight: 29,
    color: 'rgba(231, 214, 252, 0.91)',
    textAlign: 'center',
    fontWeight: '400',
  },
  mascotBottomSpot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  thinkingStageWrap: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 34,
    paddingBottom: 0,
  },
  tarotRevealGate: { marginHorizontal: 16, marginVertical: 12, padding: 14, borderRadius: 20, backgroundColor: 'rgba(32, 20, 70, 0.82)', borderWidth: 1, borderColor: 'rgba(247, 204, 106, 0.35)' },
  tarotRevealTitle: { color: '#F7CC6A', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  tarotRevealHint: { color: '#DCCEF2', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  tarotRevealCards: { paddingTop: 14, paddingHorizontal: 4 },
  tarotRevealProgress: { color: '#F7CC6A', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  userBubbleWrapper: {
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 2,
  },
  userBubbleCard: {
    maxWidth: '76%',
    backgroundColor: 'rgba(91, 57, 156, 0.75)',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(178, 141, 235, 0.25)',
    paddingHorizontal: 18,
    paddingVertical: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  userBubbleCardCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  userBubbleContent: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  userBubbleContentCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  thinkingBubbleCard: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(112, 74, 182, 0.7)',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(189, 152, 245, 0.3)',
    paddingHorizontal: 19,
    paddingVertical: 16,
    marginLeft: 18,
    marginTop: 8,
  },
  thinkingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  thinkingOrangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8A8A',
    marginRight: 6,
  },
  thinkingSenderTitle: {
    color: '#FF809B',
    fontSize: 15,
    fontWeight: '700',
  },
  thinkingMessageBody: {
    color: '#F1EAFB',
    fontSize: 17,
    fontWeight: '400',
  },
  answerStageWrap: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 0,
  },
  answerPopupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraCardsInlineWrap: {
    marginTop: 10,
  },
  historyListContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  historyBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(30, 20, 55, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(160, 130, 240, 0.2)',
  },
  historyBannerText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  historyBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 112, 138, 0.12)',
  },
  clearHistoryBtnDisabled: {
    opacity: 0.45,
  },
  clearHistoryBtnText: {
    color: '#FF9AAC',
    fontSize: 12,
    fontWeight: '600',
  },
  returnStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 112, 138, 0.25)',
  },
  returnStageBtnText: {
    color: '#FF85A1',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBarWrap: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
});
