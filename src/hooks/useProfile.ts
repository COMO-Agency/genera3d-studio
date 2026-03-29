import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Cache configuration - Profile changes rarely
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("No authenticated user");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
