// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/**
 * High-performance Game Audio Hook.
 * Uses an Audio Player Pool (5 round-robin instances) for playerCapture
 * to prevent audio buffer underruns, stutter, and latency when clicking rapidly.
 */
function useGameAudio() {
  const music = useAudioPlayer(musicSource, { loop: true });
  const dropOne = useAudioPlayer(dropSource);
  const dropTwo = useAudioPlayer(dropSource);
  const computerCapture = useAudioPlayer(computerCaptureSource);

  // 5-player round-robin pool for rapid player clicks
  const cap0 = useAudioPlayer(playerCaptureSource);
  const cap1 = useAudioPlayer(playerCaptureSource);
  const cap2 = useAudioPlayer(playerCaptureSource);
  const cap3 = useAudioPlayer(playerCaptureSource);
  const cap4 = useAudioPlayer(playerCaptureSource);
  const capturePool = useMemo(() => [cap0, cap1, cap2, cap3, cap4], [cap0, cap1, cap2, cap3, cap4]);
  const captureIndexRef = useRef(0);

  const nextDrop = useRef(false);
  const started = useRef(false);
  const lastPlayTimeRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const startMusic = useCallback(() => {
    if (started.current) return;
    started.current = true;
    try {
      music.volume = 0.1;
      music.play();
    } catch {}
  }, [music]);

  const play = useCallback(
    (name: 'drop' | 'player' | 'computer', volume?: number) => {
      const now = Date.now();

      if (name === 'player') {
        // Throttle player click sounds to at least 50ms apart to prevent audio queue clogging
        const last = lastPlayTimeRef.current.player || 0;
        if (now - last < 50) return;
        lastPlayTimeRef.current.player = now;

        const player = capturePool[captureIndexRef.current];
        captureIndexRef.current = (captureIndexRef.current + 1) % capturePool.length;
        if (player) {
          try {
            player.volume = volume ?? 0.65;
            player.seekTo(0).catch?.(() => undefined);
            player.play();
          } catch {}
        }
        return;
      }

      if (name === 'drop') {
        const player = nextDrop.current ? dropOne : dropTwo;
        nextDrop.current = !nextDrop.current;
        if (player) {
          try {
            player.volume = volume ?? 0.5;
            player.seekTo(0).catch?.(() => undefined);
            player.play();
          } catch {}
        }
        return;
      }

      if (name === 'computer') {
        if (computerCapture) {
          try {
            computerCapture.volume = volume ?? 0.58;
            computerCapture.seekTo(0).catch?.(() => undefined);
            computerCapture.play();
          } catch {}
        }
      }
    },
    [capturePool, computerCapture, dropOne, dropTwo]
  );

  return { play, startMusic };
}

const DIFFICULTY: Record<string, { label: string; tag: string; desc: string; icon: string }> = {
  easy: {
    label: 'Dễ',
    tag: 'Tập sự',
    desc: 'AI nhìn 1 lượt trước. Thích hợp cho người mới làm quen hoặc chơi giải trí nhẹ nhàng.',
    icon: '🌱',
  },
  medium: {
    label: 'Trung bình',
    tag: 'Thử thách',
    desc: 'Minimax 3 tầng. AI biết tính toán, cản phá ăn quân và tránh các cạm bẫy cơ bản.',
    icon: '⚡',
  },
  hard: {
    label: 'Khó',
    tag: 'Bậc thầy',
    desc: 'Minimax 5 tầng cực thông minh. Tính toán bẫy ngầm và chuỗi ăn liên hoàn, rất khó thắng!',
    icon: '🔥',
  },
};

type OAnQuanGameProps = {
  initialTab?: 'dotbox' | 'oanquan';
};

