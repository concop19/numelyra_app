import React, { useCallback, useEffect, useState } from 'react';
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowEscapeScreen from '../games/arrow-escape/ArrowEscapeScreen';
import Game2048Screen from '../games/game-2048/Game2048Screen';
import MindRulesGame from '../games/mind-rules/MindRulesGame';
import OAnQuanGame from '../games/o-an-quan/OAnQuanGame';
import SudokuScreen from '../games/sudoku/SudokuScreen';
import ZipGameScreen from '../games/zip/ZipGameScreen';
import LuaGaGameScreen from '../games/lua-ga/LuaGaGameScreen';
import { getDailyChallenge, type DailyChallenge, type GameHubProgress, type GameHubRouteParams, type GameId } from '../games/gameHub';
import { completeDailyChallenge, loadGameHubProgress, recordGameActivity } from '../games/gameHubStorage';
import { useLocalization } from '../i18n/LocalizationContext';

const GAME_AVATARS: Record<GameId, ImageSourcePropType> = {
  'arrow-escape': require('../../assets/image/game_avt/narrow.png'),
  'mind-rules': require('../../assets/image/game_avt/zip.png'),
  'o-an-quan': require('../../assets/image/game_avt/o_an_quan.png'),
  'dots-boxes': require('../../assets/image/game_avt/noi.png'),
  'sudoku': require('../../assets/image/game_avt/sudoku.png'),
  'game-2048': require('../../assets/image/game_avt/2024.png'),
  'zip': require('../../assets/image/game_avt/dot.png'),
  'lua-ga': require('../../assets/image/game_avt/lua_ga.png'),
};

const GAMES: Array<{ id: GameId; title: string; titleEn?: string; subtitle: string; subtitleEn: string; emoji: string; color: string; avatar: ImageSourcePropType }> = [
  { id: 'arrow-escape', title: 'Arrow Escape', subtitle: '40 màn giải đố mũi tên', subtitleEn: '40 arrow-puzzle levels', emoji: '🏹', color: '#6D4AFF', avatar: GAME_AVATARS['arrow-escape'] },
  { id: 'mind-rules', title: 'Mind Rules', subtitle: '48 quy luật số', subtitleEn: '48 number-rule puzzles', emoji: '🧠', color: '#F05A9D', avatar: GAME_AVATARS['mind-rules'] },
  { id: 'o-an-quan', title: 'Ô Ăn Quan', titleEn: 'Mandarin Square Capturing', subtitle: 'Đấu trí cùng AI', subtitleEn: 'Challenge the AI', emoji: '🪨', color: '#D98935', avatar: GAME_AVATARS['o-an-quan'] },
  { id: 'dots-boxes', title: 'Nối Ô', titleEn: 'Dots & Boxes', subtitle: 'Đối kháng PvE/PvP', subtitleEn: 'PvE and PvP matches', emoji: '✦', color: '#24A89A', avatar: GAME_AVATARS['dots-boxes'] },
  { id: 'sudoku', title: 'Sudoku', subtitle: 'Bốn mức độ khó', subtitleEn: 'Four difficulty levels', emoji: '🔢', color: '#3E7DDB', avatar: GAME_AVATARS['sudoku'] },
  { id: 'game-2048', title: '2048', subtitle: 'Chạm mốc cao mới', subtitleEn: 'Reach a new high score', emoji: '🔷', color: '#C752A4', avatar: GAME_AVATARS['game-2048'] },
  { id: 'zip', title: 'Zip', subtitle: '24 puzzle và Daily', subtitleEn: '24 puzzles and a daily challenge', emoji: '〰️', color: '#7E58D1', avatar: GAME_AVATARS['zip'] },
  { id: 'lua-ga', title: 'Lùa Gà', titleEn: 'Chicken Herding', subtitle: 'Đưa 9 chú gà về chuồng', subtitleEn: 'Guide all 9 chickens home', emoji: '🐔', color: '#6A963E', avatar: GAME_AVATARS['lua-ga'] },
];

type Props = {
  navigation?: {
    goBack: () => void;
    canGoBack: () => boolean;
    navigate: (name: string, params?: { screen: string }) => void;
  };
  route?: { params?: GameHubRouteParams };
};

