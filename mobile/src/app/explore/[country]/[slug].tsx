import { useState } from 'react';
import { View, Text, ScrollView, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Info, MessageCircle, Star, Share as ShareIcon } from 'lucide-react-native';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { BottomActionBar } from '@/components/common/BottomActionBar';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Accordion } from '@/components/ui/Accordion';
import { colors } from '@/lib/theme';
import { fetchArticle } from '@/mocks/client';

export default function ArticleDetailScreen() {
  const { country: countryCode, slug } = useLocalSearchParams<{ country: string; slug: string }>();
  const [saved, setSaved] = useState(false);
  const articleQuery = useQuery({
    queryKey: ['article', countryCode, slug],
    queryFn: () => fetchArticle(countryCode, slug),
  });
  const article = articleQuery.data?.data;

  const onShare = () => {
    if (!article) return;
    Share.share({ message: `${article.title} — ${article.source.url}` }).catch(() => {});
  };

  if (!article) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Đang tải…</Text>
      </View>
    );
  }

  const accordionItems = [
    { title: 'Mức phạt cụ thể', content: article.fines },
    { title: 'Trường hợp ngoại lệ', content: article.exceptions.length ? article.exceptions : ['Không có ngoại lệ được ghi nhận.'] },
    { title: 'Lưu ý cho người nước ngoài', content: article.foreignerNotes.length ? article.foreignerNotes : ['Không có lưu ý riêng cho người nước ngoài.'] },
    { title: 'Nguồn pháp lý', content: [`${article.source.agency} · Cập nhật ${article.updatedAt}`, article.source.url] },
  ];

  return (
    <View className="flex-1 bg-bg">
      <PageHeaderBare
        left={<IconButton accessibilityLabel="Quay lại" variant="soft" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => router.back()} />}
        right={
          <>
            <IconButton
              accessibilityLabel={saved ? 'Bỏ lưu' : 'Lưu quy định'}
              variant={saved ? 'warning' : 'outline'}
              icon={<Star size={18} color={saved ? colors.warning : colors.muted} fill={saved ? colors.warning : 'none'} />}
              onPress={() => setSaved((v) => !v)}
            />
            <IconButton accessibilityLabel="Chia sẻ" variant="outline" icon={<ShareIcon size={18} color={colors.ink} />} onPress={onShare} />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          <Badge label={countryCode} tone="info" dot />
          <Badge label="Giao thông" tone="neutral" />
        </View>
        <Text className="mt-3 font-display text-ink" style={{ fontSize: 26 }}>
          {article.title}
        </Text>
        <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
          <Badge label="Đang hiệu lực" tone="success" dot />
          <Text className="text-sm text-subtle">Cập nhật {article.updatedAt}</Text>
        </View>

        <View className="mt-4 rounded-lg bg-primary-soft p-4">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Info size={18} color={colors.primaryStrong} />
            <Text className="text-[15px] font-body-bold text-primary-strong">Tóm tắt nhanh</Text>
          </View>
          <Text className="mt-2 text-base leading-6 text-ink">{article.summary}</Text>
        </View>

        {article.keyPoints.length > 0 && (
          <View className="mt-6">
            <Text className="mb-3 text-base font-body-bold text-ink">Quy định chính</Text>
            <View style={{ gap: 10 }}>
              {article.keyPoints.map((point, i) => (
                <View
                  key={i}
                  className={`flex-row items-start gap-3 rounded-lg border p-3.5 ${
                    point.severity === 'criminal' ? 'border-danger-line bg-danger-tint' : 'border-line bg-surface'
                  }`}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      point.severity === 'criminal' ? 'bg-danger-soft' : 'bg-primary-soft'
                    }`}
                  >
                    <Text className={`text-sm font-body-bold ${point.severity === 'criminal' ? 'text-danger' : 'text-primary'}`}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-base text-ink">{point.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="mt-6">
          <Text className="mb-3 text-base font-body-bold text-ink">Xem chi tiết</Text>
          <Accordion items={accordionItems} />
        </View>
      </ScrollView>

      <BottomActionBar>
        <Button
          label="Hỏi AI về nội dung này"
          iconLeft={<MessageCircle size={18} color="#fff" />}
          onPress={() => router.push(`/chat?country=${countryCode}&focusArticleId=${article.id}` as never)}
        />
      </BottomActionBar>
    </View>
  );
}
