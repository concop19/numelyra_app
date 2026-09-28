import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type Props = {
  text: string;
};

export function HintBubble({ text }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center'
  },
  bubble: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgBubble,
    borderRadius: theme.radius.lg,
    minWidth: 260,
    paddingHorizontal: 26,
    paddingVertical: 22
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '800'
  },
  tail: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 18,
    borderRightColor: 'transparent',
    borderRightWidth: 18,
    borderTopColor: theme.colors.bgBubble,
    borderTopWidth: 20,
    height: 0,
    marginTop: -1,
    width: 0
  }
});
