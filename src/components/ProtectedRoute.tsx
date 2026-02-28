import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute, getRoleHomePath, normalizeRole } from "@/lib/rbac";
import type { UserRole } from "@/types";

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memeriksa sesi login...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !canAccessRoute(user.role, location.pathname)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  if (user && allowedRoles) {
    const normalizedRole = normalizeRole(user.role);
    if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
      return <Navigate to={getRoleHomePath(user.role)} replace />;
    }
  }

  return <Outlet />;
}
