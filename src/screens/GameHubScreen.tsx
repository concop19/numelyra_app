import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowEscapeScreen from '../games/arrow-escape/ArrowEscapeScreen';
import Game2048Screen from '../games/game-2048/Game2048Screen';
import MindRulesGame from '../games/mind-rules/MindRulesGame';
import OAnQuanGame from '../games/o-an-quan/OAnQuanGame';
import SudokuScreen from '../games/sudoku/SudokuScreen';
import ZipGameScreen from '../games/zip/ZipGameScreen';
import { getDailyChallenge, type DailyChallenge, type GameHubProgress, type GameHubRouteParams, type GameId } from '../games/gameHub';
import { completeDailyChallenge, loadGameHubProgress, recordGameActivity } from '../games/gameHubStorage';

const GAMES: Array<{ id: GameId; title: string; subtitle: string; emoji: string; color: string }> = [
  { id: 'arrow-escape', title: 'Arrow Escape', subtitle: '40 màn giải đố mũi tên', emoji: '🏹', color: '#6D4AFF' },
  { id: 'mind-rules', title: 'Mind Rules', subtitle: '48 quy luật số', emoji: '🧠', color: '#F05A9D' },
  { id: 'o-an-quan', title: 'Ô Ăn Quan', subtitle: 'Đấu trí cùng AI', emoji: '🪨', color: '#D98935' },
  { id: 'dots-boxes', title: 'Nối Ô', subtitle: 'Đối kháng PvE/PvP', emoji: '✦', color: '#24A89A' },
  { id: 'sudoku', title: 'Sudoku', subtitle: 'Bốn mức độ khó', emoji: '🔢', color: '#3E7DDB' },
  { id: 'game-2048', title: '2048', subtitle: 'Chạm mốc cao mới', emoji: '🔷', color: '#C752A4' },
  { id: 'zip', title: 'Zip', subtitle: '24 puzzle và Daily', emoji: '〰️', color: '#7E58D1' },
];

type Props = {
  navigation?: { setOptions: (options: { tabBarStyle?: object }) => void };
  route?: { params?: GameHubRouteParams };
};

export default function GameHubScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedGame, setSelectedGame] = useState<GameId | null>(route?.params?.gameId ?? null);
  const [dailyMode, setDailyMode] = useState(route?.params?.entry === 'daily');
  const [progress, setProgress] = useState<GameHubProgress | null>(null);
  const daily = getDailyChallenge();
  const refresh = useCallback(async () => setProgress(await loadGameHubProgress()), []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (route?.params?.entry === 'daily') { setSelectedGame(daily.gameId); setDailyMode(true); }
    if (route?.params?.gameId) { setSelectedGame(route.params.gameId); setDailyMode(false); }
  }, [daily.gameId, route?.params?.entry, route?.params?.gameId]);
  useEffect(() => {
    navigation?.setOptions({ tabBarStyle: selectedGame ? styles.hiddenTabBar : undefined });
    return () => navigation?.setOptions({ tabBarStyle: undefined });
  }, [navigation, selectedGame]);

  const openGame = useCallback(async (gameId: GameId, fromDaily = false) => {
    setSelectedGame(gameId); setDailyMode(fromDaily); setProgress(await recordGameActivity(gameId));
  }, []);
  const completeDaily = useCallback(async () => setProgress(await completeDailyChallenge(daily.dateKey, daily.gameId)), [daily.dateKey, daily.gameId]);

  if (selectedGame) return <View style={styles.gameShell}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại Game Hub" onPress={() => { setSelectedGame(null); setDailyMode(false); void refresh(); }} style={({ pressed }) => [styles.backButton, { top: insets.top + 8, left: insets.left + 12 }, pressed && styles.backButtonPressed]}><Text style={styles.backText}>‹  Game Hub</Text></Pressable>
    {dailyMode && <DailyBanner daily={daily} completed={progress?.lastDailyDate === daily.dateKey} />}
    <View style={styles.gameContent}>{renderGame(selectedGame, dailyMode, completeDaily)}</View>
  </View>;

  const continueGame = [...GAMES].sort((a, b) => (progress?.games[b.id]?.playedAt ?? '').localeCompare(progress?.games[a.id]?.playedAt ?? ''))[0];
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}><Text style={styles.kicker}>NUMELYRA PLAY</Text><Text style={styles.title}>Game Hub</Text><Text style={styles.description}>Chơi một chút mỗi ngày, nuôi dưỡng trí óc và giữ chuỗi của bạn.</Text></View>
    <Pressable onPress={() => void openGame(daily.gameId, true)} style={({ pressed }) => [styles.dailyCard, pressed && styles.cardPressed]}><View style={styles.dailyTop}><Text style={styles.dailyKicker}>✦ DAILY CHALLENGE</Text><Text style={styles.streak}>🔥 {progress?.streak ?? 0} ngày</Text></View><Text style={styles.dailyTitle}>{daily.title}</Text><Text style={styles.dailySubtitle}>{daily.subtitle}</Text><Text style={styles.dailyAction}>{progress?.lastDailyDate === daily.dateKey ? 'Đã hoàn thành hôm nay' : 'Chơi thử thách hôm nay  ›'}</Text></Pressable>
    {continueGame && progress?.games[continueGame.id]?.playedAt && <Pressable onPress={() => void openGame(continueGame.id)} style={styles.continueCard}><Text style={styles.continueKicker}>CHƠI TIẾP</Text><Text style={styles.continueText}>{continueGame.emoji} {continueGame.title}</Text></Pressable>}
    <Text style={styles.sectionTitle}>Tất cả trò chơi</Text><View style={styles.grid}>{GAMES.map((game) => { const summary = progress?.games[game.id]; return <Pressable key={game.id} accessibilityRole="button" accessibilityLabel={`Mở ${game.title}`} onPress={() => void openGame(game.id)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}><View style={[styles.icon, { backgroundColor: game.color }]}><Text style={styles.emoji}>{game.emoji}</Text></View><View style={styles.cardText}><Text style={styles.cardTitle}>{game.title}</Text><Text style={styles.cardSubtitle}>{game.subtitle}</Text>{summary?.completed ? <Text style={styles.progressText}>✓ {summary.completed} lần hoàn thành</Text> : null}</View><Text style={styles.readyStatus}>Chơi</Text></Pressable>; })}</View>
  </ScrollView></SafeAreaView>;
}

