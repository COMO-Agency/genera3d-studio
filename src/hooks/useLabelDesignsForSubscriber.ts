import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useLabelSubscriptions } from "@/hooks/useLabelSubscription";

export interface SubscribedLabelDesign {
  id: string;
  name: string;
  image_url: string | null;
  glb_preview_url: string | null;
  weight_g: number | null;
  lens_width_mm: number | null;
  bridge_width_mm: number | null;
  temple_length_mm: number | null;
  master_udi_di_base: string;
  labelName: string;
  labelId: string;
}

export const useLabelDesignsForSubscriber = () => {
  const { data: profile } = useProfile();
  const { data: subscriptions } = useLabelSubscriptions();

  const labelIds = subscriptions?.map((s) => s.label_id) ?? [];
  const stableKey = labelIds.slice().sort().join(",");

  return useQuery({
    queryKey: ["label_designs_subscribed", stableKey],
    enabled: !!profile?.org_id && labelIds.length > 0,
    queryFn: async () => {
      // Fetch label designs for all subscribed labels
      const { data: designs, error: dErr } = await supabase
        .from("label_designs")
        .select("*")
        .in("label_id", labelIds)
        .eq("is_active", true);
      if (dErr) throw dErr;

      // Fetch label names
      const { data: labels, error: lErr } = await supabase
        .from("labels")
        .select("id, name")
        .in("id", labelIds);
      if (lErr) throw lErr;

      const labelMap = new Map(labels?.map((l) => [l.id, l.name]) ?? []);

      return (designs ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        image_url: d.image_url,
        glb_preview_url: d.glb_preview_url,
        weight_g: d.weight_g,
        lens_width_mm: d.lens_width_mm,
        bridge_width_mm: d.bridge_width_mm,
        temple_length_mm: d.temple_length_mm,
        master_udi_di_base: d.master_udi_di_base,
        labelName: labelMap.get(d.label_id) ?? "Label",
        labelId: d.label_id,
      })) as SubscribedLabelDesign[];
    },
  });
};
