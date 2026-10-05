import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/navigation';
import { CircleNotch } from '@phosphor-icons/react';

interface ProtectedRouteProps {
  requiredRole?: 'student' | 'admin' | 'super_admin';
}

function hasRoleAccess(profileRole: string | null | undefined, requiredRole?: 'student' | 'admin' | 'super_admin') {
  if (!requiredRole) return true;
  if (!profileRole) return false;

  if (requiredRole === 'admin') {
    return profileRole === 'admin' || profileRole === 'super_admin';
  }

  if (requiredRole === 'student') {
    return profileRole === 'student';
  }

  return profileRole === 'super_admin';
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, initialized } = useAuth();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch size={32} className="text-emerald-600 animate-spin" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRoleAccess(profile?.role, requiredRole)) {
    const redirectTo = profile?.role === 'admin' || profile?.role === 'super_admin' ? ROUTES.adminDashboard : ROUTES.studentDashboard;
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}