import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReloadPuzzleCanvas } from '../components/ReloadPuzzleCanvas';
import { SpaceCombatCanvas } from '../components/SpaceCombatCanvas';
import { SpaceArrowNode } from '../engine/levelLoader';
import { SpaceEngine } from '../engine/spaceEngine';
import { AMMO_CONFIGS, SpaceGameState } from '../types';
import { playSpaceSfx } from '../utils/spaceAudio';

interface Props {
  navigation: any;
}

export function SpaceArrowScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  // Layout clamping for desktop / tablet
  const contentWidth = Math.min(winWidth, 460);
  const availableHeight = winHeight - insets.top - insets.bottom;
  // Give comfortable 50% height to the authentic labyrinth
  const topCombatHeight = Math.floor(availableHeight * 0.46);
  const dividerHeight = 44;
  const bottomPuzzleHeight = availableHeight - topCombatHeight - dividerHeight;

  // Initialize engine
  const engine = useMemo(() => {
    const eng = new SpaceEngine(contentWidth, topCombatHeight);
    eng.onSound = (name) => playSpaceSfx(name);
    return eng;
  }, [contentWidth, topCombatHeight]);

  // Sync HUD state from engine
  const [hudState, setHudState] = useState<SpaceGameState>(engine.state);
  const [ammoType, setAmmoType] = useState(engine.currentAmmoType);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setHudState((prev) => {
        const s = engine.state;
        if (
          prev.score !== s.score ||
          prev.ammo !== s.ammo ||
          prev.wave !== s.wave ||
          prev.health !== s.health ||
          prev.status !== s.status ||
          (prev.overdriveTimer > 0) !== (s.overdriveTimer > 0) ||
          Math.ceil(prev.overdriveTimer) !== Math.ceil(s.overdriveTimer) ||
          Math.ceil(prev.shieldTimer) !== Math.ceil(s.shieldTimer)
        ) {
          return { ...s };
        }
        return prev;
      });

      setAmmoType((prev) =>
        prev !== engine.currentAmmoType ? engine.currentAmmoType : prev
      );

      if (engine.state.status === 'GAMEOVER' && !isGameOver) {
        setIsGameOver(true);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [engine, isGameOver]);

  const handleArrowCleared = React.useCallback(
    (arrow: SpaceArrowNode) => {
      engine.addAmmo(arrow.ammoType, arrow.ammoCount);
    },
    [engine]
  );

  const handleBoardCleared = React.useCallback(
    (clearedLevelId: number) => {
      engine.triggerOverdrive(8.0);
      engine.state.score += 1000;
      engine.addFloatingText(
        contentWidth / 2,
        topCombatHeight * 0.4,
        `MÊ CUNG ${clearedLevelId} HOÀN THÀNH! +1000`,
        '#FFD700'
      );
    },
    [engine, contentWidth, topCombatHeight]
  );

  const handleBlocked = React.useCallback(() => {
    playSpaceSfx('hit');
  }, []);

  const handleRestart = () => {
    setIsGameOver(false);
    engine.init(contentWidth, topCombatHeight);
    setHudState({ ...engine.state });
  };

  const currentAmmoCfg = AMMO_CONFIGS[ammoType];
  const isOverdrive = hudState.overdriveTimer > 0;
  const isOutOfAmmo = hudState.ammo === 0 && !isOverdrive;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.cabinet, { width: contentWidth }]}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <Text style={styles.backButtonText}>✕ THOÁT</Text>
          </Pressable>

          <View style={styles.statsRow}>
            <Text style={styles.scoreText}>🏆 {hudState.score}</Text>
            <Text style={styles.waveText}>WAVE {hudState.wave}</Text>
            <View style={styles.healthRow}>
              {Array.from({ length: hudState.maxHealth }).map((_, i) => (
                <Text key={i} style={styles.heartText}>
                  {i < hudState.health ? '❤️' : '🖤'}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Top 54%: Space Combat Area */}
        <View style={{ width: contentWidth, height: topCombatHeight }}>
          <SpaceCombatCanvas
            engine={engine}
            width={contentWidth}
            height={topCombatHeight}
          />
        </View>

        {/* Middle Multitasking Divider / Ammo Gauge */}
        <View
          style={[
            styles.divider,
            isOverdrive && styles.dividerOverdrive,
            isOutOfAmmo && styles.dividerEmpty,
          ]}
        >
          {isOverdrive ? (
            <Text style={styles.overdriveBanner}>
              ⚡ OVERDRIVE! VÔ HẠN ĐẠN ({Math.ceil(hudState.overdriveTimer)}s) ⚡
            </Text>
          ) : isOutOfAmmo ? (
            <Text style={styles.outOfAmmoBanner}>
              ⚠️ HẾT ĐẠN! BẤM MŨI TÊN DƯỚI ĐỂ NẠP ĐẠN NGAY! ⚠️
            </Text>
          ) : (
            <View style={styles.ammoInfoRow}>
              <View style={styles.ammoTypeBadge}>
                <Text style={[styles.ammoBadgeText, { color: currentAmmoCfg.color }]}>
                  {currentAmmoCfg.icon} {currentAmmoCfg.name.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.ammoCountText}>
                ĐẠN: <Text style={{ color: currentAmmoCfg.color, fontWeight: '900' }}>{hudState.ammo}</Text> / {hudState.maxAmmo}
              </Text>

              {hudState.shieldTimer > 0 && (
                <Text style={styles.shieldBadge}>
                  🛡️ {Math.ceil(hudState.shieldTimer)}s
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom 46%: Reload Arrow Puzzle */}
        <View style={{ width: contentWidth, height: bottomPuzzleHeight, position: 'relative' }}>
          <ReloadPuzzleCanvas
            width={contentWidth}
            height={bottomPuzzleHeight}
            onArrowCleared={handleArrowCleared}
            onBoardCleared={handleBoardCleared}
            onBlocked={handleBlocked}
          />

          {/* Quick Subtitle Legend */}
          <View style={styles.bottomLegend}>
            <Text style={styles.legendText}>
              ⚡+14 Thường  💥+10 Chùm  🚀+5 Rocket  🛡️+Khiên
            </Text>
          </View>
        </View>

        {/* Game Over Modal */}
        <Modal
          visible={isGameOver}
          transparent
          animationType="fade"
          onRequestClose={handleRestart}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🚀 PHI THUYỀN RƠI!</Text>
              <Text style={styles.modalSubtitle}>Đàn gà vũ trụ quá hung hãn!</Text>

              <View style={styles.modalScoreCard}>
                <Text style={styles.modalScoreLabel}>ĐIỂM SỐ</Text>
                <Text style={styles.modalScoreValue}>{hudState.score}</Text>

                <View style={styles.modalStatsRow}>
                  <Text style={styles.modalStatItem}>
                    Wave: <Text style={styles.bold}>{hudState.wave}</Text>
                  </Text>
                  <Text style={styles.modalStatItem}>
                    Gà tiêu diệt: <Text style={styles.bold}>{hudState.chickensDefeated}</Text>
                  </Text>
                </View>
              </View>

              <Pressable style={styles.primaryBtn} onPress={handleRestart}>
                <Text style={styles.primaryBtnText}>🔄 BẮN LẠI NGAY</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  setIsGameOver(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.secondaryBtnText}>VỀ TRANG CHỦ</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
  },
  cabinet: {
    flex: 1,
    backgroundColor: '#040714',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    height: 48,
    backgroundColor: '#090d1f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
  },
  waveText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  healthRow: {
    flexDirection: 'row',
    gap: 2,
  },
  heartText: {
    fontSize: 14,
  },
  divider: {
    height: 44,
    backgroundColor: '#0f172a',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dividerOverdrive: {
    backgroundColor: '#083344',
    borderColor: '#06b6d4',
  },
  dividerEmpty: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  overdriveBanner: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  outOfAmmoBanner: {
    color: '#f87171',
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
  },
  ammoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ammoTypeBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ammoBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ammoCountText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  shieldBadge: {
    color: '#e879f9',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#3b0764',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bottomLegend: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  legendText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f43f5e',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  modalScoreCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalScoreLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalScoreValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fbbf24',
    marginVertical: 4,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  modalStatItem: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  bold: {
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
