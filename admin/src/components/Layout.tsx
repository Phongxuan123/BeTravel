import { Fragment, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  FileText,
  Globe2,
  History,
  Languages,
  LayoutDashboard,
  LogOut,
  MapPin,
  Maximize2,
  Minimize2,
  Plane,
  Scale,
  Siren,
  Tags,
  TriangleAlert,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { usePresentationMode } from '../lib/usePresentationMode';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

// Nhom menu theo 4 lop san pham (master plan) de khi trinh bay nhin la biet tung phan thuoc lop nao.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Kho tri thức',
    items: [
      { to: '/countries', label: 'Quốc gia', icon: Globe2 },
      { to: '/topics', label: 'Chủ đề', icon: Tags },
      { to: '/articles', label: 'Bài luật', icon: FileText },
      { to: '/australia-laws', label: 'Luật Úc', icon: Scale },
    ],
  },
  {
    title: 'Hỗ trợ tại chỗ',
    items: [
      { to: '/locations', label: 'Điểm hỗ trợ', icon: MapPin },
      { to: '/incidents', label: 'Xử lý sự cố', icon: Siren },
      { to: '/geo-alerts', label: 'Cảnh báo vị trí', icon: TriangleAlert },
      { to: '/quick-phrases', label: 'Câu dịch sẵn', icon: Languages },
    ],
  },
  {
    title: 'Trợ lý AI',
    items: [
      { to: '/assistant', label: 'Trợ lý AI', icon: Bot },
      { to: '/rag', label: 'RAG Index', icon: BrainCircuit },
    ],
  },
  {
    title: 'Hệ thống',
    items: [{ to: '/audit', label: 'Nhật ký', icon: History }],
  },
];

const SEGMENT_LABEL: Record<string, string> = {
  countries: 'Quốc gia',
  topics: 'Chủ đề',
  articles: 'Bài luật',
  locations: 'Điểm hỗ trợ',
  incidents: 'Xử lý sự cố',
  'australia-laws': 'Luật Úc',
  'quick-phrases': 'Câu dịch sẵn',
  'geo-alerts': 'Cảnh báo vị trí',
  assistant: 'Trợ lý AI',
  rag: 'RAG Index',
  audit: 'Nhật ký',
  new: 'Tạo mới',
};

// Sinh breadcrumb tu segment URL -- du don gian cho quy mo admin nay, khong can route-meta rieng.
function useBreadcrumb(): string[] {
  const { pathname } = useLocation();
  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => SEGMENT_LABEL[segment] ?? segment);
}

function initialsOf(fullName: string | undefined) {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? 'AD' : words.slice(-2).map((word) => word[0]!.toUpperCase()).join('');
}

function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-14 shrink-0 flex-col bg-sidebar text-white md:w-60">
      <Link to="/" className="flex h-16 items-center justify-center gap-2.5 px-2 md:justify-start md:px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
          <Plane size={17} />
        </span>
        <span className="hidden leading-tight md:block">
          <span className="block text-sm font-semibold">Be.Travel</span>
          <span className="block text-[11px] text-sidebar-muted">Cổng quản trị</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mt-3">
            <div className="mb-1 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted md:block">
              {group.title}
            </div>
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors md:justify-start md:px-3 ${
                    isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const breadcrumb = useBreadcrumb();
  const { presenting, toggle: togglePresenting } = usePresentationMode();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Duoi breakpoint md sidebar thu thanh dai icon (B21); che do trinh chieu an han. */}
      {!presenting && <Sidebar />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-3 backdrop-blur md:px-6">
          <div className="min-w-0 truncate text-sm text-muted">
            <Link to="/" className="hover:text-ink">
              Trang chủ
            </Link>
            {breadcrumb.map((crumb, index) => (
              <Fragment key={index}>
                <span className="mx-1.5 text-slate-300">/</span>
                <span className={index === breadcrumb.length - 1 ? 'font-medium text-ink' : ''}>{crumb}</span>
              </Fragment>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm">
            <button
              onClick={togglePresenting}
              aria-pressed={presenting}
              title={presenting ? 'Thoát trình chiếu (Esc)' : 'Chế độ trình chiếu: ẩn menu, phóng to chữ'}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                presenting ? 'bg-brand text-white hover:bg-brand-dark' : 'text-muted hover:bg-slate-100 hover:text-ink'
              }`}
            >
              {presenting ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span className="hidden sm:inline">{presenting ? 'Thoát trình chiếu' : 'Trình chiếu'}</span>
            </button>

            <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand">
                {initialsOf(user?.fullName)}
              </span>
              <span className="leading-tight">
                <span className="block font-medium text-ink">{user?.fullName}</span>
                <span className="block text-[11px] text-muted">Quản trị viên</span>
              </span>
            </div>
            <button
              onClick={onLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted hover:bg-slate-100 hover:text-ink"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
