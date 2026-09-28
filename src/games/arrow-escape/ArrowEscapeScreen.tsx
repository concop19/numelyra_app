import 'react-native-gesture-handler';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';

import { audioManager } from './src/utils/audio';

import { FailScreen } from './src/screens/FailScreen';
import { GameplayScreen } from './src/screens/GameplayScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelSelectScreen } from './src/screens/LevelSelectScreen';
import { MultiplayerScreen } from './src/screens/MultiplayerScreen';
import { TutorialScreen } from './src/screens/TutorialScreen';
import { VictoryScreen } from './src/screens/VictoryScreen';
import { SpaceArrowScreen } from './src/space_game/screens/SpaceArrowScreen';
import { theme } from './src/theme/theme';

export type RootStackParamList = {
  Home: undefined;
  Tutorial: undefined;
  Gameplay: undefined;
  LevelSelect: undefined;
  Victory: undefined;
  Fail: undefined;
  Multiplayer: undefined;
  SpaceArrow: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    void audioManager.init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bgPrimary },
          animation: 'fade'
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen name="Gameplay" component={GameplayScreen} />
        <Stack.Screen name="Victory" component={VictoryScreen} />
        <Stack.Screen name="Fail" component={FailScreen} />
        <Stack.Screen name="Multiplayer" component={MultiplayerScreen} />
        <Stack.Screen name="SpaceArrow" component={SpaceArrowScreen} />
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
}
