import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

// Cache configuration - Colors change occasionally
const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export interface OrgColor {
  id: string;
  org_id: string;
  name: string;
  color_type: "standard" | "custom_mix";
  color_code: string | null;
  cyan: number | null;
  magenta: number | null;
  yellow: number | null;
  black: number | null;
  white: number | null;
  natural_pct: number | null;
  hex_preview: string | null;
  opacity_type: "opak" | "transparent" | "transluzent";
  is_active: boolean;
  created_at: string;
}

export const useOrgColors = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["org_colors", orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      // RLS allows own org + global org colors — no client-side org filter needed
      const { data, error } = await supabase
        .from("org_colors")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as OrgColor[];
    },
  });
};

export interface CreateColorInput {
  name: string;
  color_type: "standard" | "custom_mix";
  color_code?: string;
  cyan?: number;
  magenta?: number;
  yellow?: number;
  black?: number;
  white?: number;
  natural_pct?: number;
  hex_preview?: string;
  opacity_type?: "opak" | "transparent" | "transluzent";
}

export const useCreateOrgColor = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateColorInput) => {
      if (!orgId) throw new Error("Keine Organisation");
      const { data, error } = await supabase
        .from("org_colors")
        .insert({ ...input, org_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_colors"] });
      toast({ title: "Farbe angelegt", description: "Neue Farbe wurde gespeichert." });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useDeleteOrgColor = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("Keine Organisation");
      const { error } = await supabase
        .from("org_colors")
        .update({ is_active: false })
        .eq("id", id)
        .eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org_colors"] });
      toast({ title: "Farbe entfernt" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};
