import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export const useOrganization = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["organization", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .single();

      if (error) throw error;
      return data;
    },
  });
};
