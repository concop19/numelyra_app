import { AppText } from '@/src/components/app-text';
import { Icon } from '@/src/components/icons';
import SafeScreenView from '@/src/components/views/safe-screen';
import { useAppTheme } from '@/src/contexts/app-theme-context';
import { useProgress } from '@/src/store/hooks/use-progress';
import { useSettings } from '@/src/store/hooks/use-settings';
import { useRouter } from 'expo-router';
import { PressableFeedback, Surface, Switch } from 'heroui-native';
import React from 'react';
import { Alert, ScrollView, View } from 'react-native';

const Row: React.FC<{
  IconComponent: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  tint?: string;
}> = ({ IconComponent, label, description, children, onPress, tint = 'text-foreground' }) => {
  const content = (
    <View className="flex-row items-center gap-3 py-3">
      <View className="size-9 items-center justify-center rounded-xl bg-default">
        <IconComponent size={18} className={tint} />
      </View>
      <View className="flex-1">
        <AppText className="text-base text-default-foreground">{label}</AppText>
        {!!description && (
          <AppText className="text-xs text-muted">{description}</AppText>
        )}
      </View>
      {children}
    </View>
  );

  return onPress ? (
    <PressableFeedback onPress={onPress}>{content}</PressableFeedback>
  ) : (
    content
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppText className="mb-1 ml-1 mt-4 text-xs uppercase tracking-wider text-muted">
    {children}
  </AppText>
);

export default function Settings() {
  const router = useRouter();
  const { settings, toggle } = useSettings();
  const { isDark, toggleTheme } = useAppTheme();
  const { reset, totalStars, completedCount } = useProgress();

  const confirmReset = () => {
    Alert.alert(
      'Reset progress?',
      'This clears all stars and locks every level except the first. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => reset() },
      ]
    );
  };

  return (
    <SafeScreenView
      edges={['bottom']}
      style={{ flex: 1, paddingHorizontal: 16 }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionLabel>Preferences</SectionLabel>
        <Surface className="bg-surface/60">
          <Row IconComponent={Icon.Haptics} label="Haptics" description="Vibrations on taps and answers">
            <Switch
              isSelected={settings.haptics}
              onSelectedChange={() => toggle('haptics')}
            />
          </Row>
          <View className="h-px bg-default" />
          <Row IconComponent={Icon.Volume} label="Sound" description="Sound effects">
            <Switch
              isSelected={settings.sound}
              onSelectedChange={() => toggle('sound')}
            />
          </Row>
        </Surface>

        <SectionLabel>Appearance</SectionLabel>
        <Surface className="bg-surface/60">
          <Row IconComponent={Icon.Moon} label="Dark mode">
            <Switch isSelected={isDark} onSelectedChange={() => toggleTheme()} />
          </Row>
        </Surface>

        <SectionLabel>Game</SectionLabel>
        <Surface className="bg-surface/60">
          <Row
            IconComponent={Icon.Trophy}
            label="Your progress"
            description={`${completedCount} levels cleared · ${totalStars} stars`}
            tint="text-warning"
          />
          <View className="h-px bg-default" />
          <Row
            IconComponent={Icon.Question}
            label="How to play"
            onPress={() => router.push('/how-to-play')}
          >
            <Icon.ChevronRight
              size={18}
              className="text-muted"
            />
          </Row>
        </Surface>

        <View className="mt-4">
          <Surface className="bg-surface/60">
            <Row
              IconComponent={Icon.Trash}
              label="Reset progress"
              description="Clear all stars and unlocked levels"
              tint="text-danger"
              onPress={confirmReset}
            />
          </Surface>
        </View>

        <AppText className="mt-6 text-center text-xs text-muted">
          Mind Puzzle · v1.0.0
        </AppText>
      </ScrollView>
    </SafeScreenView>
  );
}
