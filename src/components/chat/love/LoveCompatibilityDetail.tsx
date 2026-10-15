import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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

export default function LoveCompatibilityDetail({ model, onClose }: {
  model: LoveReadingViewModel;
  onClose: () => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set());
  const sections = useMemo(() => buildAccordionData(model), [model]);

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
          <View style={styles.introCard}>
            <Text style={styles.introScore}>
              {model.compatibilityScore !== undefined ? `${model.compatibilityScore}%` : 'DUYÊN'}
            </Text>
            <Text style={styles.introText}>
              Sáu yếu tố dưới đây giúp hai bạn hiểu rõ hơn về điểm hòa hợp và điều có thể cùng vun đắp.
            </Text>
          </View>

          {sections.map((section) => {
            const expanded = expandedItems.has(section.id);
            return (
              <View key={section.id} style={styles.accordionCard}>
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
                    <Text numberOfLines={1} style={[styles.accordionSubtitle, section.warning && styles.warningText]}>
                      {section.subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#FFE7AD"
                  />
                </TouchableOpacity>

                {expanded ? (
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
                ) : null}
              </View>
            );
          })}
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
  content: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 28, gap: 10 },
  introCard: {
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 3,
    backgroundColor: 'rgba(29, 48, 75, 0.83)',
    borderWidth: 1,
    borderColor: 'rgba(255, 222, 163, 0.36)',
  },
  introScore: { color: '#FFF4D8', fontSize: 29, lineHeight: 34, fontWeight: '900' },
  introText: { color: '#E9F2FF', fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  accordionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(34, 49, 70, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(224, 239, 255, 0.34)',
  },
  accordionHeader: { minHeight: 66, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 43,
    height: 43,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 219, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(218, 233, 255, 0.28)',
  },
  iconText: { color: '#FFF2D6', fontSize: 21, fontWeight: '800' },
  accordionHeading: { flex: 1, marginHorizontal: 11 },
  accordionTitle: { color: '#FFF9EC', fontSize: 14, lineHeight: 19, fontWeight: '900' },
  accordionSubtitle: { color: '#DFE9F7', fontSize: 11.5, lineHeight: 16, marginTop: 3 },
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
  sectionLabel: { color: '#FFE2A7', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.7, marginBottom: 5 },
  bodyText: { color: '#F4F6FA', fontSize: 12.5, lineHeight: 19 },
});
