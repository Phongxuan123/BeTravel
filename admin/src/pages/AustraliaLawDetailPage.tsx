import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { australiaLawsApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { AU_SCOPE_NOTICE } from '../lib/auLaws';
import type { AuLawBlock } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { LoadingState, ErrorState } from '../components/ui/Feedback';

const VERSION_LIMIT = 10;
const CONTENT_PAGE_SIZE = 100;
const BYTES_PER_KB = 1024;

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : 'Không tải được dữ liệu');

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value || '-'}</dd>
    </div>
  );
}

function BlockLine({ block, translate }: { block: AuLawBlock; translate: boolean }) {
  const tone = block.kind === 'heading' ? 'font-semibold text-ink' : block.kind === 'note' ? 'text-xs italic text-muted' : 'text-ink';
  // Chế độ dịch: tiếng Việt là chính, bản gốc tiếng Anh nhỏ bên dưới để đối chiếu; đoạn chưa dịch hiện bản gốc.
  if (translate && block.textVi) {
    return (
      <div id={block.citationId} className="py-1.5">
        <p className={`text-sm leading-relaxed ${tone}`}>{block.textVi}</p>
        <p className="text-xs text-muted">{block.text}</p>
      </div>
    );
  }
  return (
    <p id={block.citationId} className={`py-1 text-sm leading-relaxed ${tone}`}>
      {block.text}
    </p>
  );
}

const OUTLINE_PREVIEW_COUNT = 8;
const SUMMARY_STALE_TIME_MS = 24 * 60 * 60 * 1000;
// Tóm tắt từng phần được sinh nền: hỏi lại định kỳ cho tới khi xong.
const GENERATING_POLL_MS = 15_000;

// Tóm lược: mục đích và dàn ý lấy nguyên văn từ nguồn; bản tiếng Việt do AI diễn giải, luôn gắn nhãn AI.
function SummaryBlock({ id }: { id: string }) {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['au-laws', id, 'summary'],
    queryFn: () => australiaLawsApi.summary(id),
    retry: false,
    staleTime: SUMMARY_STALE_TIME_MS,
    refetchInterval: (query) => (query.state.data?.data.deepStatus === 'generating' ? GENERATING_POLL_MS : false),
  });

  if (isLoading) return <LoadingState label="Đang tạo tóm lược (lần đầu có thể mất vài chục giây)..." />;
  if (error || !data) return <p className="text-sm text-muted">Chưa tải được tóm lược. Bạn vẫn có thể đọc nội dung bên dưới.</p>;

  const { purpose, outline, outlineTruncated, summaryVi, disclaimer, deepStatus, deepSummary } = data.data;
  const visibleOutline = showAll ? outline : outline.slice(0, OUTLINE_PREVIEW_COUNT);

  return (
    <div className="space-y-4 rounded-lg border border-line bg-white p-4">
      {summaryVi && (
        <div className="space-y-2">
          <Badge tone="brand">AI diễn giải bằng tiếng Việt</Badge>
          <p className="text-sm text-ink">{summaryVi.summary}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {summaryVi.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      {deepStatus === 'generating' && (
        <p className="text-sm text-muted">Đang chuẩn bị tóm tắt chi tiết từng phần, vài phút nữa sẽ hiện tại đây...</p>
      )}
      {deepSummary && deepSummary.parts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">Tóm tắt nội dung từng phần</p>
          {deepSummary.parts.map((part) => (
            <div key={part.citationId} className="space-y-1 rounded-md bg-surface p-3">
              <p className="text-xs font-semibold text-brand">{part.heading}</p>
              <p className="text-sm text-ink">{part.summary}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                {part.keyPoints.map((point) => (
                  <li key={point.text}>{point.text}</li>
                ))}
              </ul>
              {part.partial && <p className="text-xs text-muted">Phần này dài: tóm tắt dựa trên các điều đầu tiên.</p>}
            </div>
          ))}
          {(deepSummary.skippedParts > 0 || deepSummary.truncated) && (
            <p className="text-xs text-muted">Một số phần chưa có tóm tắt (chưa qua kiểm tra nguồn hoặc quá dài). Xem nội dung gốc để biết đầy đủ.</p>
          )}
        </div>
      )}
      {purpose && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Mục đích của luật (nguyên văn, tiếng Anh)</p>
          <p className="mt-0.5 text-sm text-ink">{purpose.text}</p>
        </div>
      )}
      {outline.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Cấu trúc chính (nguyên văn, tiếng Anh)</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink">
            {visibleOutline.map((item) => (
              <li key={item.citationId}>{item.text}</li>
            ))}
          </ul>
          {outline.length > OUTLINE_PREVIEW_COUNT && (
            <Button variant="ghost" onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Thu gọn' : `Xem tất cả ${outline.length}${outlineTruncated ? '+' : ''} mục`}
            </Button>
          )}
        </div>
      )}
      {!summaryVi && !purpose && outline.length === 0 && (
        <p className="text-sm text-muted">Văn bản này chưa có đủ dữ liệu để tóm lược.</p>
      )}
      <p className="text-xs text-muted">{disclaimer}</p>
    </div>
  );
}

