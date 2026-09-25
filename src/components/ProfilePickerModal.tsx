/**
 * ProfilePickerModal.tsx - Modal quản lý & chọn Profile (1 người hoặc 2 người để ghép đôi tình duyên)
 * Kích hoạt khi bấm nút Kính Lúp (🔍) ở thanh chat hoặc khi gửi câu hỏi.
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  ScrollView, TextInput, Alert, Platform
} from 'react-native';
import {
  ProfileItem, loadAllProfiles, addProfile, deleteProfile,
  setActiveProfileId, getZodiac, getZodiacEmoji, getNguHanh, getNguHanhEmoji
} from '../store/userProfile';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedProfiles: ProfileItem[];
  onProfilesSelected: (profiles: ProfileItem[]) => void;
  promptNotice?: string;
}

export default function ProfilePickerModal({
  visible,
  onClose,
  selectedProfiles,
  onProfilesSelected,
  promptNotice
}: Props) {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [isCoupleMode, setIsCoupleMode] = useState<boolean>(selectedProfiles.length >= 2);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(
    selectedProfiles.map(p => p.id)
  );

  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female'>('female');
  const [formError, setFormError] = useState('');

  const fetchProfiles = async () => {
    const list = await loadAllProfiles();
    setProfiles(list);
    if (selectedProfiles.length === 0 && list.length > 0) {
      setTempSelectedIds([list[0].id]);
      onProfilesSelected([list[0]]);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchProfiles();
      setIsAdding(false);
      setFormError('');
      setIsCoupleMode(selectedProfiles.length >= 2);
      setTempSelectedIds(selectedProfiles.map(p => p.id));
    }
  }, [visible]);

  const handleSelectProfile = async (item: ProfileItem) => {
    if (!isCoupleMode) {
      // Chế độ 1 người: Chọn ngay và đóng modal
      await setActiveProfileId(item.id);
      onProfilesSelected([item]);
      onClose();
      return;
    }

    // Chế độ 2 người (Ghép đôi tình duyên)
    let updatedIds = [...tempSelectedIds];
    if (updatedIds.includes(item.id)) {
      // Hủy chọn nếu đã chọn
      updatedIds = updatedIds.filter(id => id !== item.id);
    } else {
      if (updatedIds.length >= 2) {
        // Đã chọn đủ 2 người -> thay thế người thứ 2
        updatedIds = [updatedIds[0], item.id];
      } else {
        updatedIds.push(item.id);
      }
    }
    setTempSelectedIds(updatedIds);
  };

  const handleConfirmCouple = () => {
    const chosen = profiles.filter(p => tempSelectedIds.includes(p.id));
    if (chosen.length < 2) {
      Alert.alert('Thông báo', 'Vui lòng chọn đủ 2 hồ sơ để xem mức độ tương hợp tình duyên!');
      return;
    }
    onProfilesSelected(chosen.slice(0, 2));
    onClose();
  };

  const handleDelete = async (id: string, name: string) => {
    const doDelete = async () => {
      const updated = await deleteProfile(id);
      setProfiles(updated);
      setTempSelectedIds(prev => prev.filter(pId => pId !== id));
      if (updated.length > 0 && selectedProfiles.some(p => p.id === id)) {
        onProfilesSelected([updated[0]]);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Bạn có chắc muốn xóa hồ sơ "${name}" không?`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Xác nhận xóa',
        `Bạn có chắc muốn xóa hồ sơ "${name}" không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  const handleCreateProfile = async () => {
    const trimmedName = newName.trim();
    const trimmedDate = newBirthDate.trim();

    if (!trimmedName) {
      setFormError('Vui lòng nhập Họ và tên.');
      return;
    }

    let formattedDate = trimmedDate;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDate)) {
      const [d, m, y] = trimmedDate.split('/');
      formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
      setFormError('Ngày sinh cần đúng định dạng YYYY-MM-DD hoặc DD/MM/YYYY (ví dụ: 1998-10-20 hoặc 20/10/1998).');
      return;
    }

    try {
      const created = await addProfile({
        fullName: trimmedName,
        birthDate: formattedDate,
        gender: newGender
      });
      setNewName('');
      setNewBirthDate('');
      setFormError('');
      setIsAdding(false);
      await fetchProfiles();

      if (isCoupleMode) {
        setTempSelectedIds(prev => [...prev.slice(0, 1), created.id]);
      } else {
        onProfilesSelected([created]);
        onClose();
      }
    } catch {
      setFormError('Không thể tạo hồ sơ. Vui lòng thử lại.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerIcon}>✦</Text>
              <Text style={styles.headerTitle}>Chọn Hồ Sơ Luận Giải</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switch: 1 người vs 2 người */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, !isCoupleMode && styles.modeTabActive]}
              onPress={() => {
                setIsCoupleMode(false);
                if (tempSelectedIds.length > 1) {
                  setTempSelectedIds([tempSelectedIds[0]]);
                }
              }}
            >
              <Text style={[styles.modeTabText, !isCoupleMode && styles.modeTabTextActive]}>
                👤 Cá Nhân (1 Người)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, isCoupleMode && styles.modeTabActiveCouple]}
              onPress={() => {
                setIsCoupleMode(true);
                if (profiles.length >= 2 && tempSelectedIds.length < 2) {
                  setTempSelectedIds([profiles[0].id, profiles[1].id]);
                }
              }}
            >
              <Text style={[styles.modeTabText, isCoupleMode && styles.modeTabTextActiveCouple]}>
                💖 Tình Duyên (2 Người)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle / Notice */}
          {promptNotice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{promptNotice}</Text>
            </View>
          ) : (
            <Text style={styles.headerSubtitle}>
              {isCoupleMode
                ? 'Tích chọn 2 người (Bạn & Người ấy) để Agent phân tích Bát Tự hòa hợp và trải bài tình duyên.'
                : 'Chọn 1 hồ sơ để Tiểu Linh Miêu giải mã vận mệnh, công danh và năng lượng cá nhân.'}
            </Text>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* List of profiles */}
            <View style={styles.listContainer}>
              {profiles.map((p) => {
                const isSelected = tempSelectedIds.includes(p.id);
                const order = tempSelectedIds.indexOf(p.id) + 1;
                const birthYear = parseInt(p.birthDate.substring(0, 4), 10) || 2000;
                const zodiac = getZodiac(birthYear);
                const zodiacEmoji = getZodiacEmoji(zodiac);
                const nguHanh = getNguHanh(birthYear);
                const nguHanhEmoji = getNguHanhEmoji(nguHanh);

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.profileCard,
                      isSelected && styles.profileCardSelected,
                      isSelected && isCoupleMode && styles.profileCardCoupleSelected
                    ]}
                    onPress={() => handleSelectProfile(p)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.profileLeft}>
                      <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                        <Text style={{ fontSize: 24 }}>{zodiacEmoji}</Text>
                      </View>
                      <View style={styles.profileInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.profileName}>{p.fullName}</Text>
                          {isSelected && (
                            <View style={[styles.activeBadge, isCoupleMode && styles.activeBadgeCouple]}>
                              <Text style={styles.activeBadgeText}>
                                {isCoupleMode ? `Người ${order}` : 'Đang chọn'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.profileDetails}>
                          📅 {p.birthDate} · {nguHanhEmoji} {nguHanh} · {zodiac}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.profileRight}>
                      {profiles.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id, p.fullName);
                          }}
                        >
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {profiles.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có hồ sơ nào. Hãy thêm hồ sơ để bắt đầu!</Text>
                </View>
              )}
            </View>

            {/* Add Profile Section */}
            {isAdding ? (
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>➕ Thêm Hồ Sơ Mới</Text>
                
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <Text style={styles.label}>Họ và tên</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  placeholderTextColor="#64748B"
                  value={newName}
                  onChangeText={setNewName}
                />

                <Text style={styles.label}>Ngày sinh (Dương lịch)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 1998-10-20 hoặc 20/10/1998"
                  placeholderTextColor="#64748B"
                  value={newBirthDate}
                  onChangeText={setNewBirthDate}
                />

                <Text style={styles.label}>Giới tính</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, newGender === 'female' && styles.genderBtnActive]}
                    onPress={() => setNewGender('female')}
                  >
                    <Text style={[styles.genderBtnText, newGender === 'female' && styles.genderBtnTextActive]}>
                      👩 Nữ
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderBtn, newGender === 'male' && styles.genderBtnActive]}
                    onPress={() => setNewGender('male')}
                  >
                    <Text style={[styles.genderBtnText, newGender === 'male' && styles.genderBtnTextActive]}>
                      👨 Nam
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setIsAdding(false);
                      setFormError('');
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleCreateProfile}>
                    <Text style={styles.submitBtnText}>Lưu Hồ Sơ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={() => setIsAdding(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addTriggerIcon}>➕</Text>
                <Text style={styles.addTriggerText}>Thêm hồ sơ người thân / bạn bè</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Confirm Button for Couple Mode */}
          {isCoupleMode && (
            <TouchableOpacity
              style={[
                styles.confirmCoupleBtn,
                tempSelectedIds.length < 2 && styles.confirmCoupleBtnDisabled
              ]}
              onPress={handleConfirmCouple}
              disabled={tempSelectedIds.length < 2}
            >
              <Text style={styles.confirmCoupleBtnText}>
                💖 Áp Dụng Ghép Đôi ({tempSelectedIds.length}/2)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#12101E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2D2845',
    padding: 20,
    shadowColor: '#F5BA5B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  headerIcon: {
    fontSize: 16,
    color: '#F5BA5B',
    marginRight: 6
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  closeBtn: {
    padding: 6
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'bold'
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#181528',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  modeTabActive: {
    backgroundColor: '#262040'
  },
  modeTabActiveCouple: {
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    borderWidth: 1,
    borderColor: '#F472B6'
  },
  modeTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  modeTabTextActive: {
    color: '#F5BA5B',
    fontWeight: '700'
  },
  modeTabTextActiveCouple: {
    color: '#F472B6',
    fontWeight: '700'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 17
  },
  noticeBanner: {
    backgroundColor: 'rgba(245, 186, 91, 0.15)',
    borderWidth: 1,
    borderColor: '#F5BA5B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  noticeText: {
    color: '#F5BA5B',
    fontSize: 12,
    fontWeight: '600'
  },
  scrollArea: {
    maxHeight: 380
  },
  listContainer: {
    gap: 10,
    marginBottom: 14
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181528',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A243F',
    padding: 10
  },
  profileCardSelected: {
    borderColor: '#F5BA5B',
    backgroundColor: '#201B35'
  },
  profileCardCoupleSelected: {
    borderColor: '#F472B6',
    backgroundColor: 'rgba(244, 114, 182, 0.1)'
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#282342',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarCircleSelected: {
    backgroundColor: 'rgba(245, 186, 91, 0.25)',
    borderWidth: 1,
    borderColor: '#F5BA5B'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700'
  },
  activeBadge: {
    backgroundColor: '#F5BA5B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  activeBadgeCouple: {
    backgroundColor: '#F472B6'
  },
  activeBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700'
  },
  profileDetails: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  deleteBtn: {
    padding: 6
  },
  deleteIcon: {
    fontSize: 14,
    opacity: 0.6
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center'
  },
  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1B32',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#373258',
    borderStyle: 'dashed'
  },
  addTriggerIcon: {
    fontSize: 13,
    color: '#F5BA5B',
    marginRight: 6
  },
  addTriggerText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600'
  },
  formContainer: {
    backgroundColor: '#171426',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2F294D'
  },
  formTitle: {
    color: '#F5BA5B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },
  label: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6
  },
  input: {
    backgroundColor: '#0F0D1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2B2642',
    color: '#F8FAFC',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#0F0D1A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B2642'
  },
  genderBtnActive: {
    borderColor: '#F5BA5B',
    backgroundColor: 'rgba(245, 186, 91, 0.15)'
  },
  genderBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  genderBtnTextActive: {
    color: '#F5BA5B',
    fontWeight: '700'
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#231E38'
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  submitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5BA5B'
  },
  submitBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700'
  },
  formError: {
    color: '#EF4444',
    fontSize: 11,
    marginBottom: 6
  },
  confirmCoupleBtn: {
    marginTop: 12,
    backgroundColor: '#F472B6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  confirmCoupleBtnDisabled: {
    opacity: 0.5
  },
  confirmCoupleBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700'
  }
});