function renderGame(gameId: GameId, daily: boolean, onDailyComplete: () => void) {
  switch (gameId) {
    case 'arrow-escape': return <ArrowEscapeScreen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'mind-rules': return <MindRulesGame dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'o-an-quan': return <OAnQuanGame initialTab="oanquan" />;
    case 'dots-boxes': return <OAnQuanGame initialTab="dotbox" />;
    case 'sudoku': return <SudokuScreen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'game-2048': return <Game2048Screen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'zip': return <ZipGameScreen dailyMode={daily} onDailyComplete={onDailyComplete} />;
  }
}

function DailyBanner({ daily, completed }: { daily: DailyChallenge; completed: boolean }) { return <View style={styles.dailyBanner}><Text style={styles.dailyBannerText}>{completed ? '✓ Daily đã hoàn thành' : `✦ ${daily.title}`}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10062D' }, gameShell: { flex: 1, backgroundColor: '#10062D' }, gameContent: { flex: 1 }, content: { padding: 20, paddingBottom: 32 },
  hero: { borderRadius: 24, padding: 22, marginBottom: 14, backgroundColor: '#211052', borderWidth: 1, borderColor: '#6E3A9D' }, kicker: { color: '#F5BA5B', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#FFF7E8', fontSize: 28, fontWeight: '800', marginTop: 7 }, description: { color: '#DCCEF4', fontSize: 14, lineHeight: 21, marginTop: 7 },
  dailyCard: { borderRadius: 22, padding: 18, marginBottom: 14, backgroundColor: '#4B258C', borderWidth: 1, borderColor: '#D9A5FF' }, dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, dailyKicker: { color: '#FFE18C', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, streak: { color: '#FFF1C6', fontWeight: '800' }, dailyTitle: { color: '#FFF8EC', fontSize: 21, fontWeight: '900', marginTop: 10 }, dailySubtitle: { color: '#E6D8FF', marginTop: 5 }, dailyAction: { color: '#FFE18C', fontWeight: '800', marginTop: 16 },
  continueCard: { borderRadius: 16, padding: 14, marginBottom: 16, backgroundColor: '#1E4A57', borderWidth: 1, borderColor: '#66C6C7' }, continueKicker: { color: '#A7F3D0', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, continueText: { color: '#F0FFFF', fontSize: 16, fontWeight: '800', marginTop: 5 }, sectionTitle: { color: '#E8D9FF', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  grid: { gap: 12 }, card: { minHeight: 76, padding: 13, borderRadius: 18, alignItems: 'center', flexDirection: 'row', backgroundColor: '#211052', borderWidth: 1, borderColor: 'rgba(185, 139, 220, 0.35)' }, cardPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] }, icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 13 }, emoji: { fontSize: 24 }, cardText: { flex: 1 }, cardTitle: { color: '#FFF7E8', fontSize: 16, fontWeight: '800' }, cardSubtitle: { color: '#C9B5EC', fontSize: 12.5, marginTop: 3 }, progressText: { color: '#91E8BC', fontSize: 11, marginTop: 4, fontWeight: '700' }, readyStatus: { color: '#91E8BC', fontSize: 12, fontWeight: '700' },
  hiddenTabBar: { display: 'none', height: 0, minHeight: 0, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0 }, backButton: { position: 'absolute', zIndex: 10, top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(33, 16, 82, 0.94)', borderWidth: 1, borderColor: '#6E3A9D' }, backButtonPressed: { opacity: 0.7 }, backText: { color: '#FFF7E8', fontSize: 14, fontWeight: '700' }, dailyBanner: { position: 'absolute', zIndex: 9, top: 62, alignSelf: 'center', padding: 9, borderRadius: 8, backgroundColor: '#4B258C' }, dailyBannerText: { color: '#FFE18C', fontWeight: '800', textAlign: 'center' },
});
