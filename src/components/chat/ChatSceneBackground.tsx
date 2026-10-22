import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Image, Animated, Platform, Pressable } from 'react-native';

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
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ChatMoonButton({
  onPress,
  style,
  attention = false,
  accessibilityLabel = 'Thông điệp hôm nay',
  accessibilityHint = 'Chạm vào mặt trăng để xem thông điệp hôm nay',
}: ChatMoonButtonProps) {
  const moonGlowAnim = useRef(new Animated.Value(0.92)).current;
  const moonFloatAnim = useRef(new Animated.Value(0)).current;
  const attentionGlowAnim = useRef(new Animated.Value(0)).current;
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
      attentionGlowAnim.setValue(0);
      return;
    }

    const attentionLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(attentionGlowAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(attentionGlowAnim, {
          toValue: 0.2,
          duration: 950,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    attentionLoop.start();
    return () => attentionLoop.stop();
  }, [attention, attentionGlowAnim]);

  return (
    <Animated.View style={[styles.moonContainer, style, { transform: [{ translateY: moonFloatAnim }, { scale: moonGlowAnim }] }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [styles.moonButton, pressed && { opacity: 0.7 }]}
      >
        {attention && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.moonAttentionGlow,
              {
                opacity: attentionGlowAnim,
                transform: [{
                  scale: attentionGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.78, 1.24],
                  }),
                }],
              },
            ]}
          />
        )}
        <Image source={MOON_TOP_LEFT} resizeMode="contain" style={styles.moonImage} />
      </Pressable>
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
  moonAttentionGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 220, 146, 0.28)',
    shadowColor: '#FFE2A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
  },
  moonImage: {
    width: '100%',
    height: '100%',
  },
});

export default ChatSceneBackground;
