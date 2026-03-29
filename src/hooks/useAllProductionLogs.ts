import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { ProductionLogWithDesign } from "@/lib/types";

const STALE_TIME = 2 * 60 * 1000;
const GC_TIME = 5 * 60 * 1000;

interface PaginationParams {
  page: number;
  pageSize: number;
}

export const useAllProductionLogs = (pagination?: PaginationParams) => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["production_logs_all", orgId, pagination?.page, pagination?.pageSize],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) throw new Error("No organization");

      let query = supabase
        .from("production_logs")
        .select("*", { count: "exact" })
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (pagination) {
        const from = pagination.page * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      } else {
        query = query.limit(100); // Default limit for non-paginated calls
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return {
        logs: (data ?? []) as ProductionLogWithDesign[],
        total: count ?? 0,
        page: pagination?.page ?? 0,
        pageSize: pagination?.pageSize ?? (data?.length ?? 0),
      };
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
};
