import { AppText } from '@/src/components/app-text';
import { Icon } from '@/src/components/icons';
import React from 'react';
import { View } from 'react-native';

type StatsGridProps = {
  timeSpent?: number;
  accuracy?: number;
  coinsEarned?: number;
  xpEarned?: number;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

/** Four-tile summary of the run shown on the result screen. */
const StatsGrid: React.FC<StatsGridProps> = ({
  timeSpent = 0,
  accuracy = 100,
  coinsEarned = 0,
  xpEarned = 0,
}) => {
  const stats = [
    { IconComponent: Icon.Clock, label: 'Time', value: formatTime(timeSpent), tint: 'text-accent' },
    { IconComponent: Icon.Target, label: 'Accuracy', value: `${Math.round(accuracy)}%`, tint: 'text-success' },
    { IconComponent: Icon.Coins, label: 'Coins', value: `+${coinsEarned}`, tint: 'text-warning' },
    { IconComponent: Icon.Bolt, label: 'XP', value: `+${xpEarned}`, tint: 'text-violet-400' },
  ];

  return (
    <View className="flex-row gap-2">
      {stats.map((stat) => {
        const StatIcon = stat.IconComponent;
        return (
          <View
            key={stat.label}
            className="flex-1 items-center gap-1 rounded-2xl bg-default py-3"
          >
            <StatIcon size={22} className={stat.tint} />
            <AppText className="text-xs text-muted">{stat.label}</AppText>
            <AppText className="font-mono-medium text-sm text-default-foreground">
              {stat.value}
            </AppText>
          </View>
        );
      })}
    </View>
  );
};

export default StatsGrid;
