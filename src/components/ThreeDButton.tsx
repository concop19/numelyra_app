import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type ThreeDButtonVariant = 'brand' | 'purple' | 'gold' | 'light' | 'danger';
export type ThreeDButtonSize = 'sm' | 'md' | 'lg';
export type ThreeDButtonShape = 'rounded' | 'pill' | 'circle';

export type ThreeDButtonProps = {
  label?: string;
  onPress: () => void;
  variant?: ThreeDButtonVariant;
  size?: ThreeDButtonSize;
  shape?: ThreeDButtonShape;
  fullWidth?: boolean;
  diameter?: number;
  highlightColor?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type VariantTokens = {
  face: readonly [string, string, ...string[]];
  base: string;
  ink: string;
  shadow: string;
};

const VARIANTS: Record<ThreeDButtonVariant, VariantTokens> = {
  brand: {
    face: ['#FFD7B8', '#FF9BCB'],
    base: '#B84C8A',
    ink: '#3F205C',
    shadow: '#FF74B3',
  },
  purple: {
    face: ['#B184FF', '#8658EA'],
    base: '#5732AD',
    ink: '#FFFFFF',
    shadow: '#8D66FF',
  },
  gold: {
    face: ['#FFE8A8', '#F6B85F'],
    base: '#BF7B34',
    ink: '#3B260D',
    shadow: '#F5BA5B',
  },
  light: {
    face: ['#FFFDFB', '#F2E9FF'],
    base: '#C8B6D5',
    ink: '#46265F',
    shadow: '#A77BC6',
  },
  danger: {
    face: ['#FF8D82', '#F35569'],
    base: '#B5324D',
    ink: '#FFFFFF',
    shadow: '#E64B67',
  },
};

const SIZES: Record<ThreeDButtonSize, { minHeight: number; depth: number; radius: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { minHeight: 44, depth: 4, radius: 13, paddingHorizontal: 15, fontSize: 13 },
  md: { minHeight: 50, depth: 5, radius: 16, paddingHorizontal: 19, fontSize: 14 },
  lg: { minHeight: 56, depth: 6, radius: 20, paddingHorizontal: 23, fontSize: 16 },
};

export default function ThreeDButton({
  label,
  onPress,
  variant = 'brand',
  size = 'md',
  shape = 'rounded',
  fullWidth = false,
  diameter,
  highlightColor,
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  numberOfLines = 2,
  style,
  faceStyle,
  textStyle,
}: ThreeDButtonProps) {
  const pressOffset = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const tokens = VARIANTS[variant];
  const metrics = SIZES[size];
  const circleDiameter = diameter ?? metrics.minHeight;
  const radius = shape === 'pill' ? 999 : shape === 'circle' ? circleDiameter / 2 : metrics.radius;
  const blocked = disabled || loading;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (blocked) pressOffset.setValue(0);
  }, [blocked, pressOffset]);

  const animateTo = (value: number) => {
    if (reduceMotion) {
      pressOffset.setValue(value);
      return;
    }
    Animated.timing(pressOffset, {
      toValue: value,
      duration: value === 0 ? 90 : 70,
      useNativeDriver: true,
    }).start();
  };

  const accessibilityState = useMemo(
    () => ({ disabled: blocked, busy: loading }),
    [blocked, loading],
  );

  return (
    <View
      style={[
        styles.shell,
        fullWidth && styles.fullWidth,
        shape === 'circle' && { width: circleDiameter },
        { paddingBottom: metrics.depth, shadowColor: tokens.shadow },
        blocked && styles.shellDisabled,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.base,
          {
            top: metrics.depth,
            borderRadius: radius,
            backgroundColor: blocked ? '#AFA7BC' : tokens.base,
          },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY: pressOffset }] }}>
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          disabled={blocked}
          onPress={onPress}
          onPressIn={() => animateTo(metrics.depth)}
          onPressOut={() => animateTo(0)}
          testID={testID}
          style={[styles.pressable, { borderRadius: radius }]}
        >
          <LinearGradient
            colors={blocked ? ['#D8D3E0', '#C8C1D1'] : tokens.face}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[
              styles.face,
              {
                minHeight: shape === 'circle' ? circleDiameter : metrics.minHeight,
                width: shape === 'circle' ? circleDiameter : undefined,
                height: shape === 'circle' ? circleDiameter : undefined,
                borderRadius: radius,
                paddingHorizontal: shape === 'circle' ? 0 : metrics.paddingHorizontal,
              },
              faceStyle,
            ]}
          >
            {!blocked && (
              <View
                pointerEvents="none"
                style={[
                  styles.highlight,
                  {
                    borderRadius: radius,
                    backgroundColor: highlightColor ?? 'rgba(255,255,255,0.34)',
                  },
                ]}
              />
            )}
            {loading ? (
              <ActivityIndicator color={tokens.ink} size="small" />
            ) : (
              <>
                {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
                {label ? (
                  <Text
                    numberOfLines={numberOfLines}
                    style={[
                      styles.label,
                      { color: blocked ? '#81798E' : tokens.ink, fontSize: metrics.fontSize },
                      textStyle,
                    ]}
                  >
                    {label}
                  </Text>
                ) : null}
                {trailingIcon ? <View style={styles.icon}>{trailingIcon}</View> : null}
              </>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'flex-start',
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  shellDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  base: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  pressable: {
    overflow: 'hidden',
  },
  face: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 10,
  },
  highlight: {
    height: '34%',
    left: '9%',
    position: 'absolute',
    right: '9%',
    top: 3,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 20,
    textAlign: 'center',
  },
});
