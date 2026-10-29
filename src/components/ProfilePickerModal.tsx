/**
 * ProfilePickerModal.tsx - Modal quản lý & chọn Profile (1 người hoặc 2 người để ghép đôi tình duyên)
 * Kích hoạt khi bấm nút Kính Lúp (🔍) ở thanh chat hoặc khi gửi câu hỏi.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, StyleSheet, View, Text, Modal, TouchableOpacity,
  ScrollView, TextInput, Alert, PanResponder, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ThreeDButton from './ThreeDButton';
import {
  ProfileItem, loadAllProfiles, addProfile, deleteProfile,
  updateProfile, getZodiac, getZodiacEmoji, getNguHanh, getNguHanhEmoji,
  type ProfileGender, type ResolvedBirthLocation,
} from '../store/userProfile';
import { extractBirthYear } from '../services/lunarService';
import { useLocalization } from '../i18n/LocalizationContext';
import { useBirthPlaceSuggestions } from '../features/astrology/useBirthPlaceSuggestions';
import {
  resolveBirthLocation,
  resolveBirthPlaceSuggestion,
  type BirthPlaceSuggestion,
} from '../services/astro/birthLocation';
import {
  birthDateInputToIso,
  birthDateToInputValue,
  formatBirthDateInput,
  formatBirthTimeInput,
} from '../utils/birthInputFormatting';

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
  const { t, l, locale } = useLocalization();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [isCoupleMode, setIsCoupleMode] = useState<boolean>(selectedProfiles.length >= 2);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(
    selectedProfiles.map(p => p.id)
  );
  const selectedProfileIdsKey = selectedProfiles.map((profile) => profile.id).join('|');

  const [isAdding, setIsAdding] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [revealedProfileId, setRevealedProfileId] = useState<string | null>(null);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newBirthTime, setNewBirthTime] = useState('');
  const [newBirthPlace, setNewBirthPlace] = useState('');
  const [newBirthLocation, setNewBirthLocation] = useState<ResolvedBirthLocation | undefined>();
  const [selectedPlaceSuggestion, setSelectedPlaceSuggestion] = useState<BirthPlaceSuggestion | null>(null);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [newGender, setNewGender] = useState<ProfileGender | null>(null);
  const [formError, setFormError] = useState('');
  const {
    suggestions: placeSuggestions,
    searching: searchingPlace,
    searchError: placeSearchError,
  } = useBirthPlaceSuggestions({
    query: newBirthPlace,
    existingLabel: newBirthLocation?.userLabel,
    selectedLabel: selectedPlaceSuggestion?.userLabel,
    enabled: visible && isAdding,
    locale,
  });

  const resetProfileForm = () => {
    setNewName('');
    setNewBirthDate('');
    setNewBirthTime('');
    setNewBirthPlace('');
    setNewBirthLocation(undefined);
    setSelectedPlaceSuggestion(null);
    setResolvingPlace(false);
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
    setNewBirthDate(birthDateToInputValue(item.birthDate));
    setNewBirthTime(item.birthTime || '');
    setNewBirthPlace(item.birthPlace || '');
    setNewBirthLocation(item.birthLocation);
    setSelectedPlaceSuggestion(null);
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
      setRevealedProfileId(null);
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
      try {
        const updated = await deleteProfile(id);
        setProfiles(updated);
        await onProfilesChanged?.();
        setTempSelectedIds(prev => prev.filter(pId => pId !== id));
        if (updated.length > 0 && selectedProfiles.some(p => p.id === id)) {
          onProfilesSelected([updated[0]]);
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert(
          l('Không thể xóa hồ sơ', 'Unable to delete profile'),
          l('Hồ sơ vẫn được giữ nguyên. Vui lòng kiểm tra kết nối và thử lại.', 'The profile was kept. Check your connection and try again.'),
        );
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

  const selectBirthPlace = (suggestion: BirthPlaceSuggestion) => {
    setSelectedPlaceSuggestion(suggestion);
    setNewBirthPlace(suggestion.userLabel);
    setNewBirthLocation(resolveBirthPlaceSuggestion(suggestion));
    setFormError('');
    void Haptics.selectionAsync();
  };

  const handleSaveProfile = async () => {
    const trimmedName = newName.trim();
    const trimmedDate = newBirthDate.trim();
    const trimmedTime = newBirthTime.trim();
    const trimmedPlace = newBirthPlace.trim();

    if (!trimmedName) {
      setFormError(l('Vui lòng nhập Họ và tên.', 'Enter a full name.'));
      return;
    }

    const formattedDate = birthDateInputToIso(trimmedDate);
    if (!formattedDate) {
      setFormError(l('Ngày sinh không hợp lệ. Hãy nhập đủ DD/MM/YYYY, ví dụ 20/10/1998.', 'Enter a valid birth date in DD/MM/YYYY format, for example 20/10/1998.'));
      return;
    }

    const birthDate = new Date(`${formattedDate}T00:00:00`);
    if (birthDate.getFullYear() < 1920 || birthDate > new Date()) {
      setFormError(l('Ngày sinh phải từ năm 1920 đến hôm nay.', 'Birth date must be between 1920 and today.'));
      return;
    }

    if (trimmedTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedTime)) {
      setFormError(l('Giờ sinh chưa hợp lệ. Hãy nhập 4 chữ số theo giờ 24h, ví dụ 0830.', 'Enter 4 digits in 24-hour time, for example 0830.'));
      return;
    }

    if (!newGender) {
      setFormError(l('Vui lòng chọn giới tính Nam hoặc Nữ. Thông tin này ảnh hưởng trực tiếp đến kết quả luận giải.', 'Choose Female or Male. This information directly affects the reading.'));
      return;
    }

    let resolvingBirthPlaceAtFailure = false;
    setResolvingPlace(true);
    try {
      let resolvedBirthLocation = trimmedPlace ? newBirthLocation : undefined;
      if (
        trimmedPlace
        && resolvedBirthLocation?.userLabel.trim().toLocaleLowerCase(locale) !== trimmedPlace.toLocaleLowerCase(locale)
        && Platform.OS !== 'web'
      ) {
        if (selectedPlaceSuggestion?.userLabel === trimmedPlace) {
          resolvedBirthLocation = resolveBirthPlaceSuggestion(selectedPlaceSuggestion);
        } else {
          resolvingBirthPlaceAtFailure = true;
          resolvedBirthLocation = await resolveBirthLocation(trimmedPlace);
          resolvingBirthPlaceAtFailure = false;
        }
      }

      const profileDetails = {
        birthTime: trimmedTime || undefined,
        birthPlace: trimmedPlace || undefined,
        birthLocation: resolvedBirthLocation,
        birthTimeAccuracy: trimmedTime ? 'exact' as const : 'unknown' as const,
      };

      if (editingProfileId) {
        const updated = await updateProfile(editingProfileId, {
          fullName: trimmedName,
          birthDate: formattedDate,
          gender: newGender,
          ...profileDetails,
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
        gender: newGender,
        ...profileDetails,
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
      setFormError(resolvingBirthPlaceAtFailure
        ? l('Chưa xác định được nơi sinh. Hãy chọn một địa điểm trong danh sách gợi ý hoặc để trống.', 'We could not identify the birth place. Choose a suggestion or leave it blank.')
        : l('Không thể lưu hồ sơ. Vui lòng thử lại.', 'Unable to save the profile. Please try again.'));
    } finally {
      setResolvingPlace(false);
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
                : managementMode === 'full'
                  ? l('Chạm bút để sửa. Vuốt hồ sơ phụ sang trái để hiện nút xóa.', 'Tap the pencil to edit. Swipe a secondary profile left to reveal delete.')
                  : t('mascot.profilePickerPrompt')}
            </Text>
          )}

          <ScrollView
            style={styles.scrollArea}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                const canDelete = managementMode === 'full'
                  && profiles.length > 1
                  && p.id !== primaryProfileId;

                return (
                  <SwipeRevealProfileRow
                    key={p.id}
                    deleteLabel={`${l('Xóa hồ sơ', 'Delete profile')} ${p.fullName}`}
                    deleteText={l('Xóa', 'Delete')}
                    enabled={canDelete}
                    onDelete={() => {
                      setRevealedProfileId(null);
                      handleDelete(p.id, p.fullName);
                    }}
                    onReveal={(revealed) => setRevealedProfileId(revealed ? p.id : null)}
                    revealed={revealedProfileId === p.id}
                  >
                    <TouchableOpacity
                      style={[
                        styles.profileCard,
                        isSelected && styles.profileCardSelected,
                        isSelected && isCoupleMode && styles.profileCardCoupleSelected
                      ]}
                      onPress={() => {
                        setRevealedProfileId(null);
                        void handleSelectProfile(p);
                      }}
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
                            setRevealedProfileId(null);
                            void Haptics.selectionAsync();
                            startEditingProfile(p);
                          }}
                        >
                          <Ionicons name="pencil-outline" size={16} color="#93C5FD" />
                        </TouchableOpacity>}
                        {canDelete && (
                          <Ionicons name="chevron-back" size={15} color="#776E8E" style={styles.swipeHintIcon} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </SwipeRevealProfileRow>
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
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#64748B"
                  value={newBirthDate}
                  onChangeText={(value) => setNewBirthDate((current) => (
                    formatBirthDateInput(value, current)
                  ))}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  maxLength={10}
                  selectionColor="#F5BA5B"
                  cursorColor="#F5BA5B"
                  underlineColorAndroid="transparent"
                />

                <Text style={styles.label}>{l('Giờ sinh (không bắt buộc)', 'Birth time (optional)')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={l('4 chữ số, ví dụ 0830', '4 digits, for example 0830')}
                  placeholderTextColor="#64748B"
                  value={newBirthTime}
                  onChangeText={(value) => setNewBirthTime((current) => (
                    formatBirthTimeInput(value, current)
                  ))}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  maxLength={5}
                  selectionColor="#F5BA5B"
                  cursorColor="#F5BA5B"
                  underlineColorAndroid="transparent"
                />

                <Text style={styles.label}>{l('Nơi sinh (không bắt buộc)', 'Birth place (optional)')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={l('Nhập thành phố, ví dụ: Hà Nội', 'Enter a city, for example London')}
                  placeholderTextColor="#64748B"
                  value={newBirthPlace}
                  onChangeText={(value) => {
                    setNewBirthPlace(value);
                    setNewBirthLocation(undefined);
                    setSelectedPlaceSuggestion(null);
                  }}
                  selectionColor="#F5BA5B"
                  cursorColor="#F5BA5B"
                  underlineColorAndroid="transparent"
                />
                {(searchingPlace || placeSuggestions.length > 0 || placeSearchError) && (
                  <View style={styles.placeSuggestionPanel}>
                    {searchingPlace && (
                      <View style={styles.placeSearchStatus}>
                        <ActivityIndicator size="small" color="#F5BA5B" />
                        <Text style={styles.placeSearchStatusText}>{l('Đang tìm địa điểm…', 'Searching places…')}</Text>
                      </View>
                    )}
                    {!searchingPlace && placeSuggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion.placeId}
                        activeOpacity={0.75}
                        style={styles.placeSuggestionRow}
                        onPress={() => selectBirthPlace(suggestion)}
                      >
                        <Ionicons name="location-outline" size={16} color="#F5BA5B" />
                        <View style={styles.placeSuggestionCopy}>
                          <Text style={styles.placeSuggestionPrimary}>{suggestion.primaryText}</Text>
                          {!!suggestion.secondaryText && (
                            <Text numberOfLines={1} style={styles.placeSuggestionSecondary}>
                              {suggestion.secondaryText}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                    {!searchingPlace && !!placeSearchError && (
                      <Text style={styles.placeSearchError}>{placeSearchError}</Text>
                    )}
                  </View>
                )}
                {!!newBirthLocation && (
                  <View style={styles.resolvedPlaceBadge}>
                    <Ionicons name="checkmark-circle" size={15} color="#86EFAC" />
                    <Text numberOfLines={2} style={styles.resolvedPlaceText}>
                      {l('Đã chọn', 'Selected')}: {newBirthLocation.userLabel} · {newBirthLocation.timeZoneIdentifier}
                    </Text>
                  </View>
                )}

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
                    loading={resolvingPlace}
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

const DELETE_REVEAL_WIDTH = 78;

function SwipeRevealProfileRow({
  children,
  deleteLabel,
  deleteText,
  enabled,
  onDelete,
  onReveal,
  revealed,
}: {
  children: React.ReactNode;
  deleteLabel: string;
  deleteText: string;
  enabled: boolean;
  onDelete: () => void;
  onReveal: (revealed: boolean) => void;
  revealed: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureStart = useRef(0);

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: enabled && revealed ? -DELETE_REVEAL_WIDTH : 0,
      damping: 22,
      stiffness: 240,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [enabled, revealed, translateX]);

  const settle = (shouldReveal: boolean) => {
    onReveal(shouldReveal);
    Animated.spring(translateX, {
      toValue: shouldReveal ? -DELETE_REVEAL_WIDTH : 0,
      damping: 22,
      stiffness: 240,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => (
      enabled
      && Math.abs(gesture.dx) > 8
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25
    ),
    onPanResponderGrant: () => {
      translateX.stopAnimation((value) => { gestureStart.current = value; });
    },
    onPanResponderMove: (_event, gesture) => {
      const next = Math.max(-DELETE_REVEAL_WIDTH, Math.min(0, gestureStart.current + gesture.dx));
      translateX.setValue(next);
    },
    onPanResponderRelease: (_event, gesture) => {
      const next = gestureStart.current + gesture.dx;
      settle(next < -DELETE_REVEAL_WIDTH * 0.42 || gesture.vx < -0.35);
    },
    onPanResponderTerminate: () => settle(revealed),
  }), [enabled, revealed, translateX]);

  return (
    <View style={styles.swipeRow}>
      {enabled && (
        <TouchableOpacity
          accessibilityLabel={deleteLabel}
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={() => {
            settle(false);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          style={styles.swipeDeleteAction}
        >
          <Ionicons name="trash-outline" size={21} color="#FFFFFF" />
          <Text style={styles.swipeDeleteText}>{deleteText}</Text>
        </TouchableOpacity>
      )}
      <Animated.View
        {...(enabled ? panResponder.panHandlers : {})}
        style={[styles.swipeProfileSurface, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </View>
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
  swipeRow: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#B52D4A',
  },
  swipeProfileSurface: {
    width: '100%',
    backgroundColor: '#181528',
  },
  swipeDeleteAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DELETE_REVEAL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#C73550',
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181528',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A243F',
    padding: 10,
    width: '100%',
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
  swipeHintIcon: { marginLeft: 1, opacity: 0.72 },
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
    minHeight: 38,
    backgroundColor: '#0F0D1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2B2642',
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  placeSuggestionPanel: {
    marginTop: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#3B345B',
    backgroundColor: '#100E1D',
    overflow: 'hidden',
  },
  placeSearchStatus: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  placeSearchStatusText: { color: '#A9A0BE', fontSize: 11, fontWeight: '600' },
  placeSuggestionRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#302A48',
  },
  placeSuggestionCopy: { flex: 1 },
  placeSuggestionPrimary: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  placeSuggestionSecondary: { color: '#8E86A5', fontSize: 10, marginTop: 2 },
  placeSearchError: { color: '#FCA5A5', fontSize: 10, lineHeight: 15, padding: 10 },
  resolvedPlaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.25)',
  },
  resolvedPlaceText: { flex: 1, color: '#BBF7D0', fontSize: 10, lineHeight: 14 },
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
