// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { GameBoard } from './src/components/GameBoard';
import { DotBoxScreen } from './src/dotbox/screens/DotBoxScreen';
import {
  COMPUTER_PLAYER,
  HUMAN_PLAYER,
  MANDARIN_VALUE,
  PLAYER_NAMES,
  PLAYER_TOP,
  buildMoveTrace,
  canSelectCell,
  chooseComputerMove,
  cloneState,
  createInitialState,
  scoreTotal,
} from './src/game/gameEngine';

const musicSource = require('./assets/source/sound/music.mp3');
const dropSource = require('./assets/source/sound/rai_da.wav');
const playerCaptureSource = require('./assets/source/sound/player_click_square.wav');
const computerCaptureSource = require('./assets/source/sound/enemy_click_square.wav');

function useGameAudio() {
  const music = useAudioPlayer(musicSource, { loop: true });
  const dropOne = useAudioPlayer(dropSource); const dropTwo = useAudioPlayer(dropSource);
  const playerCapture = useAudioPlayer(playerCaptureSource); const computerCapture = useAudioPlayer(computerCaptureSource);
  const nextDrop = useRef(false);
  const started = useRef(false);
  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined); }, []);
  const startMusic = useCallback(() => {
    if (started.current) return;
    started.current = true; music.volume = 0.1; music.play();
  }, [music]);
  const play = useCallback((name: 'drop' | 'player' | 'computer', volume?: number) => {
    const player = name === 'drop' ? (nextDrop.current ? dropOne : dropTwo) : name === 'player' ? playerCapture : computerCapture;
    if (name === 'drop') nextDrop.current = !nextDrop.current;
    player.volume = volume ?? (name === 'drop' ? 0.5 : name === 'player' ? 0.62 : 0.58);
    player.seekTo(0); player.play();
  }, [computerCapture, dropOne, dropTwo, playerCapture]);
  return { play, startMusic };
}

function ScoreBlock({ title, score, active }: any) {
  return <View style={[styles.scoreBlock, active && styles.scoreActive]}>
    <View style={styles.scoreTitle}><Text style={styles.muted}>{title}</Text><Text style={styles.scoreNumber}>{scoreTotal(score)}</Text></View>
    <Text style={styles.pill}>{score.citizens} dân</Text><Text style={styles.pill}>{score.mandarins} quan</Text>
  </View>;
}

const DIFFICULTY = { easy: ['Dễ', 'AI nhìn 1 lượt trước'], medium: ['Trung bình', 'Minimax 3 tầng'], hard: ['Khó', 'Minimax 5 tầng, rất khó thắng'] };

type OAnQuanGameProps = {
  initialTab?: 'dotbox' | 'oanquan';
};

