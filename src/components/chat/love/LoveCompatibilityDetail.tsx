import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PersonTuViBaziChart } from '../../../services/tuViBaziService';
import type { LoveReadingProfile, LoveReadingViewModel } from './loveReadingModel';

const BACKGROUND = require('../../../../assets/giao_dien/giaodien1/chat_detail/love/background/evident.png');

type AccordionData = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  rows: Array<{ label: string; value: string }>;
  analysis: string;
  advice: string;
  warning?: boolean;
};

type PersonEntry = {
  profile: LoveReadingProfile;
  chart?: PersonTuViBaziChart;
};

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có ngày sinh';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
};

const makePersonSection = (entry: PersonEntry, index: number): AccordionData => {
  const { profile, chart } = entry;
  const gender = profile.gender;
  const title = gender === 'male' ? 'Hồ sơ bạn nam' : gender === 'female' ? 'Hồ sơ bạn nữ' : `Hồ sơ ${index + 1}`;

  return {
    id: `person-${index}`,
    title,
    subtitle: profile.fullName,
    icon: gender === 'male' ? '♂' : gender === 'female' ? '♀' : '✦',
    rows: [
      { label: 'Ngày sinh', value: formatDate(chart?.birthDate || profile.birthDate) },
      { label: 'Giới tính', value: gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Chưa cập nhật' },
      ...(chart ? [
        { label: 'Tứ trụ năm', value: `${chart.yearPillar.ganVi} ${chart.yearPillar.zhiVi}` },
        { label: 'Tứ trụ tháng', value: `${chart.monthPillar.ganVi} ${chart.monthPillar.zhiVi}` },
        { label: 'Tứ trụ ngày', value: `${chart.dayPillar.ganVi} ${chart.dayPillar.zhiVi}` },
        { label: 'Nhật chủ', value: `${chart.dayMaster} · ${chart.dayMasterElement}` },
        { label: 'Cung Phu Thê', value: `${chart.spousalPalace} · ${chart.spousalPalaceElement}` },
        { label: 'Quái mệnh', value: `${chart.cungPhi} · ${chart.cungPhiElement}` },
        { label: 'Nạp Âm', value: chart.napAmYear },
      ] : []),
    ],
    analysis: chart
      ? `${profile.fullName} có Nhật Chủ ${chart.dayMaster} thuộc hành ${chart.dayMasterElement}; dữ liệu này được dùng để đối chiếu với hồ sơ còn lại.`
      : 'Hồ sơ chưa có đủ ngày sinh để dựng lá số Tử Vi và Bát Tự.',
    advice: chart
      ? 'Các thông tin này là nền tảng tham khảo cho phần luận giải tương hợp bên dưới.'
      : 'Hãy bổ sung ngày sinh trong hồ sơ để xem đầy đủ các chỉ số cá nhân.',
  };
};

function buildAccordionData(model: LoveReadingViewModel): AccordionData[] {
  const synastry = model.tuViBazi;
  const entries: PersonEntry[] = [
    { profile: model.profileA, chart: synastry?.personA },
    { profile: model.profileB, chart: synastry?.personB },
  ];
  const genderA = entries[0].profile.gender;
  const genderB = entries[1].profile.gender;
  if (genderA && genderB && genderA !== genderB && genderA === 'female') entries.reverse();

  const fallbackAnalysis = model.summary || 'Chưa có dữ liệu phân tích chi tiết cho mục này.';
  const fallbackAdvice = model.advice || 'Hãy cùng trò chuyện cởi mở và tôn trọng sự khác biệt của nhau.';
  const pA = synastry?.personA;
  const pB = synastry?.personB;

  const sections: AccordionData[] = [
    makePersonSection(entries[0], 0),
    makePersonSection(entries[1], 1),
  ];

  sections.push(
    {
      id: 'phu-the',
      title: 'Cung Phu Thê',
      subtitle: synastry?.spousalInteraction.labelVi || 'Đối chiếu cung hôn phối',
      icon: '💍',
      rows: synastry && pA && pB ? [
        { label: model.profileA.fullName, value: `${pA.spousalPalace} · ${pA.spousalPalaceElement}` },
        { label: model.profileB.fullName, value: `${pB.spousalPalace} · ${pB.spousalPalaceElement}` },
        { label: 'Tương tác', value: synastry.spousalInteraction.labelVi },
      ] : [],
      analysis: synastry?.spousalInteraction.description || fallbackAnalysis,
      advice: synastry?.spousalInteraction.type === 'chong'
        ? 'Khi cảm xúc dâng cao, hãy tạm dừng tranh luận, lắng nghe nhau và tôn trọng không gian riêng.'
        : synastry?.spousalInteraction.type === 'hai'
          ? 'Chia sẻ thẳng thắn tâm tư để tránh hiểu lầm tích tụ.'
          : 'Duy trì sự sẻ chia và vun đắp tình cảm bằng những quan tâm nhỏ mỗi ngày.',
      warning: synastry?.spousalInteraction.type === 'chong' || synastry?.spousalInteraction.type === 'hai',
    },
    {
      id: 'thien-can',
      title: 'Thiên Can Nhật Chủ',
      subtitle: synastry?.stemInteraction.labelVi || 'Tính cách và cách thể hiện',
      icon: '⚡',
      rows: synastry && pA && pB ? [
        { label: model.profileA.fullName, value: `${pA.dayMaster} · ${pA.dayMasterElement}` },
        { label: model.profileB.fullName, value: `${pB.dayMaster} · ${pB.dayMasterElement}` },
        { label: 'Tương tác', value: synastry.stemInteraction.labelVi },
      ] : [],
      analysis: synastry?.stemInteraction.description || fallbackAnalysis,
      advice: 'Tôn trọng mục tiêu và lý tưởng sống của nhau để trở thành điểm tựa vững chắc.',
      warning: synastry?.stemInteraction.type === 'chong',
    },
    {
      id: 'ngu-hanh',
      title: 'Ngũ Hành Nhật Chủ',
      subtitle: synastry?.elementHarmony.relationship === 'sinh'
        ? 'Tương sinh'
        : synastry?.elementHarmony.relationship === 'khac'
          ? 'Tương khắc'
          : 'Đồng hành',
      icon: '🔥',
      rows: synastry && pA && pB ? [
        { label: model.profileA.fullName, value: pA.dayMasterElement },
        { label: model.profileB.fullName, value: pB.dayMasterElement },
        { label: 'Dòng năng lượng', value: `${pA.dayMasterElement} × ${pB.dayMasterElement}` },
      ] : [],
      analysis: synastry?.elementHarmony.description || fallbackAnalysis,
      advice: synastry?.elementHarmony.relationship === 'khac'
        ? 'Khi khác biệt xuất hiện, hãy tìm cách cân bằng nhu cầu thay vì cố thay đổi đối phương.'
        : 'Tiếp tục động viên và lan tỏa năng lượng tích cực cho nhau.',
      warning: synastry?.elementHarmony.relationship === 'khac',
    },
    {
      id: 'bat-trach',
      title: 'Bát Trạch Quái Mệnh',
      subtitle: synastry?.cungPhiBatTrach?.labelVi || 'Phối quái',
      icon: '🏛️',
      rows: synastry && pA && pB ? [
        { label: model.profileA.fullName, value: `${pA.cungPhi} · ${pA.cungPhiElement} · ${pA.cungPhiGroup}` },
        { label: model.profileB.fullName, value: `${pB.cungPhi} · ${pB.cungPhiElement} · ${pB.cungPhiGroup}` },
        { label: 'Phối quái', value: synastry.cungPhiBatTrach.labelVi },
      ] : [],
      analysis: synastry?.cungPhiBatTrach?.description || fallbackAnalysis,
      advice: synastry?.cungPhiBatTrach?.isAuspicious
        ? 'Cùng duy trì nếp sống hài hòa và bàn bạc trước những quyết định quan trọng.'
        : 'Ưu tiên giao tiếp rõ ràng, cùng thống nhất cách sắp xếp không gian sống phù hợp với cả hai.',
      warning: synastry ? !synastry.cungPhiBatTrach.isAuspicious : false,
    },
    {
      id: 'nap-am',
      title: 'Bản Mệnh Nạp Âm',
      subtitle: synastry?.napAmHarmony?.labelVi || 'Ngũ hành nạp âm',
      icon: '🌊',
      rows: synastry && pA && pB ? [
        { label: model.profileA.fullName, value: pA.napAmYear },
        { label: model.profileB.fullName, value: pB.napAmYear },
        { label: 'Ngũ hành', value: `${pA.napAmElement} × ${pB.napAmElement}` },
      ] : [],
      analysis: synastry?.napAmHarmony?.description || fallbackAnalysis,
      advice: synastry?.napAmHarmony?.relationship === 'khac'
        ? 'Tìm điểm chung trong nhịp sống và cách ra quyết định để điều hòa khác biệt.'
        : 'Cùng nuôi dưỡng sự tin cậy và khích lệ nhau trong công việc, cuộc sống.',
      warning: synastry?.napAmHarmony?.relationship === 'khac',
    },
    {
      id: 'dia-chi',
      title: 'Địa Chi Con Giáp',
      subtitle: synastry?.yearAnimalHarmony?.labelVi || 'Tương tác tuổi',
      icon: '🐉',
      rows: synastry && pA && pB ? [
        { label: model.profileA.fullName, value: `${pA.yearPillar.ganVi} ${pA.yearPillar.zhiVi}` },
        { label: model.profileB.fullName, value: `${pB.yearPillar.ganVi} ${pB.yearPillar.zhiVi}` },
        { label: 'Tương tác', value: synastry.yearAnimalHarmony.labelVi },
      ] : [],
      analysis: synastry?.yearAnimalHarmony?.description || fallbackAnalysis,
      advice: fallbackAdvice,
      warning: !!synastry?.yearAnimalHarmony?.labelVi.includes('Xung'),
    },
  );

  return sections;
}

function AccordionDetails({ section, model }: { section: AccordionData; model: LoveReadingViewModel }) {
  return (
    <View style={styles.accordionBody}>
      {section.rows.length > 0 ? (
        <View style={styles.dataTable}>
          {section.rows.map((row, index) => (
            <View key={`${section.id}-${index}`} style={[styles.dataRow, index > 0 && styles.dataRowDivider]}>
              <Text style={styles.dataLabel}>{row.label}</Text>
              <Text style={styles.dataValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.analysisBox}>
        <Text style={styles.sectionLabel}>✦ LUẬN GIẢI</Text>
        <Text style={styles.bodyText}>{section.analysis}</Text>
      </View>
      <View style={[styles.adviceBox, section.warning && styles.warningBox]}>
        <Text style={[styles.sectionLabel, section.warning && styles.warningText]}>
          {section.warning ? '✦ GỢI Ý CÂN BẰNG' : '✦ CÙNG VUN ĐẮP'}
        </Text>
        <Text style={styles.bodyText}>{section.advice || fallbackAdviceText(model)}</Text>
      </View>
    </View>
  );
}

export default function LoveCompatibilityDetail({ model, onClose, onContinue }: {
  model: LoveReadingViewModel;
  onClose: () => void;
  onContinue?: () => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set());
  const sections = useMemo(() => buildAccordionData(model), [model]);
  const profileSections = sections
    .filter((section) => section.id.startsWith('person-'))
    .sort((a, b) => Number(a.title === 'Hồ sơ bạn nam') - Number(b.title === 'Hồ sơ bạn nam'));
  const factorSections = sections.filter((section) => !section.id.startsWith('person-'));
  const expandedProfile = profileSections.find((section) => expandedItems.has(section.id));

  const toggleItem = (id: string) => {
    void Haptics.selectionAsync();
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.screen}>
      <Image
        source={BACKGROUND}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Quay lại kết quả tương hợp"
          >
            <Ionicons name="arrow-back" color="#FFF7E9" size={21} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>NUMELYRA · DUYÊN MỆNH</Text>
            <Text style={styles.headerTitle}>Nguyên nhân tương hợp</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCardShadow}>
            <LinearGradient
              colors={['rgba(111, 64, 173, 0.98)', 'rgba(77, 54, 136, 0.98)', 'rgba(44, 44, 98, 0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.introCard}
            >
              <Text style={styles.introScore}>
                {model.compatibilityScore !== undefined ? `${model.compatibilityScore}%` : 'DUYÊN'}
              </Text>
              <Text style={styles.introText}>
                Sáu yếu tố dưới đây giúp hai bạn hiểu rõ hơn về điểm hòa hợp và điều có thể cùng vun đắp.
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.profileRow}>
            {profileSections.map((section) => {
              const isMaleProfile = section.title === 'Hồ sơ bạn nam';
              const isFemaleProfile = section.title === 'Hồ sơ bạn nữ';
              const profileColors = isMaleProfile
                ? (['rgba(31, 95, 157, 0.9)', 'rgba(36, 53, 103, 0.88)'] as const)
                : isFemaleProfile
                  ? (['rgba(139, 59, 122, 0.9)', 'rgba(73, 47, 98, 0.9)'] as const)
                  : (['rgba(80, 59, 123, 0.9)', 'rgba(45, 48, 92, 0.88)'] as const);
              const profileAccent = isMaleProfile ? '#69C5FF' : isFemaleProfile ? '#F28ACB' : '#C7A4FF';
              return (
                <View key={section.id} style={[styles.profileShadow, { shadowColor: profileAccent }]}>
                  <LinearGradient
                    colors={profileColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.profileCard, { borderColor: `${profileAccent}88` }]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleItem(section.id)}
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: expandedItems.has(section.id) }}
                      accessibilityLabel={`${expandedItems.has(section.id) ? 'Thu gọn' : 'Mở'} ${section.title}`}
                      style={styles.profileHeader}
                    >
                      <LinearGradient
                        colors={isMaleProfile
                          ? ['rgba(105, 197, 255, 0.36)', 'rgba(74, 137, 221, 0.18)']
                          : isFemaleProfile
                            ? ['rgba(242, 138, 203, 0.38)', 'rgba(188, 91, 163, 0.18)']
                            : ['rgba(199, 164, 255, 0.32)', 'rgba(119, 132, 220, 0.16)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.profileIconBadge, { borderColor: `${profileAccent}88` }]}
                      >
                        <Text style={[styles.profileIconText, { color: profileAccent }]}>{section.icon}</Text>
                      </LinearGradient>
                      <View style={styles.profileHeading}>
                        <Text numberOfLines={1} style={styles.profileTitle}>{section.title}</Text>
                        <Text numberOfLines={1} style={styles.profileSubtitle}>{section.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              );
            })}
          </View>

          {expandedProfile ? (
            <View style={styles.profileDetailsCard}>
              <AccordionDetails section={expandedProfile} model={model} />
            </View>
          ) : null}

          {factorSections.map((section) => {
            const expanded = expandedItems.has(section.id);
            const isLiuHe = section.subtitle.toLowerCase().includes('lục hợp');
            const cardColors = isLiuHe
              ? (['rgba(139, 105, 50, 0.87)', 'rgba(54, 48, 68, 0.86)'] as const)
              : (['rgba(71, 53, 98, 0.84)', 'rgba(32, 48, 78, 0.84)'] as const);
            const tagStyle = isLiuHe
              ? styles.goldTag
              : section.id === 'thien-can'
                ? styles.purpleTag
                : section.id === 'ngu-hanh'
                  ? styles.tealTag
                  : section.id === 'bat-trach'
                    ? styles.blueTag
                    : section.id === 'dia-chi'
                      ? styles.goldTag
                      : styles.neutralTag;
            const cardBorderColor = isLiuHe ? 'rgba(255, 220, 139, 0.58)' : 'rgba(220, 210, 255, 0.52)';
            const cardShadowColor = isLiuHe ? '#F5B84E' : '#A26DCC';
            return (
              <View key={section.id} style={[styles.accordionShadow, { shadowColor: cardShadowColor }]}>
                <LinearGradient
                  colors={cardColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.accordionCard, { borderColor: cardBorderColor }]}
                >
                  <TouchableOpacity
                    onPress={() => toggleItem(section.id)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${expanded ? 'Thu gọn' : 'Mở'} ${section.title}`}
                    style={styles.accordionHeader}
                  >
                    <View style={styles.iconBadge}>
                      <Text style={styles.iconText}>{section.icon}</Text>
                    </View>
                    <View style={styles.accordionHeading}>
                      <Text style={styles.accordionTitle}>{section.title}</Text>
                      <View style={[styles.subtitlePill, tagStyle]}>
                        <Text numberOfLines={1} style={[styles.accordionSubtitle, section.warning && styles.warningText]}>
                          {section.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#FFE7AD"
                    />
                  </TouchableOpacity>

                  {expanded ? (
                    <AccordionDetails section={section} model={model} />
                  ) : null}
                </LinearGradient>
              </View>
            );
          })}
          {onContinue ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={onContinue}
              accessibilityRole="button"
              accessibilityLabel="Tiếp tục trò chuyện về bài luận giải này"
              style={styles.continueButton}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF8E7" />
              <Text style={styles.continueButtonText}>Tiếp tục trò chuyện</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF8E7" />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const fallbackAdviceText = (model: LoveReadingViewModel) => (
  model.advice || 'Hãy trò chuyện cởi mở, lắng nghe và tôn trọng sự khác biệt của nhau.'
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10172E' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12, 20, 45, 0.2)' },
  safeArea: { flex: 1 },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(18, 29, 53, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 30, 54, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255, 231, 173, 0.34)',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  eyebrow: { color: '#FFE0A2', fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 1.2 },
  headerTitle: { color: '#FFF8EA', fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 2 },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 28, gap: 11 },
  introCardShadow: {
    borderRadius: 18,
    marginBottom: 3,
    shadowColor: '#9C65E8',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 15,
    elevation: 8,
  },
  introCard: {
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(210, 180, 255, 0.62)',
  },
  introScore: { color: '#FFF4D8', fontSize: 29, lineHeight: 34, fontWeight: '900' },
  introText: { color: '#E9F2FF', fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  profileRow: { flexDirection: 'row', gap: 9 },
  profileShadow: {
    flex: 1,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 10,
    elevation: 6,
  },
  profileCard: { minHeight: 76, justifyContent: 'center', borderRadius: 15, overflow: 'hidden', borderWidth: 1 },
  profileHeader: { minHeight: 76, paddingHorizontal: 9, paddingVertical: 9, flexDirection: 'row', alignItems: 'center' },
  profileIconBadge: { width: 39, height: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  profileIconText: { fontSize: 23, fontWeight: '800' },
  profileHeading: { flex: 1, minWidth: 0, marginLeft: 8 },
  profileTitle: { color: '#FFF9EC', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  profileSubtitle: { color: '#F1EAF8', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  profileDetailsCard: { borderRadius: 16, backgroundColor: 'rgba(36, 39, 72, 0.9)', borderWidth: 1, borderColor: 'rgba(220, 210, 255, 0.42)' },
  accordionShadow: {
    borderRadius: 16,
    shadowColor: '#B38BE8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  accordionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(224, 220, 255, 0.4)',
  },
  accordionHeader: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 43,
    height: 43,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(218, 233, 255, 0.34)',
    backgroundColor: 'rgba(180, 168, 222, 0.15)',
  },
  iconText: { color: '#FFF2D6', fontSize: 21, fontWeight: '800' },
  accordionHeading: { flex: 1, marginHorizontal: 11 },
  accordionTitle: { color: '#FFF9EC', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  accordionSubtitle: { color: '#F5F1FC', fontSize: 10.5, lineHeight: 14 },
  subtitlePill: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1 },
  neutralTag: { backgroundColor: 'rgba(222, 225, 238, 0.23)', borderColor: 'rgba(244, 243, 255, 0.45)' },
  purpleTag: { backgroundColor: 'rgba(186, 112, 219, 0.34)', borderColor: 'rgba(223, 164, 255, 0.54)' },
  tealTag: { backgroundColor: 'rgba(74, 168, 151, 0.34)', borderColor: 'rgba(134, 228, 200, 0.5)' },
  blueTag: { backgroundColor: 'rgba(73, 148, 215, 0.34)', borderColor: 'rgba(142, 201, 255, 0.52)' },
  goldTag: { backgroundColor: 'rgba(205, 154, 59, 0.38)', borderColor: 'rgba(255, 221, 135, 0.6)' },
  warningText: { color: '#FFB8B3' },
  accordionBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 9 },
  dataTable: {
    borderRadius: 11,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(12, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  dataRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 8 },
  dataRowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.09)' },
  dataLabel: { width: '38%', color: '#C5D8F2', fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  dataValue: { flex: 1, color: '#FFF5DF', fontSize: 12, lineHeight: 17, fontWeight: '800', textAlign: 'right' },
  analysisBox: {
    padding: 11,
    borderRadius: 11,
    backgroundColor: 'rgba(222, 236, 255, 0.1)',
  },
  adviceBox: {
    padding: 11,
    borderRadius: 11,
    backgroundColor: 'rgba(119, 213, 187, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(132, 226, 194, 0.24)',
  },
  warningBox: { backgroundColor: 'rgba(255, 135, 130, 0.11)', borderColor: 'rgba(255, 153, 148, 0.28)' },
  continueButton: {
    minHeight: 52, borderRadius: 26, paddingHorizontal: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#7440A5',
    borderWidth: 1, borderColor: 'rgba(255, 226, 160, 0.72)',
  },
  continueButtonText: { flex: 1, color: '#FFF8E7', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  sectionLabel: { color: '#FFE2A7', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.7, marginBottom: 5 },
  bodyText: { color: '#F4F6FA', fontSize: 12.5, lineHeight: 19 },
});
