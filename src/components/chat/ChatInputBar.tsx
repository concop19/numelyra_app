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

  return (
    <View style={styles.container}>
      {/* Nút hành động nhanh: dấu cộng (+) */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPressPlus}
        style={styles.circlePlusBtn}
        accessibilityLabel="Mở menu tính năng nhanh"
        accessibilityRole="button"
      >
        <Text style={styles.plusIcon}>+</Text>
      </TouchableOpacity>

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
            if (canSend) onSend();
          }}
          multiline={false}
          editable={!disabled && !isLoading}
          autoCorrect={false}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSend}
          disabled={!canSend}
          style={[
            styles.circleSendBtn,
            !canSend && styles.circleSendBtnDisabled,
          ]}
          accessibilityLabel="Gửi tin nhắn"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendArrowIcon}>↑</Text>
          )}
        </TouchableOpacity>
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
  circlePlusBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(46, 27, 93, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(180, 139, 244, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  circleSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF7C98',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5E7E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 7,
    elevation: 5,
  },
  circleSendBtnDisabled: {
    backgroundColor: 'rgba(80, 60, 110, 0.65)',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendArrowIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
  },
});

export default ChatInputBar;