export default function OAnQuanGame({ initialTab = 'oanquan' }: OAnQuanGameProps) {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'dotbox' | 'oanquan'>(initialTab);
  const [gameState, setGameState] = useState(() => createInitialState());
  const [direction, setDirection] = useState(1); const [history, setHistory] = useState<any[]>([]);
  const [isAnimating, setIsAnimating] = useState(false); const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null); const [pendingCapture, setPendingCapture] = useState<any>(null);
  const [captureClicks, setCaptureClicks] = useState(0); const [difficulty, setDifficulty] = useState('easy'); const [computerThinking, setComputerThinking] = useState(false);
  const [skyEffects, setSkyEffects] = useState({ move: null as any, charge: null as any, bursts: [] as any[] });
  const runnerRef = useRef<any>(null); const timersRef = useRef<any[]>([]); const captureTimerRef = useRef<any>(null); const captureClicksRef = useRef(0);
  const { play, startMusic } = useGameAudio();
  const compact = width < 980;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout); timersRef.current = [];
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = null;
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const resetTransient = useCallback(() => {
    setActiveIndex(null); setSelectedCell(null); setPendingCapture(null); setCaptureClicks(0); captureClicksRef.current = 0;
    setSkyEffects({ move: null, charge: null, bursts: [] }); setIsAnimating(false);
  }, []);
  const finishTrace = useCallback(() => {
    if (runnerRef.current) setGameState(runnerRef.current.trace.state);
    runnerRef.current = null; resetTransient();
  }, [resetTransient]);

  const advanceTrace = useCallback((frameIndex: number) => {
    const runner = runnerRef.current; if (!runner) return;
    clearTimers(); const frame = runner.trace.frames[frameIndex];
    if (!frame) { finishTrace(); return; }
    setGameState(frame.state); setActiveIndex(frame.activeIndex);
    if (frame.phase === 'drop') play('drop');
    if (frame.phase === 'capturePrompt') {
      const prompt = { emptyIndex: frame.emptyIndex, targetIndex: frame.targetIndex, nextFrameIndex: frameIndex + 1, isComputer: runner.player === COMPUTER_PLAYER };
      setPendingCapture(prompt); setCaptureClicks(0); captureClicksRef.current = 0;
      if (prompt.isComputer) {
        const timer = setTimeout(() => { play('computer'); setPendingCapture(null); setIsAnimating(true); advanceTrace(prompt.nextFrameIndex); }, 520);
        timersRef.current.push(timer);
      } else {
        setIsAnimating(false); setSkyEffects((value) => ({ ...value, charge: { ...prompt, clicks: 0 } }));
        captureTimerRef.current = setTimeout(() => {
          const clicks = captureClicksRef.current; play('player', Math.min(1, 0.28 + clicks * 0.12));
          setSkyEffects((value) => ({ move: value.move, charge: null, bursts: [...value.bursts, { ...prompt, clicks, startedAt: Date.now() }] }));
          setPendingCapture(null); setCaptureClicks(0); captureClicksRef.current = 0; setIsAnimating(true); advanceTrace(prompt.nextFrameIndex);
        }, 3000);
      }
      return;
    }
    setPendingCapture(null); setCaptureClicks(0); captureClicksRef.current = 0; setIsAnimating(true);
    const timer = setTimeout(() => advanceTrace(frameIndex + 1), 230); timersRef.current.push(timer);
  }, [clearTimers, finishTrace, play]);

  const playTrace = useCallback((baseState: any, cell: number, moveDirection: number, saveHistory = true) => {
    const trace = buildMoveTrace(baseState, cell, moveDirection); if (!trace.ok) return false;
    clearTimers(); runnerRef.current = { trace, player: baseState.currentPlayer };
    if (saveHistory) setHistory((items) => [...items, cloneState(baseState)]);
    setDirection(moveDirection); setSelectedCell(null); setPendingCapture(null); setIsAnimating(true); setActiveIndex(cell);
    setSkyEffects({ move: { seed: Date.now(), startedAt: Date.now() }, charge: null, bursts: [] }); advanceTrace(0); return true;
  }, [advanceTrace, clearTimers]);

  const canInteract = gameState.currentPlayer === HUMAN_PLAYER && gameState.winner === null && !isAnimating && !pendingCapture;
  const selectCell = useCallback((index: number) => { if (canInteract && canSelectCell(gameState, index)) { startMusic(); setSelectedCell(index); setActiveIndex(index); } }, [canInteract, gameState, startMusic]);
  const selectDirection = useCallback((moveDirection: number) => { if (canInteract && selectedCell !== null && canSelectCell(gameState, selectedCell)) { startMusic(); playTrace(gameState, selectedCell, moveDirection); } }, [canInteract, gameState, playTrace, selectedCell, startMusic]);
  const confirmCapture = useCallback((index: number) => {
    if (!pendingCapture || pendingCapture.isComputer || index !== pendingCapture.emptyIndex) return;
    startMusic(); setCaptureClicks((count) => { const next = count + 1; captureClicksRef.current = next; play('player', Math.min(1, 0.32 + next * 0.12)); setSkyEffects((value) => ({ ...value, charge: { ...value.charge, clicks: next } })); return next; });
  }, [pendingCapture, play, startMusic]);

  useEffect(() => {
    if (isAnimating || gameState.winner !== null || gameState.currentPlayer !== COMPUTER_PLAYER) { setComputerThinking(false); return; }
    setComputerThinking(true);
    const timer = setTimeout(() => { setComputerThinking(false); const move = chooseComputerMove(gameState, difficulty); if (move) playTrace(gameState, move.index, move.direction); }, 3000);
    return () => clearTimeout(timer);
  }, [difficulty, gameState, isAnimating, playTrace]);

  const resetGame = useCallback(() => { startMusic(); clearTimers(); runnerRef.current = null; setGameState(createInitialState()); setHistory([]); setDirection(1); resetTransient(); }, [clearTimers, resetTransient, startMusic]);
  const undo = useCallback(() => { if (!history.length) return; clearTimers(); runnerRef.current = null; const prior = history[history.length - 1]; setHistory((items) => items.slice(0, -1)); setGameState(prior); resetTransient(); }, [clearTimers, history, resetTransient]);
  const changeDifficulty = useCallback((level: string) => { if (isAnimating) return; setDifficulty(level); resetGame(); }, [isAnimating, resetGame]);
  const status = useMemo(() => {
    if (gameState.winner === 'draw') return 'Ván hòa'; if (gameState.winner !== null) return `${PLAYER_NAMES[gameState.winner]} thắng`;
    if (pendingCapture && !pendingCapture.isComputer) return `Click ô ăn trong 3 giây (${captureClicks})`;
    if (pendingCapture?.isComputer || computerThinking || gameState.currentPlayer === COMPUTER_PLAYER) return 'Máy đang nghĩ';
    if (isAnimating) return 'Đang rải quân'; if (selectedCell !== null) return 'Chọn hướng rải'; return 'Tới lượt bạn';
  }, [captureClicks, computerThinking, gameState.currentPlayer, gameState.winner, isAnimating, pendingCapture, selectedCell]);

  const panel = <View style={[styles.panel, compact && styles.panelCompact]}>
    <View><Text style={styles.eyebrow}>Ô ĂN QUAN</Text><Text style={styles.heading}>{status}</Text></View>
    <View style={styles.scoreGrid}><ScoreBlock title="Máy" score={gameState.scores[PLAYER_TOP]} active={gameState.currentPlayer === PLAYER_TOP && gameState.winner === null} /><ScoreBlock title="Bạn" score={gameState.scores[HUMAN_PLAYER]} active={gameState.currentPlayer === HUMAN_PLAYER && gameState.winner === null} /></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Độ khó AI</Text><View style={styles.difficultyRow}>{Object.entries(DIFFICULTY).map(([key, [label]]) => <Pressable key={key} disabled={isAnimating} onPress={() => changeDifficulty(key)} style={[styles.diffButton, difficulty === key && styles.diffActive]}><Text style={styles.diffText}>{label}</Text></Pressable>)}</View><Text style={styles.description}>{DIFFICULTY[difficulty][1]}</Text></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Cách đi</Text><Text style={styles.description}>Bạn chơi hàng dưới. Bấm một ô dân đang sáng, rồi chọn mũi tên để rải. Khi có thế ăn, click ô trống vàng trong 3 giây. Quan = {MANDARIN_VALUE} dân.</Text></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Nhật ký</Text>{gameState.log.slice(-4).map((item: string, index: number) => <Text key={`${item}-${index}`} style={styles.log}>• {item}</Text>)}</View>
    <View style={styles.actions}><Pressable onPress={undo} disabled={!history.length || isAnimating} style={[styles.action, (!history.length || isAnimating) && styles.disabled]}><Text style={styles.actionText}>↶ Undo</Text></Pressable><Pressable onPress={resetGame} style={styles.action}><Text style={styles.actionText}>↻ Chơi lại</Text></Pressable></View>
  </View>;

  return (
    <SafeAreaView style={[styles.safe, activeTab === 'dotbox' && styles.safeDotBox]}>
      <StatusBar style="light" />
      {/* Top Game Switcher Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === 'dotbox' && styles.tabButtonActiveDotBox]}
          onPress={() => setActiveTab('dotbox')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'dotbox' && styles.tabButtonTextActive]}>
            🔴 DotBox (MỚI)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'oanquan' && styles.tabButtonActiveOAnQuan]}
          onPress={() => setActiveTab('oanquan')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'oanquan' && styles.tabButtonTextActive]}>
            🌾 Ô Ăn Quan
          </Text>
        </Pressable>
      </View>

      {activeTab === 'dotbox' ? (
        <DotBoxScreen />
      ) : (
        <ScrollView contentContainerStyle={[styles.shell, compact && styles.shellCompact]}>
          <View style={styles.stage}>
            <GameBoard
              state={gameState}
              direction={direction}
              onCellSelect={selectCell}
              onDirectionSelect={selectDirection}
              onCaptureConfirm={confirmCapture}
              canInteract={canInteract}
              activeIndex={activeIndex}
              selectedCell={selectedCell}
              capturePrompt={pendingCapture}
              skyEffects={skyEffects}
            />
          </View>
          {panel}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#211710' },
  safeDotBox: { backgroundColor: '#13101c' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(10, 8, 16, 0.65)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
  },
  tabButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#241b2c',
    borderWidth: 1,
    borderColor: '#3e2e4f',
  },
  tabButtonActiveDotBox: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  tabButtonActiveOAnQuan: {
    backgroundColor: '#e0a93b',
    borderColor: '#f5c45f',
  },
  tabButtonText: {
    color: '#a99bb8',
    fontWeight: '700',
    fontSize: 13,
  },
  tabButtonTextActive: {
    color: '#000',
    fontWeight: '900',
  },
  shell: { minHeight: '100%', flexDirection: 'row', gap: 14, padding: 10, backgroundColor: '#211710' },
  shellCompact: { flexDirection: 'column' },
  stage: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  panel: { width: 340, alignSelf: 'center', gap: 12, padding: 16, borderRadius: 10, backgroundColor: '#191311', borderWidth: 1, borderColor: '#4b382a' },
  panelCompact: { width: '100%', alignSelf: 'stretch' },
  eyebrow: { color: '#8ec9ff', fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  heading: { color: '#f8e8c9', fontSize: 26, fontWeight: '800', marginTop: 3 },
  scoreGrid: { gap: 8 },
  scoreBlock: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderWidth: 1, borderColor: '#4b382a', borderRadius: 8, backgroundColor: '#2a201c' },
  scoreActive: { borderColor: '#8ec9ff' },
  scoreTitle: { flex: 1 },
  muted: { color: '#cdbca3', fontWeight: '700' },
  scoreNumber: { color: '#f8e8c9', fontSize: 24, fontWeight: '800' },
  pill: { color: '#d8efff', backgroundColor: '#223958', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5, fontSize: 12 },
  card: { gap: 7, padding: 10, borderWidth: 1, borderColor: '#4b382a', borderRadius: 8, backgroundColor: '#241b18' },
  cardTitle: { color: '#f8e8c9', fontWeight: '800', fontSize: 15 },
  description: { color: '#cdbca3', fontSize: 12, lineHeight: 17 },
  difficultyRow: { flexDirection: 'row', gap: 5 },
  diffButton: { flex: 1, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: '#594434', borderRadius: 6 },
  diffActive: { borderColor: '#f5c45f', backgroundColor: '#4b3920' },
  diffText: { color: '#f8e8c9', fontSize: 12, fontWeight: '700' },
  log: { color: '#d9c7ad', fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#594434', borderRadius: 8, backgroundColor: '#30231d' },
  disabled: { opacity: 0.38 },
  actionText: { color: '#f8e8c9', fontWeight: '800' },
});

