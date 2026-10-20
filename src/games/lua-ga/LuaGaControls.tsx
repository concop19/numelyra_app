import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onMove: (x: number, y: number, sprint: boolean) => void;
  onAction: (action: 'grain' | 'clap' | 'gate') => void;
  onDash: (held: boolean, released: boolean) => void;
  disabled?: boolean;
};

const JOYSTICK_RADIUS = 54;

function LuaGaControls({ onMove, onAction, onDash, disabled }: Props) {
  const insets = useSafeAreaInsets();
  const origin = useRef({ x: 0, y: 0 });
  const knobOffset = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    if (disabled) {
      knobOffset.setValue({ x: 0, y: 0 });
      onMove(0, 0, false);
    }
  }, [disabled, knobOffset, onMove]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: event => {
      origin.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
      onMove(0, 0, false);
    },
    onPanResponderMove: event => {
      const dx = event.nativeEvent.pageX - origin.current.x; const dy = event.nativeEvent.pageY - origin.current.y;
      const distance = Math.hypot(dx, dy); const scale = distance > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / distance : 1;
      const x = dx * scale; const y = dy * scale;
      knobOffset.setValue({ x, y });
      onMove(x / JOYSTICK_RADIUS, y / JOYSTICK_RADIUS, distance / JOYSTICK_RADIUS >= 0.82);
    },
    onPanResponderRelease: () => { knobOffset.setValue({ x: 0, y: 0 }); onMove(0, 0, false); },
    onPanResponderTerminate: () => { knobOffset.setValue({ x: 0, y: 0 }); onMove(0, 0, false); },
  }), [disabled, knobOffset, onMove]);

  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <View style={[styles.joystick, { left: Math.max(22, insets.left + 12), bottom: Math.max(20, insets.bottom + 12) }, disabled && styles.disabled]} {...responder.panHandlers}>
      <View style={styles.joystickRing} />
      <Animated.View style={[styles.knob, { transform: knobOffset.getTranslateTransform() }]} />
    </View>
    <View style={[styles.actions, { right: Math.max(20, insets.right + 12), bottom: Math.max(17, insets.bottom + 10) }, disabled && styles.disabled]}>
      <Action label="🌾" caption="Thóc" onPress={() => onAction('grain')} disabled={disabled} />
      <Action label="👏" caption="Vỗ tay" onPress={() => onAction('clap')} disabled={disabled} />
      <Action label="💨" caption="Lướt" disabled={disabled} onPressIn={() => onDash(true, false)} onPressOut={() => onDash(false, true)} />
      <Action label="🚪" caption="Cửa" onPress={() => onAction('gate')} disabled={disabled} />
    </View>
  </View>;
}

export default React.memo(LuaGaControls);

function Action({ label, caption, ...props }: { label: string; caption: string; disabled?: boolean; onPress?: () => void; onPressIn?: () => void; onPressOut?: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={caption} style={({ pressed }) => [styles.action, pressed && styles.pressed]} {...props}>
    <Text style={styles.actionEmoji}>{label}</Text><Text style={styles.actionText}>{caption}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.35 },
  joystick: { position: 'absolute', width: 122, height: 122, alignItems: 'center', justifyContent: 'center' },
  joystickRing: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(18,20,22,0.42)' },
  knob: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,225,140,0.92)', borderWidth: 3, borderColor: '#6B4423' },
  actions: { position: 'absolute', width: 186, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  action: { width: 84, minHeight: 54, borderRadius: 18, backgroundColor: 'rgba(36,24,54,0.86)', borderWidth: 1, borderColor: '#E5BD70', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.76 }, actionEmoji: { fontSize: 20 }, actionText: { color: '#FFF5D6', fontSize: 10, fontWeight: '800', marginTop: 1 },
});
