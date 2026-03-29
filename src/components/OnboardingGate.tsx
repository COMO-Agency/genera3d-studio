import { Navigate, Outlet } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useMyLabelMemberships } from "@/hooks/useLabelMembers";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";

/**
 * Redirects authenticated users to /onboarding when they have
 * neither an organization nor any label membership.
 * Platform admins bypass this gate.
 */
const OnboardingGate = () => {
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useProfile();
  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
  } = useMyLabelMemberships();
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();

  const isLoading = profileLoading || membershipsLoading || roleLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (profileError || membershipsError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          Profildaten konnten nicht geladen werden.
        </p>
        <button
          className="text-sm text-primary underline"
          onClick={() => window.location.reload()}
        >
          Seite neu laden
        </button>
      </div>
    );
  }

  if (isPlatformAdmin) return <Outlet />;

  const hasOrg = !!profile?.org_id;
  const hasLabel = (memberships?.length ?? 0) > 0;

  if (!hasOrg && !hasLabel) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export default OnboardingGate;
