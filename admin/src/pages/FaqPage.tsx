import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { countriesApi, faqApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';
import type { ApprovedFaq, FaqCandidate, FaqCitation, FaqSections, FaqStatus } from '../lib/types';

type Tab = 'candidates' | 'approved';

const STATUS_LABEL: Record<Exclude<FaqStatus, 'dismissed'>, string> = {
  active: 'Đang dùng',
  needs_review: 'Cần duyệt lại',
  retired: 'Đã gỡ',
};

const STATUS_TONE: Record<Exclude<FaqStatus, 'dismissed'>, 'success' | 'warn' | 'neutral'> = {
  active: 'success',
  needs_review: 'warn',
  retired: 'neutral',
};

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : 'Không tải được dữ liệu');

/*
 * G6 -- Câu hỏi thường gặp. Tab "Đề xuất": nhóm câu hỏi cùng ý được hỏi lặp lại nhiều (backend gom theo
 * từ khoá); admin đọc câu trả lời AI kèm nguồn rồi DUYỆT NGUYÊN VĂN hoặc bỏ qua -- không sửa nội dung.
 * Tab "Đã duyệt": FAQ đang được phát thay AI, số lần phát, phản hồi người dùng, gỡ / kích hoạt lại.
 */
export default function FaqPage() {
  const [tab, setTab] = useState<Tab>('candidates');
  const [countryCode, setCountryCode] = useState('');
  // Country-driven (CLAUDE.md 4.1): danh sách quốc gia lấy từ DB, không hard-code.
  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countryCodes = (countriesRes?.data ?? []).map((country) => country.code);

  return (
    <div>
      <PageHeader
        title="Câu hỏi thường gặp"
        description="Duyệt câu trả lời AI cho câu hỏi hay lặp lại. FAQ đã duyệt được trả ngay cho người dùng, không gọi AI."
      />

      <div className="mb-4 flex items-end gap-3">
        <div className="flex gap-2">
          <Button variant={tab === 'candidates' ? 'primary' : 'secondary'} onClick={() => setTab('candidates')}>
            Đề xuất
          </Button>
          <Button variant={tab === 'approved' ? 'primary' : 'secondary'} onClick={() => setTab('approved')}>
            Đã duyệt
          </Button>
        </div>
        {tab === 'candidates' && (
          <div className="max-w-xs">
            <Select label="Quốc gia" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              <option value="">Tất cả</option>
              {countryCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {tab === 'candidates' ? <CandidatesTab countryCode={countryCode} /> : <ApprovedTab />}
    </div>
  );
}

function CandidatesTab({ countryCode }: { countryCode: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'faq', 'candidates', countryCode],
    queryFn: () => faqApi.candidates(countryCode || undefined),
  });
  const decide = useMutation({
    mutationFn: ({ messageId, decision }: { messageId: string; decision: 'approve' | 'dismiss' }) =>
      faqApi.decide(messageId, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'faq'] }),
  });

  const items = data?.data ?? [];
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={errorMessage(error)} />;
  if (items.length === 0) {
    return <EmptyState label="Chưa có nhóm câu hỏi nào lặp đủ nhiều để đề xuất" />;
  }

  return (
    <div className="space-y-4">
      {decide.error && <ErrorState message={errorMessage(decide.error)} />}
      {items.map((candidate) => (
        <CandidateCard
          key={candidate.answers[0].messageId}
          candidate={candidate}
          busy={decide.isPending}
          onDecide={(messageId, decision) => decide.mutate({ messageId, decision })}
        />
      ))}
    </div>
  );
}

