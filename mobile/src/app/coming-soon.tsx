import { useLocalSearchParams } from 'expo-router';
import { ComingSoonScreen } from '@/components/common/ComingSoonScreen';

// Route dùng chung cho mọi nút dẫn tới tính năng chưa triển khai -- xem
// ComingSoonScreen. `title`/`detail` truyền qua router.push({params}).
export default function ComingSoonRoute() {
  const params = useLocalSearchParams<{ title?: string; detail?: string }>();
  return <ComingSoonScreen title={params.title || 'Tính năng mới'} detail={params.detail} />;
}
