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
import HighlightedAnswerText from './HighlightedAnswerText';

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
  isCompact?: boolean;
}

export const AnswerFlamePopup: React.FC<Props> = ({
  text,
  senderName = 'Numelyra',
  isTypingCompleted = false,
  onFinishTyping,
  style,
  extraActions,
  isCompact = false,
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

    // Hiệu ứng bập bùng nhẹ (floating sway) cho ảnh nền
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

  // Kích thước chuẩn linh hoạt (co gọn khi bàn phím mở)
  const popupWidth = isCompact ? COMPACT_POPUP_WIDTH : NORMAL_POPUP_WIDTH;
  const popupHeight = isCompact ? COMPACT_POPUP_HEIGHT : NORMAL_POPUP_HEIGHT;

  // Tính toán vùng hiển thị khớp hoàn hảo 100% với vùng bụng kem sáng của ngọn lửa
  const contentTop = Math.round(popupHeight * 0.19);
  const contentLeft = Math.round(popupWidth * 0.16);
  const contentWidth = Math.round(popupWidth * 0.68);
  const contentHeight = Math.round(popupHeight * 0.56);
  // Cố định chiều cao tuyệt đối cho ScrollView để cuộn mượt mà không bị giãn
  const headerHeight = 24;
  const scrollHeight = Math.max(contentHeight - headerHeight - 4, 100);

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          width: popupWidth,
          height: popupHeight,
          opacity: opacityEnterAnim,
        },
        style,
      ]}
    >
      {/* Toàn bộ lớp nền trang trí (hào quang, hạt sáng, ngọn lửa) gom vào vùng pointerEvents="none" 100% */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Lớp hào quang tia lửa bên ngoài */}
        <Animated.View
          style={[
            styles.auraBackground,
            {
              transform: [{ scale: auraPulseAnim }, { translateY: floatAnim }],
            },
          ]}
        >
          <Image
            source={ANSWER_AURA}
            style={styles.fillImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Lớp hạt sáng ma thuật xung quanh */}
        <Animated.View
          style={[
            styles.particlesOverlay,
            {
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          <Image
            source={ANSWER_PARTICLES}
            style={styles.fillImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Lớp nền ngọn lửa kem phát sáng - khóa tĩnh đồng bộ hoàn toàn với khung chữ */}
        <View style={styles.flameImageBg}>
          <Image
            source={ANSWER_BG}
            style={styles.fillImage}
            resizeMode="stretch"
          />
        </View>
      </View>

      {/* Nội dung bên trong ngọn lửa: hòa quyện tự nhiên 100% vào nền kem, không có hộp hay viền thô */}
      <View
        style={[
          styles.contentContainer,
          {
            top: contentTop,
            left: contentLeft,
            width: contentWidth,
            height: contentHeight,
          },
        ]}
      >
        {/* Header người gửi - chạm vào để bỏ qua gõ chữ */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSkipTyping}
          style={styles.headerRow}
          accessibilityLabel="Bỏ qua hiệu ứng gõ chữ"
        >
          <View style={styles.senderDot} />
          <Text style={[styles.senderTitle, isCompact && styles.senderTitleCompact]}>
            {senderName}
          </Text>
        </TouchableOpacity>

        {/* Khung văn bản cuộn êm mượt, không có thanh cuộn xám thô */}
        <ScrollView
          style={[styles.textScroll, { height: scrollHeight, maxHeight: scrollHeight }]}
          contentContainerStyle={styles.textScrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          overScrollMode="always"
          scrollEventThrottle={16}
          onScrollBeginDrag={handleSkipTyping}
        >
          <HighlightedAnswerText
            text={displayedText}
            style={[styles.messageBody, isCompact && styles.messageBodyCompact]}
            emphasisStyle={styles.messageEmphasis}
          >
            {!isDone && <Text style={styles.cursor}> ▌</Text>}
          </HighlightedAnswerText>

          {extraActions && (
            <View style={styles.actionsContainer}>{extraActions}</View>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NORMAL_POPUP_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 360);
const NORMAL_POPUP_HEIGHT = NORMAL_POPUP_WIDTH * 1.03;

const COMPACT_POPUP_WIDTH = Math.min(SCREEN_WIDTH * 0.74, 255);
const COMPACT_POPUP_HEIGHT = COMPACT_POPUP_WIDTH * 1.03;

const styles = StyleSheet.create({
  outerContainer: {
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
  flameImageBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 2,
    overflow: 'hidden',
    borderRadius: 18,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    height: 20,
  },
  senderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6F59',
    marginRight: 6,
    shadowColor: '#FF6F59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  senderTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#D44A68',
    letterSpacing: 0.3,
  },
  senderTitleCompact: {
    fontSize: 11.5,
  },
  textScroll: {
    width: '100%',
  },
  textScrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageBody: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#281335', // Deep plum/charcoal: độ tương phản cực tốt trên nền kem sáng (WCAG AAA)
    fontWeight: '500',
  },
  messageBodyCompact: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  messageEmphasis: {
    fontWeight: '800',
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
