import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

// Cache configuration - Materials rarely change
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

export const useMaterials = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["materials", orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      // RLS allows own org + global org materials — no client-side org filter needed
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
};
