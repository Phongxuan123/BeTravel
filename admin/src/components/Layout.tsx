import { Fragment, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Globe2, Tags, FileText, MapPin, History, LogOut, BrainCircuit, MessageSquareWarning, Siren, Languages, TriangleAlert } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/countries', label: 'Quốc gia', icon: Globe2 },
  { to: '/topics', label: 'Chủ đề', icon: Tags },
  { to: '/articles', label: 'Bài luật', icon: FileText },
  { to: '/locations', label: 'Điểm hỗ trợ', icon: MapPin },
  { to: '/incidents', label: 'Xử lý sự cố', icon: Siren },
  { to: '/quick-phrases', label: 'Câu dịch sẵn', icon: Languages },
  { to: '/geo-alerts', label: 'Cảnh báo vị trí', icon: TriangleAlert },
  { to: '/rag', label: 'RAG Index', icon: BrainCircuit },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareWarning },
  { to: '/audit', label: 'Nhật ký', icon: History },
];

// Sinh breadcrumb tu segment URL -- du don gian cho quy mo admin nay, khong
// can cau hinh route-meta rieng.
function useBreadcrumb(): string[] {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const labelMap: Record<string, string> = {
    countries: 'Quốc gia',
    topics: 'Chủ đề',
    articles: 'Bài luật',
    locations: 'Điểm hỗ trợ',
    incidents: 'Xử lý sự cố',
    'quick-phrases': 'Câu dịch sẵn',
    'geo-alerts': 'Cảnh báo vị trí',
    rag: 'RAG Index',
    feedback: 'Feedback',
    audit: 'Nhật ký',
    new: 'Tạo mới',
  };
  return segments.map((segment) => labelMap[segment] ?? segment);
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const breadcrumb = useBreadcrumb();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Dưới breakpoint md sidebar thu thành dải icon để nội dung còn chỗ trên màn hẹp (B21). */}
      <aside className="w-14 shrink-0 border-r border-line bg-white md:w-60">
        <div className="flex h-14 items-center justify-center border-b border-line px-2 md:justify-start md:px-4">
          <Link to="/" className="font-semibold text-ink">
            <span className="md:hidden">BT</span>
            <span className="hidden md:inline">Be.Travel Admin</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              aria-label={label}
              className={({ isActive }) =>
                `flex items-center justify-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium md:justify-start md:px-3 ${
                  isActive ? 'bg-blue-50 text-brand' : 'text-ink hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-white px-3 md:px-5">
          <div className="min-w-0 truncate text-sm text-muted">
            <Link to="/" className="hover:text-ink">
              Trang chủ
            </Link>
            {breadcrumb.map((crumb, index) => (
              <Fragment key={index}>
                <span className="mx-1.5">/</span>
                <span className={index === breadcrumb.length - 1 ? 'text-ink' : ''}>{crumb}</span>
              </Fragment>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3 text-sm">
            <span className="hidden text-ink sm:inline">{user?.fullName}</span>
            <button
              onClick={onLogout}
              aria-label="Đăng xuất"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted hover:bg-slate-100 hover:text-ink"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
