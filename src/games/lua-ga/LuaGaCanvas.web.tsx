import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { LuaGaCanvasProps } from './LuaGaCanvasSkia';

export default function LuaGaCanvasWeb(props: LuaGaCanvasProps) {
  return <WithSkiaWeb
    getComponent={() => import('./LuaGaCanvasSkia')}
    opts={{ locateFile: () => '/canvaskit.wasm' }}
    componentProps={props}
    fallback={<View style={styles.loading}><Text style={styles.loadingText}>Đang tải sân gà…</Text></View>}
  />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#132317' },
  loadingText: { color: '#FFF0B8', fontSize: 16, fontWeight: '800' },
});
