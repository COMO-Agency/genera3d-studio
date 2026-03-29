import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Explicit column list — intentionally excludes stripe_account_id (sensitive)
const LABEL_COLUMNS =
  "id, name, slug, logo_url, description, terms_conditions, contact_email, contact_phone, ce_certificate_url, is_active, created_at" as const;

export interface Label {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  terms_conditions: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  ce_certificate_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const useLabels = (activeOnly = false) =>
  useQuery({
    queryKey: ["labels", { activeOnly }],
    queryFn: async () => {
      let query = supabase
        .from("labels")
        .select(LABEL_COLUMNS)
        .order("name");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Label[];
    },
  });

export const useLabelBySlug = (slug: string | undefined) =>
  useQuery({
    queryKey: ["labels", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labels")
        .select(LABEL_COLUMNS)
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Label;
    },
  });
