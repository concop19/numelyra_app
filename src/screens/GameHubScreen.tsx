import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowEscapeScreen from '../games/arrow-escape/ArrowEscapeScreen';
import Game2048Screen from '../games/game-2048/Game2048Screen';
import SudokuScreen from '../games/sudoku/SudokuScreen';
import MindRulesGame from '../games/mind-rules/MindRulesGame';
import OAnQuanGame from '../games/o-an-quan/OAnQuanGame';
import ZipGameScreen from '../games/zip/ZipGameScreen';

const GAMES = [
  { id: 'arrow-escape', title: 'Arrow Escape', subtitle: 'Giải đố mũi tên', emoji: '🏹', color: '#6D4AFF' },
  { id: 'mind-rules', title: 'Mind Rules', subtitle: 'Tìm quy luật số', emoji: '🧠', color: '#F05A9D' },
  { id: 'o-an-quan', title: 'Ô Ăn Quan', subtitle: 'Trò chơi dân gian', emoji: '🪨', color: '#D98935' },
  { id: 'dots-boxes', title: 'Nối Ô', subtitle: 'Dots & Boxes', emoji: '✦', color: '#24A89A' },
  { id: 'sudoku', title: 'Sudoku', subtitle: 'Rèn luyện tư duy', emoji: '🔢', color: '#3E7DDB' },
  { id: 'game-2048', title: '2048', subtitle: 'Ghép các ô số', emoji: '🔷', color: '#C752A4' },
  { id: 'zip', title: 'Zip', subtitle: 'Nối đường qua mọi ô', emoji: '〰️', color: '#7E58D1' },
] as const;

type Game = (typeof GAMES)[number];

export default function GameHubScreen() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const selectedGameContent = () => {
    switch (selectedGame?.id) {
      case 'arrow-escape':
        return <ArrowEscapeScreen />;
      case 'mind-rules':
        return <MindRulesGame />;
      case 'o-an-quan':
        return <OAnQuanGame initialTab="oanquan" />;
      case 'dots-boxes':
        return <OAnQuanGame initialTab="dotbox" />;
      case 'sudoku':
        return <SudokuScreen />;
      case 'game-2048':
        return <Game2048Screen />;
      case 'zip':
        return <ZipGameScreen />;
      default:
        return null;
    }
  };

  if (selectedGame) {
    return (
      <View style={styles.gameShell}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại Game Hub"
          onPress={() => setSelectedGame(null)}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Text style={styles.backText}>‹  Game Hub</Text>
        </Pressable>
        <View style={styles.gameContent}>
          {selectedGameContent()}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>NUMELYRA PLAY</Text>
          <Text style={styles.title}>Game Hub</Text>
          <Text style={styles.description}>Các trò chơi thư giãn và rèn luyện tư duy.</Text>
        </View>

        <View style={styles.grid}>
          {GAMES.map((game) => (
            <Pressable
              key={game.id}
              accessibilityRole="button"
              accessibilityLabel={`Mở ${game.title}`}
              onPress={() => setSelectedGame(game)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={[styles.icon, { backgroundColor: game.color }]}>
                <Text style={styles.emoji}>{game.emoji}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{game.title}</Text>
                <Text style={styles.cardSubtitle}>{game.subtitle}</Text>
              </View>
              <Text style={styles.readyStatus}>Chơi</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10062D' },
  gameShell: { flex: 1, backgroundColor: '#10062D' },
  gameContent: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  hero: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    backgroundColor: '#211052',
    borderWidth: 1,
    borderColor: '#6E3A9D',
  },
  kicker: { color: '#F5BA5B', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#FFF7E8', fontSize: 28, fontWeight: '800', marginTop: 7 },
  description: { color: '#DCCEF4', fontSize: 14, lineHeight: 21, marginTop: 7 },
  grid: { gap: 12 },
  card: {
    minHeight: 76,
    padding: 13,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#211052',
    borderWidth: 1,
    borderColor: 'rgba(185, 139, 220, 0.35)',
  },
  cardPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  emoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: { color: '#FFF7E8', fontSize: 16, fontWeight: '800' },
  cardSubtitle: { color: '#C9B5EC', fontSize: 12.5, marginTop: 3 },
  status: { color: '#C9B5EC', fontSize: 11, fontWeight: '700' },
  readyStatus: { color: '#91E8BC' },
  backButton: { alignSelf: 'flex-start', margin: 14, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#211052' },
  backButtonPressed: { opacity: 0.7 },
  backText: { color: '#FFF7E8', fontSize: 14, fontWeight: '700' },
});
