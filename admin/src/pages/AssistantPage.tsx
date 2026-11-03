import { PageHeader } from '../components/ui/PageHeader';
import { KillSwitchCard } from '../components/assistant/KillSwitchCard';
import { AssistantMetricsPanel } from '../components/assistant/AssistantMetricsPanel';
import { QaLogTable } from '../components/assistant/QaLogTable';

// Tro ly AI ban 2 -- giai doan 6 (docs/AI_V2_PLAN.md H1, F5; contracts/README.md muc 27).
export default function AssistantPage() {
  return (
    <div>
      <PageHeader
        title="Trợ lý AI"
        description="Công tắc tắt nhanh, chi phí và lượt hỏi theo ngày, nhật ký hỏi - đáp đã ẩn thông tin cá nhân."
      />
      <div className="flex flex-col gap-6">
        <KillSwitchCard />
        <AssistantMetricsPanel />
        <QaLogTable />
      </div>
    </div>
  );
}
