import { useNavigation } from '@react-navigation/native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AmbientBackground } from '../components/AmbientBackground';
import { GameHeader } from '../components/GameHeader';
import { getLevel, getTotalLevels } from '../levels/levels';
import { useGameStore } from '../state/gameStore';
import { difficultyColor, theme } from '../theme/theme';
import type { AppNavigation } from '../types/navigation';

export function LevelSelectScreen() {
  const navigation = useNavigation<AppNavigation>();
  const highestUnlockedLevel = useGameStore((state) => state.highestUnlockedLevel);
  const startLevel = useGameStore((state) => state.startLevel);

  const totalLevels = getTotalLevels();
  const levels = Array.from({ length: totalLevels }, (_, i) => i + 1);

  const handleSelectLevel = (id: number) => {
    if (id <= highestUnlockedLevel) {
      startLevel(id);
      navigation.replace('Gameplay');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientBackground />
      <GameHeader
        title="Select Level"
        showBack={true}
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {levels.map((levelId) => {
            const isUnlocked = levelId <= highestUnlockedLevel;
            const difficulty = getLevel(levelId).difficulty;
            const color = isUnlocked ? difficultyColor[difficulty] : theme.colors.levelLocked;
            
            return (
              <LevelBoxButton
                key={levelId}
                levelId={levelId}
                isUnlocked={isUnlocked}
                color={color}
                onPress={() => handleSelectLevel(levelId)}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LevelBoxButton({
  levelId,
  isUnlocked,
  color,
  onPress
}: {
  levelId: number;
  isUnlocked: boolean;
  color: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const difficulty = getLevel(levelId).difficulty;

  return (
    <Pressable
      onPressIn={() => { if (isUnlocked) scale.value = withSpring(0.92, { damping: 10, stiffness: 350 }); }}
      onPressOut={() => { if (isUnlocked) scale.value = withSpring(1, { damping: 10, stiffness: 350 }); }}
      onPress={onPress}
      disabled={!isUnlocked}
    >
      <Animated.View
        style={[
          styles.levelBox,
          { borderColor: isUnlocked ? color : theme.colors.levelLocked },
          !isUnlocked && styles.levelBoxLocked,
          animatedStyle
        ]}
      >
        <Text style={[styles.levelNumber, { color: isUnlocked ? color : '#FFF' }]}>
          {levelId}
        </Text>
        {isUnlocked && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{difficulty[0]}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  levelBox: {
    width: 72,
    height: 72,
    borderWidth: 3,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  levelBoxLocked: {
    backgroundColor: 'rgba(200, 189, 174, 0.35)',
    borderColor: 'rgba(200, 189, 174, 0.2)',
  },
  levelNumber: {
    fontSize: 26,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  }
});
