import { BlurMask, Canvas, Circle, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

export function AmbientBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['#FDFCFA', '#ECE3D3']}
        />
      </Rect>
      
      {/* Top Left soft glow */}
      <Circle cx={0} cy={0} r={width * 0.9} color="#EADFCB" opacity={0.7}>
        <BlurMask blur={100} style="normal" />
      </Circle>

      {/* Center Right soft glow */}
      <Circle cx={width} cy={height * 0.45} r={width * 0.6} color="#E5D8C0" opacity={0.5}>
        <BlurMask blur={80} style="normal" />
      </Circle>

      {/* Bottom Left soft glow */}
      <Circle cx={0} cy={height} r={width * 0.8} color="#DFD3BE" opacity={0.65}>
        <BlurMask blur={90} style="normal" />
      </Circle>
    </Canvas>
  );
}
