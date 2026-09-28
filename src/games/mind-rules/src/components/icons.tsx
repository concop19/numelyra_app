import {
  AltArrowRightLinear,
  ArrowRightLinear,
  BackspaceLinear,
  BoltLinear,
  CalculatorLinear,
  CalendarLinear,
  ClockCircleLinear,
  CupStarLinear,
  EyeLinear,
  LightbulbBoldDuotone,
  LockBoldDuotone,
  LogoutLinear,
  MenuDotsLinear,
  MoonLinear,
  QuestionCircleLinear,
  RefreshLinear,
  SettingsLinear,
  SmartphoneVibrationLinear,
  StarBoldDuotone,
  SunLinear,
  TargetLinear,
  TrashBinMinimalisticLinear,
  VolumeLoudLinear,
  WalletLinear,
} from '@solar-icons/react-native';
import { withUniwind } from 'uniwind';

/**
 * App icon set, sourced from `@solar-icons/react-native` and wrapped with
 * `withUniwind` so colour can be set with `text-*` classNames (via
 * `currentColor`). Pass a numeric `size` for sizing.
 */
export const Icon = {
  // Filled / duotone feature icons
  Lightbulb: withUniwind(LightbulbBoldDuotone),
  Lock: withUniwind(LockBoldDuotone),
  Star: withUniwind(StarBoldDuotone),

  // Outline UI / chrome icons
  ArrowRight: withUniwind(ArrowRightLinear),
  ChevronRight: withUniwind(AltArrowRightLinear),
  Backspace: withUniwind(BackspaceLinear),
  Settings: withUniwind(SettingsLinear),
  Calendar: withUniwind(CalendarLinear),
  Menu: withUniwind(MenuDotsLinear),
  Refresh: withUniwind(RefreshLinear),
  Question: withUniwind(QuestionCircleLinear),
  Exit: withUniwind(LogoutLinear),
  Trash: withUniwind(TrashBinMinimalisticLinear),
  Moon: withUniwind(MoonLinear),
  Sun: withUniwind(SunLinear),
  Haptics: withUniwind(SmartphoneVibrationLinear),
  Volume: withUniwind(VolumeLoudLinear),
  Eye: withUniwind(EyeLinear),
  Calculator: withUniwind(CalculatorLinear),

  // Stats
  Clock: withUniwind(ClockCircleLinear),
  Target: withUniwind(TargetLinear),
  Coins: withUniwind(WalletLinear),
  Bolt: withUniwind(BoltLinear),
  Trophy: withUniwind(CupStarLinear),
};
