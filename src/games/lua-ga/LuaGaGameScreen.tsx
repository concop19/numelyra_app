import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameAudioMode, useGameSound } from '../shared/useGameSound';
import LuaGaCanvas from './LuaGaCanvas';
import LuaGaControls from './LuaGaControls';
import { consumeLuaGaEvents, createLuaGaWorld, setLuaGaPaused, snapshotLuaGaWorld, stepLuaGaWorld } from './engine';
import { EMPTY_INPUT, type LuaGaInputFrame } from './types';

const musicAsset = require('../../../assets/games/lua-ga/sound/lua_ga_music.mp3');
const collisionAsset = require('../../../assets/games/lua-ga/sound/chicken_collision.wav');
const attackAsset = require('../../../assets/games/lua-ga/sound/chicken_attack.wav');
const successAsset = require('../../../assets/games/lua-ga/sound/success.wav');

export default function LuaGaGameScreen({ onExit }: { onExit?: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const worldRef = useRef(createLuaGaWorld());
  const inputRef = useRef<LuaGaInputFrame>({ ...EMPTY_INPUT });
  const hudTimeRef = useRef(0);
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState(() => snapshotLuaGaWorld(worldRef.current));
  const music = useAudioPlayer(musicAsset, { updateInterval: 1000, keepAudioSessionActive: true });
  useGameAudioMode();
  const playCollision = useGameSound(collisionAsset, { minimumIntervalMs: 90, volume: 0.62 });
  const playAttack = useGameSound(attackAsset, { minimumIntervalMs: 650, volume: 0.78 });
  const playSuccess = useGameSound(successAsset, { minimumIntervalMs: 160, volume: 0.76 });

  const syncSnapshot = useCallback(() => setSnapshot(snapshotLuaGaWorld(worldRef.current)), []);
  const startMusic = useCallback(() => {
    try { music.loop = true; music.volume = 0.24; music.play(); } catch {}
  }, [music]);

  useEffect(() => {
    let active = true;
    void ScreenOrientation.unlockAsync().then(() => {
      if (active) return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return undefined;
    }).catch(() => undefined);
    if (Platform.OS === 'android') NavigationBar.setHidden(true);
    startMusic();
    return () => {
      active = false; music.pause();
      void ScreenOrientation.unlockAsync().catch(() => undefined);
      if (Platform.OS === 'android') NavigationBar.setHidden(false);
    };
  }, [music, startMusic]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setLuaGaPaused(worldRef.current, true); music.pause();
        Object.assign(inputRef.current, { moveX: 0, moveY: 0, sprint: false, dashHeld: false, dashReleased: false });
        syncSnapshot();
      }
    });
    return () => subscription.remove();
  }, [music, syncSnapshot]);

  const advanceFrame = useCallback((fixedDeltaTime: number) => {
    stepLuaGaWorld(worldRef.current, inputRef.current, fixedDeltaTime);
    inputRef.current.dropGrain = false;
    inputRef.current.clap = false;
    inputRef.current.toggleCoop = false;
    inputRef.current.dashReleased = false;
    for (const event of consumeLuaGaEvents(worldRef.current)) {
      if (event === 'attack') playAttack();
      else if (event === 'success') playSuccess();
      else playCollision();
    }
    hudTimeRef.current += fixedDeltaTime;
    if (hudTimeRef.current >= 0.14) {
      hudTimeRef.current = 0;
      syncSnapshot();
    }
  }, [playAttack, playCollision, playSuccess, syncSnapshot]);

  const reset = useCallback(() => {
    worldRef.current = createLuaGaWorld(); inputRef.current = { ...EMPTY_INPUT }; hudTimeRef.current = 0;
    setRevision(value => value + 1); syncSnapshot(); startMusic();
  }, [startMusic, syncSnapshot]);
  const togglePause = useCallback(() => {
    const world = worldRef.current; setLuaGaPaused(world, !world.paused); if (!world.paused) startMusic(); else music.pause(); syncSnapshot();
  }, [music, startMusic, syncSnapshot]);
  const onMove = useCallback((moveX: number, moveY: number, sprint: boolean) => { Object.assign(inputRef.current, { moveX, moveY, sprint }); }, []);
  const onAction = useCallback((action: 'grain' | 'clap' | 'gate') => {
    if (action === 'grain') inputRef.current.dropGrain = true;
    if (action === 'clap') inputRef.current.clap = true;
    if (action === 'gate') inputRef.current.toggleCoop = true;
  }, []);
  const onDash = useCallback((held: boolean, released: boolean) => { inputRef.current.dashHeld = held; inputRef.current.dashReleased = released; }, []);
  const gameEnded = snapshot.completed || snapshot.failed;

  return <View style={styles.root} key={revision}>
    <StatusBar hidden />
    <LuaGaCanvas world={worldRef.current} width={width} height={height} onFrame={advanceFrame} />
    <View pointerEvents="box-none" style={[styles.hud, { left: Math.max(150, insets.left + 145), right: Math.max(150, insets.right + 145), top: Math.max(8, insets.top + 6) }]}>
      <View style={styles.hudGroup}><Text style={styles.hudText}>⏱ {formatTime(snapshot.timeRemaining)}</Text><Text style={styles.hudText}>❤️ {snapshot.playerLives}/{snapshot.maxPlayerLives}</Text></View>
      <View style={styles.hudGroup}><Text style={styles.hudText}>🐔 {snapshot.securedCount}/{snapshot.chickenCount}</Text><Text style={styles.hudText}>🌾 {snapshot.grainDropsRemaining}/3</Text><Text style={styles.hudText}>{snapshot.coopClosed ? '🔒 Đóng' : '🔓 Mở'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={snapshot.paused ? 'Tiếp tục' : 'Tạm dừng'} onPress={togglePause} style={styles.pause}><Text style={styles.pauseText}>{snapshot.paused ? '▶' : 'Ⅱ'}</Text></Pressable>
    </View>
    <LuaGaControls onMove={onMove} onAction={onAction} onDash={onDash} disabled={snapshot.paused || gameEnded} />
    {snapshot.paused && !gameEnded && <View style={styles.pauseOverlay}><Text style={styles.modalTitle}>Đã tạm dừng</Text><Pressable onPress={togglePause} style={styles.primary}><Text style={styles.primaryText}>Tiếp tục</Text></Pressable></View>}
    <Modal visible={gameEnded} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <Text style={styles.modalKicker}>{snapshot.completed ? 'HOÀN THÀNH' : 'THỬ THÁCH THẤT BẠI'}</Text>
        <Text style={styles.modalTitle}>{snapshot.completed ? 'Đàn gà đã an toàn!' : snapshot.failureReason === 'time' ? 'Đã hết 8 phút' : 'Bạn đã mất hết mạng'}</Text>
        <Text style={styles.modalBody}>Thời gian: {formatTime(snapshot.elapsedTime)}  •  Gà: {snapshot.securedCount}/{snapshot.chickenCount}</Text>
        <View style={styles.modalActions}>
          <Pressable onPress={onExit} style={styles.secondary}><Text style={styles.secondaryText}>Về Game Hub</Text></Pressable>
          <Pressable onPress={reset} style={styles.primary}><Text style={styles.primaryText}>Chơi lại</Text></Pressable>
        </View>
      </View></View>
    </Modal>
  </View>;
}

function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#132317' },
  hud: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudGroup: { flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(23,27,28,0.76)' },
  hudText: { color: '#FFF5D6', fontWeight: '800', fontSize: 12 }, pause: { minWidth: 42, minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,27,28,0.78)', borderWidth: 1, borderColor: '#E5BD70' }, pauseText: { color: '#FFF5D6', fontSize: 18, fontWeight: '900' },
  pauseOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,12,12,0.68)' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,12,12,0.72)' },
  modalCard: { width: 340, maxWidth: '86%', borderRadius: 24, backgroundColor: '#FFF7E8', padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#D5A853' },
  modalKicker: { color: '#9A5A24', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, modalTitle: { color: '#302015', fontSize: 23, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  modalBody: { color: '#6B5542', fontSize: 14, marginTop: 10, textAlign: 'center' }, primary: { minWidth: 150, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#7443A6', alignItems: 'center' }, primaryText: { color: 'white', fontWeight: '900', fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  secondary: { minWidth: 130, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#E8DCC6', alignItems: 'center' },
  secondaryText: { color: '#4D3828', fontWeight: '900', fontSize: 14 },
});
