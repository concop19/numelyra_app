/**
 * WallpaperStudioScreen.tsx - Lucky Wallpaper Generator (Xưởng Hình Nền May Mắn NUMELYRA)
 * 
 * Thiết kế giao diện cao cấp 100% khớp chuẩn mockup:
 * - Nền tím sâu huyền ảo (#211438), phong cảnh vector, trăng sao và các nút màu vàng pastel (#F7CC6A).
 * - Tách thành 3 màn hình chuyển động:
 *   1. Màn hình 1 - Nhập yêu cầu (Input):
 *      + Tiêu đề "Create your lucky wallpaper" & mô tả
 *      + Minh họa Trăng khuyết vàng + sao lấp lánh ở góc trên phải
 *      + Ô nhập liệu dạng capsule: icon tìm kiếm + gợi ý vibe ("Falling asleep...") + nút tròn vàng pastel mũi tên ➔
 *      + Minh họa phong cảnh vector lớn ở nửa dưới màn hình
 *   2. Màn hình 2 - Đang tạo (Creating / Loading):
 *      + Tiêu đề "Creating your lucky wallpaper..." & "Turning your words into a scene ✨"
 *      + 4 tấm hình nổi xếp chồng nhau (stacked/angled floating cards) với animation lơ lửng nhẹ nhàng 60fps
 *      + Thanh thông báo capsule bo tròn phía dưới: spinner + "Painting your scene..."
 *   3. Màn hình 3 - Kết quả (Result):
 *      + Tiêu đề "Here’s your lucky wallpaper ✨" & "Tap to see more versions or refine your request."
 *      + Carousel ngang hiển thị hình nền may mắn chính ở giữa, các phiên bản khác hé mở 2 bên (peeking cards)
 *      + Dải chấm pagination tinh tế
 *      + Bộ nút đôi: "Try another" (tím trong suốt) và "Save wallpaper" (vàng pastel)
 * 
 * Phong cách nghệ thuật & Ý niệm thu hút được chọn ngẫu nhiên (randomize) tự động theo tinh thần Thần số học.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  ImageSourcePropType,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { UserProfile } from '../store/userProfile';
import { NumerologyCalculator, reduceNumber } from '../services/numerology24Service';
import { API_ENDPOINTS, authenticatedFetch, resolveApiUrl } from '../services/apiConfig';
import { NumerologyCardsModal } from '../components/NumerologyCardsModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Carousel Dimensions for Screen 3
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.72);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.38);
const CARD_MARGIN = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

// ==========================================
// ASSETS TỪ THƯ MỤC WALLPAPER_ASSET
// ==========================================
const BG_LANDSCAPE = require('../../assets/giao_dien/giaodien1/wallpaper_asset/background/background.png');
const MOON_DECOR = require('../../assets/giao_dien/giaodien1/wallpaper_asset/decorate/moon.png');
const STAR_DECOR = require('../../assets/giao_dien/giaodien1/wallpaper_asset/decorate/star.png');
const THREE_STARS_DECOR = require('../../assets/giao_dien/giaodien1/wallpaper_asset/decorate/3stars.png');

const MOCK_IMG1 = require('../../assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img1.png');
const MOCK_IMG2 = require('../../assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img2.png');
const MOCK_IMG3 = require('../../assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img3.png');
const MOCK_IMG4 = require('../../assets/giao_dien/giaodien1/wallpaper_asset/mock_wrapper/img4.png');

interface Props {
  profile?: UserProfile | null;
}

type ScreenStep = 'input' | 'generating' | 'result';

interface WallpaperItem {
  id: string;
  source: ImageSourcePropType | { uri: string };
  isUri: boolean;
  title: string;
  affirmation_vi: string;
  explanation_vi: string;
  luckyColors_vi: string[];
  styleName: string;
  intentionName: string;
}

const STYLES = [
  { id: 'sacred_geometry', label: 'Hình học thiêng' },
  { id: 'luxury_gold_3d', label: '3D ánh hoàng kim' },
  { id: 'ethereal_minimalist', label: 'Thiền tĩnh huyền bí' },
  { id: 'cosmic_celestial', label: 'Vũ trụ cung hoàng đạo' },
  { id: 'watercolor_nature', label: 'Thiên nhiên mộng mơ' },
  { id: 'minimalist_clean', label: 'Tối giản thuần khiết' },
];

const INTENTIONS = [
  { id: 'wealth', label: 'Thịnh vượng & Tài lộc' },
  { id: 'love', label: 'Tình duyên & Bình yên' },
  { id: 'peace', label: 'An lạc & Chữa lành' },
  { id: 'career', label: 'Sự nghiệp thăng hoa' },
  { id: 'protection', label: 'Bảo hộ năng lượng' },
  { id: 'healing', label: 'Cân bằng thân tâm trí' },
];

function personalDayFor(calculator: NumerologyCalculator): number {
  const personalYear = Number(calculator.getPersonalYear().value) || 1;
  const today = new Date();
  const personalMonth = reduceNumber(personalYear + reduceNumber(today.getMonth() + 1, false), false);
  return reduceNumber(personalMonth + reduceNumber(today.getDate(), false), false);
}

function getRandomAffirmation(lifePath: number, intention: string): string {
  const quotes: Record<number, string[]> = {
    1: [
      'Tôi tự tin tiên phong mở lối, ánh sáng vũ trụ dẫn đường thành công.',
      'Sức mạnh ý chí khai mở những chân trời thịnh vượng mới.',
    ],
    2: [
      'Trực giác an tĩnh dẫn dắt tôi đến sự hài hòa và kết nối sâu sắc.',
      'Bình an trong tâm hồn là chìa khóa mở ra mọi tình yêu thương.',
    ],
    3: [
      'Nguồn cảm hứng vô tận tuôn trào, niềm vui lan tỏa muôn nơi.',
      'Mỗi ngày là một tuyệt tác được vẽ bằng sự lạc quan và may mắn.',
    ],
    4: [
      'Nền tảng vững chãi, kiên định tạo dựng tương lai bình an và giàu có.',
      'Từng bước đi chắc chắn đưa tôi tới đỉnh cao của sự viên mãn.',
    ],
    5: [
      'Tự do chuyển hóa, đón nhận muôn ngàn phước lành bất ngờ từ vũ trụ.',
      'Năng lượng tươi mới mở ra những cơ hội đột phá nhiệm màu.',
    ],
    6: [
      'Tình yêu thương vô điều kiện và vẻ đẹp nuôi dưỡng trọn vẹn tâm hồn.',
      'Không gian ấm áp, an lành chở che cho tôi và người thân yêu.',
    ],
    7: [
      'Minh triết nội tâm soi sáng mọi nẻo đường tôi bước qua.',
      'Sự tĩnh lặng giúp tôi kết nối với nguồn trí tuệ vô biên.',
    ],
    8: [
      'Thịnh vượng tài chính và quyền năng cá nhân thức tỉnh trọn vẹn.',
      'Tôi là thỏi nam châm thu hút sự giàu có và thành tựu vững bền.',
    ],
    9: [
      'Lòng trắc ẩn bao la mở ra chu kỳ mới ngập tràn ánh sáng và may mắn.',
      'Buông bỏ những điều cũ để đón nhận những điều kỳ diệu lớn lao hơn.',
    ],
  };

  const pool = quotes[lifePath] || quotes[8];
  const q = pool[Math.floor(Math.random() * pool.length)];
  return `${q} (Ý niệm: ${intention})`;
}

export default function WallpaperStudioScreen({ profile }: Props) {
  // State quản lý luồng màn hình: 'input' -> 'generating' -> 'result'
  const [step, setStep] = useState<ScreenStep>('input');
  const [prompt, setPrompt] = useState<string>('');

  // Lịch sử danh sách wallpaper (vị trí thứ 3 - index 2 - là vị trí chính giữa trên màn hình kết quả)
  const [history, setHistory] = useState<WallpaperItem[]>([
    {
      id: 'preset-1',
      source: MOCK_IMG1,
      isUri: false,
      title: 'Hồ Đêm & Dãy Núi Thiêng',
      affirmation_vi: 'Tôi vững vàng trước mọi thử thách, năng lượng dồi dào luôn bảo bọc.',
      explanation_vi: 'Dãy núi sâu thẳm soi bóng mặt nước đại diện cho ý chí kiên định và bình an sâu thẳm.',
      luckyColors_vi: ['Xanh đêm', 'Tím đậm', 'Vàng kim nhạt'],
      styleName: 'Vũ trụ cung hoàng đạo',
      intentionName: 'Bảo hộ năng lượng',
    },
    {
      id: 'preset-2',
      source: MOCK_IMG2,
      isUri: false,
      title: 'Cung Trăng Ánh Hồng',
      affirmation_vi: 'Trái tim rộng mở đón nhận yêu thương và phước lành ngập tràn.',
      explanation_vi: 'Mây hồng và vầng trăng khuyết là biểu tượng của tình cảm dịu dàng, hài hòa.',
      luckyColors_vi: ['Hồng pastel', 'Tím thạch anh', 'Vàng ánh dương'],
      styleName: 'Thiền tĩnh huyền bí',
      intentionName: 'Tình duyên & Bình yên',
    },
    {
      id: 'preset-center',
      source: MOCK_IMG3,
      isUri: false,
      title: 'Hồ Hoàng Hôn & Nai Thần',
      affirmation_vi: 'Vũ trụ ban tặng sự bình yên tuyệt đối và may mắn vĩnh cửu.',
      explanation_vi: 'Hình tượng vầng trăng khuyết và làn sương hoàng hôn hồ nước kích hoạt trực giác an định.',
      luckyColors_vi: ['Tím hoàng hôn', 'Vàng ánh trăng', 'Hồng dạ yến'],
      styleName: 'Thiên nhiên mộng mơ',
      intentionName: 'An lạc & Chữa lành',
    },
    {
      id: 'preset-4',
      source: MOCK_IMG4,
      isUri: false,
      title: 'Chuyến Tàu Đêm Hy Vọng',
      affirmation_vi: 'Hành trình mới khởi sinh tài lộc, đưa tôi đến đúng nơi đúng thời điểm.',
      explanation_vi: 'Ánh đèn ấm áp xuyên màn đêm mở lối cho những vận may bất ngờ.',
      luckyColors_vi: ['Vàng hổ phách', 'Tím huyền bí', 'Đen nhung'],
      styleName: '3D ánh hoàng kim',
      intentionName: 'Thịnh vượng & Tài lộc',
    },
    {
      id: 'preset-5',
      source: MOCK_IMG1,
      isUri: false,
      title: 'Hồ Đêm Huyền Bí',
      affirmation_vi: 'Nguồn cảm hứng vô tận tuôn trào, niềm vui lan tỏa muôn nơi.',
      explanation_vi: 'Không gian tĩnh mịch kích hoạt trực giác và mở lối cho vận may.',
      luckyColors_vi: ['Tím thạch anh', 'Vàng hoàng kim'],
      styleName: 'Hình học thiêng',
      intentionName: 'Thịnh vượng & Tài lộc',
    },
  ]);

  const [activeCarouselIndex, setActiveCarouselIndex] = useState(2);
  const [fullscreenItem, setFullscreenItem] = useState<WallpaperItem | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  // Animation values
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const twinkleAnim = useRef(new Animated.Value(0.4)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Tính toán Thần số học
  const numbers = useMemo(() => {
    const fullName = profile?.fullName || 'Numelyra Seeker';
    const birthDate = profile?.birthDate || '2000-01-01';
    const calculator = new NumerologyCalculator(fullName, birthDate);
    return {
      lifePathNumber: Number(calculator.getWalksOfLife().value) || 8,
      destinyNumber: Number(calculator.getMission().value) || 1,
      personalYear: Number(calculator.getPersonalYear().value) || 1,
      personalDay: personalDayFor(calculator),
    };
  }, [profile?.birthDate, profile?.fullName]);

  // Vòng lặp animation lơ lửng cho màn hình 2 (Generating)
  useEffect(() => {
    if (step === 'generating') {
      const loop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim1, {
            toValue: -8,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim1, {
            toValue: 6,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const loop2 = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim2, {
            toValue: 7,
            duration: 2100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim2, {
            toValue: -6,
            duration: 2100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const loopPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

      loop1.start();
      loop2.start();
      loopPulse.start();

      return () => {
        loop1.stop();
        loop2.stop();
        loopPulse.stop();
      };
    }
  }, [step]);

  // Vòng lặp sao lấp lánh (twinkle)
  useEffect(() => {
    const twinkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.35,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    twinkleLoop.start();
    return () => twinkleLoop.stop();
  }, []);

  // Khi chuyển sang màn hình Kết quả, đảm bảo FlatList cuộn ngay tới vị trí thứ 3 (index 2 - chính giữa)
  useEffect(() => {
    if (step === 'result') {
      setActiveCarouselIndex(2);
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: 2,
            animated: false,
          });
        } catch {
          flatListRef.current?.scrollToOffset({
            offset: SNAP_INTERVAL * 2,
            animated: false,
          });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2400),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  // ==========================================
  // HÀM TẠO HÌNH NỀN TỪ BACKEND AI NUMELYRA
  // ==========================================
  const handleGenerate = async () => {
    Keyboard.dismiss();
    const effectivePrompt = prompt.trim() || 'Falling asleep...';

    // 1. Chuyển sang màn hình 2: Đang tạo (Creating / Loading)
    setStep('generating');

    // 2. Randomize phong cách nghệ thuật & ý niệm thu hút
    const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
    const randomIntention = INTENTIONS[Math.floor(Math.random() * INTENTIONS.length)];

    // Thời gian chờ animation tối thiểu 2.5s
    const minWaitPromise = new Promise((resolve) => setTimeout(resolve, 2500));

    let newResult: WallpaperItem | null = null;
    let errorMessage: string | null = null;

    try {
      const endpoint = API_ENDPOINTS.LUCKY_WALLPAPER;
      console.log('[LuckyWallpaper] Calling backend:', endpoint);

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profile?.fullName || 'Numelyra Seeker',
          birthDate: profile?.birthDate || '2000-01-01',
          ...numbers,
          intentionId: randomIntention.id,
          styleId: randomStyle.id,
          deviceType: 'mobile',
          customWish: effectivePrompt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log('[LuckyWallpaper] Response status:', res.status, 'success:', data?.success, 'imageUrl:', data?.imageUrl);

      if (res.ok && data.success && data.imageUrl) {
        const fullImageUrl = resolveApiUrl(data.imageUrl);
        console.log('[LuckyWallpaper] Full Image URL:', fullImageUrl);

        newResult = {
          id: `ai-${Date.now()}`,
          source: { uri: fullImageUrl },
          isUri: true,
          title: effectivePrompt,
          affirmation_vi: data.affirmation_vi || getRandomAffirmation(numbers.lifePathNumber, randomIntention.label),
          explanation_vi: data.explanation_vi || `Hội tụ năng lượng số ${numbers.lifePathNumber} với phong cách ${randomStyle.label}.`,
          luckyColors_vi: Array.isArray(data.luckyColors_vi) && data.luckyColors_vi.length > 0
            ? data.luckyColors_vi
            : ['Vàng hoàng kim', 'Tím huyền bí'],
          styleName: data.style?.name_vi || randomStyle.label,
          intentionName: data.intention?.name_vi || randomIntention.label,
        };
      } else {
        errorMessage = data.error || `Máy chủ phản hồi mã ${res.status}`;
      }
    } catch (err) {
      console.error('[LuckyWallpaper] Request error:', err);
      errorMessage = err instanceof Error ? err.message : 'Không thể kết nối máy chủ';
    }

    await minWaitPromise;

    if (newResult) {
      // Đặt ảnh mới tạo từ Backend vào đúng VỊ TRÍ THỨ 3 (index 2 - chính giữa màn hình)
      setHistory((prev) => {
        const next = [...prev];
        if (next.length >= 3) {
          next[2] = newResult!; // Thay ảnh ở giữa (vị trí thứ 3) bằng ảnh backend
        } else {
          next.splice(2, 0, newResult!);
        }
        return next;
      });
      setActiveCarouselIndex(2);
      setStep('result');
      showToast('✨ Đã tạo xong hình nền may mắn từ AI!');
    } else {
      // Thông báo lỗi cụ thể cho người dùng, KHÔNG âm thầm thay bằng ảnh mock
      setStep('input');
      showToast(`⚠️ Không thể tạo hình nền: ${errorMessage || 'Vui lòng thử lại'}`);
    }
  };

  const handleShareOrSave = async (item: WallpaperItem) => {
    try {
      if (Platform.OS === 'web') {
        showToast('✨ Đang tải hình nền về máy...');
        return;
      }

      if (item.isUri && typeof item.source === 'object' && 'uri' in item.source) {
        await Share.share({
          message: `Hình nền may mắn số ${numbers.lifePathNumber} từ NUMELYRA - ${item.affirmation_vi}`,
          url: item.source.uri,
        });
      } else {
        await Share.share({
          message: `Hình nền may mắn "${item.title}" từ NUMELYRA ✨\n"${item.affirmation_vi}"`,
        });
      }
      showToast('✨ Đã lưu hình nền may mắn!');
    } catch {
      showToast('Đã đóng chia sẻ.');
    }
  };

  const handleScrollCarousel = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP_INTERVAL);
    if (index >= 0 && index < history.length && index !== activeCarouselIndex) {
      setActiveCarouselIndex(index);
    }
  };

  // Nút Back trên thanh Header
  const handleHeaderBack = () => {
    if (step === 'generating') {
      setStep('input');
    } else if (step === 'result') {
      setStep('input');
    } else {
      // Đang ở input, nếu có wallpaper đã tạo thì cho xem lại kết quả
      if (history.length > 0) {
        setStep('result');
      }
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Ảnh nền phong cảnh vector TOÀN MÀN HÌNH cho Màn hình 1 (không bị cắt cụt) */}
      {step === 'input' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image
            source={BG_LANDSCAPE}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ========================================================= */}
        {/* TOP HEADER: BACK ARROW & HAMBURGER MENU                  */}
        {/* ========================================================= */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleHeaderBack}
            style={styles.headerIconButton}
          >
            <Text style={styles.headerBackArrow}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowMenuModal(true)}
            style={styles.headerIconButton}
          >
            <View style={styles.hamburger}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* MÀN HÌNH 1: NHẬP YÊU CẦU (INPUT)                         */}
        {/* ========================================================= */}
        {step === 'input' && (
          <View style={styles.screenContainer}>
            {/* Phía trên: Tiêu đề & Cung trăng sao trang trí */}
            <View style={styles.inputTopSection}>
              <View style={styles.inputTitleWrapper}>
                <Text style={styles.inputMainTitle}>
                  Create your{'\n'}lucky wallpaper
                </Text>
                <Text style={styles.inputSubtitle}>
                  Describe your vibe, mood or what{'\n'}you need right now.
                </Text>
              </View>

              {/* Minh họa trăng khuyết và sao lấp lánh ở góc trên phải */}
              <View style={styles.moonDecorWrapper} pointerEvents="none">
                <Image
                  source={MOON_DECOR}
                  style={styles.moonImage}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={STAR_DECOR}
                  style={[
                    styles.moonStar1,
                    {
                      opacity: twinkleAnim,
                      transform: [
                        {
                          scale: twinkleAnim.interpolate({
                            inputRange: [0.35, 1],
                            outputRange: [0.75, 1.15],
                          }),
                        },
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={THREE_STARS_DECOR}
                  style={[
                    styles.moonStar2,
                    {
                      opacity: twinkleAnim,
                      transform: [
                        {
                          scale: twinkleAnim.interpolate({
                            inputRange: [0.35, 1],
                            outputRange: [1.1, 0.8],
                          }),
                        },
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Ô nhập liệu dạng capsule viền tím huyền ảo */}
            <View style={styles.inputBoxContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => textInputRef.current?.focus()}
                style={styles.searchPill}
              >
                {/* Search Icon */}
                <View style={styles.searchIcon} pointerEvents="none">
                  <View style={styles.searchCircle} />
                  <View style={styles.searchHandle} />
                </View>

                {/* Input Text */}
                <TextInput
                  ref={textInputRef}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Falling asleep..."
                  placeholderTextColor="#9F8EC0"
                  style={styles.textInputField}
                  returnKeyType="go"
                  onSubmitEditing={handleGenerate}
                  selectionColor="#F7CC6A"
                  cursorColor="#F7CC6A"
                  keyboardAppearance="dark"
                  autoCorrect={false}
                  editable={true}
                />

                {/* Nút tròn màu vàng pastel với mũi tên ➔ */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleGenerate}
                  style={styles.submitCircleButton}
                >
                  <Text style={styles.submitArrowText}>➔</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* ========================================================= */}
      {/* MÀN HÌNH 2: ĐANG TẠO (CREATING / LOADING)                 */}
      {/* ========================================================= */}
      {step === 'generating' && (
        <View style={styles.screenContainer}>
          {/* Tiêu đề loading */}
          <View style={styles.loadingTopSection}>
            <Text style={styles.loadingMainTitle}>
              Creating your{'\n'}lucky wallpaper...
            </Text>
            <Text style={styles.loadingSubtitle}>
              Turning your words into a scene ✨
            </Text>
          </View>

          {/* Khung 4 tấm hình nổi xếp chồng nhau với chuyển động bay bổng */}
          <View style={styles.stackedCardsArea}>
            {/* Tấm 1: Phía sau bên trái (-8 deg) */}
            <Animated.View
              style={[
                styles.stackedCardWrapper,
                styles.cardPos1,
                {
                  transform: [
                    { rotate: '-9deg' },
                    { translateY: floatAnim1 },
                  ],
                },
              ]}
            >
              <Image source={MOCK_IMG1} style={styles.stackedCardImg} resizeMode="cover" />
            </Animated.View>

            {/* Tấm 2: Phía sau bên phải (+7 deg) */}
            <Animated.View
              style={[
                styles.stackedCardWrapper,
                styles.cardPos2,
                {
                  transform: [
                    { rotate: '7deg' },
                    { translateY: floatAnim2 },
                  ],
                },
              ]}
            >
              <Image source={MOCK_IMG2} style={styles.stackedCardImg} resizeMode="cover" />
            </Animated.View>

            {/* Tấm 4: Phía trước bên phải (+8 deg) */}
            <Animated.View
              style={[
                styles.stackedCardWrapper,
                styles.cardPos4,
                {
                  transform: [
                    { rotate: '8deg' },
                    {
                      translateY: floatAnim1.interpolate({
                        inputRange: [-8, 6],
                        outputRange: [6, -8],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={MOCK_IMG4} style={styles.stackedCardImg} resizeMode="cover" />
            </Animated.View>

            {/* Tấm 3: Nằm chính diện lớn nhất (-1.5 deg) */}
            <Animated.View
              style={[
                styles.stackedCardWrapper,
                styles.cardPos3Center,
                {
                  transform: [
                    { rotate: '-1.5deg' },
                    { translateY: floatAnim2 },
                    { scale: pulseAnim },
                  ],
                },
              ]}
            >
              <Image source={MOCK_IMG3} style={styles.stackedCardImg} resizeMode="cover" />
            </Animated.View>

            {/* Sao lấp lánh trôi nổi bên cạnh tấm ảnh */}
            <Animated.Image
              source={STAR_DECOR}
              style={[
                styles.loadingFloatingStar,
                {
                  opacity: twinkleAnim,
                  transform: [
                    {
                      scale: twinkleAnim.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0.8, 1.25],
                      }),
                    },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Thanh thông báo capsule bo tròn phía dưới */}
          <View style={styles.loadingPillContainer}>
            <View style={styles.loadingPill}>
              <ActivityIndicator size="small" color="#F7CC6A" />
              <Text style={styles.loadingPillText}>Painting your scene...</Text>
            </View>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* MÀN HÌNH 3: KẾT QUẢ (RESULT CAROUSEL)                     */}
      {/* ========================================================= */}
      {step === 'result' && (
        <View style={styles.screenContainer}>
          {/* Tiêu đề kết quả căn giữa */}
          <View style={styles.resultTopSection}>
            <Text style={styles.resultMainTitle}>
              Here’s your{'\n'}lucky wallpaper ✨
            </Text>
            <Text style={styles.resultSubtitle}>
              Tap to see more versions{'\n'}or refine your request.
            </Text>
          </View>

          {/* Carousel ngang hiển thị hình nền */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={history}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled={false}
              snapToInterval={SNAP_INTERVAL}
              snapToAlignment="center"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              initialScrollIndex={2}
              getItemLayout={(_, index) => ({
                length: SNAP_INTERVAL,
                offset: SNAP_INTERVAL * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({
                    offset: info.index * SNAP_INTERVAL,
                    animated: false,
                  });
                }, 100);
              }}
              onMomentumScrollEnd={handleScrollCarousel}
              renderItem={({ item, index }) => {
                const isActive = index === activeCarouselIndex;
                return (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => setFullscreenItem(item)}
                    style={[
                      styles.carouselCardWrapper,
                      isActive ? styles.carouselCardActive : styles.carouselCardInactive,
                    ]}
                  >
                    <Image
                      source={item.source}
                      style={styles.carouselCardImage}
                      resizeMode="cover"
                    />

                    {/* Vầng sáng nhẹ trên thẻ đang chọn */}
                    {isActive && <View style={styles.carouselActiveBorderGlow} pointerEvents="none" />}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Dải chấm pagination tinh tế */}
            <View style={styles.paginationDotsRow}>
              {history.slice(0, 5).map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[
                    styles.paginationDot,
                    idx === activeCarouselIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Bộ nút đôi dưới đáy: "Try another" & "Save wallpaper" */}
          <View style={styles.resultActionsRow}>
            {/* Nút Try another */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setPrompt('');
                setStep('input');
              }}
              style={styles.tryAnotherButton}
            >
              <Text style={styles.tryAnotherIcon}>↻</Text>
              <Text style={styles.tryAnotherText}>Try another</Text>
            </TouchableOpacity>

            {/* Nút Save wallpaper */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const cur = history[activeCarouselIndex] || history[0];
                if (cur) handleShareOrSave(cur);
              }}
              style={styles.saveWallpaperButton}
            >
              <Text style={styles.saveWallpaperIcon}>↓</Text>
              <Text style={styles.saveWallpaperText}>Save wallpaper</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* TOAST THÔNG BÁO HOÀN THÀNH                                */}
      {/* ========================================================= */}
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* ========================================================= */}
      {/* MODAL CHIÊM NGƯỠNG TOÀN MÀN HÌNH (FULLSCREEN VIEW)        */}
      {/* ========================================================= */}
      <Modal
        visible={!!fullscreenItem}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenItem(null)}
      >
        <View style={styles.fullscreenBackdrop}>
          <SafeAreaView style={styles.fullscreenSafe} edges={['top', 'bottom']}>
            {/* Top Bar */}
            <View style={styles.fullscreenTopBar}>
              <TouchableOpacity
                onPress={() => setFullscreenItem(null)}
                style={styles.fullscreenCloseBtn}
              >
                <Text style={styles.fullscreenCloseText}>✕ Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => fullscreenItem && handleShareOrSave(fullscreenItem)}
                style={styles.fullscreenShareBtn}
              >
                <Text style={styles.fullscreenShareText}>Lưu / Chia sẻ ✦</Text>
              </TouchableOpacity>
            </View>

            {/* Ảnh lớn */}
            <View style={styles.fullscreenImageWrap}>
              {fullscreenItem && (
                <Image
                  source={fullscreenItem.source}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Chi tiết luận giải thần số học */}
            {fullscreenItem && (
              <View style={styles.fullscreenCardInfo}>
                <Text style={styles.fullscreenAffirmation}>
                  “{fullscreenItem.affirmation_vi}”
                </Text>
                <Text style={styles.fullscreenExplanation}>
                  {fullscreenItem.explanation_vi}
                </Text>
                <View style={styles.fullscreenTagRow}>
                  <Text style={styles.fullscreenTag}>
                    ✦ {fullscreenItem.styleName}
                  </Text>
                  <Text style={styles.fullscreenTag}>
                    • {fullscreenItem.intentionName}
                  </Text>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL MENU HAMBURGER: THẦN SỐ HỌC & LỊCH SỬ              */}
      {/* ========================================================= */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <View style={styles.menuBackdrop}>
          <TouchableOpacity
            style={styles.menuBackdropDismiss}
            activeOpacity={1}
            onPress={() => setShowMenuModal(false)}
          />
          <View style={styles.menuSheet}>
            <View style={styles.menuSheetHeader}>
              <Text style={styles.menuSheetTitle}>Xưởng Hình Nền May Mắn</Text>
              <Text style={styles.menuSheetSub}>Số chủ đạo {numbers.lifePathNumber} • Ngày cá nhân {numbers.personalDay}</Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowCardsModal(true);
              }}
            >
              <Text style={styles.menuItemIcon}>🎴</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Xem 24 Lá Bài Bản Mệnh</Text>
                <Text style={styles.menuItemDesc}>Bản đồ năng lượng linh số Pythagoras</Text>
              </View>
              <Text style={styles.menuItemChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setStep('result');
              }}
            >
              <Text style={styles.menuItemIcon}>🖼️</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Thư viện hình nền đã tạo</Text>
                <Text style={styles.menuItemDesc}>Xem lại {history.length} tác phẩm đã hoàn thành</Text>
              </View>
              <Text style={styles.menuItemChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setPrompt('');
                setStep('input');
              }}
            >
              <Text style={styles.menuItemIcon}>✨</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={styles.menuItemTitle}>Tạo hình nền may mắn mới</Text>
                <Text style={styles.menuItemDesc}>Nhập mong muốn và hòa vào năng lượng vũ trụ</Text>
              </View>
              <Text style={styles.menuItemChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCloseBtn}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={styles.menuCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 24 Lá Bài Thần Số Học */}
      {profile && (
        <NumerologyCardsModal
          visible={showCardsModal}
          profile={profile}
          onClose={() => setShowCardsModal(false)}
        />
      )}
    </SafeAreaView>
  </View>
  );
}

// ==========================================
// HỆ THỐNG STYLES CHUẨN XÁC THEO MOCKUP
// ==========================================
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#211438',
    position: 'relative',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },

  // ================= TOP HEADER =================
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 20,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackArrow: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  hamburger: {
    width: 22,
    height: 15,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },

  // ================= MÀN HÌNH 1: INPUT =================
  inputTopSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    position: 'relative',
    zIndex: 10,
  },
  inputTitleWrapper: {
    maxWidth: SCREEN_WIDTH * 0.68,
  },
  inputMainTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  inputSubtitle: {
    color: '#B6A6CE',
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 10,
    fontWeight: '400',
  },
  moonDecorWrapper: {
    position: 'absolute',
    top: 6,
    right: 18,
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonImage: {
    width: 74,
    height: 74,
  },
  moonStar1: {
    position: 'absolute',
    top: -3,
    left: -5,
    width: 18,
    height: 18,
  },
  moonStar2: {
    position: 'absolute',
    bottom: 2,
    right: -3,
    width: 20,
    height: 20,
  },

  // Input Box dạng capsule
  inputBoxContainer: {
    paddingHorizontal: 24,
    marginTop: 26,
    zIndex: 15,
  },
  searchPill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(56, 36, 90, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(142, 105, 196, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 30,
  },
  searchIcon: {
    width: 20,
    height: 20,
    position: 'relative',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#B8A8D2',
    position: 'absolute',
    top: 1,
    left: 1,
  },
  searchHandle: {
    width: 7,
    height: 2.2,
    borderRadius: 1,
    backgroundColor: '#B8A8D2',
    position: 'absolute',
    bottom: 3,
    right: 2,
    transform: [{ rotate: '45deg' }],
  },
  textInputField: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  submitCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7CC6A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F7CC6A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  submitArrowText: {
    color: '#211438',
    fontSize: 18,
    fontWeight: '800',
    marginTop: -1,
  },

  // ================= MÀN HÌNH 2: GENERATING =================
  loadingTopSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  loadingMainTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  loadingSubtitle: {
    color: '#B6A6CE',
    fontSize: 14.5,
    marginTop: 8,
    fontWeight: '400',
  },
  stackedCardsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  stackedCardWrapper: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stackedCardImg: {
    width: '100%',
    height: '100%',
  },
  // Vị trí các card floating
  cardPos1: {
    width: 140,
    height: 185,
    top: '8%',
    left: SCREEN_WIDTH * 0.1,
    zIndex: 3,
  },
  cardPos2: {
    width: 145,
    height: 195,
    top: '6%',
    right: SCREEN_WIDTH * 0.1,
    zIndex: 2,
  },
  cardPos4: {
    width: 135,
    height: 180,
    bottom: '12%',
    right: SCREEN_WIDTH * 0.12,
    zIndex: 4,
  },
  cardPos3Center: {
    width: 195,
    height: 250,
    zIndex: 6,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 14,
  },
  loadingFloatingStar: {
    position: 'absolute',
    left: SCREEN_WIDTH * 0.11,
    top: '46%',
    width: 32,
    height: 32,
    zIndex: 10,
  },

  // Thanh trạng thái loading dạng capsule
  loadingPillContainer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
  },
  loadingPill: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(48, 30, 78, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(142, 105, 196, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ================= MÀN HÌNH 3: RESULT =================
  resultTopSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  resultMainTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  resultSubtitle: {
    color: '#B6A6CE',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '400',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - SNAP_INTERVAL) / 2,
    alignItems: 'center',
  },
  carouselCardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#170E28',
  },
  carouselCardActive: {
    transform: [{ scale: 1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  carouselCardInactive: {
    transform: [{ scale: 0.94 }],
    opacity: 0.72,
  },
  carouselCardImage: {
    width: '100%',
    height: '100%',
  },
  carouselActiveBorderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 204, 106, 0.45)',
  },

  // Pagination dots
  paginationDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(142, 105, 196, 0.4)',
  },
  paginationDotActive: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  // Bottom action buttons
  resultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 24,
    gap: 12,
  },
  tryAnotherButton: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(58, 38, 92, 0.9)',
    borderWidth: 1.2,
    borderColor: 'rgba(138, 102, 192, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tryAnotherIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tryAnotherText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  saveWallpaperButton: {
    flex: 1.2,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F7CC6A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F7CC6A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveWallpaperIcon: {
    color: '#211438',
    fontSize: 18,
    fontWeight: '900',
  },
  saveWallpaperText: {
    color: '#211438',
    fontSize: 15,
    fontWeight: '700',
  },

  // ================= TOAST =================
  toastContainer: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(19, 12, 33, 0.95)',
    borderWidth: 1,
    borderColor: '#F7CC6A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 100,
    elevation: 10,
  },
  toastText: {
    color: '#F7CC6A',
    fontSize: 13.5,
    fontWeight: '600',
  },

  // ================= FULLSCREEN MODAL =================
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 18, 0.98)',
  },
  fullscreenSafe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fullscreenCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  fullscreenCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  fullscreenShareBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F7CC6A',
    borderRadius: 20,
  },
  fullscreenShareText: {
    color: '#211438',
    fontSize: 13,
    fontWeight: '700',
  },
  fullscreenImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  fullscreenCardInfo: {
    backgroundColor: '#1E1233',
    borderWidth: 1,
    borderColor: 'rgba(142, 105, 196, 0.3)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 6,
  },
  fullscreenAffirmation: {
    color: '#F7CC6A',
    fontSize: 14.5,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  fullscreenExplanation: {
    color: '#D1C7E2',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  fullscreenTagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  fullscreenTag: {
    color: '#B6A6CE',
    fontSize: 11.5,
    fontWeight: '600',
  },

  // ================= HAMBURGER BOTTOM SHEET =================
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  menuBackdropDismiss: {
    flex: 1,
  },
  menuSheet: {
    backgroundColor: '#1E1233',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(142, 105, 196, 0.35)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  menuSheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  menuSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  menuSheetSub: {
    color: '#F7CC6A',
    fontSize: 12.5,
    marginTop: 4,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 36, 90, 0.5)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 105, 196, 0.25)',
  },
  menuItemIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  menuItemTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemDesc: {
    color: '#B6A6CE',
    fontSize: 11.5,
    marginTop: 2,
  },
  menuItemChevron: {
    color: '#B6A6CE',
    fontSize: 20,
    fontWeight: '300',
  },
  menuCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  menuCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