export default function OAnQuanGame({ initialTab = 'oanquan' }: OAnQuanGameProps) {
  const insets = useSafeAreaInsets();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isLandscape = winWidth >= winHeight;

  const [activeTab, setActiveTab] = useState<'dotbox' | 'oanquan'>(initialTab);
  const [gameState, setGameState] = useState(() => createInitialState());
  const [direction, setDirection] = useState(1);
  const [history, setHistory] = useState<any[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [pendingCapture, setPendingCapture] = useState<any>(null);
  const [captureClicks, setCaptureClicks] = useState(0);
  const [difficulty, setDifficulty] = useState('easy');
  const [computerThinking, setComputerThinking] = useState(false);
  const [skyEffects, setSkyEffects] = useState({ move: null as any, charge: null as any, bursts: [] as any[] });

  // Orientation and Modal Dialogs
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);

  const runnerRef = useRef<any>(null);
  const timersRef = useRef<any[]>([]);
  const captureTimerRef = useRef<any>(null);
  const captureClicksRef = useRef(0);
  const lastCaptureEffectTime = useRef(0);
  const { play, startMusic } = useGameAudio();

  // Screen orientation management: Unlock sensor and request landscape on O An Quan
  useEffect(() => {
    let active = true;

    if (activeTab === 'oanquan') {
      // First ensure sensor orientation is unlocked, then attempt to rotate to landscape
      ScreenOrientation.unlockAsync()
        .then(() => {
          if (!active) return;
          return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        })
        .catch(() => {
          // If lockAsync is rejected (e.g. system portrait lock is active or web), fallback to unlocked
          void ScreenOrientation.unlockAsync().catch(() => undefined);
        });

      if (Platform.OS === 'android') {
        try {
          NavigationBar.setHidden(true);
        } catch {}
      }
    } else {
      // In dotbox or other tab, keep orientation unlocked so phone behaves naturally
      void ScreenOrientation.unlockAsync().catch(() => undefined);
      if (Platform.OS === 'android') {
        try {
          NavigationBar.setHidden(false);
        } catch {}
      }
    }

    return () => {
      active = false;
      // Always unlock orientation when leaving, NEVER lock to PORTRAIT_UP permanently!
      void ScreenOrientation.unlockAsync().catch(() => undefined);
      if (Platform.OS === 'android') {
        try {
          NavigationBar.setHidden(false);
        } catch {}
      }
    };
  }, [activeTab]);

  const handleForceLandscape = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch {
      await ScreenOrientation.unlockAsync().catch(() => undefined);
    }
  }, []);

  const handleForcePortrait = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {
      await ScreenOrientation.unlockAsync().catch(() => undefined);
    }
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = null;
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const resetTransient = useCallback(() => {
    setActiveIndex(null);
    setSelectedCell(null);
    setPendingCapture(null);
    setCaptureClicks(0);
    captureClicksRef.current = 0;
    setSkyEffects({ move: null, charge: null, bursts: [] });
    setIsAnimating(false);
  }, []);

  const finishTrace = useCallback(() => {
    if (runnerRef.current) setGameState(runnerRef.current.trace.state);
    runnerRef.current = null;
    resetTransient();
  }, [resetTransient]);

  const advanceTrace = useCallback(
    (frameIndex: number) => {
      const runner = runnerRef.current;
      if (!runner) return;
      clearTimers();
      const frame = runner.trace.frames[frameIndex];
      if (!frame) {
        finishTrace();
        return;
      }
      setGameState(frame.state);
      setActiveIndex(frame.activeIndex);
      if (frame.phase === 'drop') play('drop');
      if (frame.phase === 'capturePrompt') {
        const prompt = {
          emptyIndex: frame.emptyIndex,
          targetIndex: frame.targetIndex,
          nextFrameIndex: frameIndex + 1,
          isComputer: runner.player === COMPUTER_PLAYER,
        };
        setPendingCapture(prompt);
        setCaptureClicks(0);
        captureClicksRef.current = 0;
        if (prompt.isComputer) {
          const timer = setTimeout(() => {
            play('computer');
            setPendingCapture(null);
            setIsAnimating(true);
            advanceTrace(prompt.nextFrameIndex);
          }, 520);
          timersRef.current.push(timer);
        } else {
          setIsAnimating(false);
          setSkyEffects((value) => ({ ...value, charge: { ...prompt, clicks: 0 } }));
          captureTimerRef.current = setTimeout(() => {
            const clicks = captureClicksRef.current;
            play('player', Math.min(1, 0.4 + clicks * 0.06));
            setSkyEffects((value) => ({
              move: value.move,
              charge: null,
              bursts: [...value.bursts, { ...prompt, clicks, startedAt: Date.now() }],
            }));
            setPendingCapture(null);
            setCaptureClicks(0);
            captureClicksRef.current = 0;
            setIsAnimating(true);
            advanceTrace(prompt.nextFrameIndex);
          }, 3000);
        }
        return;
      }
      setPendingCapture(null);
      setCaptureClicks(0);
      captureClicksRef.current = 0;
      setIsAnimating(true);
      const timer = setTimeout(() => advanceTrace(frameIndex + 1), 230);
      timersRef.current.push(timer);
    },
    [clearTimers, finishTrace, play]
  );

  const playTrace = useCallback(
    (baseState: any, cell: number, moveDirection: number, saveHistory = true) => {
      const trace = buildMoveTrace(baseState, cell, moveDirection);
      if (!trace.ok) return false;
      clearTimers();
      runnerRef.current = { trace, player: baseState.currentPlayer };
      if (saveHistory) setHistory((items) => [...items, cloneState(baseState)]);
      setDirection(moveDirection);
      setSelectedCell(null);
      setPendingCapture(null);
      setIsAnimating(true);
      setActiveIndex(cell);
      setSkyEffects({ move: { seed: Date.now(), startedAt: Date.now() }, charge: null, bursts: [] });
      advanceTrace(0);
      return true;
    },
    [advanceTrace, clearTimers]
  );

  const canInteract =
    gameState.currentPlayer === HUMAN_PLAYER &&
    gameState.winner === null &&
    !isAnimating &&
    !pendingCapture;

  const selectCell = useCallback(
    (index: number) => {
      if (canInteract && canSelectCell(gameState, index)) {
        startMusic();
        setSelectedCell(index);
        setActiveIndex(index);
      }
    },
    [canInteract, gameState, startMusic]
  );

  const selectDirection = useCallback(
    (moveDirection: number) => {
      if (canInteract && selectedCell !== null && canSelectCell(gameState, selectedCell)) {
        startMusic();
        playTrace(gameState, selectedCell, moveDirection);
      }
    },
    [canInteract, gameState, playTrace, selectedCell, startMusic]
  );

  /**
   * Optimized click-to-capture confirmation.
   * Plays sound via round-robin pool with throttling and decoupled state updates.
   */
  const confirmCapture = useCallback(
    (index: number) => {
      if (!pendingCapture || pendingCapture.isComputer || index !== pendingCapture.emptyIndex) return;
      startMusic();

      const next = captureClicksRef.current + 1;
      captureClicksRef.current = next;

      // Play sound immediately using the pool without interrupting previous playback
      play('player', Math.min(1, 0.35 + next * 0.08));

      // Update click count state
      setCaptureClicks(next);

      // Throttle visual sky charge update to avoid Skia frame dropping (max once per 100ms)
      const now = Date.now();
      if (now - lastCaptureEffectTime.current > 100) {
        lastCaptureEffectTime.current = now;
        setSkyEffects((value) => ({
          ...value,
          charge: { ...value.charge, clicks: next },
        }));
      }
    },
    [pendingCapture, play, startMusic]
  );

  useEffect(() => {
    if (isAnimating || gameState.winner !== null || gameState.currentPlayer !== COMPUTER_PLAYER) {
      setComputerThinking(false);
      return;
    }
    setComputerThinking(true);
    const timer = setTimeout(() => {
      setComputerThinking(false);
      const move = chooseComputerMove(gameState, difficulty);
      if (move) playTrace(gameState, move.index, move.direction);
    }, 2400);
    return () => clearTimeout(timer);
  }, [difficulty, gameState, isAnimating, playTrace]);

  const resetGame = useCallback(() => {
    startMusic();
    clearTimers();
    runnerRef.current = null;
    setGameState(createInitialState());
    setHistory([]);
    setDirection(1);
    resetTransient();
  }, [clearTimers, resetTransient, startMusic]);

  const undo = useCallback(() => {
    if (!history.length || isAnimating) return;
    clearTimers();
    runnerRef.current = null;
    const prior = history[history.length - 1];
    setHistory((items) => items.slice(0, -1));
    setGameState(prior);
    resetTransient();
  }, [clearTimers, history, isAnimating, resetTransient]);

  const changeDifficulty = useCallback(
    (level: string) => {
      if (isAnimating) return;
      setDifficulty(level);
      resetGame();
    },
    [isAnimating, resetGame]
  );

  const status = useMemo(() => {
    if (gameState.winner === 'draw') return 'Ván cờ hòa';
    if (gameState.winner !== null) return `${PLAYER_NAMES[gameState.winner]} thắng`;
    if (pendingCapture && !pendingCapture.isComputer) return `Click ô ăn vàng! (${captureClicks})`;
    if (pendingCapture?.isComputer || computerThinking || gameState.currentPlayer === COMPUTER_PLAYER)
      return 'Máy đang nghĩ';
    if (isAnimating) return 'Đang rải quân';
    if (selectedCell !== null) return 'Chọn hướng rải';
    return 'Tới lượt bạn';
  }, [
    captureClicks,
    computerThinking,
    gameState.currentPlayer,
    gameState.winner,
    isAnimating,
    pendingCapture,
    selectedCell,
  ]);

  const isHumanTurn = gameState.currentPlayer === HUMAN_PLAYER && gameState.winner === null;
  const isAITurn = gameState.currentPlayer === COMPUTER_PLAYER && gameState.winner === null;
  const isCapturePrompt = pendingCapture && !pendingCapture.isComputer;

  return (
    <SafeAreaView style={[styles.safe, activeTab === 'dotbox' && styles.safeDotBox]}>
      <StatusBar hidden={activeTab === 'oanquan' && isLandscape} style="light" />

      {/* When in portrait mode, show top switcher */}
      {(!isLandscape || activeTab === 'dotbox') && (
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
      )}

      {activeTab === 'dotbox' ? (
        <DotBoxScreen />
      ) : isLandscape ? (
        /* ========================================================
           FULL SCREEN LANDSCAPE MODE (Màn hình ngang trọn vẹn)
           ======================================================== */
        <View
          style={[
            styles.landscapeContainer,
            {
              paddingLeft: Math.max(insets.left, 8),
              paddingRight: Math.max(insets.right, 8),
              paddingTop: Math.max(insets.top, 4),
              paddingBottom: Math.max(insets.bottom, 4),
            },
          ]}
        >
          {/* Left Column HUD: Game switch, AI Score, Difficulty, Rules '!' */}
          <View style={styles.landscapeSideCol}>
            {/* Mini Game Switcher */}
            <View style={styles.landscapeMiniTabBar}>
              <Pressable
                style={[styles.miniTabBtn, activeTab === 'dotbox' && styles.miniTabBtnActiveDotBox]}
                onPress={() => setActiveTab('dotbox')}
              >
                <Text style={styles.miniTabBtnText}>🔴 DotBox</Text>
              </Pressable>
              <Pressable
                style={[styles.miniTabBtn, activeTab === 'oanquan' && styles.miniTabBtnActiveOAnQuan]}
                onPress={() => setActiveTab('oanquan')}
              >
                <Text style={styles.miniTabBtnTextActive}>🌾 Ô Ăn Quan</Text>
              </Pressable>
            </View>

            {/* AI Player Card */}
            <View
              style={[
                styles.landscapePlayerCard,
                isAITurn && styles.landscapePlayerCardActiveAI,
              ]}
            >
              <View style={styles.landscapePlayerHeader}>
                <Text style={styles.landscapeAvatar}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.landscapePlayerName}>Máy</Text>
                    {isAITurn && (
                      <View style={styles.turnBadgeAI}>
                        <Text style={styles.turnBadgeText}>Đang đi</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.landscapeScoreSub}>
                    {gameState.scores[PLAYER_TOP].citizens} dân • {gameState.scores[PLAYER_TOP].mandarins} quan
                  </Text>
                </View>
              </View>
              <Text style={[styles.landscapeScoreVal, { color: '#8ec9ff' }]}>
                {scoreTotal(gameState.scores[PLAYER_TOP])}
              </Text>
            </View>

            {/* Quick Controls: Difficulty + Rotate + Rules '!' */}
            <View style={styles.landscapeControlRow}>
              {/* Nút điều chỉnh độ khó */}
              <Pressable
                style={({ pressed }) => [
                  styles.landscapeDiffBtn,
                  pressed && styles.diffBtnPressed,
                  isAnimating && styles.btnDisabled,
                ]}
                onPress={() => setShowDifficultyModal(true)}
                disabled={isAnimating}
                accessibilityLabel="Điều chỉnh độ khó"
              >
                <Text style={styles.diffBtnIcon}>{DIFFICULTY[difficulty]?.icon ?? '⚡'}</Text>
                <Text style={styles.diffBtnText}>{DIFFICULTY[difficulty]?.label ?? 'Dễ'}</Text>
                <Text style={styles.diffBtnArrow}>▾</Text>
              </Pressable>

              {/* Nút xoay dọc màn hình */}
              <Pressable
                style={({ pressed }) => [styles.landscapeRotateBtn, pressed && styles.diffBtnPressed]}
                onPress={handleForcePortrait}
                accessibilityLabel="Chuyển về màn hình dọc"
              >
                <Text style={styles.landscapeRotateBtnText}>🔄</Text>
              </Pressable>

              {/* Nút '!' xem luật */}
              <Pressable
                style={({ pressed }) => [styles.rulesBtn, pressed && styles.rulesBtnPressed]}
                onPress={() => setShowRulesModal(true)}
                accessibilityLabel="Xem luật chơi"
              >
                <Text style={styles.rulesBtnText}>!</Text>
              </Pressable>
            </View>
          </View>

          {/* Center Column: GameBoard occupying 100% full screen */}
          <View style={styles.landscapeCenterCol}>
            {/* Floating Banner for Capture / Move hint */}
            {isCapturePrompt ? (
              <Pressable
                style={styles.floatingCapturePrompt}
                onPress={() => confirmCapture(pendingCapture.emptyIndex)}
              >
                <Text style={styles.capturePromptEmoji}>⚡</Text>
                <View>
                  <Text style={styles.capturePromptTitle}>CLICK Ô VÀNG ĐỂ ĂN! ({captureClicks})</Text>
                  <Text style={styles.capturePromptSub}>Chạm ô trống màu vàng trong 3s</Text>
                </View>
              </Pressable>
            ) : selectedCell !== null && !isAnimating ? (
              <View style={styles.floatingDirectionPrompt}>
                <Text style={styles.directionPromptText}>
                  👈 👉 Chạm mũi tên trên bàn cờ để rải quân
                </Text>
              </View>
            ) : null}

            <View style={styles.landscapeBoardWrapper}>
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
          </View>

          {/* Right Column HUD: Player Score, Status, Undo, Restart */}
          <View style={styles.landscapeSideCol}>
            {/* Player Card */}
            <View
              style={[
                styles.landscapePlayerCard,
                isHumanTurn && styles.landscapePlayerCardActiveHuman,
              ]}
            >
              <View style={styles.landscapePlayerHeader}>
                <Text style={styles.landscapeAvatar}>👤</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.landscapePlayerName}>Bạn</Text>
                    {isHumanTurn && (
                      <View style={styles.turnBadgeHuman}>
                        <Text style={styles.turnBadgeText}>Lượt bạn</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.landscapeScoreSub}>
                    {gameState.scores[HUMAN_PLAYER].citizens} dân • {gameState.scores[HUMAN_PLAYER].mandarins} quan
                  </Text>
                </View>
              </View>
              <Text style={[styles.landscapeScoreVal, { color: '#f5c45f' }]}>
                {scoreTotal(gameState.scores[HUMAN_PLAYER])}
              </Text>
            </View>

            {/* Turn status indicator */}
            <View
              style={[
                styles.landscapeStatusBadge,
                isHumanTurn && styles.statusBadgeHuman,
                isAITurn && styles.statusBadgeAI,
                isCapturePrompt && styles.statusBadgeCapture,
              ]}
            >
              <Text style={styles.statusBadgeText}>{status}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.landscapeActionCol}>
              <Pressable
                onPress={undo}
                disabled={!history.length || isAnimating}
                style={[
                  styles.landscapeActionBtn,
                  (!history.length || isAnimating) && styles.btnDisabled,
                ]}
              >
                <Text style={styles.actionBtnText}>↶ Đi lại</Text>
              </Pressable>

              <Pressable onPress={resetGame} style={[styles.landscapeActionBtn, styles.actionBtnRestart]}>
                <Text style={[styles.actionBtnText, styles.actionBtnRestartText]}>↻ Ván mới</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* ========================================================
           PORTRAIT MODE (Màn hình dọc - kèm banner/nút xoay ngang)
           ======================================================== */
        <View style={styles.screenContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>🌾 Ô ĂN QUAN</Text>
              <View
                style={[
                  styles.statusBadge,
                  isHumanTurn && styles.statusBadgeHuman,
                  isAITurn && styles.statusBadgeAI,
                  isCapturePrompt && styles.statusBadgeCapture,
                ]}
              >
                <Text style={styles.statusBadgeText}>{status}</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {/* Nút xoay ngang màn hình */}
              <Pressable
                style={({ pressed }) => [styles.rotateHeaderBtn, pressed && styles.diffBtnPressed]}
                onPress={handleForceLandscape}
                accessibilityLabel="Xoay ngang màn hình"
              >
                <Text style={styles.rotateHeaderBtnText}>🔄 Xoay ngang</Text>
              </Pressable>

              {/* Nút điều chỉnh độ khó */}
              <Pressable
                style={({ pressed }) => [
                  styles.diffBtn,
                  pressed && styles.diffBtnPressed,
                  isAnimating && styles.btnDisabled,
                ]}
                onPress={() => setShowDifficultyModal(true)}
                disabled={isAnimating}
                accessibilityLabel="Điều chỉnh độ khó"
              >
                <Text style={styles.diffBtnIcon}>{DIFFICULTY[difficulty]?.icon ?? '⚡'}</Text>
                <Text style={styles.diffBtnText}>{DIFFICULTY[difficulty]?.label ?? 'Dễ'}</Text>
                <Text style={styles.diffBtnArrow}>▾</Text>
              </Pressable>

              {/* Nút '!' xem luật chơi */}
              <Pressable
                style={({ pressed }) => [styles.rulesBtn, pressed && styles.rulesBtnPressed]}
                onPress={() => setShowRulesModal(true)}
                accessibilityLabel="Xem luật chơi"
              >
                <Text style={styles.rulesBtnText}>!</Text>
              </Pressable>
            </View>
          </View>

          {/* Prompt banner to rotate phone if not dismissed */}
          {!dismissRotatePrompt && (
            <View style={styles.rotateSuggestBanner}>
              <Text style={styles.rotateSuggestEmoji}>📲</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rotateSuggestTitle}>Khuyên dùng màn hình nằm ngang</Text>
                <Text style={styles.rotateSuggestSub}>
                  Lật ngang điện thoại (nhớ bật Tự động xoay trên máy) hoặc bấm Xoay ngay!
                </Text>
              </View>
              <Pressable style={styles.rotateSuggestBtn} onPress={handleForceLandscape}>
                <Text style={styles.rotateSuggestBtnText}>Xoay ngay</Text>
              </Pressable>
              <Pressable
                style={styles.rotateDismissBtn}
                onPress={() => setDismissRotatePrompt(true)}
              >
                <Text style={styles.rotateDismissBtnText}>✕</Text>
              </Pressable>
            </View>
          )}

          {/* Compact Modern Scoreboard */}
          <View style={styles.scoreboard}>
            {/* Máy (AI) */}
            <View
              style={[
                styles.playerScoreCard,
                styles.aiScoreCard,
                isAITurn && styles.playerScoreCardActiveAI,
              ]}
            >
              <View style={styles.playerMetaRow}>
                <Text style={styles.playerAvatar}>🤖</Text>
                <View>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.playerName}>Máy</Text>
                    {isAITurn && (
                      <View style={styles.turnBadgeAI}>
                        <Text style={styles.turnBadgeText}>Đang đi</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerDetails}>
                    {gameState.scores[PLAYER_TOP].citizens} dân • {gameState.scores[PLAYER_TOP].mandarins} quan
                  </Text>
                </View>
              </View>
              <Text style={[styles.playerPoints, { color: '#8ec9ff' }]}>
                {scoreTotal(gameState.scores[PLAYER_TOP])}
              </Text>
            </View>

            <View style={styles.scoreDivider}>
              <Text style={styles.scoreDividerText}>VS</Text>
            </View>

            {/* Bạn (Human) */}
            <View
              style={[
                styles.playerScoreCard,
                styles.humanScoreCard,
                isHumanTurn && styles.playerScoreCardActiveHuman,
              ]}
            >
              <Text style={[styles.playerPoints, { color: '#f5c45f' }]}>
                {scoreTotal(gameState.scores[HUMAN_PLAYER])}
              </Text>
              <View style={[styles.playerMetaRow, { flexDirection: 'row-reverse' }]}>
                <Text style={styles.playerAvatar}>👤</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.nameBadgeRow, { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.playerName}>Bạn</Text>
                    {isHumanTurn && (
                      <View style={styles.turnBadgeHuman}>
                        <Text style={styles.turnBadgeText}>Lượt bạn</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerDetails}>
                    {gameState.scores[HUMAN_PLAYER].citizens} dân • {gameState.scores[HUMAN_PLAYER].mandarins} quan
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Interactive Prompts */}
          {isCapturePrompt ? (
            <Pressable
              style={styles.capturePromptCard}
              onPress={() => confirmCapture(pendingCapture.emptyIndex)}
            >
              <Text style={styles.capturePromptEmoji}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.capturePromptTitle}>THẾ ĂN QUÂN! BẤM Ô VÀNG NGAY!</Text>
                <Text style={styles.capturePromptSub}>
                  Chạm ô trống màu vàng trong 3s để kích hoạt ({captureClicks} lần bấm)
                </Text>
              </View>
            </Pressable>
          ) : selectedCell !== null && !isAnimating ? (
            <View style={styles.directionPromptCard}>
              <Text style={styles.directionPromptText}>
                👈 👉 Chạm mũi tên trên bàn cờ để chọn hướng rải quân
              </Text>
            </View>
          ) : null}

          {/* Central Stage: GameBoard occupying maximum screen area */}
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

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={undo}
              disabled={!history.length || isAnimating}
              style={[
                styles.actionBtn,
                (!history.length || isAnimating) && styles.btnDisabled,
              ]}
            >
              <Text style={styles.actionBtnText}>↶ Đi lại</Text>
            </Pressable>

            <Pressable onPress={resetGame} style={[styles.actionBtn, styles.actionBtnRestart]}>
              <Text style={[styles.actionBtnText, styles.actionBtnRestartText]}>↻ Ván mới</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Rules Modal ('!' Button) */}
      <Modal
        visible={showRulesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rulesModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.rulesIconBadge}>
                  <Text style={styles.rulesIconBadgeText}>!</Text>
                </View>
                <Text style={styles.modalTitle}>Luật Chơi Ô Ăn Quan</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setShowRulesModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* Scrollable Rules Content */}
            <ScrollView style={styles.rulesScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🎯 Mục tiêu chiến thắng</Text>
                <Text style={styles.rulesText}>
                  Thu thập được nhiều điểm quân hơn đối thủ thông qua các lượt rải quân và ăn ngọc.
                </Text>
                <Text style={styles.rulesBullet}>
                  • <Text style={styles.highlightText}>1 Dân</Text> = 1 điểm
                </Text>
                <Text style={styles.rulesBullet}>
                  • <Text style={styles.highlightText}>1 Quan</Text> = {MANDARIN_VALUE} điểm ({MANDARIN_VALUE} dân)
                </Text>
              </View>

              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🗺️ Bố cục bàn cờ</Text>
                <Text style={styles.rulesText}>
                  Bàn cờ gồm 10 ô vuông Dân (5 ô hàng trên của Máy, 5 ô hàng dưới của Bạn) và 2 ô Quan hình bán nguyệt ở hai đầu.
                </Text>
                <Text style={styles.rulesBullet}>
                  • Bạn điều khiển 5 ô dân ở hàng dưới (ô số 7, 8, 9, 10, 11).
                </Text>
              </View>

              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🔄 Cách rải quân (Lượt đi)</Text>
                <Text style={styles.rulesText}>
                  1. Chạm vào một ô dân đang sáng có ngọc của mình ở hàng dưới.
                </Text>
                <Text style={styles.rulesText}>
                  2. Chạm vào một trong hai mũi tên (trái hoặc phải) để rải ngọc theo chiều tương ứng.
                </Text>
                <Text style={styles.rulesText}>
                  3. Ngọc sẽ được rải lần lượt từng viên vào các ô liên tiếp theo chiều đã chọn.
                </Text>
              </View>

              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>⚡ Cách ăn quân & Nối bước</Text>
                <Text style={styles.rulesText}>
                  Khi rải đến viên ngọc cuối cùng:
                </Text>
                <Text style={styles.rulesBullet}>
                  • <Text style={styles.highlightText}>Nối bước:</Text> Nếu ô liền kề CÓ ngọc, bạn tiếp tục bốc toàn bộ ngọc ở ô đó để rải tiếp theo chiều cũ.
                </Text>
                <Text style={styles.rulesBullet}>
                  • <Text style={styles.highlightText}>Ăn quân:</Text> Nếu ô liền kề TRỐNG, và ô tiếp theo sau nó CÓ ngọc, bạn ĐƯỢC ĂN toàn bộ ngọc ở ô đó! Trong game, nhanh tay bấm vào ô trống màu vàng trong vòng 3 giây để thu điểm.
                </Text>
                <Text style={styles.rulesBullet}>
                  • <Text style={styles.highlightText}>Ăn liên hoàn:</Text> Sau khi ăn, nếu ô tiếp theo lại là một ô trống rồi đến ô có ngọc, bạn tiếp tục được ăn tiếp ô đó!
                </Text>
                <Text style={styles.rulesBullet}>
                  • <Text style={styles.highlightText}>Hết lượt:</Text> Nếu gặp 2 ô trống liên tiếp hoặc ô Quan có ngọc, lượt đi kết thúc.
                </Text>
              </View>

              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🌾 Tình huống hết quân</Text>
                <Text style={styles.rulesText}>
                  Nếu đến lượt đi mà cả 5 ô ở hàng bạn đều trống, bạn bắt buộc phải trích 5 viên dân từ kho điểm của mình rải vào 5 ô (mỗi ô 1 viên) để tiếp tục ván đấu.
                </Text>
              </View>

              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🏆 Kết thúc ván cờ</Text>
                <Text style={styles.rulesText}>
                  Ván đấu kết thúc khi cả 2 ô Quan đều bị ăn hết. Số ngọc còn lại ở hàng của ai sẽ thuộc về người đó. Bên nào nhiều điểm hơn sẽ giành chiến thắng!
                </Text>
              </View>
            </ScrollView>

            {/* Close Button */}
            <Pressable style={styles.modalPrimaryBtn} onPress={() => setShowRulesModal(false)}>
              <Text style={styles.modalPrimaryBtnText}>Đã hiểu, vào chơi ngay</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Difficulty Adjustment Modal */}
      <Modal
        visible={showDifficultyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.diffModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>⚙️</Text>
                <Text style={styles.modalTitle}>Điều Chỉnh Độ Khó AI</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setShowDifficultyModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.diffModalSubtitle}>
              Chọn cấp độ thông minh của đối thủ máy (thay đổi độ khó sẽ bắt đầu ván mới):
            </Text>

            {/* Options */}
            <View style={styles.diffOptionsList}>
              {Object.entries(DIFFICULTY).map(([key, item]) => {
                const isSelected = difficulty === key;
                return (
                  <Pressable
                    key={key}
                    style={[styles.diffOptionCard, isSelected && styles.diffOptionCardActive]}
                    onPress={() => {
                      if (key !== difficulty) {
                        changeDifficulty(key);
                      }
                      setShowDifficultyModal(false);
                    }}
                  >
                    <View style={styles.diffOptionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                        <Text
                          style={[
                            styles.diffOptionTitle,
                            isSelected && styles.diffOptionTitleActive,
                          ]}
                        >
                          {item.label} ({item.tag})
                        </Text>
                      </View>
                      <View style={[styles.diffRadio, isSelected && styles.diffRadioActive]}>
                        {isSelected && <View style={styles.diffRadioInner} />}
                      </View>
                    </View>
                    <Text style={styles.diffOptionDesc}>{item.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Over Modal */}
      <Modal visible={gameState.winner !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverEmoji}>
              {gameState.winner === 'draw'
                ? '🤝'
                : gameState.winner === HUMAN_PLAYER
                ? '🏆'
                : '🤖'}
            </Text>
            <Text style={styles.gameOverTitle}>
              {gameState.winner === 'draw'
                ? 'VÁN CỜ HÒA!'
                : gameState.winner === HUMAN_PLAYER
                ? 'BẠN ĐÃ CHIẾN THẮNG!'
                : 'MÁY ĐÃ CHIẾN THẮNG!'}
            </Text>
            <Text style={styles.gameOverSubtitle}>
              {gameState.winner === HUMAN_PLAYER
                ? 'Xuất sắc! Bạn đã thu thập được nhiều điểm ngọc hơn.'
                : gameState.winner === COMPUTER_PLAYER
                ? 'Rất tiếc! Hãy thử lại ván khác để phục thù máy.'
                : 'Hai bên có số điểm ngang nhau.'}
            </Text>

            <View style={styles.gameOverScoreRow}>
              <View style={styles.gameOverScoreBox}>
                <Text style={styles.gameOverScoreLabel}>Bạn</Text>
                <Text style={[styles.gameOverScoreVal, { color: '#f5c45f' }]}>
                  {scoreTotal(gameState.scores[HUMAN_PLAYER])}
                </Text>
                <Text style={styles.gameOverScoreDetail}>
                  {gameState.scores[HUMAN_PLAYER].citizens} dân • {gameState.scores[HUMAN_PLAYER].mandarins} quan
                </Text>
              </View>
              <Text style={styles.gameOverScoreDivider}>-</Text>
              <View style={styles.gameOverScoreBox}>
                <Text style={styles.gameOverScoreLabel}>Máy</Text>
                <Text style={[styles.gameOverScoreVal, { color: '#8ec9ff' }]}>
                  {scoreTotal(gameState.scores[PLAYER_TOP])}
                </Text>
                <Text style={styles.gameOverScoreDetail}>
                  {gameState.scores[PLAYER_TOP].citizens} dân • {gameState.scores[PLAYER_TOP].mandarins} quan
                </Text>
              </View>
            </View>

            <Pressable style={styles.modalPrimaryBtn} onPress={resetGame}>
              <Text style={styles.modalPrimaryBtnText}>↻ Chơi ván tiếp theo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

  /* ========================================================
     LANDSCAPE STYLES (Trọn vẹn màn hình ngang)
     ======================================================== */
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#211710',
    gap: 8,
  },
  landscapeSideCol: {
    width: 156,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  landscapeMiniTabBar: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(20, 14, 10, 0.7)',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#432f22',
  },
  miniTabBtn: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 10,
  },
  miniTabBtnActiveDotBox: {
    backgroundColor: '#00D4FF',
  },
  miniTabBtnActiveOAnQuan: {
    backgroundColor: '#e0a93b',
  },
  miniTabBtnText: {
    color: '#a99bb8',
    fontSize: 10,
    fontWeight: '700',
  },
  miniTabBtnTextActive: {
    color: '#1a1006',
    fontSize: 10,
    fontWeight: '900',
  },
  landscapePlayerCard: {
    backgroundColor: '#1b1411',
    borderWidth: 1.5,
    borderColor: '#3e2e22',
    borderRadius: 12,
    padding: 8,
  },
  landscapePlayerCardActiveAI: {
    borderColor: '#8ec9ff',
    backgroundColor: '#152538',
    shadowColor: '#8ec9ff',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  landscapePlayerCardActiveHuman: {
    borderColor: '#f5c45f',
    backgroundColor: '#352414',
    shadowColor: '#f5c45f',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  landscapePlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  landscapeAvatar: {
    fontSize: 18,
  },
  landscapePlayerName: {
    color: '#f8e8c9',
    fontSize: 13,
    fontWeight: '800',
  },
  landscapeScoreVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  landscapeScoreSub: {
    color: '#cdbca3',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  landscapeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landscapeDiffBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#2c2018',
    borderWidth: 1.5,
    borderColor: '#594434',
  },
  landscapeRotateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2c2018',
    borderWidth: 1.5,
    borderColor: '#594434',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeRotateBtnText: {
    fontSize: 14,
  },
  landscapeStatusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#30231d',
    borderWidth: 1,
    borderColor: '#5e4432',
    alignItems: 'center',
  },
  landscapeActionCol: {
    gap: 6,
  },
  landscapeActionBtn: {
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#594434',
    borderRadius: 10,
    backgroundColor: '#2e2119',
  },
  landscapeCenterCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 0,
  },
  landscapeBoardWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCapturePrompt: {
    position: 'absolute',
    top: 6,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4a3212',
    borderWidth: 1.5,
    borderColor: '#f5c45f',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    shadowColor: '#f5c45f',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingDirectionPrompt: {
    position: 'absolute',
    top: 6,
    zIndex: 20,
    backgroundColor: '#2b211a',
    borderWidth: 1,
    borderColor: '#634934',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },

  /* ========================================================
     PORTRAIT STYLES (Màn hình dọc)
     ======================================================== */
  screenContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: 'space-between',
    backgroundColor: '#211710',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 6,
  },
  headerTitleCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  headerTitle: {
    color: '#f8e8c9',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    backgroundColor: '#30231d',
    borderWidth: 1,
    borderColor: '#5e4432',
  },
  statusBadgeHuman: {
    borderColor: '#f5c45f',
    backgroundColor: '#3b2c1b',
  },
  statusBadgeAI: {
    borderColor: '#8ec9ff',
    backgroundColor: '#1b2c3b',
  },
  statusBadgeCapture: {
    borderColor: '#ffd580',
    backgroundColor: '#4a3212',
  },
  statusBadgeText: {
    color: '#f8e8c9',
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rotateHeaderBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#352417',
    borderWidth: 1,
    borderColor: '#8a6538',
  },
  rotateHeaderBtnText: {
    color: '#ffd580',
    fontSize: 11,
    fontWeight: '800',
  },
  rotateSuggestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2c1e14',
    borderWidth: 1.5,
    borderColor: '#e0a93b',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 3,
  },
  rotateSuggestEmoji: {
    fontSize: 22,
  },
  rotateSuggestTitle: {
    color: '#ffd580',
    fontSize: 12,
    fontWeight: '900',
  },
  rotateSuggestSub: {
    color: '#d9cbba',
    fontSize: 11,
  },
  rotateSuggestBtn: {
    backgroundColor: '#e0a93b',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  rotateSuggestBtnText: {
    color: '#1a1006',
    fontSize: 11,
    fontWeight: '900',
  },
  rotateDismissBtn: {
    padding: 4,
  },
  rotateDismissBtnText: {
    color: '#9e8d78',
    fontSize: 13,
    fontWeight: '800',
  },
  diffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#2c2018',
    borderWidth: 1.5,
    borderColor: '#594434',
  },
  diffBtnPressed: {
    backgroundColor: '#3d2c20',
    borderColor: '#f5c45f',
  },
  diffBtnIcon: {
    fontSize: 12,
  },
  diffBtnText: {
    color: '#f8e8c9',
    fontSize: 11,
    fontWeight: '800',
  },
  diffBtnArrow: {
    color: '#cdbca3',
    fontSize: 9,
    fontWeight: '700',
  },
  rulesBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2c2018',
    borderWidth: 2,
    borderColor: '#f5c45f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f5c45f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  rulesBtnPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: '#432f22',
  },
  rulesBtnText: {
    color: '#f5c45f',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 3,
  },
  playerScoreCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#1b1411',
    borderWidth: 1.5,
    borderColor: '#3e2e22',
  },
  aiScoreCard: {
    borderColor: '#352e40',
  },
  humanScoreCard: {
    borderColor: '#423223',
  },
  playerScoreCardActiveAI: {
    borderColor: '#8ec9ff',
    backgroundColor: '#152538',
    shadowColor: '#8ec9ff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  playerScoreCardActiveHuman: {
    borderColor: '#f5c45f',
    backgroundColor: '#352414',
    shadowColor: '#f5c45f',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerAvatar: {
    fontSize: 15,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerName: {
    color: '#f8e8c9',
    fontSize: 12,
    fontWeight: '800',
  },
  turnBadgeAI: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#1c3e66',
  },
  turnBadgeHuman: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#664714',
  },
  turnBadgeText: {
    color: '#f8e8c9',
    fontSize: 9,
    fontWeight: '800',
  },
  playerDetails: {
    color: '#cdbca3',
    fontSize: 10,
    fontWeight: '600',
  },
  playerPoints: {
    fontSize: 18,
    fontWeight: '900',
  },
  scoreDivider: {
    paddingHorizontal: 2,
  },
  scoreDividerText: {
    color: '#7a6452',
    fontSize: 10,
    fontWeight: '900',
  },
  capturePromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4a3212',
    borderWidth: 1.5,
    borderColor: '#f5c45f',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginVertical: 2,
    shadowColor: '#f5c45f',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  capturePromptEmoji: {
    fontSize: 18,
  },
  capturePromptTitle: {
    color: '#ffd580',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  capturePromptSub: {
    color: '#fff3d1',
    fontSize: 10.5,
    fontWeight: '600',
  },
  directionPromptCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b211a',
    borderWidth: 1,
    borderColor: '#634934',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  directionPromptText: {
    color: '#ffd580',
    fontSize: 11,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    paddingVertical: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#594434',
    borderRadius: 10,
    backgroundColor: '#2e2119',
  },
  actionBtnRestart: {
    backgroundColor: '#3d281a',
    borderColor: '#80562e',
  },
  actionBtnText: {
    color: '#cdbca3',
    fontWeight: '800',
    fontSize: 12,
  },
  actionBtnRestartText: {
    color: '#f8e8c9',
  },
  btnDisabled: {
    opacity: 0.35,
  },

  /* ========================================================
     MODALS
     ======================================================== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d2d21',
  },
  modalTitle: {
    color: '#f8e8c9',
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2e2017',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4d3727',
  },
  closeBtnText: {
    color: '#cdbca3',
    fontSize: 13,
    fontWeight: '800',
  },
  modalPrimaryBtn: {
    marginTop: 12,
    backgroundColor: '#f5c45f',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#f5c45f',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  modalPrimaryBtnText: {
    color: '#211710',
    fontWeight: '900',
    fontSize: 13,
  },

  // Rules Modal
  rulesModalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '86%',
    backgroundColor: '#1b1410',
    borderWidth: 1.5,
    borderColor: '#543d2c',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  rulesIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#352417',
    borderWidth: 1.5,
    borderColor: '#f5c45f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesIconBadgeText: {
    color: '#f5c45f',
    fontSize: 13,
    fontWeight: '900',
  },
  rulesScrollView: {
    marginTop: 8,
    paddingRight: 4,
  },
  rulesSection: {
    marginBottom: 10,
    backgroundColor: '#241a15',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3d2c20',
  },
  rulesSectionTitle: {
    color: '#f5c45f',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  rulesText: {
    color: '#ded1be',
    fontSize: 12,
    lineHeight: 18,
  },
  rulesBullet: {
    color: '#d9cbba',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  highlightText: {
    color: '#ffd580',
    fontWeight: '800',
  },

  // Difficulty Modal
  diffModalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1b1410',
    borderWidth: 1.5,
    borderColor: '#543d2c',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  diffModalSubtitle: {
    color: '#bfae99',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 16,
  },
  diffOptionsList: {
    gap: 8,
  },
  diffOptionCard: {
    backgroundColor: '#241a15',
    borderWidth: 1.5,
    borderColor: '#3d2c20',
    borderRadius: 12,
    padding: 10,
  },
  diffOptionCardActive: {
    borderColor: '#f5c45f',
    backgroundColor: '#352417',
  },
  diffOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  diffOptionTitle: {
    color: '#f8e8c9',
    fontSize: 14,
    fontWeight: '800',
  },
  diffOptionTitleActive: {
    color: '#f5c45f',
  },
  diffRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#5e4635',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffRadioActive: {
    borderColor: '#f5c45f',
  },
  diffRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f5c45f',
  },
  diffOptionDesc: {
    color: '#cdbca3',
    fontSize: 11.5,
    lineHeight: 15,
  },

  // Game Over Modal
  gameOverCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1b1410',
    borderWidth: 2,
    borderColor: '#f5c45f',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
  },
  gameOverEmoji: {
    fontSize: 44,
    marginBottom: 6,
  },
  gameOverTitle: {
    color: '#f8e8c9',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  gameOverSubtitle: {
    color: '#cdbca3',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  gameOverScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    width: '100%',
    backgroundColor: '#241a15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#432f22',
  },
  gameOverScoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  gameOverScoreLabel: {
    color: '#cdbca3',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  gameOverScoreVal: {
    fontSize: 24,
    fontWeight: '900',
  },
  gameOverScoreDetail: {
    color: '#9e8d78',
    fontSize: 10,
    marginTop: 2,
  },
  gameOverScoreDivider: {
    color: '#634b39',
    fontSize: 20,
    fontWeight: '900',
  },
});
