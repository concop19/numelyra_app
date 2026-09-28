import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Pusher from 'pusher-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { AmbientBackground } from '../components/AmbientBackground';
import { LivesIndicator } from '../components/LivesIndicator';
import { PuzzleBoardCanvas } from '../components/PuzzleBoardCanvas';
import { createInitialBoard, resolveTap } from '../game/engine';
import type { ArrowNode, BoardState, LevelDefinition } from '../game/types';
import { theme } from '../theme/theme';
import type { AppNavigation } from '../types/navigation';
import { playCorrectFeedback, playWrongFeedback } from '../utils/feedback';

type MultiplayerStep = 'setup' | 'lobby' | 'game' | 'results';

interface ServerPlayer {
  name: string;
  status: 'playing' | 'won' | 'failed' | 'abandoned';
  timeMs: number | null;
  arrowsLeft: number | null;
}

export function MultiplayerScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { width, height } = useWindowDimensions();

  // Connection & Room state
  const [playerName, setPlayerName] = useState('');
  const [serverUrl, setServerUrl] = useState('https://arrow-game-backend.vercel.app');
  const [pusherKey, setPusherKey] = useState('1d9ae595090f679858b4');
  const [roomCode, setRoomCode] = useState('');
  const [step, setStep] = useState<MultiplayerStep>('setup');
  const [connecting, setConnecting] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const [readyStates, setReadyStates] = useState<Record<string, boolean>>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Game state
  const [level, setLevel] = useState<LevelDefinition | null>(null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [exitingArrows, setExitingArrows] = useState<ArrowNode[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  
  // Live progress tracking
  const [opponentName, setOpponentName] = useState('');
  const [opponentArrowsLeft, setOpponentArrowsLeft] = useState<number>(0);
  const [myArrowsInitial, setMyArrowsInitial] = useState(0);

  // Results state
  const [matchWinner, setMatchWinner] = useState('');
  const [matchResults, setMatchResults] = useState<ServerPlayer[]>([]);
  const [rematchStates, setRematchStates] = useState<Record<string, boolean>>({});

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardScale = useSharedValue(1);
  const boardOpacity = useSharedValue(1);

  // Refs to avoid stale closures in event handlers
  const playerNameRef = useRef(playerName);
  const levelRef = useRef(level);
  const playersRef = useRef(players);
  const stepRef = useRef(step);
  const roomCodeRef = useRef(roomCode);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  // Load saved credentials on start
  useEffect(() => {
    async function loadSavedData() {
      try {
        const savedName = await AsyncStorage.getItem('multiplayer_name');
        const savedUrl = await AsyncStorage.getItem('multiplayer_url');
        const savedPusherKey = await AsyncStorage.getItem('multiplayer_pusher_key');
        if (savedName) setPlayerName(savedName);
        if (savedUrl) setServerUrl(savedUrl);
        if (savedPusherKey) setPusherKey(savedPusherKey);
      } catch (err) {
        console.error('AsyncStorage load error:', err);
      }
    }
    loadSavedData();

    return () => {
      disconnectPusher();
    };
  }, []);

  const disconnectPusher = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (channelRef.current && roomCodeRef.current) {
      channelRef.current.unbind_all();
    }
    if (pusherRef.current) {
      if (roomCodeRef.current) {
        pusherRef.current.unsubscribe(`room-${roomCodeRef.current}`);
      }
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }
    channelRef.current = null;
  };

  const apiPost = useCallback(async (endpoint: string, body: object) => {
    let cleanUrl = serverUrl.trim();
    if (!cleanUrl) {
      throw new Error('Please enter a valid Server URL.');
    }
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const response = await fetch(`${cleanUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let resData;
    try {
      resData = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response: ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(resData?.data?.message || resData?.error || 'Request failed');
    }
    return resData;
  }, [serverUrl]);

  const startCountdownTimer = (gameStartsAt: number, countdownSeconds: number) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const initialCount = Math.max(0, Math.ceil((gameStartsAt - Date.now()) / 1000));
    setCountdown(initialCount);

    countdownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remainingSeconds = Math.ceil((gameStartsAt - now) / 1000);

      if (now >= gameStartsAt || remainingSeconds <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);

        const currentLevel = levelRef.current;
        if (currentLevel) {
          setBoard(createInitialBoard(currentLevel, 3));
          setMyArrowsInitial(currentLevel.arrows.length);
          setOpponentArrowsLeft(currentLevel.arrows.length);
          
          const other = playersRef.current.find(p => p.toLowerCase() !== playerNameRef.current.toLowerCase()) || 'Opponent';
          setOpponentName(other);
          setExitingArrows([]);
          setStep('game');
          
          boardOpacity.value = 0;
          boardScale.value = 0.95;
          boardOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
          boardScale.value = withSpring(1, { damping: 14, stiffness: 120 });
        }
      } else {
        setCountdown(remainingSeconds);
      }
    }, 100);
  };

  const connectAndSubscribePusher = (code: string, keyToUse: string) => {
    disconnectPusher();

    try {
      console.log('Connecting to Pusher with key:', keyToUse);
      const PusherConstructor: any = (Pusher as any).Pusher || Pusher;
      const pusher = new PusherConstructor(keyToUse || '1d9ae595090f679858b4', {
        cluster: 'ap2',
        forceTLS: true,
      });

      pusherRef.current = pusher;

      const channelName = `room-${code}`;
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      channel.bind('player_joined', (data: any) => {
        console.log('Pusher received: [player_joined]', data);
        setPlayers(data.players);
        const other = data.players.find((p: string) => p.toLowerCase() !== playerNameRef.current.toLowerCase());
        if (other) setOpponentName(other);
      });

      channel.bind('player_left', (data: any) => {
        console.log('Pusher received: [player_left]', data);
        setPlayers(data.players);
        setReadyStates({});
        setOpponentName('');
        Alert.alert('Notice', `${data.playerName} left the lobby.`);
      });

      channel.bind('ready_states', (data: any) => {
        console.log('Pusher received: [ready_states]', data);
        setReadyStates(data.readyStates);
      });

      channel.bind('start_countdown', (data: any) => {
        console.log('Pusher received: [start_countdown]', data);
        startCountdownTimer(data.gameStartsAt, data.countdownSeconds || 5);
      });

      channel.bind('opponent_progress', (data: any) => {
        console.log('Pusher received: [opponent_progress]', data);
        setOpponentArrowsLeft(data.arrowsLeft);
      });

      channel.bind('match_results', (data: any) => {
        console.log('Pusher received: [match_results]', data);
        setMatchWinner(data.winner);
        setMatchResults(data.players);
        setRematchStates({});
        setStep('results');
      });

      channel.bind('rematch_states', (data: any) => {
        console.log('Pusher received: [rematch_states]', data);
        setRematchStates(data.rematchStates);
      });

      channel.bind('rematch_start', (data: any) => {
        console.log('Pusher received: [rematch_start]', data);
        setLevel(data.level);
        setPlayers(data.players);
        const other = data.players.find((p: string) => p.toLowerCase() !== playerNameRef.current.toLowerCase()) || 'Opponent';
        setOpponentName(other);
        setReadyStates({});
        setRematchStates({});
        setStep('lobby');
      });

      pusher.connection.bind('error', (err: any) => {
        console.error('Pusher connection error:', err);
      });

      pusher.connection.bind('state_change', (states: any) => {
        console.log('Pusher state changed:', states.current);
        if (states.current === 'failed') {
          Alert.alert('Connection Error', 'Pusher connection failed. Please check your Pusher credentials.');
          disconnectPusher();
          setStep('setup');
        }
      });

    } catch (err) {
      console.error('Pusher initialization error:', err);
      Alert.alert('Error', 'Failed to initialize real-time connection.');
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name first.');
      return;
    }
    if (!serverUrl.trim()) {
      Alert.alert('Server URL Required', 'Please enter a valid Server URL.');
      return;
    }
    if (!pusherKey.trim()) {
      Alert.alert('Pusher Key Required', 'Please enter your Pusher App Key.');
      return;
    }

    setConnecting(true);
    try {
      const res = await apiPost('/api/create-room', { name: playerName.trim() });
      const { roomCode: newCode, players: roomPlayers, level: newLevel } = res.data;
      
      await AsyncStorage.setItem('multiplayer_name', playerName.trim());
      await AsyncStorage.setItem('multiplayer_url', serverUrl.trim());
      await AsyncStorage.setItem('multiplayer_pusher_key', pusherKey.trim());

      setRoomCode(newCode);
      setPlayers(roomPlayers);
      setLevel(newLevel);
      setReadyStates({});
      setStep('lobby');
      
      connectAndSubscribePusher(newCode, pusherKey.trim());
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create room.');
    } finally {
      setConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name first.');
      return;
    }
    if (!roomCode.trim()) {
      Alert.alert('Code Required', 'Please enter a 4-letter room code.');
      return;
    }
    if (!serverUrl.trim()) {
      Alert.alert('Server URL Required', 'Please enter a valid Server URL.');
      return;
    }
    if (!pusherKey.trim()) {
      Alert.alert('Pusher Key Required', 'Please enter your Pusher App Key.');
      return;
    }

    setConnecting(true);
    try {
      const formattedCode = roomCode.trim().toUpperCase();
      const res = await apiPost('/api/join-room', {
        name: playerName.trim(),
        roomCode: formattedCode
      });
      const { roomCode: newCode, players: roomPlayers, level: newLevel } = res.data;

      await AsyncStorage.setItem('multiplayer_name', playerName.trim());
      await AsyncStorage.setItem('multiplayer_url', serverUrl.trim());
      await AsyncStorage.setItem('multiplayer_pusher_key', pusherKey.trim());

      setRoomCode(newCode);
      setPlayers(roomPlayers);
      setLevel(newLevel);
      setReadyStates({});
      setStep('lobby');

      const other = roomPlayers.find((p: string) => p.toLowerCase() !== playerName.trim().toLowerCase());
      if (other) setOpponentName(other);

      connectAndSubscribePusher(newCode, pusherKey.trim());
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join room.');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleReady = async () => {
    try {
      await apiPost('/api/toggle-ready', {
        name: playerName.trim(),
        roomCode: roomCode.trim().toUpperCase()
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to toggle ready state.');
    }
  };

  const handleRequestRematch = async () => {
    try {
      await apiPost('/api/rematch-request', {
        name: playerName.trim(),
        roomCode: roomCode.trim().toUpperCase()
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to request rematch.');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await apiPost('/api/leave-room', {
        name: playerName.trim(),
        roomCode: roomCode.trim().toUpperCase()
      });
    } catch (err) {
      console.warn('leave-room API call failed/ignored:', err);
    }
    disconnectPusher();
    setStep('setup');
    setRoomCode('');
    setPlayers([]);
    setLevel(null);
    setBoard(null);
  };

  // Gameplay Board interactions
  const handleExitDone = useCallback((arrowId: string) => {
    setExitingArrows((prev) => prev.filter((a) => a.id !== arrowId));
  }, []);

  const handleArrowPress = useCallback((arrowId: string) => {
    if (!board || !roomCode) return;

    const arrow = board.arrows.find((a) => a.id === arrowId);
    const result = resolveTap(arrowId, board);

    if (result.type === 'REMOVED' && arrow) {
      setExitingArrows((prev) => [...prev, arrow]);
      boardScale.value = withSequence(
        withTiming(0.98, { duration: 70 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      void playCorrectFeedback();

      const nextBoard = result.board;
      setBoard(nextBoard);

      apiPost('/api/update-progress', {
        name: playerNameRef.current,
        roomCode: roomCode.trim().toUpperCase(),
        arrowsLeft: nextBoard.arrows.length
      }).catch(err => console.error('Failed to update progress:', err));

      if (nextBoard.arrows.length === 0) {
        apiPost('/api/player-finished', {
          name: playerNameRef.current,
          roomCode: roomCode.trim().toUpperCase()
        }).catch(err => console.error('Failed to notify finished:', err));
      }

    } else if (result.type === 'BLOCKED') {
      void playWrongFeedback(hapticsEnabled);
      const nextBoard = result.board;
      setBoard(nextBoard);

      if (nextBoard.livesLeft <= 0) {
        apiPost('/api/player-failed', {
          name: playerNameRef.current,
          roomCode: roomCode.trim().toUpperCase()
        }).catch(err => console.error('Failed to notify failed:', err));
      }
    }
  }, [board, roomCode, soundEnabled, hapticsEnabled, boardScale, apiPost]);

  const handleUndo = useCallback(() => {
    if (!board || !roomCode) return;
    const lastRemovedId = board.removedIds[board.removedIds.length - 1];
    if (!lastRemovedId) return;

    const originalArrow = board.level.arrows.find((arrow) => arrow.id === lastRemovedId);
    if (!originalArrow) return;

    const nextBoard = {
      ...board,
      arrows: [...board.arrows, originalArrow],
      removedIds: board.removedIds.slice(0, -1)
    };

    setBoard(nextBoard);

    apiPost('/api/update-progress', {
      name: playerNameRef.current,
      roomCode: roomCode.trim().toUpperCase(),
      arrowsLeft: nextBoard.arrows.length
    }).catch(err => console.error('Failed to update progress:', err));
  }, [board, roomCode, apiPost]);

  const handleRestart = useCallback(() => {
    if (!level || !roomCode) return;
    const nextBoard = createInitialBoard(level, 3);
    setBoard(nextBoard);

    apiPost('/api/update-progress', {
      name: playerNameRef.current,
      roomCode: roomCode.trim().toUpperCase(),
      arrowsLeft: nextBoard.arrows.length
    }).catch(err => console.error('Failed to update progress:', err));
  }, [level, roomCode, apiPost]);

  // Animated Board styling
  const animatedBoardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
    opacity: boardOpacity.value
  }));

  // Render Sub-Views
  const renderSetup = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Battle Arena</Text>
          <Text style={styles.headerSub}>Compete real-time against another player!</Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Choose Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SpeedRunner99"
              placeholderTextColor={theme.colors.textMuted}
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={15}
            />

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={handleCreateRoom}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create New Room</Text>
              )}
            </Pressable>

            <View style={styles.orContainer}>
              <Text style={styles.orText}>OR JOIN EXISTING</Text>
            </View>

            <Text style={styles.inputLabel}>Room Code</Text>
            <TextInput
              style={[styles.input, styles.codeField]}
              placeholder="CODE"
              placeholderTextColor={theme.colors.textMuted}
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
              maxLength={4}
            />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
              onPress={handleJoinRoom}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color={theme.colors.arrowStroke} />
              ) : (
                <Text style={styles.secondaryBtnText}>Join Room</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            style={styles.backBtn}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.backBtnText}>← Return to Menu</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderLobby = () => {
    const isReady = readyStates[playerName] || false;
    const otherPlayer = players.find(p => p.toLowerCase() !== playerName.toLowerCase());
    const otherReady = otherPlayer ? readyStates[otherPlayer] || false : false;

    return (
      <View style={styles.lobbyContainer}>
        <Text style={styles.lobbyLabel}>ROOM CODE</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.lobbyCode}>{roomCode}</Text>
        </View>

        <Text style={styles.lobbySub}>Share this code with your friend to connect</Text>

        <View style={styles.playersCard}>
          <Text style={styles.cardHeader}>PLAYERS IN LOBBY</Text>
          
          <View style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerDot}>🎮</Text>
              <Text style={styles.playerNameText}>{playerName} (You)</Text>
            </View>
            <View style={[styles.readyBadge, isReady ? styles.readyActive : styles.readyWait]}>
              <Text style={styles.readyText}>{isReady ? 'READY' : 'WAITING'}</Text>
            </View>
          </View>

          {otherPlayer ? (
            <View style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerDot}>⚔️</Text>
                <Text style={styles.playerNameText}>{otherPlayer}</Text>
              </View>
              <View style={[styles.readyBadge, otherReady ? styles.readyActive : styles.readyWait]}>
                <Text style={styles.readyText}>{otherReady ? 'READY' : 'WAITING'}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.playerRow, styles.waitingRow]}>
              <ActivityIndicator color={theme.colors.textMuted} size="small" style={{ marginRight: 10 }} />
              <Text style={styles.waitingOpponentText}>Waiting for opponent to join...</Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.lobbyActionBtn,
            isReady ? styles.lobbyWaitBtn : styles.lobbyReadyBtn,
            pressed && styles.btnPressed
          ]}
          onPress={handleToggleReady}
          disabled={!otherPlayer}
        >
          <Text style={styles.lobbyActionBtnText}>
            {!otherPlayer ? 'Waiting for Player...' : isReady ? 'Cancel Ready' : 'I am Ready!'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.lobbyLeaveBtn}
          onPress={handleLeaveRoom}
        >
          <Text style={styles.lobbyLeaveBtnText}>Leave Room</Text>
        </Pressable>
      </View>
    );
  };

  const renderGame = () => {
    if (!board || !level) return null;

    const maxW = width * 0.95;
    const maxH = height * 0.52;
    const { columns, rows } = board.level.gridSize;
    const sizeFromWidth = maxW / columns;
    const sizeFromHeight = maxH / rows;
    const cellSize = Math.min(sizeFromWidth, sizeFromHeight, 60);
    const boardWidth = cellSize * columns;

    // Progress calculations
    const myArrowsLeft = board.arrows.length;
    const myCleared = Math.max(0, myArrowsInitial - myArrowsLeft);
    const myProgress = myArrowsInitial > 0 ? myCleared / myArrowsInitial : 0;

    const oppCleared = Math.max(0, myArrowsInitial - opponentArrowsLeft);
    const oppProgress = myArrowsInitial > 0 ? oppCleared / myArrowsInitial : 0;

    return (
      <View style={styles.gameContainer}>
        {/* Battle Progress Bar Header */}
        <View style={styles.vsContainer}>
          <View style={styles.vsPlayerColumn}>
            <Text style={styles.vsPlayerName} numberOfLines={1}>{playerName}</Text>
            <Text style={styles.vsProgressSub}>{myArrowsLeft} left</Text>
            <View style={styles.vsProgressBarBg}>
              <View style={[styles.vsProgressBarFill, { width: `${myProgress * 100}%`, backgroundColor: '#43A047' }]} />
            </View>
          </View>

          <View style={styles.vsBadgeContainer}>
            <Text style={styles.vsBadgeText}>VS</Text>
          </View>

          <View style={[styles.vsPlayerColumn, { alignItems: 'flex-end' }]}>
            <Text style={styles.vsPlayerName} numberOfLines={1}>{opponentName}</Text>
            <Text style={styles.vsProgressSub}>{opponentArrowsLeft} left</Text>
            <View style={styles.vsProgressBarBg}>
              <View style={[styles.vsProgressBarFill, { width: `${oppProgress * 100}%`, backgroundColor: '#8E24AA', alignSelf: 'flex-end' }]} />
            </View>
          </View>
        </View>

        {/* Lives Indicator */}
        <LivesIndicator livesLeft={board.livesLeft} />

        {/* Puzzle Canvas */}
        <View style={styles.boardStage}>
          <Animated.View style={animatedBoardStyle}>
            <PuzzleBoardCanvas
              board={board}
              exitingArrows={exitingArrows}
              width={boardWidth}
              onArrowPress={handleArrowPress}
              onExitDone={handleExitDone}
            />
          </Animated.View>
        </View>

        {/* Battle Controls (Hint hidden for fairness) */}
        <View style={styles.battleControls}>
          <Pressable style={styles.controlBtn} onPress={handleUndo}>
            <Text style={styles.controlBtnText}>↩ Undo</Text>
          </Pressable>
          <Pressable style={styles.controlBtn} onPress={handleRestart}>
            <Text style={styles.controlBtnText}>🔄 Restart</Text>
          </Pressable>
          <Pressable style={[styles.controlBtn, styles.controlLeaveBtn]} onPress={handleLeaveRoom}>
            <Text style={[styles.controlBtnText, styles.controlLeaveText]}>🏳️ Forfeit</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    const isMeWinner = matchWinner.toLowerCase() === playerName.toLowerCase();
    const otherPlayer = players.find(p => p.toLowerCase() !== playerName.toLowerCase()) || 'Opponent';
    const isRematchRequested = rematchStates[playerName] || false;
    const isOtherRematchRequested = rematchStates[otherPlayer] || false;

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsCard}>
          {matchWinner === 'None' ? (
            <Text style={styles.winEmoji}>🤝</Text>
          ) : isMeWinner ? (
            <Text style={styles.winEmoji}>🏆</Text>
          ) : (
            <Text style={styles.winEmoji}>💀</Text>
          )}

          <Text style={styles.winTitle}>
            {matchWinner === 'None' ? 'Draw Match!' : isMeWinner ? 'YOU VICTORY!' : 'YOU DEFEATED'}
          </Text>
          <Text style={styles.winSub}>
            {matchWinner === 'None' ? 'Both players failed the board.' : `${matchWinner} cleared the board first!`}
          </Text>

          {/* Results Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, styles.tableHeaderLabel]}>Player</Text>
              <Text style={[styles.tableCol, styles.tableHeaderLabel, { textAlign: 'center' }]}>Status</Text>
              <Text style={[styles.tableCol, styles.tableHeaderLabel, { textAlign: 'right' }]}>Time</Text>
            </View>

            {matchResults.map((result) => {
              const displayTime = result.timeMs ? `${(result.timeMs / 1000).toFixed(2)}s` : 'Failed';
              return (
                <View key={result.name} style={styles.tableRow}>
                  <Text style={[styles.tableCol, styles.tableCellName, result.name === playerName && styles.tableCellHighlight]}>
                    {result.name} {result.name === playerName ? '(You)' : ''}
                  </Text>
                  <Text style={[styles.tableCol, styles.tableCellStatus, { textAlign: 'center' }, result.status === 'won' ? styles.statusWon : styles.statusFailed]}>
                    {result.status === 'won' ? 'FINISHED' : 'FAILED'}
                  </Text>
                  <Text style={[styles.tableCol, styles.tableCellTime, { textAlign: 'right' }]}>
                    {displayTime}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Rematch Section */}
        <View style={styles.rematchCard}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.rematchBtn,
              isRematchRequested ? styles.rematchBtnWaiting : styles.rematchBtnActive,
              pressed && styles.btnPressed
            ]}
            onPress={handleRequestRematch}
            disabled={isRematchRequested}
          >
            <Text style={styles.rematchBtnText}>
              {isRematchRequested ? 'Waiting for opponent...' : 'Request Rematch'}
            </Text>
          </Pressable>

          {isOtherRematchRequested && (
            <Text style={styles.rematchTip}>{otherPlayer} wants a rematch!</Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.resultsLeaveBtn}
          onPress={handleLeaveRoom}
        >
          <Text style={styles.resultsLeaveBtnText}>Exit Arena</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientBackground />
      {step !== 'setup' && step !== 'game' && (
        <View style={styles.lobbyHeader}>
          <Text style={styles.lobbyTitle}>⚔️ Arena Lobby</Text>
        </View>
      )}

      {/* Main View Transition */}
      {step === 'setup' && renderSetup()}
      {step === 'lobby' && renderLobby()}
      {step === 'game' && renderGame()}
      {step === 'results' && renderResults()}

      {/* Synchronized Countdown Overlay */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownTitle}>GET READY</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownSub}>Same level. Who clears fastest?</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  keyboardContainer: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: theme.colors.arrowStroke,
    textAlign: 'center',
    marginTop: 20
  },
  headerSub: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    fontWeight: '600'
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.xl,
    padding: 24,
    ...theme.shadows.lg
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 14
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.black,
    backgroundColor: theme.colors.bgPrimary,
    fontWeight: '600'
  },
  codeField: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '900',
    color: theme.colors.arrowStroke
  },
  divider: {
    height: 1.5,
    backgroundColor: theme.colors.borderSoft,
    marginVertical: 20
  },
  orContainer: {
    alignItems: 'center',
    marginVertical: 16
  },
  orText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 2
  },
  primaryBtn: {
    backgroundColor: theme.colors.arrowStroke,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800'
  },
  secondaryBtn: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: theme.colors.arrowStroke,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...theme.shadows.md
  },
  secondaryBtnText: {
    color: theme.colors.arrowStroke,
    fontSize: 18,
    fontWeight: '800'
  },
  btnPressed: {
    transform: [{ scale: 0.97 }]
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 24
  },
  backBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '700'
  },

  // Lobby Styles
  lobbyHeader: {
    alignItems: 'center',
    marginTop: 16
  },
  lobbyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.arrowStroke
  },
  lobbyContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lobbyLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 2
  },
  codeContainer: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: theme.colors.arrowStroke,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 40,
    paddingVertical: 12,
    marginVertical: 12,
    ...theme.shadows.md
  },
  lobbyCode: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 8,
    color: theme.colors.arrowStroke,
    textAlign: 'center'
  },
  lobbySub: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600'
  },
  playersCard: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 30,
    ...theme.shadows.md
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 14
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft
  },
  waitingRow: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    paddingVertical: 16
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  playerDot: {
    fontSize: 20,
    marginRight: 10
  },
  playerNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.arrowStroke
  },
  waitingOpponentText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: '600'
  },
  readyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  readyActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#43A047',
    borderWidth: 1
  },
  readyWait: {
    backgroundColor: '#ECEFF1',
    borderColor: '#B0BEC5',
    borderWidth: 1
  },
  readyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#37474F'
  },
  lobbyActionBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md
  },
  lobbyReadyBtn: {
    backgroundColor: theme.colors.arrowStroke
  },
  lobbyWaitBtn: {
    backgroundColor: '#B0BEC5'
  },
  lobbyActionBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800'
  },
  lobbyLeaveBtn: {
    marginTop: 20,
    padding: 10
  },
  lobbyLeaveBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '700'
  },

  // Game UI
  gameContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    ...theme.shadows.md
  },
  vsPlayerColumn: {
    flex: 1
  },
  vsPlayerName: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.arrowStroke
  },
  vsProgressSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2
  },
  vsProgressBarBg: {
    height: 8,
    backgroundColor: theme.colors.bgPrimary,
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%'
  },
  vsProgressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  vsBadgeContainer: {
    paddingHorizontal: 10,
    backgroundColor: theme.colors.bgPrimary,
    borderRadius: 12,
    marginHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft
  },
  vsBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.textPrimary
  },
  boardStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  battleControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  controlBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    minWidth: 100,
    alignItems: 'center',
    ...theme.shadows.md
  },
  controlBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.arrowStroke
  },
  controlLeaveBtn: {
    borderColor: theme.colors.lifeRed,
    borderWidth: 1
  },
  controlLeaveText: {
    color: theme.colors.lifeRed
  },

  // Results UI
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultsCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.radius.xl,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    ...theme.shadows.lg
  },
  winEmoji: {
    fontSize: 72,
    marginBottom: 10
  },
  winTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.arrowStroke,
    textAlign: 'center'
  },
  winSub: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    fontWeight: '600'
  },
  table: {
    width: '100%',
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderSoft,
    paddingBottom: 8,
    marginBottom: 8
  },
  tableHeaderLabel: {
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontSize: 14
  },
  tableCol: {
    flex: 1
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.bgPrimary,
    alignItems: 'center'
  },
  tableCellName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.black
  },
  tableCellHighlight: {
    color: theme.colors.textPrimary,
    fontWeight: '900'
  },
  tableCellStatus: {
    fontSize: 12,
    fontWeight: '800'
  },
  statusWon: {
    color: '#43A047'
  },
  statusFailed: {
    color: theme.colors.lifeRed
  },
  tableCellTime: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.black
  },
  rematchCard: {
    width: '100%',
    alignItems: 'center',
    marginTop: 30
  },
  rematchBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md
  },
  rematchBtnActive: {
    backgroundColor: theme.colors.arrowStroke
  },
  rematchBtnWaiting: {
    backgroundColor: '#B0BEC5'
  },
  rematchBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800'
  },
  rematchTip: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary
  },
  resultsLeaveBtn: {
    marginTop: 20,
    padding: 10
  },
  resultsLeaveBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '700'
  },

  // Countdown overlay
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  countdownContainer: {
    alignItems: 'center'
  },
  countdownTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.accentGold,
    letterSpacing: 4,
    marginBottom: 10
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFF'
  },
  countdownSub: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 10,
    opacity: 0.8,
    fontWeight: '600'
  }
});