export default function GameHubScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { locale, l } = useLocalization();
  const [selectedGame, setSelectedGame] = useState<GameId | null>(route?.params?.gameId ?? null);
  const [dailyMode, setDailyMode] = useState(route?.params?.entry === 'daily');
  const [progress, setProgress] = useState<GameHubProgress | null>(null);
  const daily = getDailyChallenge(new Date(), locale);
  const refresh = useCallback(async () => setProgress(await loadGameHubProgress()), []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (route?.params?.entry === 'daily') { setSelectedGame(daily.gameId); setDailyMode(true); }
    if (route?.params?.gameId) { setSelectedGame(route.params.gameId); setDailyMode(false); }
  }, [daily.gameId, route?.params?.entry, route?.params?.gameId]);

  const openGame = useCallback(async (gameId: GameId, fromDaily = false) => {
    setSelectedGame(gameId); setDailyMode(fromDaily); setProgress(await recordGameActivity(gameId));
  }, []);
  const completeDaily = useCallback(async () => setProgress(await completeDailyChallenge(daily.dateKey, daily.gameId)), [daily.dateKey, daily.gameId]);

  if (selectedGame) return <View style={styles.gameShell}>
    <Pressable accessibilityRole="button" accessibilityLabel={l('Quay lại Game Hub', 'Back to Game Hub')} onPress={() => { setSelectedGame(null); setDailyMode(false); void refresh(); }} style={({ pressed }) => [styles.backButton, { top: insets.top + 8, left: insets.left + 12 }, pressed && styles.backButtonPressed]}><Text style={styles.backText}>‹  Game Hub</Text></Pressable>
    {dailyMode && <DailyBanner daily={daily} completed={progress?.lastDailyDate === daily.dateKey} />}
    <View style={styles.gameContent}>{renderGame(selectedGame, dailyMode, completeDaily, () => { setSelectedGame(null); setDailyMode(false); void refresh(); })}</View>
  </View>;

  const continueGame = [...GAMES].sort((a, b) => (progress?.games[b.id]?.playedAt ?? '').localeCompare(progress?.games[a.id]?.playedAt ?? ''))[0];
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Pressable accessibilityRole="button" accessibilityLabel={l('Quay lại trò chuyện', 'Back to chat')} onPress={() => {
      if (navigation?.canGoBack()) navigation.goBack();
      else navigation?.navigate('Main', { screen: 'Chat' });
    }} style={({ pressed }) => [styles.hubBackButton, pressed && styles.backButtonPressed]}>
      <Text style={styles.backText}>‹  {l('Trò chuyện', 'Chat')}</Text>
    </Pressable>
    <View style={styles.hero}><Text style={styles.kicker}>NUMELYRA PLAY</Text><Text style={styles.title}>Game Hub</Text><Text style={styles.description}>{l('Chơi một chút mỗi ngày, nuôi dưỡng trí óc và giữ chuỗi của bạn.', 'Play a little every day, train your mind and keep your streak alive.')}</Text></View>
    <Pressable onPress={() => void openGame(daily.gameId, true)} style={({ pressed }) => [styles.dailyCard, pressed && styles.cardPressed]}>
      <View style={styles.dailyTop}>
        <Text style={styles.dailyKicker}>✦ DAILY CHALLENGE</Text>
        <Text style={styles.streak}>🔥 {progress?.streak ?? 0} {l('ngày', 'days')}</Text>
      </View>
      <View style={styles.dailyBody}>
        <View style={styles.dailyInfo}>
          <Text style={styles.dailyTitle}>{daily.title}</Text>
          <Text style={styles.dailySubtitle}>{daily.subtitle}</Text>
          <Text style={styles.dailyAction}>{progress?.lastDailyDate === daily.dateKey ? l('Đã hoàn thành hôm nay', 'Completed today') : l('Chơi thử thách hôm nay  ›', "Play today's challenge  ›")}</Text>
        </View>
        <Image source={GAME_AVATARS[daily.gameId]} style={styles.dailyAvatar} resizeMode="cover" />
      </View>
    </Pressable>
    {continueGame && progress?.games[continueGame.id]?.playedAt && (
      <Pressable onPress={() => void openGame(continueGame.id)} style={styles.continueCard}>
        <Text style={styles.continueKicker}>{l('CHƠI TIẾP', 'CONTINUE')}</Text>
        <View style={styles.continueRow}>
          <Image source={continueGame.avatar} style={styles.continueAvatar} resizeMode="cover" />
          <Text style={styles.continueText}>{locale === 'en' ? (continueGame.titleEn || continueGame.title) : continueGame.title}</Text>
        </View>
      </Pressable>
    )}
    <Text style={styles.sectionTitle}>{l('Tất cả trò chơi', 'All games')}</Text>
    <View style={styles.grid}>
      {GAMES.map((game) => {
        const summary = progress?.games[game.id];
        return (
          <Pressable key={game.id} accessibilityRole="button" accessibilityLabel={`${l('Mở', 'Open')} ${locale === 'en' ? (game.titleEn || game.title) : game.title}`} onPress={() => void openGame(game.id)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.icon}>
              <Image source={game.avatar} style={styles.avatarImage} resizeMode="cover" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{locale === 'en' ? (game.titleEn || game.title) : game.title}</Text>
              <Text style={styles.cardSubtitle}>{locale === 'en' ? game.subtitleEn : game.subtitle}</Text>
              {summary?.completed ? <Text style={styles.progressText}>✓ {summary.completed} {l('lần hoàn thành', 'completions')}</Text> : null}
            </View>
            <Text style={styles.readyStatus}>{l('Chơi', 'Play')}</Text>
          </Pressable>
        );
      })}
    </View>
  </ScrollView></SafeAreaView>;
}

