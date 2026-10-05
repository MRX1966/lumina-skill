import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, BookOpen, ClipboardText, Exam, Certificate, UserCircle, GearSix, SignOut, Bell, List, MagnifyingGlass, GraduationCap, DotsThreeVertical, TrendUp, BellRinging, NotePencil } from '@phosphor-icons/react';
import { ROUTES, BRAND_NAME, studentNavItems } from '@/constants/navigation';
import { MobileDrawer } from '@/components/MobileDrawer';
import { useAuth } from '@/contexts/AuthContext';

const IconMap: Record<string, React.ElementType> = {
  House, BookOpen, ClipboardText, Exam, Certificate, UserCircle, GearSix, TrendUp, BellRinging
};

export function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] flex bg-zinc-50 dark:bg-zinc-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-zinc-900 focus:shadow-lg"
      >
        Skip to content
      </a>
      <aside className={`hidden lg:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link to={ROUTES.studentDashboard} className={`flex items-center gap-2 font-bold text-emerald-600 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <GraduationCap size={22} weight="fill" />
            {!sidebarCollapsed && <span className="text-sm">{BRAND_NAME}</span>}
          </Link>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <DotsThreeVertical size={16} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {studentNavItems.map((item) => {
            const Icon = IconMap[item.icon] || House;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path.replace(/\/:\w+/g, ''));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
          >
            <SignOut size={18} />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={studentNavItems}
        user={user ? { name: profile?.full_name || user.email || 'Student', email: user.email || '' } : null}
        role="student"
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open student navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden min-h-11 min-w-11 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <List size={20} />
            </button>
            <div className="relative hidden sm:block">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="text" placeholder="Search courses..." className="w-64 pl-9 pr-4 py-2 rounded-lg text-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <Link to={ROUTES.studentProfile} className="flex items-center gap-2 ml-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-semibold text-sm">S</div>
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 pb-24 lg:p-6 overflow-auto focus-visible:outline-none">
          <Outlet />
        </main>
      </div>
      <nav
        aria-label="Student quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden"
      >
        {[
          { to: ROUTES.studentDashboard, label: 'Home', icon: House },
          { to: ROUTES.studentCourses, label: 'Courses', icon: BookOpen },
          { to: ROUTES.studentAssignments, label: 'Tasks', icon: NotePencil },
          { to: ROUTES.studentProfile, label: 'Profile', icon: UserCircle },
        ].map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                active
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon size={21} weight={active ? 'fill' : 'regular'} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}