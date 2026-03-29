import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FreeDesign {
  id: string;
  name: string;
  version: number | null;
  weight_g: number | null;
  lens_width_mm: number | null;
  bridge_width_mm: number | null;
  temple_length_mm: number | null;
  master_udi_di_base: string;
  glb_preview_url: string | null;
  collection_id: string | null;
  collectionName: string;
  size: string | null;
  construction_type: string | null;
  serial_prefix: string | null;
  fixed_gtin: string | null;
  manufacturer_name: string | null;
  manufacturer_address: string | null;
  manufacturer_city: string | null;
  manufacturer_atu: string | null;
  manufacturer_contact: string | null;
}

export const useFreeDesigns = () => {
  return useQuery({
    queryKey: ["free_designs"],
    queryFn: async () => {
      const [designsRes, collectionsRes] = await Promise.all([
        supabase.from("designs").select("*").eq("is_latest", true),
        supabase.from("collections").select("id, name").eq("is_active", true),
      ]);

      if (designsRes.error) throw designsRes.error;
      if (collectionsRes.error) throw collectionsRes.error;

      const collectionMap = new Map(
        (collectionsRes.data ?? []).map((c) => [c.id, c.name])
      );

      return (designsRes.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        version: d.version,
        weight_g: d.weight_g,
        lens_width_mm: d.lens_width_mm,
        bridge_width_mm: d.bridge_width_mm,
        temple_length_mm: d.temple_length_mm,
        master_udi_di_base: d.master_udi_di_base,
        glb_preview_url: d.glb_preview_url,
        collection_id: d.collection_id,
        collectionName: d.collection_id
          ? collectionMap.get(d.collection_id) ?? "Sonstige"
          : "Sonstige",
        size: d.size ?? null,
        construction_type: d.construction_type ?? null,
        serial_prefix: d.serial_prefix ?? null,
        fixed_gtin: d.fixed_gtin ?? null,
        manufacturer_name: d.manufacturer_name ?? null,
        manufacturer_address: d.manufacturer_address ?? null,
        manufacturer_city: d.manufacturer_city ?? null,
        manufacturer_atu: d.manufacturer_atu ?? null,
        manufacturer_contact: d.manufacturer_contact ?? null,
      })) as FreeDesign[];
    },
  });
};
