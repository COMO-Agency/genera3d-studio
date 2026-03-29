import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

/** Returns the count of available (unused) GTINs for the user's org */
export const useGtinPoolCount = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["gtin-pool-count", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("gtin_pool")
        .select("id", { count: "exact", head: true })
        .eq("owner_type", "org")
        .eq("owner_id", orgId!)
        .eq("is_used", false);

      if (error) throw error;
      return count ?? 0;
    },
  });
};
