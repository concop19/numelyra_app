/**
 * ProfilePickerModal.tsx - Modal quản lý & chọn Profile (1 người hoặc 2 người để ghép đôi tình duyên)
 * Kích hoạt khi bấm nút Kính Lúp (🔍) ở thanh chat hoặc khi gửi câu hỏi.
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  ScrollView, TextInput, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ThreeDButton from './ThreeDButton';
import {
  ProfileItem, loadAllProfiles, addProfile, deleteProfile,
  updateProfile, getZodiac, getZodiacEmoji, getNguHanh, getNguHanhEmoji,
  type ProfileGender,
} from '../store/userProfile';
import { extractBirthYear } from '../services/lunarService';
import { useLocalization } from '../i18n/LocalizationContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedProfiles: ProfileItem[];
  onProfilesSelected: (profiles: ProfileItem[]) => void;
  promptNotice?: string;
  allowCoupleMode?: boolean;
  managementMode?: 'full' | 'add-only' | 'none';
  onProfilesChanged?: () => void | Promise<void>;
  primaryProfileId?: string | null;
  title?: string;
  selectCreatedProfile?: boolean;
}

export default function ProfilePickerModal({
  visible,
  onClose,
  selectedProfiles,
  onProfilesSelected,
  promptNotice,
  allowCoupleMode = true,
  managementMode = 'full',
  onProfilesChanged,
  primaryProfileId,
  title,
  selectCreatedProfile = true,
}: Props) {
  const { t, l } = useLocalization();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [isCoupleMode, setIsCoupleMode] = useState<boolean>(selectedProfiles.length >= 2);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(
    selectedProfiles.map(p => p.id)
  );
  const selectedProfileIdsKey = selectedProfiles.map((profile) => profile.id).join('|');

  const [isAdding, setIsAdding] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGender, setNewGender] = useState<ProfileGender | null>(null);
  const [formError, setFormError] = useState('');

  const resetProfileForm = () => {
    setNewName('');
    setNewBirthDate('');
    setNewGender(null);
    setEditingProfileId(null);
    setFormError('');
  };

  const startAddingProfile = () => {
    resetProfileForm();
    setIsAdding(true);
  };

  const startEditingProfile = (item: ProfileItem, notice = '') => {
    setEditingProfileId(item.id);
    setNewName(item.fullName);
    setNewBirthDate(item.birthDate);
    setNewGender(item.gender || null);
    setFormError(notice);
    setIsAdding(true);
  };

  const fetchProfiles = async () => {
    const list = await loadAllProfiles();
    setProfiles(list);
  };

  useEffect(() => {
    if (visible) {
      fetchProfiles();
      setIsAdding(false);
      resetProfileForm();
      const forcedSingleMode = !allowCoupleMode;
      setIsCoupleMode(forcedSingleMode ? false : selectedProfiles.length >= 2);
      setTempSelectedIds((forcedSingleMode ? selectedProfiles.slice(0, 1) : selectedProfiles).map(p => p.id));
    }
  }, [visible, allowCoupleMode, selectedProfileIdsKey]);

  const handleSelectProfile = async (item: ProfileItem) => {
    void Haptics.selectionAsync();
    if (!item.gender) {
      startEditingProfile(item, l('Hồ sơ này chưa có giới tính. Vui lòng chọn Nam hoặc Nữ trước khi sử dụng.', 'This profile has no gender selected. Choose Female or Male before continuing.'));
      return;
    }
    if (!allowCoupleMode || !isCoupleMode) {
      // Chế độ 1 người: Chọn ngay và đóng modal
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
    if (!allowCoupleMode) {
      const chosen = profiles.filter(p => tempSelectedIds.includes(p.id));
      if (chosen.length > 0) {
        onProfilesSelected([chosen[0]]);
        onClose();
      }
      return;
    }

    const chosen = profiles.filter(p => tempSelectedIds.includes(p.id));
    if (chosen.length < 2) {
      Alert.alert(l('Thông báo', 'Notice'), l('Vui lòng chọn đủ 2 hồ sơ để xem mức độ tương hợp tình duyên!', 'Choose two profiles to view relationship compatibility.'));
      return;
    }
    const missingGenderProfile = chosen.find((profile) => !profile.gender);
    if (missingGenderProfile) {
      startEditingProfile(
        missingGenderProfile,
        l('Hồ sơ này chưa có giới tính. Vui lòng cập nhật trước khi ghép đôi.', 'This profile has no gender selected. Update it before compatibility matching.'),
      );
      return;
    }
    onProfilesSelected(chosen.slice(0, 2));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  const handleDelete = async (id: string, name: string) => {
    const doDelete = async () => {
      const updated = await deleteProfile(id);
      setProfiles(updated);
      await onProfilesChanged?.();
      setTempSelectedIds(prev => prev.filter(pId => pId !== id));
      if (updated.length > 0 && selectedProfiles.some(p => p.id === id)) {
        onProfilesSelected([updated[0]]);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(l(`Bạn có chắc muốn xóa hồ sơ "${name}" không?`, `Are you sure you want to delete the profile "${name}"?`))) {
        await doDelete();
      }
    } else {
      Alert.alert(
        l('Xác nhận xóa', 'Confirm deletion'),
        l(`Bạn có chắc muốn xóa hồ sơ "${name}" không?`, `Are you sure you want to delete the profile "${name}"?`),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: l('Xóa', 'Delete'), style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = newName.trim();
    const trimmedDate = newBirthDate.trim();

    if (!trimmedName) {
      setFormError(l('Vui lòng nhập Họ và tên.', 'Enter a full name.'));
      return;
    }

    let formattedDate = trimmedDate;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDate)) {
      const [d, m, y] = trimmedDate.split('/');
      formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
      setFormError(l('Ngày sinh cần đúng định dạng YYYY-MM-DD hoặc DD/MM/YYYY (ví dụ: 1998-10-20 hoặc 20/10/1998).', 'Birth date must use YYYY-MM-DD or DD/MM/YYYY format, for example 1998-10-20 or 20/10/1998.'));
      return;
    }

    if (!newGender) {
      setFormError(l('Vui lòng chọn giới tính Nam hoặc Nữ. Thông tin này ảnh hưởng trực tiếp đến kết quả luận giải.', 'Choose Female or Male. This information directly affects the reading.'));
      return;
    }

    try {
      if (editingProfileId) {
        const updated = await updateProfile(editingProfileId, {
          fullName: trimmedName,
          birthDate: formattedDate,
          gender: newGender,
        });
        setProfiles((current) => current.map((profile) => (
          profile.id === updated.id ? updated : profile
        )));
        if (selectedProfiles.some((profile) => profile.id === updated.id)) {
          onProfilesSelected(selectedProfiles.map((profile) => (
            profile.id === updated.id ? updated : profile
          )));
        }
        await onProfilesChanged?.();
        resetProfileForm();
        setIsAdding(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const created = await addProfile({
        fullName: trimmedName,
        birthDate: formattedDate,
        gender: newGender
      });
      await onProfilesChanged?.();
      resetProfileForm();
      setIsAdding(false);
      await fetchProfiles();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!selectCreatedProfile) {
        return;
      }
      if (allowCoupleMode && isCoupleMode) {
        setTempSelectedIds(prev => [...prev.slice(0, 1), created.id]);
      } else {
        onProfilesSelected([created]);
        onClose();
      }
    } catch {
      setFormError(l('Không thể tạo hồ sơ. Vui lòng thử lại.', 'Unable to create the profile. Please try again.'));
    }
  };

  const selectedCoupleNames = tempSelectedIds
    .map((id) => profiles.find((profile) => profile.id === id)?.fullName)
    .filter((name): name is string => Boolean(name));
  const coupleNamingNotice = selectedCoupleNames.length === 2
    ? l(
        `Không cần xác định ai là “bạn”. AI sẽ gọi thẳng ${selectedCoupleNames[0]} và ${selectedCoupleNames[1]} trong toàn bộ luận giải.`,
        `You do not need to identify who is “you.” AI will address ${selectedCoupleNames[0]} and ${selectedCoupleNames[1]} by name throughout the reading.`,
      )
    : l(
        'Chọn 2 hồ sơ. Không cần xác định ai là “bạn”; AI sẽ gọi từng người bằng đúng tên hồ sơ.',
        'Choose two profiles. You do not need to identify who is “you”; AI will address each person by profile name.',
      );

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
              <Ionicons name="sparkles" size={16} color="#F5BA5B" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>{title || l('Chọn Hồ Sơ Luận Giải', 'Choose a Reading Profile')}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Mode Switch: 1 người vs 2 người */}
          {allowCoupleMode && (
            <View style={styles.modeTabs}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.modeTab, !isCoupleMode && styles.modeTabActive]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsCoupleMode(false);
                  if (tempSelectedIds.length > 1) {
                    setTempSelectedIds([tempSelectedIds[0]]);
                  }
                }}
              >
                <View style={styles.modeTabLabel}><Ionicons name="person-outline" size={15} color={!isCoupleMode ? '#F5BA5B' : '#94A3B8'} /><Text style={[styles.modeTabText, !isCoupleMode && styles.modeTabTextActive]}>{l('Cá Nhân (1 Người)', 'Individual (1 person)')}</Text></View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.modeTab, isCoupleMode && styles.modeTabActiveCouple]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsCoupleMode(true);
                  if (profiles.length >= 2 && tempSelectedIds.length < 2) {
                    setTempSelectedIds([profiles[0].id, profiles[1].id]);
                  }
                }}
              >
                <View style={styles.modeTabLabel}><Ionicons name="heart-outline" size={15} color={isCoupleMode ? '#F472B6' : '#94A3B8'} /><Text style={[styles.modeTabText, isCoupleMode && styles.modeTabTextActiveCouple]}>{l('Tình Duyên (2 Người)', 'Compatibility (2 people)')}</Text></View>
              </TouchableOpacity>
            </View>
          )}

          {/* Subtitle / Notice */}
          {promptNotice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{promptNotice}</Text>
            </View>
          ) : (
            <Text style={styles.headerSubtitle}>
              {isCoupleMode
                ? coupleNamingNotice
                : l('Chọn 1 hồ sơ để Tiểu Linh Miêu giải mã vận mệnh, công danh và năng lượng cá nhân.', 'Choose one profile for a personal destiny, career and energy reading.')}
            </Text>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* List of profiles */}
            <View style={styles.listContainer}>
              {profiles.map((p) => {
                const isSelected = tempSelectedIds.includes(p.id);
                const order = tempSelectedIds.indexOf(p.id) + 1;
                const birthYear = extractBirthYear(p.birthDate, 2000);
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
                                {isCoupleMode ? `${l('Hồ sơ', 'Profile')} ${order}` : l('Đang chọn', 'Selected')}
                              </Text>
                            </View>
                          )}
                          {p.id === primaryProfileId && (
                            <View style={styles.primaryProfileBadge}>
                              <Text style={styles.primaryProfileBadgeText}>{l('Hồ sơ chính', 'Primary')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.profileDetails, !p.gender && styles.profileDetailsWarning]}>
                          📅 {p.birthDate} · {nguHanhEmoji} {nguHanh} · {zodiac} · {' '}
                          {p.gender === 'male' ? l('👨 Nam', '👨 Male') : p.gender === 'female' ? l('👩 Nữ', '👩 Female') : l('⚠️ Chưa chọn giới tính', '⚠️ Gender not selected')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.profileRight}>
                      {managementMode === 'full' && <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`${l('Chỉnh sửa hồ sơ', 'Edit profile')} ${p.fullName}`}
                        activeOpacity={0.7}
                        style={styles.editBtn}
                        onPress={(event) => {
                          event.stopPropagation();
                          void Haptics.selectionAsync();
                          startEditingProfile(p);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={16} color="#93C5FD" />
                      </TouchableOpacity>}
                      {managementMode === 'full' && profiles.length > 1 && p.id !== primaryProfileId && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.deleteBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id, p.fullName);
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FCA5A5" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {profiles.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{l('Chưa có hồ sơ nào. Hãy thêm hồ sơ để bắt đầu!', 'No profiles yet. Add one to get started.')}</Text>
                </View>
              )}
            </View>

            {/* Add Profile Section */}
            {managementMode !== 'none' && (isAdding ? (
              <View style={styles.formContainer}>
                <View style={styles.formTitleRow}>
                  <Ionicons
                    name={editingProfileId ? 'create-outline' : 'add-circle-outline'}
                    size={17}
                    color="#F5BA5B"
                  />
                  <Text style={styles.formTitle}>
                    {editingProfileId ? l('Chỉnh Sửa Hồ Sơ', 'Edit Profile') : l('Thêm Hồ Sơ Mới', 'Add New Profile')}
                  </Text>
                </View>
                
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <Text style={styles.label}>{l('Họ và tên', 'Full name')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={l('Ví dụ: Nguyễn Văn An', 'For example: Alex Morgan')}
                  placeholderTextColor="#64748B"
                  value={newName}
                  onChangeText={setNewName}
                />

                <Text style={styles.label}>{l('Ngày sinh (Dương lịch)', 'Birth date (Gregorian)')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={l('Ví dụ: 1998-10-20 hoặc 20/10/1998', 'For example: 1998-10-20 or 20/10/1998')}
                  placeholderTextColor="#64748B"
                  value={newBirthDate}
                  onChangeText={setNewBirthDate}
                />

                <Text style={styles.label}>{l('Giới tính', 'Gender')}</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.genderBtn, newGender === 'female' && styles.genderBtnActive]}
                    onPress={() => { void Haptics.selectionAsync(); setNewGender('female'); }}
                  >
                    <Text style={[styles.genderBtnText, newGender === 'female' && styles.genderBtnTextActive]}>
                      {l('👩 Nữ', '👩 Female')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.genderBtn, newGender === 'male' && styles.genderBtnActive]}
                    onPress={() => { void Haptics.selectionAsync(); setNewGender('male'); }}
                  >
                    <Text style={[styles.genderBtnText, newGender === 'male' && styles.genderBtnTextActive]}>
                      {l('👨 Nam', '👨 Male')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formActions}>
                  <ThreeDButton
                    label={t('common.cancel')}
                    onPress={() => {
                      setIsAdding(false);
                      resetProfileForm();
                    }}
                    size="sm"
                    variant="light"
                  />
                  <ThreeDButton
                    label={editingProfileId ? l('Cập Nhật', 'Update') : l('Lưu Hồ Sơ', 'Save Profile')}
                    onPress={handleSaveProfile}
                    size="sm"
                    variant="gold"
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  startAddingProfile();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={16} color="#F5BA5B" style={styles.addTriggerIcon} />
                <Text style={styles.addTriggerText}>{l('Thêm hồ sơ người thân / bạn bè', 'Add a family or friend profile')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Confirm Button for Couple Mode */}
          {isCoupleMode && (
            <ThreeDButton
              disabled={tempSelectedIds.length < 2}
              fullWidth
              label={`💖 ${l('Áp Dụng Ghép Đôi', 'Apply Compatibility')} (${tempSelectedIds.length}/2)`}
              onPress={handleConfirmCouple}
              style={styles.confirmCoupleBtn3d}
              variant="brand"
            />
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
  modeTabLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
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
  primaryProfileBadge: {
    backgroundColor: 'rgba(147, 197, 253, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.52)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  primaryProfileBadgeText: {
    color: '#BFDBFE',
    fontSize: 9,
    fontWeight: '800',
  },
  profileDetails: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2
  },
  profileDetailsWarning: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  editBtn: {
    padding: 6,
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
  formTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  formTitle: {
    color: '#F5BA5B',
    fontSize: 14,
    fontWeight: '700',
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
  formError: {
    color: '#EF4444',
    fontSize: 11,
    marginBottom: 6
  },
  confirmCoupleBtn3d: { marginTop: 12 }
});
