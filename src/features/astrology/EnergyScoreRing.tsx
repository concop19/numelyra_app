import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ASTRO_COLORS } from './AstrologyUi';
import { useLocalization } from '../../i18n/LocalizationContext';

export function EnergyScoreRing({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const { l } = useLocalization();
  const normalized = Math.max(0, Math.min(1, value));
  const percent = Math.round(normalized * 100);
  const activeSegments = Math.round(normalized * 24);

  return (
    <View
      accessible
      accessibilityLabel={l(`${label}: ${percent} phần trăm`, `${label}: ${percent} percent`)}
      style={styles.item}
    >
      <View style={styles.ring}>
        {Array.from({ length: 24 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor: index < activeSegments ? color : 'rgba(232,223,255,0.12)',
                transform: [{ rotate: `${index * 15}deg` }, { translateY: -34 }],
              },
            ]}
          />
        ))}
        <Text style={styles.value}>{percent}%</Text>
      </View>
      <Text numberOfLines={1} style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, minWidth: 80, alignItems: 'center' },
  ring: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  segment: {
    position: 'absolute',
    left: 40,
    top: 38,
    width: 4,
    height: 10,
    borderRadius: 3,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.24,
    shadowRadius: 3,
  },
  value: { color: ASTRO_COLORS.text, fontSize: 17, fontFamily: 'serif', fontWeight: '900' },
  label: { color: ASTRO_COLORS.muted, fontSize: 9.5, fontWeight: '900', textTransform: 'uppercase', marginTop: 6 },
});
