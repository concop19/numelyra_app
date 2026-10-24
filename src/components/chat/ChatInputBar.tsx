import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ThreeDButton from '../ThreeDButton';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPressPlus?: () => void;
  onPressVoice?: () => void;
  isVoiceListening?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInputBar: React.FC<Props> = ({
  value,
  onChangeText,
  onSend,
  onPressPlus,
  onPressVoice,
  isVoiceListening = false,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const { l } = useLocalization();
  const canSend = value.trim().length > 0 && !isLoading && !disabled;
  const handleSend = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend();
  };

  return (
    <View style={styles.container}>
      {/* Nút hành động nhanh: dấu cộng (+) */}
      <ThreeDButton
        onPress={onPressPlus ?? (() => undefined)}
        disabled={!onPressPlus}
        variant="purple"
        size="md"
        shape="circle"
        diameter={44}
        highlightColor="rgba(216, 190, 255, 0.14)"
        leadingIcon={<Ionicons name="add" size={28} color="#FFFFFF" />}
        accessibilityLabel={l('Mở menu tính năng nhanh', 'Open quick actions')}
        style={styles.circlePlusButton}
      />

      {/* Khung nhập văn bản dạng viên thuốc (pill shape) */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(200, 190, 230, 0.55)"
          returnKeyType="default"
          multiline={true}
          maxLength={2000}
          textAlignVertical="center"
          editable={!disabled && !isLoading}
          autoCorrect={false}
          cursorColor="#F7CC6A"
          selectionColor="rgba(247, 204, 106, 0.4)"
        />

        <ThreeDButton
          onPress={handleSend}
          disabled={!canSend && !isLoading}
          loading={isLoading}
          variant="gold"
          size="md"
          shape="circle"
          diameter={44}
          leadingIcon={<Ionicons name="arrow-up" size={22} color="#2A1938" />}
          accessibilityLabel={l('Gửi tin nhắn', 'Send message')}
          style={styles.circleSendButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  circlePlusButton: {
    marginRight: 8,
    marginBottom: 0,
  },
  inputWrapper: {
    flex: 1,
    minHeight: 54,
    maxHeight: 120,
    borderRadius: 27,
    backgroundColor: 'rgba(53, 31, 108, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(181, 139, 244, 0.35)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 20,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#F7F3FF',
    fontWeight: '400',
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingRight: 8,
    textAlignVertical: 'center',
  },
  circleSendButton: {
    flexShrink: 0,
    marginBottom: 0,
  },
});

export default ChatInputBar;
