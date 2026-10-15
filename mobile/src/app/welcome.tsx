import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, Text, View, type ViewToken } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Check } from 'lucide-react-native';
import { Logo } from '@/components/brand/Logo';
import { OnboardingIllustration } from '@/components/brand/OnboardingIllustration';
import { EmergencyEntryButton } from '@/components/common/EmergencyEntryButton';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import { setJSON, StorageKeys } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  id: 1 | 2 | 3 | 4;
  caption: string;
  title: string;
  description: string;
  points: [string, string, string];
};

// 4 bước theo spec mục 3.2. Không hứa độ chính xác tuyệt đối: nói về nguồn và trích dẫn.
const slides: Slide[] = [
  {
    id: 1,
    caption: 'Travel with confidence',
    title: 'Tự tin trên mọi hành trình quốc tế',
    description: 'Người bạn đồng hành pháp lý và an toàn du lịch thông minh dành riêng cho người Việt khi học tập, làm việc và khám phá thế giới.',
    points: ['Cập nhật theo quốc gia đến', 'Nguồn đã kiểm chứng & đáng tin cậy', 'Tối ưu sử dụng một tay'],
  },
  {
    id: 2,
    caption: 'Understand local laws',
    title: 'Hiểu rõ luật pháp sở tại bằng tiếng Việt',
    description: 'Quy định nhập cảnh, giao thông, nơi công cộng... được tóm lược dễ đọc, tra cứu theo từng quốc gia.',
    points: ['11 chuyên mục pháp lý thiết yếu', 'Mỗi bài có nguồn chính thức và ngày cập nhật', 'Tìm kiếm bằng câu hỏi tự nhiên'],
  },
  {
    id: 3,
    caption: 'Get help when you need it',
    title: 'Hỗ trợ khẩn cấp khi bạn cần',
    description: 'Số khẩn cấp, đại sứ quán và hướng dẫn xử lý sự cố từng bước luôn sẵn sàng chỉ với vài chạm.',
    points: ['Nút SOS tối đa 2 chạm', 'Bản đồ đại sứ quán, cảnh sát, bệnh viện', 'Quy trình xử lý sự cố 5 bước'],
  },
  {
    id: 4,
    caption: 'Your AI legal travel assistant',
    title: 'Trợ lý AI pháp lý và dịch nhanh',
    description: 'Câu trả lời kèm trích dẫn nguồn. Khi dữ liệu chưa đủ, AI nói rõ thay vì suy đoán.',
    points: ['Trả lời có trích dẫn nguồn', 'Nói rõ khi chưa đủ dữ liệu', 'Dịch nhanh câu khẩn cấp'],
  },
];

async function finishOnboarding() {
  await setJSON(StorageKeys.onboarded, 1);
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }, []);

  const goNext = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finishOnboarding().then(() => router.replace('/register'));
    }
  };

  const skip = () => finishOnboarding().then(() => router.replace('/login'));

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <View className="flex-1 bg-bg">
      <DecorCircles slide={slide.id} />

      <View className="flex-row items-center justify-between px-[18px]" style={{ paddingTop: insets.top + 16 }}>
        <Logo size={30} textSize={20} />
        <View className="flex-row items-center" style={{ gap: 14 }}>
          <EmergencyEntryButton variant="pill" />
          <Pressable accessibilityRole="button" onPress={skip} hitSlop={8}>
            <Text className="text-[15px] font-body-semibold text-muted">Bỏ qua (Skip)</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => String(s.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 18 }} className="pt-6">
            <View className="items-center rounded-3xl bg-primary-soft py-4">
              <OnboardingIllustration slide={item.id} />
              <Text className="mt-4 text-[13px] font-body-bold text-primary">
                {`0${item.id} / 04 · ${item.caption}`}
              </Text>
            </View>
          </View>
        )}
      />

      <View className="px-[18px]" accessibilityLiveRegion="polite">
        <Text className="font-display text-ink" style={{ fontSize: 26, lineHeight: 32 }} numberOfLines={3}>
          {slide.title}
        </Text>
        <Text className="mt-3 text-base leading-6 text-muted">{slide.description}</Text>
        <View className="mt-4" style={{ gap: 8 }}>
          {slide.points.map((point) => (
            <View key={point} className="flex-row items-center rounded-2xl bg-surface px-3 py-2.5" style={{ gap: 10 }}>
              <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
              <Text className="flex-1 text-[13px] font-body-bold text-ink">{point}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="flex-1" />

      <View className="flex-row justify-center" style={{ gap: 6, marginBottom: 16 }}>
        {slides.map((s, i) => (
          <View
            key={s.id}
            className="h-1.5 rounded-full"
            style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? colors.primary : '#C9D6EE' }}
          />
        ))}
      </View>

      <View className="px-[18px]" style={{ paddingBottom: insets.bottom + 24 }}>
        <Button
          label={isLast ? 'Bắt đầu ngay' : 'Tiếp tục'}
          onPress={goNext}
          iconRight={<ArrowRight size={18} color="#fff" />}
        />
        {isLast && (
          <Pressable
            accessibilityRole="button"
            className="mt-3 items-center py-2"
            onPress={() => finishOnboarding().then(() => router.replace('/login'))}
          >
            <Text className="text-[15px] font-body-semibold text-muted">Tôi đã có tài khoản</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function DecorCircles({ slide }: { slide: 1 | 2 | 3 | 4 }) {
  const color = slide === 4 ? '#FBE9E9' : '#E6EEFB';
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View
        className="absolute rounded-full"
        style={{ width: 420, height: 420, right: -160, top: -180, backgroundColor: color }}
      />
      {slide === 1 && (
        <View
          className="absolute rounded-full"
          style={{ width: 260, height: 260, left: -140, top: 90, backgroundColor: color }}
        />
      )}
    </View>
  );
}
