import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STALE_TIME = 60 * 1000; // 1 minute
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: true,
    retry: 1,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data?.map((r) => r.role) ?? [];
    },
  });
};

export const useIsPlatformAdmin = () => {
  const { data: roles, isLoading } = useUserRole();
  return { isPlatformAdmin: roles?.includes("admin") ?? false, isLoading };
};

/** @deprecated Use useIsPlatformAdmin instead */
export const useIsAdmin = () => {
  const { isPlatformAdmin, isLoading } = useIsPlatformAdmin();
  return { isAdmin: isPlatformAdmin, isLoading };
};
