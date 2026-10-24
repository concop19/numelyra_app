import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Image, Animated, Platform, Pressable, Text } from 'react-native';
import { useLocalization } from '../../i18n/LocalizationContext';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const BG_SKY = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index1.png');
const BG_MOUNTAINS = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index2.png');
const BG_FOREGROUND = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index3.png');
const STARS_IMG = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/items/stars.png');
const MOON_TOP_LEFT = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/items/moon_top_left.png');

interface Props {
  style?: any;
}

export interface ChatMoonButtonProps {
  onPress?: () => void;
  style?: any;
  attention?: boolean;
  attentionHint?: string;
  showAttentionHint?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ChatMoonButton({
  onPress,
  style,
  attention = false,
  attentionHint,
  showAttentionHint = attention,
  accessibilityLabel,
  accessibilityHint,
}: ChatMoonButtonProps) {
  const { l } = useLocalization();
  const resolvedAttentionHint = attentionHint ?? l('Lời nhắn hôm nay ✨', "Today's message ✨");
  const resolvedAccessibilityLabel = accessibilityLabel ?? l('Thông điệp hôm nay', "Today's message");
  const resolvedAccessibilityHint = accessibilityHint ?? l('Chạm vào mặt trăng để xem thông điệp hôm nay', "Tap the moon to view today's message");
  const moonGlowAnim = useRef(new Animated.Value(0.92)).current;
  const moonFloatAnim = useRef(new Animated.Value(0)).current;
  const attentionPulseAnim = useRef(new Animated.Value(0)).current;
  const attentionHintAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const moonLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(moonGlowAnim, {
          toValue: 1.05,
          duration: 3500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(moonGlowAnim, {
          toValue: 0.92,
          duration: 3500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(moonFloatAnim, {
          toValue: -7,
          duration: 2400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(moonFloatAnim, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    moonLoop.start();
    floatLoop.start();
    return () => {
      moonLoop.stop();
      floatLoop.stop();
    };
  }, [moonGlowAnim, moonFloatAnim]);

  useEffect(() => {
    if (!attention) {
      attentionPulseAnim.setValue(0);
      return;
    }

    attentionPulseAnim.setValue(0);
    const attentionLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(6_500),
        Animated.timing(attentionPulseAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(1_900),
        Animated.timing(attentionPulseAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(18_060),
      ])
    );

    attentionLoop.start();
    return () => attentionLoop.stop();
  }, [attention, attentionPulseAnim]);

  useEffect(() => {
    if (!attention || !showAttentionHint) {
      attentionHintAnim.setValue(0);
      return;
    }

    attentionHintAnim.setValue(0);
    const hintLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(attentionHintAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(3_200),
        Animated.timing(attentionHintAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(14_500),
      ])
    );

    hintLoop.start();
    return () => hintLoop.stop();
  }, [attention, attentionHintAnim, showAttentionHint]);

  return (
    <Animated.View style={[styles.moonContainer, style, { transform: [{ translateY: moonFloatAnim }, { scale: moonGlowAnim }] }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={resolvedAccessibilityLabel}
        accessibilityHint={resolvedAccessibilityHint}
        style={({ pressed }) => [styles.moonButton, pressed && { opacity: 0.7 }]}
      >
        <Image source={MOON_TOP_LEFT} resizeMode="contain" style={styles.moonImage} />
        {attention && (
          <View pointerEvents="none" style={styles.moonAttentionBadgeWrap}>
            <Animated.View
              style={[
                styles.moonAttentionRing,
                {
                  opacity: attentionPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.65],
                  }),
                  transform: [{
                    scale: attentionPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.1],
                    }),
                  }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.moonAttentionDot,
                {
                  opacity: attentionPulseAnim,
                  transform: [{
                    scale: attentionPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, 1.18],
                    }),
                  }],
                },
              ]}
            />
          </View>
        )}
      </Pressable>
      {attention && showAttentionHint && (
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.moonAttentionHint,
            {
              opacity: attentionHintAnim,
              transform: [
                {
                  translateY: attentionHintAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-4, 0],
                  }),
                },
                {
                  scale: attentionHintAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.moonAttentionHintArrow} />
          <Text numberOfLines={2} style={styles.moonAttentionHintText}>{resolvedAttentionHint}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export const ChatSceneBackground: React.FC<Props> = ({ style }) => {
  const starsTwinkleAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {

    // Stars twinkle
    const starsLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(starsTwinkleAnim, {
          toValue: 1.0,
          duration: 2200,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(starsTwinkleAnim, {
          toValue: 0.65,
          duration: 2400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    starsLoop.start();

    return () => {
      starsLoop.stop();
    };
  }, []);

  return (
    <View style={[styles.container, style, { pointerEvents: 'none' }]}>
      {/* Layer 1: Bầu trời đêm sâu thẳm + mây hồng tím */}
      <View style={[styles.layer, styles.skyLayer]}>
        <Image source={BG_SKY} style={styles.layerImage} resizeMode="cover" />
      </View>

      {/* Layer 1.5: Bầu trời sao lấp lánh */}
      <Animated.View style={[styles.starsLayer, { opacity: starsTwinkleAnim }]}> 
        <Image source={STARS_IMG} style={styles.layerImage} resizeMode="contain" />
      </Animated.View>

      {/* Layer 2: Dãy núi tím & mặt hồ phản chiếu hoàng hôn */}
      <View style={[styles.layer, styles.mountainsLayer]}>
        <Image source={BG_MOUNTAINS} style={styles.layerImage} resizeMode="cover" />
      </View>

      {/* Layer 3: Tiền cảnh thảm cỏ tím, bụi cây 2 bên & ánh sáng trung tâm */}
      <View style={[styles.layer, styles.foregroundLayer]}>
        <Image source={BG_FOREGROUND} style={styles.layerImage} resizeMode="cover" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    // Keep the negative image layer created by React Native Web inside this
    // stacking context; otherwise it is painted behind the app's dark root.
    zIndex: 0,
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  layerImage: {
    width: '100%',
    height: '100%',
    // On React Native Web this is the stacking context of the actual bitmap.
    zIndex: 1,
  },
  skyLayer: {
    zIndex: 1,
  },
  mountainsLayer: {
    zIndex: 4,
  },
  foregroundLayer: {
    zIndex: 5,
  },
  starsLayer: {
    position: 'absolute',
    top: '13%',
    left: '6%',
    width: '26%',
    height: '19%',
    zIndex: 2,
  },
  moonContainer: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 64,
    height: 64,
    zIndex: 20,
  },
  moonButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonAttentionBadgeWrap: {
    position: 'absolute',
    top: 1,
    right: 0,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  moonAttentionRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4B67',
  },
  moonAttentionDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFF1E6',
    backgroundColor: '#FF375F',
    shadowColor: '#FF5472',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 5,
    elevation: 6,
  },
  moonAttentionHint: {
    position: 'absolute',
    top: 43,
    left: 52,
    width: 148,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 220, 155, 0.78)',
    backgroundColor: 'rgba(42, 19, 75, 0.96)',
    shadowColor: '#120827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 10,
  },
  moonAttentionHintArrow: {
    position: 'absolute',
    top: 8,
    left: -5,
    width: 10,
    height: 10,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 220, 155, 0.78)',
    backgroundColor: 'rgba(42, 19, 75, 0.96)',
    transform: [{ rotate: '45deg' }],
  },
  moonAttentionHintText: {
    color: '#FFF3D2',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.15,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 220, 155, 0.26)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  moonImage: {
    width: '100%',
    height: '100%',
  },
});

export default ChatSceneBackground;
