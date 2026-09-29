import "./src/polyfills";
import "react-native-gesture-handler";

import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppScreen } from "./src/components";
import { useFonts } from "expo-font";
import { theme } from "./src/constants";

type Props = { dailyMode?: boolean; onDailyComplete?: () => void };

export default function App({ dailyMode = false, onDailyComplete }: Props) {
  const [fontsLoaded] = useFonts({
    [theme.fonts.bold]: require("./assets/fonts/ClearSans-Bold.ttf"),
    [theme.fonts.regular]: require("./assets/fonts/ClearSans-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundPrimary }} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppScreen dailyMode={dailyMode} onDailyComplete={onDailyComplete} />
    </GestureHandlerRootView>
  );
}
