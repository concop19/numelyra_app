import React, { useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useLocalization } from '../../i18n/LocalizationContext';

// Default idle animation — animated WebP loop (sitting peacefully)
const IDLE_WEBP = require('../../../assets/char/result_Flame_character_sitting_peacefully_1080p_20261017202140_2_ (1)/idle_1.webp');

export type MascotAnimationItem =
  | {
      type: 'paired';
      id: string;
      idleSource: any;
      actionSource: any;
      dialogues: string[];
      dialoguesEn: string[];
      preIdleMs?: number;
      actionMs?: number;
      postIdleMs?: number;
    }
  | {
      type: 'standalone';
      id: string;
      source: any;
      dialogues: string[];
      dialoguesEn: string[];
    };

export const DEFAULT_IDLE_DIALOGUES = [
  'Hôm nay của bạn thế nào? Kể Tiểu Linh Miêu nghe nè ✨',
  'Ở đây luôn có một ngọn lửa nhỏ lắng nghe bạn... 💛',
  'Có tâm sự gì khó nói, cứ trút hết vào đây nha! 🌸',
  'Bạn muốn khám phá điều gì về bản thân hôm nay? 🔮',
];

const DEFAULT_IDLE_DIALOGUES_EN = [
  'How is your day going? Tell the Little Spirit Cat all about it ✨',
  'There is always a little flame here ready to listen... 💛',
  'If something is on your mind, you can tell me everything! 🌸',
  'What would you like to discover about yourself today? 🔮',
];