function renderGame(gameId: GameId, daily: boolean, onDailyComplete: () => void, onExit: () => void) {
  switch (gameId) {
    case 'arrow-escape': return <ArrowEscapeScreen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'mind-rules': return <MindRulesGame dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'o-an-quan': return <OAnQuanGame initialTab="oanquan" />;
    case 'dots-boxes': return <OAnQuanGame initialTab="dotbox" />;
    case 'sudoku': return <SudokuScreen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'game-2048': return <Game2048Screen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'zip': return <ZipGameScreen dailyMode={daily} onDailyComplete={onDailyComplete} />;
    case 'lua-ga': return <LuaGaGameScreen onExit={onExit} />;
  }
}

function DailyBanner({ daily, completed }: { daily: DailyChallenge; completed: boolean }) {
  const { l } = useLocalization();
  return <View style={styles.dailyBanner}><Text style={styles.dailyBannerText}>{completed ? l('✓ Daily đã hoàn thành', '✓ Daily completed') : `✦ ${daily.title}`}</Text></View>;
}

const styles = StyleSheet.create({
  hubBackButton: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  safe: { flex: 1, backgroundColor: '#10062D' }, gameShell: { flex: 1, backgroundColor: '#10062D' }, gameContent: { flex: 1 }, content: { padding: 20, paddingBottom: 32 },
  hero: { borderRadius: 24, padding: 22, marginBottom: 14, backgroundColor: '#211052', borderWidth: 1, borderColor: '#6E3A9D' }, kicker: { color: '#F5BA5B', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#FFF7E8', fontSize: 28, fontWeight: '800', marginTop: 7 }, description: { color: '#DCCEF4', fontSize: 14, lineHeight: 21, marginTop: 7 },
  dailyCard: { borderRadius: 22, padding: 18, marginBottom: 14, backgroundColor: '#4B258C', borderWidth: 1, borderColor: '#D9A5FF' }, dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, dailyKicker: { color: '#FFE18C', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, streak: { color: '#FFF1C6', fontWeight: '800' },
  dailyBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }, dailyInfo: { flex: 1, paddingRight: 12 }, dailyTitle: { color: '#FFF8EC', fontSize: 21, fontWeight: '900', marginTop: 4 }, dailySubtitle: { color: '#E6D8FF', marginTop: 4 }, dailyAction: { color: '#FFE18C', fontWeight: '800', marginTop: 12 }, dailyAvatar: { width: 62, height: 62, borderRadius: 16 },
  continueCard: { borderRadius: 16, padding: 14, marginBottom: 16, backgroundColor: '#1E4A57', borderWidth: 1, borderColor: '#66C6C7' }, continueKicker: { color: '#A7F3D0', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, continueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 }, continueAvatar: { width: 28, height: 28, borderRadius: 8 }, continueText: { color: '#F0FFFF', fontSize: 16, fontWeight: '800' }, sectionTitle: { color: '#E8D9FF', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  grid: { gap: 12 }, card: { minHeight: 76, padding: 13, borderRadius: 18, alignItems: 'center', flexDirection: 'row', backgroundColor: '#211052', borderWidth: 1, borderColor: 'rgba(185, 139, 220, 0.35)' }, cardPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] }, icon: { width: 52, height: 52, borderRadius: 14, overflow: 'hidden', marginRight: 13, backgroundColor: 'rgba(0,0,0,0.2)' }, avatarImage: { width: '100%', height: '100%', borderRadius: 14 }, cardText: { flex: 1 }, cardTitle: { color: '#FFF7E8', fontSize: 16, fontWeight: '800' }, cardSubtitle: { color: '#C9B5EC', fontSize: 12.5, marginTop: 3 }, progressText: { color: '#91E8BC', fontSize: 11, marginTop: 4, fontWeight: '700' }, readyStatus: { color: '#91E8BC', fontSize: 12, fontWeight: '700' },
  hiddenTabBar: { display: 'none', height: 0, minHeight: 0, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0 }, backButton: { position: 'absolute', zIndex: 10, top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(33, 16, 82, 0.94)', borderWidth: 1, borderColor: '#6E3A9D' }, backButtonPressed: { opacity: 0.7 }, backText: { color: '#FFF7E8', fontSize: 14, fontWeight: '700' }, dailyBanner: { position: 'absolute', zIndex: 9, top: 62, alignSelf: 'center', padding: 9, borderRadius: 8, backgroundColor: '#4B258C' }, dailyBannerText: { color: '#FFE18C', fontWeight: '800', textAlign: 'center' },
});
