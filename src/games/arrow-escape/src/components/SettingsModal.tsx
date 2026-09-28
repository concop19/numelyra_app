import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useGameStore } from '../state/gameStore';
import { theme } from '../theme/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onRestart?: () => void;
};

export function SettingsModal({ visible, onClose, onRestart }: Props) {
  const { soundEnabled, hapticsEnabled, musicEnabled, toggleSound, toggleHaptics, toggleMusic } = useGameStore();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          
          <Text style={styles.title}>Settings</Text>

          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.labelContainer}>
                <Ionicons name="volume-medium-outline" size={22} color={theme.colors.textMuted} style={styles.icon} />
                <Text style={styles.settingLabel}>Sound</Text>
              </View>
              <Switch 
                value={soundEnabled} 
                onValueChange={toggleSound} 
                trackColor={{ false: theme.colors.borderSoft, true: theme.colors.arrowStroke }}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.labelContainer}>
                <Ionicons name="phone-portrait-outline" size={22} color={theme.colors.textMuted} style={styles.icon} />
                <Text style={styles.settingLabel}>Vibration</Text>
              </View>
              <Switch 
                value={hapticsEnabled} 
                onValueChange={toggleHaptics} 
                trackColor={{ false: theme.colors.borderSoft, true: theme.colors.arrowStroke }}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.labelContainer}>
                <Ionicons name="musical-notes-outline" size={22} color={theme.colors.textMuted} style={styles.icon} />
                <Text style={styles.settingLabel}>Music</Text>
              </View>
              <Switch 
                value={musicEnabled} 
                onValueChange={toggleMusic} 
                trackColor={{ false: theme.colors.borderSoft, true: theme.colors.arrowStroke }}
              />
            </View>
          </View>

          {onRestart && (
            <Pressable style={styles.restartButton} onPress={onRestart}>
              <Text style={styles.restartText}>Restart</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.bgPrimary,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  closeText: {
    fontSize: 20,
    color: theme.colors.textMuted,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  settingsGroup: {
    backgroundColor: 'rgba(230, 220, 210, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  restartButton: {
    backgroundColor: theme.colors.arrowStroke,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  restartText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  }
});