export const CHAR_ANIMATIONS: MascotAnimationItem[] = [
  // 1. Bộ 3 (Cầu thủ áo đỏ số 7)
  {
    type: 'paired',
    id: 'char_3_football',
    idleSource: require('../../../assets/char/result_Flame_character_in_football_jersey_20261017202155/preview_3_idle.webp'),
    actionSource: require('../../../assets/char/preview copy 3.webp'),
    preIdleMs: 3_000,
    actionMs: 4_000,
    postIdleMs: 3_000,
    dialogues: [
      'Hôm nay tôi đá bóng, còn bạn đá bay nỗi buồn đi nhé! SIUUU! ⚽',
      'Phong độ là nhất thời, đẳng cấp của tui là mãi mãi! 😎',
      'Sút bay deadline, ghi bàn thẳng vào tim crush! ⚽🔥',
    ],
    dialoguesEn: [
      'I am playing soccer today, you kick those blues away! SIUUU! ⚽',
      'Form is temporary, but my class is forever! 😎',
      'Kick deadlines away and score straight into your crush’s heart! ⚽🔥',
    ],
  },
  // 2. Bộ 5 (Đồng phục học sinh áo xanh)
  {
    type: 'paired',
    id: 'char_5_school',
    idleSource: require('../../../assets/char/result_Flame_character_breathing_idle_1080p_20261017202322/preview_5_idle.webp'),
    actionSource: require('../../../assets/char/preview copy 5.webp'),
    preIdleMs: 3_000,
    actionMs: 4_000,
    postIdleMs: 3_000,
    dialogues: [
      'Áaaaa trễ deadline gòi, ai cứu bé zớiii! 🏃💨',
      'Học không chơi đánh rơi tuổi trẻ, chơi không học áp lực ngang! 😭',
      'Chạy ngay đi trước khi mọi chuyện tồi tệ hơn! 💨',
    ],
    dialoguesEn: [
      'Ahhh, I am late on my deadline! Somebody save me! 🏃💨',
      'Study with no play and you miss out; play with no study and the stress hits! 😭',
      'Run now before things get even worse! 💨',
    ],
  },
  // 3. Bộ 7 (Vest cầm ví tiền)
  {
    type: 'paired',
    id: 'char_7_wallet',
    idleSource: require('../../../assets/char/result_Flame_character_holding_wallet_1080p_20261017202251/preview_7_idle.webp'),
    actionSource: require('../../../assets/char/preview copy 7.webp'),
    preIdleMs: 3_000,
    actionMs: 4_000,
    postIdleMs: 3_000,
    dialogues: [
      'Ví ơi sao mày gầy thế... ăn hoài hổng chịu mập dị? 💸',
      'Tiền không tự mất đi, nó chỉ biến thành đồ ăn và đơn Shopee! 🥲',
      'Đầu tháng tổng tài, cuối tháng tổng xỉ vả ví tiền! 📉',
    ],
    dialoguesEn: [
      'Wallet, why are you so skinny... I keep feeding you, but you never gain weight? 💸',
      'Money does not disappear; it just turns into food and online shopping! 🥲',
      'A tycoon at the start of the month, yelling at my wallet by the end! 📉',
    ],
  },
  // 4. Bộ 10 (Vest tóc vàng phong cách Trump)
  {
    type: 'paired',
    id: 'char_10_trump_suit',
    idleSource: require('../../../assets/char/result_Flame_character_wearing_suit_sta__20261017202150/preview_10_idle.webp'),
    actionSource: require('../../../assets/char/preview copy 10.webp'),
    preIdleMs: 3_000,
    actionMs: 4_000,
    postIdleMs: 3_000,
    dialogues: [
      'Chủ tịch giả vờ làm ngọn lửa và cái kết... cực kỳ rực rỡ! ✨',
      'Make your life great again! Tự tin lên người anh em! 💼',
      'Tôi không có gì ngoài sự tỏa sáng và thần thái triệu đô! 👑',
    ],
    dialoguesEn: [
      'A chairman pretends to be a flame, and the result... absolutely brilliant! ✨',
      'Make your life great again! Believe in yourself, my friend! 💼',
      'All I have is a million-dollar glow and confidence! 👑',
    ],
  },
  // 5. Standalone: Tóc vàng khóc dụi mắt
  {
    type: 'standalone',
    id: 'standalone_preview_1',
    source: require('../../../assets/char/preview.webp'),
    dialogues: [
      'Người giàu cũng biết khóc mà... đừng bắt tui gồng nữa! 🥺💧',
      'Bên ngoài bảnh bao, bên trong nước mắt chảy thành sông... 😭',
      'Ủa alo, ai làm tổn thương trái tim mỏng manh này dạ?',
    ],
    dialoguesEn: [
      'Even rich people cry... stop making me pretend I am okay! 🥺💧',
      'Looking sharp on the outside, drowning in tears on the inside... 😭',
      'Hello? Who hurt this delicate little heart?',
    ],
  },
  // 6. Standalone: Ngọn lửa khóc nằm sàn
  {
    type: 'standalone',
    id: 'standalone_preview_2',
    source: require('../../../assets/char/preview copy.webp'),
    dialogues: [
      'Trầm cảm ngang... Cuộc đời này bất công với bé quá! 😭💔',
      'Cứu bé zới, thế giới này toàn điều làm tổn thương bé thui! 🛌',
      'Cho tui nằm đây ăn vạ 5 phút, ai dỗ thì tui nín... 🤧',
    ],
    dialoguesEn: [
      'I am so down... life is being so unfair to me! 😭💔',
      'Help me out, the world keeps hurting this little flame! 🛌',
      'Let me lie here and sulk for five minutes; comfort me and I might stop... 🤧',
    ],
  },
  // 7. Standalone: Ngọn lửa cầm súng
  {
    type: 'standalone',
    id: 'standalone_preview_shotgun',
    source: require('../../../assets/char/preview copy 2.webp'),
    dialogues: [
      'Nói một câu nữa coi? Dịu dàng không muốn lại thích ăn kẹo đồng! 🔫🔥',
      'Đừng đùa với lửa! Chọc tui quạu là tới công chuyện liền nha! 💣',
      'Chế độ đồ sát: ĐÃ BẬT! Ai chọc tui bước ra đây coi? 😤',
    ],
    dialoguesEn: [
      'Say that one more time? You really do not want to get on my bad side! 🔫🔥',
      'Do not play with fire! Keep pushing me and things will get real! 💣',
      'Rage mode: ACTIVATED! Whoever started this, step forward! 😤',
    ],
  },
  // 8. Standalone: Ngọn lửa tan chảy
  {
    type: 'standalone',
    id: 'standalone_preview_melting',
    source: require('../../../assets/char/preview copy 4.webp'),
    dialogues: [
      'Hết pin 0%... Tui chính thức biến thành một vũng nước lèo! 🫠',
      'Linh hồn đã rời khỏi thể xác, xin đừng làm phiền lúc này... 🕯️',
      'Trời nóng hay đời nóng mà tui tan chảy ra thế này? 🫠',
    ],
    dialoguesEn: [
      'Battery at 0%... I have officially melted into a puddle! 🫠',
      'My soul has left my body; please do not disturb me right now... 🕯️',
      'Is it the weather or life that has me melting like this? 🫠',
    ],
  },
  // 9. Standalone: Nằm ghế lười bấm điện thoại
  {
    type: 'standalone',
    id: 'standalone_preview_phone',
    source: require('../../../assets/char/preview copy 6.webp'),
    dialogues: [
      'Lướt tóp tóp 5 phút thôi mà... ủa sao trôi qua 3 tiếng rồi? 📱🛌',
      'Chuyện gì khó quá thì mình trùm mền nằm lướt điện thoại! 😴',
      'Bật chế độ lười toàn phần, thế giới ngoài kia cứ kệ đi nha~ ✨',
    ],
    dialoguesEn: [
      'Just five minutes of scrolling... wait, how did three hours pass? 📱🛌',
      'When life gets hard, I hide under a blanket and scroll! 😴',
      'Full lazy mode: on. The outside world can wait~ ✨',
    ],
  },
  // 10. Standalone: Ôm má mệt mỏi
  {
    type: 'standalone',
    id: 'standalone_preview_tired',
    source: require('../../../assets/char/preview copy 8.webp'),
    dialogues: [
      'Đau đầu hoa mắt chóng mặt bủn rủn tay chân vì overthinking! 🤯',
      'Ủa rồi cuộc đời định đưa đẩy tui đi tới đâu nữa dị trời? 🤦‍♂️',
      'Trán nhăn má xệ vì nghĩ cách làm giàu hoài mà chưa giàu... 💆',
    ],
    dialoguesEn: [
      'Head spinning, knees weak, arms are heavy from overthinking! 🤯',
      'Where on earth is life taking me now? 🤦‍♂️',
      'Wrinkling my forehead trying to figure out how to get rich... still not rich. 💆',
    ],
  },
  // 11. Standalone: Ngọn lửa đội mũ sinh nhật
  {
    type: 'standalone',
    id: 'standalone_preview_party',
    source: require('../../../assets/char/preview copy 9.webp'),
    dialogues: [
      'Chúc mừng sinh nhật tôi... lại già thêm một tuổi rồi nè! 🎂🎈',
      'Thêm một tuổi mới, mong tiền vô như nước tình vô như mơ! ✨',
      'Sinh nhật một mình nhưng vẫn phải thật xinh xắn và rực rỡ! 🥳',
    ],
    dialoguesEn: [
      'Happy birthday to me... one year older again! 🎂🎈',
      'Another year older; may money flow in and love feel like a dream! ✨',
      'Celebrating alone, but still looking fabulous and radiant! 🥳',
    ],
  },
];