function VersionTable({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['au-laws', id, 'versions', page],
    queryFn: () => australiaLawsApi.versions(id, { page, limit: VERSION_LIMIT }),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={errorMessage(error)} />;

  return (
    <>
      <Table>
        <Thead>
          <Th>Bản biên soạn</Th>
          <Th>Mã đăng ký</Th>
          <Th>Hiệu lực từ</Th>
          <Th>Đến</Th>
          <Th>Trạng thái</Th>
        </Thead>
        <Tbody>
          {(data?.data ?? []).map((version) => (
            <tr key={version.registerId}>
              <Td>{version.compilationNumber ?? '-'}</Td>
              <Td className="font-mono text-xs">{version.registerId}</Td>
              <Td>{version.startDate ?? '-'}</Td>
              <Td>{version.endDate ?? 'hiện tại'}</Td>
              <Td>{version.isCurrent ? <Badge tone="success">Đang áp dụng</Badge> : <Badge>{version.status ?? '-'}</Badge>}</Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Pagination page={page} limit={VERSION_LIMIT} total={data?.meta?.total ?? 0} onPageChange={setPage} />
    </>
  );
}

function ContentViewer({ id, translate }: { id: string; translate: boolean }) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['au-laws', id, 'content', translate ? 'vi' : 'en'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      (translate ? australiaLawsApi.contentVi : australiaLawsApi.content)(id, { offset: pageParam, limit: CONTENT_PAGE_SIZE }),
    getNextPageParam: (last) => {
      const nextOffset = last.data.offset + last.data.limit;
      return nextOffset < last.data.totalBlocks ? nextOffset : undefined;
    },
    retry: false,
  });

  if (isLoading) {
    return <LoadingState label={translate ? 'Đang dịch sang tiếng Việt (lần đầu có thể mất vài chục giây)...' : 'Đang tải văn bản (lần đầu có thể mất vài giây)...'} />;
  }
  if (error) return <ErrorState message={errorMessage(error)} />;

  const pages = data?.pages ?? [];
  const blocks = pages.flatMap((p) => p.data.blocks);
  const total = pages[0]?.data.totalBlocks ?? 0;
  const translationNotice = pages[0]?.data.translationNotice;

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      {translate && translationNotice && (
        <p className="mb-3 rounded-md bg-warn-tint px-3 py-2 text-xs text-warn">{translationNotice}</p>
      )}
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        {blocks.map((block) => (
          <BlockLine key={block.citationId} block={block} translate={translate} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>
          Đã tải {blocks.length}/{total} đoạn
        </span>
        {hasNextPage && (
          <Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
            Tải thêm
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AustraliaLawDetailPage() {
  const { id = '' } = useParams();
  const [showContent, setShowContent] = useState(false);
  const [translate, setTranslate] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['au-laws', id], queryFn: () => australiaLawsApi.get(id), retry: false });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;
  const law = data.data;

  return (
    <div>
      <Link to="/australia-laws" className="mb-3 inline-flex items-center gap-1 text-sm text-brand hover:underline">
        <ArrowLeft size={14} /> Danh sách luật Úc
      </Link>

      <PageHeader
        title={law.nameVi ?? law.name}
        description={law.nameVi ? law.name : undefined}
        actions={
          <a href={law.officialUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" iconLeft={<ExternalLink size={16} />}>
              Nguồn chính thức
            </Button>
          </a>
        }
      />

      <p className="mb-4 rounded-md bg-warn-tint px-4 py-3 text-sm text-warn">{AU_SCOPE_NOTICE}</p>

      <dl className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-4">
        <Field label="Mã văn bản" value={law.id} />
        <Field label="Loại" value={law.collection} />
        <Field label="Ngày ban hành" value={law.makingDate} />
        <Field label="Hiệu lực" value={law.status} />
        <Field label="Năm / số" value={law.year && law.number ? `${law.year} / ${law.number}` : null} />
        <Field label="Phiên bản (bản biên soạn)" value={law.version?.compilationNumber} />
        <Field label="Mã đăng ký phiên bản" value={law.version?.registerId} />
        <Field label="Phiên bản có hiệu lực từ" value={law.version?.startDate} />
      </dl>

      <h2 className="mb-2 text-base font-semibold text-ink">Tệp có sẵn ở nguồn</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        {law.documents.length === 0 && <span className="text-sm text-muted">Nguồn chưa có tệp cho phiên bản này.</span>}
        {law.documents.map((doc) => (
          <Badge key={`${doc.type}-${doc.format}-${doc.volumeNumber}`} tone={doc.isAuthorised ? 'brand' : 'neutral'}>
            {doc.format}
            {doc.volumeNumber > 0 ? ` tập ${doc.volumeNumber}` : ''}
            {doc.pageCount ? ` · ${doc.pageCount} trang` : doc.sizeInBytes ? ` · ${Math.round(doc.sizeInBytes / BYTES_PER_KB)} KB` : ''}
            {doc.isAuthorised ? ' · bản có thẩm quyền' : ''}
          </Badge>
        ))}
      </div>

      {law.hasReadableText && (
        <>
          <h2 className="mb-2 text-base font-semibold text-ink">Tóm lược nội dung chính</h2>
          <div className="mb-6">
            <SummaryBlock id={law.id} />
          </div>
        </>
      )}

      <h2 className="mb-2 text-base font-semibold text-ink">Lịch sử phiên bản</h2>
      <div className="mb-6">
        <VersionTable id={law.id} />
      </div>

      <h2 className="mb-2 text-base font-semibold text-ink">Nội dung văn bản</h2>
      {!law.hasReadableText && (
        <p className="text-sm text-muted">Văn bản này chưa có bản đọc được qua API (chỉ PDF/Word). Xem bản chính thức theo liên kết ở trên.</p>
      )}
      {law.hasReadableText && !showContent && <Button onClick={() => setShowContent(true)}>Xem nội dung</Button>}
      {law.hasReadableText && showContent && law.canTranslate && (
        <div className="mb-3">
          <Button variant="secondary" onClick={() => setTranslate((value) => !value)}>
            {translate ? 'Xem bản gốc tiếng Anh' : 'Dịch sang tiếng Việt'}
          </Button>
        </div>
      )}
      {law.hasReadableText && showContent && <ContentViewer id={law.id} translate={translate} />}
    </div>
  );
}
