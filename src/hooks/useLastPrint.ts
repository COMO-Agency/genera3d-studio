import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LastPrint {
  design_id: string;
  design_name: string;
  color: string | null;
  color_name: string | null;
  mode: string | null;
  customer_ref: string | null;
}

export const useLastPrint = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["last_print", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<LastPrint | null> => {
      const { data, error } = await supabase
        .from("production_logs")
        .select("design_id, design_name, color, color_name, mode, customer_ref")
        .eq("user_id", user?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        design_id: data.design_id ?? "",
        design_name: data.design_name ?? "Design",
        color: data.color,
        color_name: data.color_name,
        mode: data.mode,
        customer_ref: data.customer_ref,
      };
    },
  });
};