export type MascotState = 'idle' | 'thinking' | 'answer' | 'speaking';

interface Props {
  state: MascotState;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  paletteIndex?: number;
  specialAnimationActive?: boolean;
  specialAnimationIndex?: number;
}

export type FirePalette = {
  primary: string;
  outline: string;
};

export const FLAME_COLOR_CHANGE_INTERVAL_MS = 7_000;
export const FLAME_COLOR_PALETTES: FirePalette[] = [
  { primary: '#8B5CF6', outline: '#C4B5FD' },
  { primary: '#EC4899', outline: '#F9A8D4' },
  { primary: '#F97316', outline: '#FCD34D' },
  { primary: '#10B981', outline: '#6EE7B7' },
  { primary: '#3197FE', outline: '#6BCFFF' },
];

export const FlameMascot: React.FC<Props> = ({
  state = 'idle',
  size = 180,
  style,
  onPress,
  specialAnimationActive = false,
  specialAnimationIndex,
}) => {
  const { locale } = useLocalization();
  const [internalAnimationIndex, setInternalAnimationIndex] = useState(0);
  const [subPhase, setSubPhase] = useState<'pre_idle' | 'action' | 'post_idle'>('pre_idle');
  const [isPressed, setIsPressed] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowPulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (specialAnimationActive && specialAnimationIndex === undefined) {
      setInternalAnimationIndex((prev) => {
        if (CHAR_ANIMATIONS.length <= 1) return 0;
        let next = Math.floor(Math.random() * CHAR_ANIMATIONS.length);
        if (next === prev) {
          next = (next + 1) % CHAR_ANIMATIONS.length;
        }
        return next;
      });
    }
  }, [specialAnimationActive, specialAnimationIndex]);

  const activeSpecialIndex = specialAnimationIndex !== undefined
    ? specialAnimationIndex
    : internalAnimationIndex;

  const activeSpecialItem = CHAR_ANIMATIONS[activeSpecialIndex % CHAR_ANIMATIONS.length] || CHAR_ANIMATIONS[0];

  useEffect(() => {
    if (!specialAnimationActive || activeSpecialItem.type !== 'paired') {
      setSubPhase('pre_idle');
      return;
    }

    setSubPhase('pre_idle');
    const preIdleDuration = activeSpecialItem.preIdleMs ?? 3_000;
    const actionDuration = activeSpecialItem.actionMs ?? 4_000;

    const timer1 = setTimeout(() => {
      setSubPhase('action');
    }, preIdleDuration);

    const timer2 = setTimeout(() => {
      setSubPhase('post_idle');
    }, preIdleDuration + actionDuration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [specialAnimationActive, activeSpecialItem]);



  const [activeDialogue, setActiveDialogue] = useState<string>('');
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  // Hiệu ứng hiện / ẩn bong bóng lời thoại
  const showBubble = (text: string) => {
    setActiveDialogue(text);
    Animated.spring(bubbleAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const hideBubble = () => {
    Animated.timing(bubbleAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setActiveDialogue(''));
  };

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (specialAnimationActive) {
      const pool = locale === 'en'
        ? activeSpecialItem?.dialoguesEn || []
        : activeSpecialItem?.dialogues || [];
      if (pool.length > 0) {
        const quote = pool[Math.floor(Math.random() * pool.length)];
        showBubble(quote);
      }
    } else {
      hideBubble();

      // Khi ở idle, sau 600ms hiển thị một câu nói ngẫu nhiên trong 2.4s
      idleTimer = setTimeout(() => {
        const idleDialogues = locale === 'en' ? DEFAULT_IDLE_DIALOGUES_EN : DEFAULT_IDLE_DIALOGUES;
        const idleQuote = idleDialogues[Math.floor(Math.random() * idleDialogues.length)];
        showBubble(idleQuote);
        hideTimer = setTimeout(() => {
          hideBubble();
        }, 2400);
      }, 600);
    }

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [locale, specialAnimationActive, activeSpecialItem]);

  useEffect(() => {
    const bounce = Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.15,
        duration: 180,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]);

    bounce.start();
    return () => bounce.stop();
  }, [bounceAnim, state]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.65,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [glowPulseAnim]);

  let currentImageSource = IDLE_WEBP;
  let currentKey = 'default-idle';

  if (specialAnimationActive && activeSpecialItem) {
    if (activeSpecialItem.type === 'paired') {
      currentImageSource =
        subPhase === 'action'
          ? activeSpecialItem.actionSource
          : activeSpecialItem.idleSource;
      currentKey = `paired-${activeSpecialItem.id}-${subPhase}`;
    } else {
      currentImageSource = activeSpecialItem.source;
      currentKey = `standalone-${activeSpecialItem.id}`;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.wrapper, { width: size, height: size }, style]}
    >
      {/* 💬 Bong bóng lời thoại nổi phía trên Mascot */}
      {activeDialogue ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.speechBubbleContainer,
            {
              bottom: size * 0.96,
              opacity: bubbleAnim,
              transform: [
                {
                  translateY: bubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
                {
                  scale: bubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.bubbleBody}>
            <Text style={styles.bubbleText}>{activeDialogue}</Text>
          </View>
          <View style={styles.bubbleTail} />
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.ambientGlow,
          {
            width: size * 1.3,
            height: size * 0.45,
            bottom: -size * 0.08,
            opacity: isPressed ? 1 : glowPulseAnim,
            transform: [{ scale: isPressed ? 1.18 : 1 }],
            backgroundColor: isPressed
              ? 'rgba(255, 145, 45, 0.8)'
              : 'rgba(255, 195, 100, 0.35)',
          },
        ]}
      />

      <Animated.View
        style={[
          styles.cropContainer,
          {
            width: size,
            height: size,
            transform: [{ scale: bounceAnim }],
          },
        ]}
      >
        <View style={[styles.specialPreviewWrap, { width: size, height: size }]}>
          <ExpoImage
            key={currentKey}
            source={currentImageSource}
            style={{ width: size * 0.8, height: size * 0.8 }}
            contentFit="contain"
            autoplay
          />
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  speechBubbleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    maxWidth: 230,
    minWidth: 120,
    paddingHorizontal: 8,
  },
  bubbleBody: {
    backgroundColor: 'rgba(23, 19, 39, 0.94)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 174, 100, 0.4)',
    shadowColor: '#FFAE64',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  bubbleText: {
    color: '#FFF8F0',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255, 174, 100, 0.5)',
    marginTop: -0.5,
  },
  ambientGlow: {
    position: 'absolute',
    borderRadius: 999,
    shadowColor: '#FFAE64',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 6,
  },
  cropContainer: {
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialPreviewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FlameMascot;
