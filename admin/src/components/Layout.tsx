import { Fragment, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Globe2, Tags, FileText, MapPin, History, LogOut, BrainCircuit, MessageSquareWarning, Siren, Languages } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/countries', label: 'Quốc gia', icon: Globe2 },
  { to: '/topics', label: 'Chủ đề', icon: Tags },
  { to: '/articles', label: 'Bài luật', icon: FileText },
  { to: '/locations', label: 'Điểm hỗ trợ', icon: MapPin },
  { to: '/incidents', label: 'Xử lý sự cố', icon: Siren },
  { to: '/quick-phrases', label: 'Câu dịch sẵn', icon: Languages },
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
      <aside className="w-60 shrink-0 border-r border-line bg-white">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Link to="/" className="font-semibold text-ink">
            Be.Travel Admin
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-brand' : 'text-ink hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-white px-5">
          <div className="text-sm text-muted">
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

          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink">{user?.fullName}</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted hover:bg-slate-100 hover:text-ink"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
