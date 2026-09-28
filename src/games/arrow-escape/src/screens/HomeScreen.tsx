import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { AmbientBackground } from '../components/AmbientBackground';
import { useGameStore } from '../state/gameStore';
import { theme } from '../theme/theme';
import type { AppNavigation } from '../types/navigation';

export function HomeScreen() {
  const navigation = useNavigation<AppNavigation>();
  const hasSeenTutorial = useGameStore((s) => s.hasSeenTutorial);

  const titleScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);
  const btnTranslateY = useSharedValue(30);
  const arrowBounce = useSharedValue(0);

  // Button interactive scales
  const startScale = useSharedValue(1);
  const selectScale = useSharedValue(1);
  const multiScale = useSharedValue(1);
  const spaceScale = useSharedValue(1);

  useEffect(() => {
    titleScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.4)) });
    titleOpacity.value = withTiming(1, { duration: 500 });
    btnOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    btnTranslateY.value = withDelay(400, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    arrowBounce.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(8, { duration: 600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnTranslateY.value }]
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowBounce.value }]
  }));

  const startAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: startScale.value }]
  }));

  const selectAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectScale.value }]
  }));

  const multiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: multiScale.value }]
  }));

  const spaceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spaceScale.value }]
  }));

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientBackground />
      <View style={styles.content}>
        <Animated.View style={[styles.arrowDeco, arrowStyle]}>
          <Text style={styles.arrowIcon}>➤</Text>
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text style={styles.title}>Arrow{'\n'}Escape</Text>
          <Text style={styles.subtitle}>Tap · Think · Escape</Text>
        </Animated.View>

        <Animated.View style={[btnStyle, { width: '100%', alignItems: 'center' }]}>
          {/* NEW: Chicken Invasion - Dual Task Arrow Reload Mode */}
          <Pressable
            style={{ width: '100%', alignItems: 'center' }}
            onPressIn={() => { spaceScale.value = withSpring(0.94, { damping: 10, stiffness: 350 }); }}
            onPressOut={() => { spaceScale.value = withSpring(1, { damping: 10, stiffness: 350 }); }}
            onPress={() => navigation.navigate('SpaceArrow')}
          >
            <Animated.View style={[styles.startBtn, styles.spaceBtn, spaceAnimStyle]}>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>MỚI</Text>
              </View>
              <Text style={[styles.startBtnText, styles.spaceBtnText]}>🚀 Bắn Gà Nạp Đạn</Text>
            </Animated.View>
          </Pressable>

          <Pressable
            style={{ width: '100%', alignItems: 'center' }}
            onPressIn={() => { startScale.value = withSpring(0.94, { damping: 10, stiffness: 350 }); }}
            onPressOut={() => { startScale.value = withSpring(1, { damping: 10, stiffness: 350 }); }}
            onPress={() => navigation.replace(hasSeenTutorial ? 'Gameplay' : 'Tutorial')}
          >
            <Animated.View style={[styles.startBtn, startAnimStyle]}>
              <Text style={styles.startBtnText}>Start Now</Text>
              <Text style={styles.startBtnArrow}>→</Text>
            </Animated.View>
          </Pressable>

          <Pressable
            style={{ width: '100%', alignItems: 'center' }}
            onPressIn={() => { selectScale.value = withSpring(0.94, { damping: 10, stiffness: 350 }); }}
            onPressOut={() => { selectScale.value = withSpring(1, { damping: 10, stiffness: 350 }); }}
            onPress={() => navigation.navigate('LevelSelect')}
          >
            <Animated.View style={[styles.startBtn, styles.levelSelectBtn, selectAnimStyle]}>
              <Text style={[styles.startBtnText, styles.levelSelectText]}>Level Select</Text>
            </Animated.View>
          </Pressable>

          <Pressable
            style={{ width: '100%', alignItems: 'center' }}
            onPressIn={() => { multiScale.value = withSpring(0.94, { damping: 10, stiffness: 350 }); }}
            onPressOut={() => { multiScale.value = withSpring(1, { damping: 10, stiffness: 350 }); }}
            onPress={() => navigation.navigate('Multiplayer')}
          >
            <Animated.View style={[styles.startBtn, styles.multiplayerBtn, multiAnimStyle]}>
              <Text style={[styles.startBtnText, styles.multiplayerText]}>⚔️ Multiplayer Mode ⚔️</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  arrowDeco: { marginBottom: 20 },
  arrowIcon: { fontSize: 64, color: theme.colors.arrowStroke, opacity: 0.7 },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: theme.colors.arrowStroke,
    textAlign: 'center',
    lineHeight: 58
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
    letterSpacing: 2
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.arrowStroke,
    width: 250,
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 36,
    gap: 12,
    ...theme.shadows.md
  },
  startBtnText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  startBtnArrow: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  levelSelectBtn: {
    backgroundColor: '#FFF',
    borderWidth: 0,
    marginTop: 16,
    ...theme.shadows.md
  },
  levelSelectText: {
    color: theme.colors.arrowStroke,
  },
  multiplayerBtn: {
    backgroundColor: '#6A4428',
    borderWidth: 2,
    borderColor: '#FFD54F',
    marginTop: 16,
    ...theme.shadows.lg
  },
  multiplayerText: {
    color: '#FFD54F',
    fontWeight: '800'
  },
  spaceBtn: {
    backgroundColor: '#0369a1',
    borderWidth: 2,
    borderColor: '#38bdf8',
    marginTop: 28,
    position: 'relative',
    ...theme.shadows.lg
  },
  spaceBtnText: {
    color: '#f0f9ff',
    fontWeight: '900',
    fontSize: 18,
  },
  newBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  }
});
