import { useProfile } from "@/hooks/useProfile";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";

export const useAdminScopes = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isLabelAdmin, labelId, isLoading: labelLoading } = useIsLabelAdmin();
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();

  const hasOrgScope = !!profile?.org_id;
  const hasLabelScope = isLabelAdmin && !!labelId;
  const isOperationalAdmin = hasOrgScope || hasLabelScope;
  const isLoading = profileLoading || labelLoading || roleLoading;

  // Primary scope determines what /settings and /my-designs show by default
  const primaryScope: "org" | "label" | null = hasOrgScope
    ? "org"
    : hasLabelScope
      ? "label"
      : null;

  return {
    hasOrgScope,
    hasLabelScope,
    isPlatformAdmin,
    isOperationalAdmin,
    isLoading,
    primaryScope,
    labelId: labelId ?? null,
    orgId: profile?.org_id ?? null,
  };
};
