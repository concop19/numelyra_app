import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/game/colors';

interface AppSplashProps {
  readonly onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      setVisible(false);
      onFinish();
    }, 1400);
    return () => clearTimeout(id);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.board}>
          <View style={styles.pathHorizontal} />
          <View style={styles.pathVertical} />
          <View style={styles.dotOne}>
            <Text style={styles.dotText}>1</Text>
          </View>
          <View style={styles.dotTwo}>
            <Text style={styles.dotText}>2</Text>
          </View>
        </View>
        <Text style={styles.brand}>ZIP</Text>
        <Text style={styles.tagline}>Connect every cell.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  hero: {
    alignItems: 'center',
    gap: 18,
  },
  board: {
    width: 124,
    height: 124,
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  pathHorizontal: {
    position: 'absolute',
    left: 30,
    top: 36,
    width: 44,
    height: 16,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  pathVertical: {
    position: 'absolute',
    left: 66,
    top: 36,
    width: 16,
    height: 52,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  dotOne: {
    position: 'absolute',
    left: 18,
    top: 28,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.checkpointFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotTwo: {
    position: 'absolute',
    left: 58,
    top: 76,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.checkpointFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: palette.checkpointText,
    fontSize: 14,
    fontWeight: '800',
  },
  brand: {
    color: palette.accent,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 5,
  },
  tagline: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
