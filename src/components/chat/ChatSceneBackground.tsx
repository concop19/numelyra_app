import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Image, Animated, Platform, Pressable } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const BG_SKY = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index1.png');
const BG_MOUNTAINS = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index2.png');
const BG_FOREGROUND = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/backgorund/background_index3.png');
const STARS_IMG = require('../../../assets/giao_dien/giaodien1/chat_screen_asset/items/stars.png');

interface Props {
  style?: any;
}

export function ChatMoonButton({ onPress }: { onPress?: () => void }) {
  const moonGlowAnim = useRef(new Animated.Value(0.92)).current;
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
    moonLoop.start();
    return () => moonLoop.stop();
  }, [moonGlowAnim]);

  return (
    <Animated.View style={[styles.moonContainer, { transform: [{ scale: moonGlowAnim }] }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel="Mở Game Hub"
        accessibilityHint="Chạm vào mặt trăng để chọn trò chơi"
        style={({ pressed }) => [styles.moonButton, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.moonCrescent} pointerEvents="none">
          <View style={styles.moonCutout} />
        </View>
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
    top: '15%',
    left: '13%',
    width: 64,
    height: 64,
    zIndex: 2,
  },
  moonButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonCrescent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD87C',
    overflow: 'hidden',
  },
  moonCutout: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#251052',
    top: -7,
    left: 13,
  },
});

export default ChatSceneBackground;
