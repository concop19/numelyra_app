import { StyleSheet, Text, View } from 'react-native';

import type { Difficulty } from '../game/types';
import { difficultyColor } from '../theme/theme';

type Props = {
  difficulty: Difficulty;
};

export function DifficultyBadge({ difficulty }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: difficultyColor[difficulty] }]}>
      <Text style={styles.text}>{difficulty}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 50,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});
