import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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
  const canSend = value.trim().length > 0 && !isLoading && !disabled;
  const handleSend = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend();
  };

  return (
    <View style={styles.container}>
      {/* Nút hành động nhanh: dấu cộng (+) */}
      <View style={styles.circlePlusBtnShadow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onPressPlus}
          style={styles.circlePlusBtn}
          accessibilityLabel="Mở menu tính năng nhanh"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#4A2D82', '#30195F', '#1D103F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.circlePlusGradient}
          >
            <Ionicons name="add" size={27} color="#EFE7FF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Khung nhập văn bản dạng viên thuốc (pill shape) */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(200, 190, 230, 0.55)"
          returnKeyType="send"
          onSubmitEditing={() => {
            handleSend();
          }}
          multiline={false}
          editable={!disabled && !isLoading}
          autoCorrect={false}
          cursorColor="#F7CC6A"
          selectionColor="rgba(247, 204, 106, 0.4)"
        />

        <View style={[styles.circleSendBtnShadow, !canSend && styles.circleSendBtnShadowDisabled]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!canSend}
            style={styles.circleSendBtn}
            accessibilityLabel="Gửi tin nhắn"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#FFE5A1', '#F5B84E', '#DF962F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.circleSendGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#2A1938" />
              ) : (
                <Ionicons name="arrow-up" size={22} color="#2A1938" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  circlePlusBtnShadow: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 8,
    shadowColor: '#160A33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 6,
  },
  circlePlusBtn: {
    flex: 1,
    borderRadius: 27,
    overflow: 'hidden',
  },
  circlePlusGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    fontSize: 29,
    color: 'rgba(240, 228, 255, 0.96)',
    fontWeight: '200',
    lineHeight: 31,
  },
  inputWrapper: {
    flex: 1,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(53, 31, 108, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(181, 139, 244, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
    paddingRight: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#F7F3FF',
    fontWeight: '400',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  circleSendBtnShadow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#E4A039',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.46,
    shadowRadius: 10,
    elevation: 6,
  },
  circleSendBtnShadowDisabled: {
    opacity: 0.72,
    shadowOpacity: 0.20,
    elevation: 3,
  },
  circleSendBtn: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  circleSendGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendArrowIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
  },
});

export default ChatInputBar;