function CandidateCard({
  candidate,
  busy,
  onDecide,
}: {
  candidate: FaqCandidate;
  busy: boolean;
  onDecide: (messageId: string, decision: 'approve' | 'dismiss') => void;
}) {
  const [answerIndex, setAnswerIndex] = useState(0);
  const answer = candidate.answers[answerIndex];
  return (
    <section className="rounded-xl border border-line bg-white p-4" aria-label={`Nhóm câu hỏi ${candidate.questions[0]}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{candidate.countryCode}</Badge>
        <Badge tone="warn">Hỏi {candidate.count} lần</Badge>
        <Badge tone="neutral">AI chấm trùng lặp từ {Math.round(candidate.minSimilarity * 100)}%</Badge>
        <FeedbackCount up={candidate.feedback.up} down={candidate.feedback.down} />
      </div>
      <h3 className="font-semibold text-ink">{candidate.questions[0]}</h3>
      {candidate.questions.length > 1 && (
        <ul className="mt-1 list-disc pl-5 text-sm text-muted">
          {candidate.questions.slice(1).map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      )}

      {candidate.answers.length > 1 && (
        <div className="mt-3 flex gap-2 text-sm">
          {candidate.answers.map((item, index) => (
            <Button key={item.messageId} variant={index === answerIndex ? 'primary' : 'ghost'} onClick={() => setAnswerIndex(index)}>
              Câu trả lời {index + 1}
            </Button>
          ))}
        </div>
      )}
      <AnswerPreview sections={answer.sections} text={answer.text} citations={answer.citations} />

      <div className="mt-3 flex gap-2">
        <Button loading={busy} onClick={() => onDecide(answer.messageId, 'approve')}>
          Duyệt câu trả lời này
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onDecide(answer.messageId, 'dismiss')}>
          Bỏ qua
        </Button>
      </div>
    </section>
  );
}

function ApprovedTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'faq', 'approved'], queryFn: () => faqApi.list() });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'retired' }) => faqApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'faq'] }),
  });

  const items = (data?.data ?? []).filter((faq): faq is ApprovedFaq & { status: Exclude<FaqStatus, 'dismissed'> } => faq.status !== 'dismissed');
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={errorMessage(error)} />;
  if (items.length === 0) return <EmptyState label="Chưa duyệt câu hỏi nào" />;

  return (
    <div className="space-y-4">
      {setStatus.error && <ErrorState message={errorMessage(setStatus.error)} />}
      {items.map((faq) => (
        <section key={faq._id} className="rounded-xl border border-line bg-white p-4" aria-label={`FAQ ${faq.question}`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{faq.countryCode}</Badge>
            <Badge tone={STATUS_TONE[faq.status]}>{STATUS_LABEL[faq.status]}</Badge>
            <span className="text-sm text-muted">Đã phát {faq.servedCount} lần</span>
            <FeedbackCount up={faq.feedback.up} down={faq.feedback.down} />
            {faq.warning && (
              <Badge tone="danger">
                <TriangleAlert size={12} className="mr-1" />
                Nhiều phản hồi "Không hữu ích"
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-ink">{faq.question}</h3>
          {faq.statusReason && <p className="mt-1 text-sm text-warn">{faq.statusReason}</p>}
          <AnswerPreview sections={faq.sections} text={faq.answer} citations={faq.citations} />
          <div className="mt-3">
            {faq.status === 'active' ? (
              <Button variant="danger" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: faq._id, status: 'retired' })}>
                Gỡ FAQ
              </Button>
            ) : (
              <Button variant="secondary" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: faq._id, status: 'active' })}>
                Kích hoạt lại
              </Button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function FeedbackCount({ up, down }: { up: number; down: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <ThumbsUp size={14} className="text-success" /> {up}
      <ThumbsDown size={14} className="text-danger" /> {down}
    </span>
  );
}

function AnswerPreview({ sections, text, citations }: { sections: FaqSections; text: string; citations: FaqCitation[] }) {
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-ink">
      {sections ? (
        <>
          <p>{sections.answer}</p>
          <SectionList title="Việc nên làm" items={sections.actions} />
          <SectionList title="Điều cần tránh" items={sections.avoid} />
        </>
      ) : (
        <p className="whitespace-pre-line">{text}</p>
      )}
      {citations.length > 0 && (
        <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
          Nguồn:{' '}
          {[...new Set(citations.map((citation) => `${citation.title}${citation.heading ? ` -- ${citation.heading}` : ''}`))].join('; ')}
        </div>
      )}
    </div>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase text-muted">{title}</p>
      <ul className="list-disc pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
