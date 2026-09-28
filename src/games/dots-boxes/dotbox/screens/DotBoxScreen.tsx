import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { DotBoxBoardCanvas } from '../components/DotBoxBoardCanvas';
import { chooseAIMove } from '../engine/dotBoxAI';
import {
  connectLine,
  createInitialGameState,
} from '../engine/dotBoxEngine';
import { AIDifficulty, DotBoxGameState, GameMode } from '../types';

// Web Audio API Synthesizer for instant, zero-latency feedback
class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playLineConnect() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  playBoxCapture() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.2);
      });
    } catch {}
  }

  playWin() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch {}
  }
}

const sounds = new SoundSynthesizer();

const DIFFICULTY_LABELS: Record<AIDifficulty, { label: string; desc: string }> = {
  easy: { label: 'Dễ', desc: 'Máy đi ngẫu nhiên, dễ thắng' },
  medium: { label: 'Vừa', desc: 'Tránh tạo cạnh thứ 3, không nhường điểm' },
  hard: { label: 'Khó', desc: 'Quét chuỗi ăn điểm, tính toán cạm bẫy' },
};

export function DotBoxScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 980;

  const [boardSize, setBoardSize] = useState<number>(3);
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');

  const [gameState, setGameState] = useState<DotBoxGameState>(() =>
    createInitialGameState(3)
  );
  const [history, setHistory] = useState<DotBoxGameState[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [extraTurnBanner, setExtraTurnBanner] = useState<string | null>(null);

  const bannerTimerRef = useRef<any>(null);

  // Responsive board pixel dimension
  const boardPixelSize = useMemo(() => {
    if (compact) {
      return Math.min(width - 32, 420);
    }
    return Math.min(width * 0.52, 500);
  }, [compact, width]);

  // Restart Game
  const startNewGame = useCallback((size = boardSize) => {
    setGameState(createInitialGameState(size));
    setHistory([]);
    setIsAIThinking(false);
    setExtraTurnBanner(null);
  }, [boardSize]);

  // Handle Board Size Change
  const handleChangeBoardSize = (size: number) => {
    if (size === boardSize) return;
    setBoardSize(size);
    startNewGame(size);
  };

  // Undo Move
  const handleUndo = useCallback(() => {
    if (history.length === 0 || isAIThinking) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setGameState(last);
    setExtraTurnBanner(null);
  }, [history, isAIThinking]);

  // Human player makes a move
  const handleConnectLine = useCallback(
    (lineId: string) => {
      if (gameState.isGameOver || isAIThinking) return;

      // In PvE mode, human is always Player 0 (Blue)
      if (gameMode === 'pve' && gameState.currentPlayer !== 0) return;

      const player = gameState.currentPlayer;
      const res = connectLine(gameState, lineId, player);
      if (!res.isValid) return;

      // Push current state to undo history
      setHistory((prev) => [...prev, gameState]);
      setGameState(res.nextState);

      if (res.extraTurn) {
        sounds.playBoxCapture();
        setExtraTurnBanner(
          gameMode === 'pve'
            ? '🎉 BẠN ĐÃ ĂN HỘP! ĐƯỢC THÊM LƯỢT ĐI!'
            : `🎉 NGƯỜI CHƠI ${player + 1} ĂN HỘP! THÊM LƯỢT!`
        );
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setExtraTurnBanner(null), 2500);
      } else {
        sounds.playLineConnect();
        setExtraTurnBanner(null);
      }

      if (res.nextState.isGameOver) {
        sounds.playWin();
      }
    },
    [gameMode, gameState, isAIThinking]
  );

  // AI Turn Loop
  useEffect(() => {
    if (
      gameMode !== 'pve' ||
      gameState.isGameOver ||
      gameState.currentPlayer !== 1
    ) {
      setIsAIThinking(false);
      return;
    }

    setIsAIThinking(true);

    const timer = setTimeout(() => {
      const aiLineId = chooseAIMove(gameState, difficulty, 1);
      if (!aiLineId) {
        setIsAIThinking(false);
        return;
      }

      const res = connectLine(gameState, aiLineId, 1);
      if (!res.isValid) {
        setIsAIThinking(false);
        return;
      }

      setGameState(res.nextState);
      setIsAIThinking(false);

      if (res.extraTurn) {
        sounds.playBoxCapture();
        setExtraTurnBanner('🤖 MÁY ĂN HỘP & ĐƯỢC ĐÁNH TIẾP!');
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setExtraTurnBanner(null), 2500);
      } else {
        sounds.playLineConnect();
        setExtraTurnBanner(null);
      }

      if (res.nextState.isGameOver) {
        sounds.playWin();
      }
    }, 650); // Slight delay for realistic AI feel

    return () => clearTimeout(timer);
  }, [difficulty, gameMode, gameState]);

  // Turn status description
  const turnLabel = useMemo(() => {
    if (gameState.isGameOver) {
      if (gameState.winner === 'draw') return 'Ván đấu hòa!';
      if (gameMode === 'pve') {
        return gameState.winner === 0 ? '👑 Bạn đã chiến thắng!' : '🤖 Máy đã thắng cuộc!';
      }
      return `👑 Người chơi ${gameState.winner === 0 ? '1 (Xanh)' : '2 (Đỏ)'} thắng!`;
    }

    if (gameMode === 'pve') {
      if (gameState.currentPlayer === 0) return 'Tới lượt bạn (Xanh dương)';
      return 'Máy đang suy nghĩ...';
    }

    return `Lượt của: Người chơi ${gameState.currentPlayer === 0 ? '1 (Xanh)' : '2 (Đỏ)'}`;
  }, [gameMode, gameState.currentPlayer, gameState.isGameOver, gameState.winner]);

  const canInteract =
    !gameState.isGameOver &&
    !isAIThinking &&
    (gameMode === 'pvp' || gameState.currentPlayer === 0);

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      {/* LEFT: Game Board Stage */}
      <View style={styles.stage}>
        {/* Banner notification */}
        {extraTurnBanner && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{extraTurnBanner}</Text>
          </View>
        )}

        {/* Board Canvas */}
        <DotBoxBoardCanvas
          state={gameState}
          onLineClick={handleConnectLine}
          canInteract={canInteract}
          size={boardPixelSize}
        />
      </View>

      {/* RIGHT: Controls & HUD Panel */}
      <View style={[styles.panel, compact && styles.panelCompact]}>
        {/* Game Title & Turn */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>DOTBOX • NỐI ĐIỂM TẠO Ô</Text>
          <Text style={styles.heading}>{turnLabel}</Text>
        </View>

        {/* Score Board */}
        <View style={styles.scoreRow}>
          {/* Player 1 */}
          <View
            style={[
              styles.scoreCard,
              styles.scoreP1,
              gameState.currentPlayer === 0 && !gameState.isGameOver && styles.scoreActiveP1,
            ]}
          >
            <View style={styles.avatarCircleP1}>
              <Text style={styles.avatarTextP1}>P1</Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={styles.playerLabel}>
                {gameMode === 'pve' ? 'Bạn (Xanh)' : 'Người chơi 1'}
              </Text>
              <Text style={styles.scoreNumberP1}>{gameState.scores[0]}</Text>
            </View>
          </View>

          {/* Player 2 or AI */}
          <View
            style={[
              styles.scoreCard,
              styles.scoreP2,
              gameState.currentPlayer === 1 && !gameState.isGameOver && styles.scoreActiveP2,
            ]}
          >
            <View style={styles.avatarCircleP2}>
              <Text style={styles.avatarTextP2}>
                {gameMode === 'pve' ? 'AI' : 'P2'}
              </Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={styles.playerLabel}>
                {gameMode === 'pve' ? 'Máy (Đỏ)' : 'Người chơi 2'}
              </Text>
              <Text style={styles.scoreNumberP2}>{gameState.scores[1]}</Text>
            </View>
          </View>
        </View>

        {/* Mode Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chế độ chơi</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, gameMode === 'pve' && styles.toggleBtnActive]}
              onPress={() => {
                if (gameMode !== 'pve') {
                  setGameMode('pve');
                  startNewGame();
                }
              }}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  gameMode === 'pve' && styles.toggleBtnTextActive,
                ]}
              >
                🤖 Đấu với Máy
              </Text>
            </Pressable>

            <Pressable
              style={[styles.toggleBtn, gameMode === 'pvp' && styles.toggleBtnActive]}
              onPress={() => {
                if (gameMode !== 'pvp') {
                  setGameMode('pvp');
                  startNewGame();
                }
              }}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  gameMode === 'pvp' && styles.toggleBtnTextActive,
                ]}
              >
                👥 2 Người (Pass & Play)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* AI Difficulty (shown in PvE mode) */}
        {gameMode === 'pve' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Độ khó AI</Text>
            <View style={styles.toggleRow}>
              {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.toggleBtn,
                    difficulty === level && styles.toggleBtnActive,
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      difficulty === level && styles.toggleBtnTextActive,
                    ]}
                  >
                    {DIFFICULTY_LABELS[level].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionDesc}>{DIFFICULTY_LABELS[difficulty].desc}</Text>
          </View>
        )}

        {/* Board Size Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Kích thước bàn cờ</Text>
          <View style={styles.toggleRow}>
            {[3, 4, 5, 6].map((size) => (
              <Pressable
                key={size}
                style={[styles.sizeBtn, boardSize === size && styles.sizeBtnActive]}
                onPress={() => handleChangeBoardSize(size)}
              >
                <Text
                  style={[
                    styles.sizeBtnText,
                    boardSize === size && styles.sizeBtnTextActive,
                  ]}
                >
                  {size}x{size}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Rules hint */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Luật chơi DotBox</Text>
          <Text style={styles.sectionDesc}>
            Lần lượt nối 2 chấm liền kề. Người nối cạnh thứ 4 đóng kín một ô vuông sẽ chiếm
            được ô đó (+1 điểm) và được <Text style={styles.highlightText}>thêm 1 lượt đi tiếp!</Text> Ai chiếm
            được nhiều ô hơn sẽ chiến thắng.
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionBtn,
              (history.length === 0 || isAIThinking) && styles.actionBtnDisabled,
            ]}
            onPress={handleUndo}
            disabled={history.length === 0 || isAIThinking}
          >
            <Text style={styles.actionBtnText}>↶ Đi lại</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => startNewGame()}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
              ↻ Ván mới
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Game Over Modal */}
      <Modal visible={gameState.isGameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCrown}>
              {gameState.winner === 'draw'
                ? '🤝'
                : gameState.winner === 0
                ? '🏆'
                : '🤖'}
            </Text>
            <Text style={styles.modalTitle}>
              {gameState.winner === 'draw'
                ? 'KẾT QUẢ HÒA!'
                : gameState.winner === 0
                ? (gameMode === 'pve' ? 'BẠN ĐÃ CHIẾN THẮNG!' : 'NGƯỜI CHƠI 1 CHIẾN THẮNG!')
                : (gameMode === 'pve' ? 'MÁY ĐÃ CHIẾN THẮNG!' : 'NGƯỜI CHƠI 2 CHIẾN THẮNG!')}
            </Text>

            <View style={styles.modalScoreTable}>
              <View style={styles.modalScoreCol}>
                <Text style={styles.modalScoreLabel}>
                  {gameMode === 'pve' ? 'Bạn' : 'Người chơi 1'}
                </Text>
                <Text style={styles.modalScoreValP1}>{gameState.scores[0]}</Text>
              </View>

              <Text style={styles.modalScoreDivider}>-</Text>

              <View style={styles.modalScoreCol}>
                <Text style={styles.modalScoreLabel}>
                  {gameMode === 'pve' ? 'Máy' : 'Người chơi 2'}
                </Text>
                <Text style={styles.modalScoreValP2}>{gameState.scores[1]}</Text>
              </View>
            </View>

            <Pressable
              style={styles.modalPlayAgainBtn}
              onPress={() => startNewGame()}
            >
              <Text style={styles.modalPlayAgainText}>Chơi ván tiếp theo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerCompact: {
    flexDirection: 'column',
  },
  stage: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  banner: {
    position: 'absolute',
    top: -6,
    zIndex: 10,
    backgroundColor: '#ffb703',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#ffb703',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  panel: {
    width: 350,
    gap: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#18131f',
    borderWidth: 1,
    borderColor: '#382a4a',
  },
  panelCompact: {
    width: '100%',
  },
  header: {
    gap: 3,
  },
  eyebrow: {
    color: '#00D4FF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  heading: {
    color: '#f8e8c9',
    fontSize: 22,
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#20192a',
    borderWidth: 1.5,
    borderColor: '#382a4a',
  },
  scoreP1: {
    borderColor: '#19415c',
  },
  scoreActiveP1: {
    borderColor: '#00D4FF',
    backgroundColor: '#122c42',
  },
  scoreP2: {
    borderColor: '#541f2f',
  },
  scoreActiveP2: {
    borderColor: '#FF4D6D',
    backgroundColor: '#3b1623',
  },
  avatarCircleP1: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextP1: {
    color: '#051923',
    fontWeight: '900',
    fontSize: 14,
  },
  avatarCircleP2: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextP2: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  scoreDetails: {
    flex: 1,
  },
  playerLabel: {
    color: '#a99bb8',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreNumberP1: {
    color: '#00D4FF',
    fontSize: 24,
    fontWeight: '900',
  },
  scoreNumberP2: {
    color: '#FF4D6D',
    fontSize: 24,
    fontWeight: '900',
  },
  sectionCard: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#20192a',
    borderWidth: 1,
    borderColor: '#382a4a',
  },
  sectionTitle: {
    color: '#f8e8c9',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionDesc: {
    color: '#a99bb8',
    fontSize: 12,
    lineHeight: 16,
  },
  highlightText: {
    color: '#ffb703',
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2b213b',
    borderWidth: 1,
    borderColor: '#43345c',
  },
  toggleBtnActive: {
    backgroundColor: '#4d2d73',
    borderColor: '#a366ff',
  },
  toggleBtnText: {
    color: '#a99bb8',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  sizeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2b213b',
    borderWidth: 1,
    borderColor: '#43345c',
  },
  sizeBtnActive: {
    backgroundColor: '#005f73',
    borderColor: '#00D4FF',
  },
  sizeBtnText: {
    color: '#a99bb8',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeBtnTextActive: {
    color: '#00D4FF',
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#2b213b',
    borderWidth: 1,
    borderColor: '#43345c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  actionBtnText: {
    color: '#f8e8c9',
    fontWeight: '800',
    fontSize: 13,
  },
  actionBtnTextPrimary: {
    color: '#051923',
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1f1629',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#a366ff',
    gap: 14,
    shadowColor: '#a366ff',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalCrown: {
    fontSize: 52,
  },
  modalTitle: {
    color: '#f8e8c9',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalScoreTable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginVertical: 10,
  },
  modalScoreCol: {
    alignItems: 'center',
    gap: 4,
  },
  modalScoreLabel: {
    color: '#a99bb8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalScoreValP1: {
    color: '#00D4FF',
    fontSize: 36,
    fontWeight: '900',
  },
  modalScoreValP2: {
    color: '#FF4D6D',
    fontSize: 36,
    fontWeight: '900',
  },
  modalScoreDivider: {
    color: '#65527a',
    fontSize: 32,
    fontWeight: '700',
  },
  modalPlayAgainBtn: {
    width: '100%',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalPlayAgainText: {
    color: '#051923',
    fontWeight: '900',
    fontSize: 15,
  },
});
