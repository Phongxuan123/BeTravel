import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, Text, View, type ViewToken } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { Logo } from '@/components/brand/Logo';
import { OnboardingIllustration } from '@/components/brand/OnboardingIllustration';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import { setJSON, StorageKeys } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  id: 1 | 2 | 3 | 4;
  chip?: string;
  chipTone: 'primary' | 'danger';
  title: string;
  description: string;
};

const slides: Slide[] = [
  {
    id: 1,
    chipTone: 'primary',
    title: 'Bảo vệ bạn khi du lịch nước ngoài',
    description: 'Luật pháp, khẩn cấp và hỗ trợ — gói gọn trong một ứng dụng tiếng Việt.',
  },
  {
    id: 2,
    chip: 'Cẩm nang pháp luật',
    chipTone: 'primary',
    title: 'Biết luật trước khi đi',
    description: 'Quy định nhập cảnh, giao thông, nơi công cộng… tra cứu theo từng quốc gia.',
  },
  {
    id: 3,
    chip: 'AI Legal Assistant',
    chipTone: 'primary',
    title: 'Hỏi luật bằng tiếng Việt',
    description: 'Trả lời kèm nguồn pháp lý. Không đủ dữ liệu, AI sẽ nói rõ thay vì đoán.',
  },
  {
    id: 4,
    chip: 'SOS & Khẩn cấp',
    chipTone: 'danger',
    title: 'Hỗ trợ khi có sự cố',
    description: 'Số khẩn cấp, đại sứ quán, dịch câu gấp và hướng dẫn xử lý — chỉ một chạm.',
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
        <Pressable accessibilityRole="button" onPress={skip} hitSlop={8}>
          <Text className="text-[15px] font-body-semibold text-muted">Bỏ qua</Text>
        </Pressable>
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
          <View style={{ width: SCREEN_WIDTH }} className="items-center pt-10">
            <OnboardingIllustration slide={item.id} />
          </View>
        )}
      />

      <View className="px-[25px]" accessibilityLiveRegion="polite">
        {slide.chip && (
          <View
            className={`mb-3 self-start rounded-full px-3 py-1 ${
              slide.chipTone === 'danger' ? 'bg-danger-soft' : 'bg-primary-soft'
            }`}
          >
            <Text className={`text-[13px] font-body-bold ${slide.chipTone === 'danger' ? 'text-danger' : 'text-primary-strong'}`}>
              {slide.chip}
            </Text>
          </View>
        )}
        <Text className="font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
          {slide.title}
        </Text>
        <Text className="mt-3 text-base leading-6 text-muted">{slide.description}</Text>
      </View>

      <View className="flex-1" />

      <View className="px-[18px] flex-row" style={{ gap: 6, marginBottom: 16 }}>
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
