import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";

interface ProtectedRouteProps {
  /** "admin" = platform admin only, "label_admin" = label admin or platform admin */
  requiredRole?: "admin" | "label_admin";
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const { isLabelAdmin, isLoading: labelLoading } = useIsLabelAdmin();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">G3</span>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Laden…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const needsLabelCheck = requiredRole === "label_admin";
    const stillLoading = roleLoading || (needsLabelCheck && labelLoading);

    if (stillLoading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }

    const hasAccess =
      requiredRole === "admin"
        ? isPlatformAdmin
        : isPlatformAdmin || isLabelAdmin;

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
