import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

const ANSWER_BG = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/answerPopup/answer_popup_index2.png');
const ANSWER_AURA = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/answerPopup/answer_popup_index3.png');
const ANSWER_PARTICLES = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/answerPopup/answer_popup_index1.png');

interface Props {
  text: string;
  senderName?: string;
  isTypingCompleted?: boolean;
  onFinishTyping?: () => void;
  style?: any;
  extraActions?: React.ReactNode;
}

export const AnswerFlamePopup: React.FC<Props> = ({
  text,
  senderName = 'Numelyra',
  isTypingCompleted = false,
  onFinishTyping,
  style,
  extraActions,
}) => {
  const [displayedLength, setDisplayedLength] = useState(
    isTypingCompleted ? text.length : 0
  );
  const [isDone, setIsDone] = useState(isTypingCompleted);

  // Animation values
  const scaleEnterAnim = useRef(new Animated.Value(0.85)).current;
  const opacityEnterAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const auraPulseAnim = useRef(new Animated.Value(0.92)).current;

  const isDoneRef = useRef(isDone);
  const typingTimerRef = useRef<any>(null);

  // Hiệu ứng mở bung (enter reveal)
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleEnterAnim, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacityEnterAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Hiệu ứng bập bùng nhẹ (floating sway)
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // Hào quang lấp lánh (aura pulse)
    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulseAnim, {
          toValue: 1.04,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(auraPulseAnim, {
          toValue: 0.94,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    auraLoop.start();

    return () => {
      floatLoop.stop();
      auraLoop.stop();
    };
  }, []);

  // Xử lý Typewriter gõ từng chữ
  useEffect(() => {
    if (isTypingCompleted) {
      setDisplayedLength(text.length);
      setIsDone(true);
      isDoneRef.current = true;
      return;
    }

    let current = 0;
    const step = 3;
    const intervalMs = 24;

    typingTimerRef.current = setInterval(() => {
      if (isDoneRef.current) {
        clearInterval(typingTimerRef.current);
        return;
      }
      current += step;
      if (current >= text.length) {
        current = text.length;
        setDisplayedLength(text.length);
        setIsDone(true);
        isDoneRef.current = true;
        clearInterval(typingTimerRef.current);
        onFinishTyping?.();
      } else {
        setDisplayedLength(current);
      }
    }, intervalMs);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [text, isTypingCompleted]);

  // Chạm vào để bỏ qua hiệu ứng gõ, hiển thị trọn vẹn
  const handleSkipTyping = () => {
    if (!isDone) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedLength(text.length);
      setIsDone(true);
      isDoneRef.current = true;
      onFinishTyping?.();
    }
  };

  const displayedText = isDone ? text : text.slice(0, displayedLength);

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          opacity: opacityEnterAnim,
          transform: [{ scale: scaleEnterAnim }, { translateY: floatAnim }],
        },
        style,
      ]}
    >
      {/* Lớp hào quang tia lửa bên ngoài */}
      <Animated.Image
        source={ANSWER_AURA}
        style={[
          styles.auraBackground,
          {
            transform: [{ scale: auraPulseAnim }],
          },
        ]}
        resizeMode="contain"
      />

      {/* Lớp hạt sáng ma thuật xung quanh */}
      <Image
        source={ANSWER_PARTICLES}
        style={styles.particlesOverlay}
        resizeMode="contain"
      />

      {/* Lớp nền ngọn lửa kem phát sáng */}
      <View style={styles.flameCard}>
        <Image
          source={ANSWER_BG}
          style={styles.flameImageBg}
          resizeMode="stretch"
        />

        {/* Nội dung bên trong ngọn lửa */}
        <TouchableOpacity
          activeOpacity={isDone ? 1 : 0.9}
          onPress={handleSkipTyping}
          style={styles.contentContainer}
        >
          {/* Header người gửi */}
          <View style={styles.headerRow}>
            <View style={styles.senderDot} />
            <Text style={styles.senderTitle}>{senderName}</Text>
          </View>

          {/* Khung văn bản có thể cuộn nếu câu trả lời dài */}
          <ScrollView
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <Text style={styles.messageBody}>
              {displayedText}
              {!isDone && <Text style={styles.cursor}> ▌</Text>}
            </Text>

            {extraActions && (
              <View style={styles.actionsContainer}>{extraActions}</View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POPUP_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 360);
const POPUP_HEIGHT = POPUP_WIDTH * 1.03;

const styles = StyleSheet.create({
  outerContainer: {
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  auraBackground: {
    position: 'absolute',
    width: '115%',
    height: '115%',
    top: '-7.5%',
    left: '-7.5%',
    opacity: 0.85,
  },
  particlesOverlay: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    top: '-10%',
    left: '-10%',
    opacity: 0.9,
  },
  flameCard: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameImageBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  contentContainer: {
    width: '72%',
    height: '70%',
    paddingHorizontal: 10,
    paddingTop: 19,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6F59',
    marginRight: 6,
    shadowColor: '#FF6F59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  senderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D44A68',
    letterSpacing: 0.3,
  },
  textScroll: {
    flex: 1,
  },
  textScrollContent: {
    paddingBottom: 10,
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 22.5,
    color: '#281335', // Deep plum/charcoal: độ tương phản cực tốt trên nền kem sáng (WCAG AAA)
    fontWeight: '500',
  },
  cursor: {
    color: '#FF6F59',
    fontWeight: '900',
  },
  actionsContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 74, 104, 0.15)',
  },
});

export default AnswerFlamePopup;
