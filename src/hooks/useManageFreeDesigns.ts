import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/utils";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";

export interface FreeDesignInput {
  name: string;
  collection_id?: string | null;
  size?: string | null;
  construction_type?: string | null;
  serial_prefix?: string | null;
  fixed_gtin?: string | null;
  weight_g?: number | null;
  lens_width_mm?: number | null;
  bridge_width_mm?: number | null;
  temple_length_mm?: number | null;
  master_udi_di_base: string;
  glb_preview_url?: string | null;
  manufacturer_name?: string | null;
  manufacturer_address?: string | null;
  manufacturer_city?: string | null;
  manufacturer_atu?: string | null;
  manufacturer_contact?: string | null;
}

// Admin-Check helper - wirft Fehler wenn kein Admin
const checkAdmin = (isPlatformAdmin: boolean | undefined) => {
  if (!isPlatformAdmin) {
    throw new Error("Nur Plattform-Admins können Free Designs verwalten.");
  }
};

export const useCreateFreeDesign = () => {
  const qc = useQueryClient();
  const { isPlatformAdmin } = useIsPlatformAdmin();

  return useMutation({
    mutationFn: async (input: FreeDesignInput) => {
      checkAdmin(isPlatformAdmin);
      const { error } = await supabase.from("designs").insert({
        ...input,
        is_latest: true,
        version: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["free_designs"] });
      toast({ title: "Design erstellt" });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateFreeDesign = () => {
  const qc = useQueryClient();
  const { isPlatformAdmin } = useIsPlatformAdmin();

  return useMutation({
    mutationFn: async ({ id, ...input }: FreeDesignInput & { id: string }) => {
      checkAdmin(isPlatformAdmin);
      const { error } = await supabase.from("designs").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["free_designs"] });
      toast({ title: "Design aktualisiert" });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteFreeDesign = () => {
  const qc = useQueryClient();
  const { isPlatformAdmin } = useIsPlatformAdmin();

  return useMutation({
    mutationFn: async (id: string) => {
      checkAdmin(isPlatformAdmin);
      const { error } = await supabase.from("designs").update({ is_latest: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["free_designs"] });
      toast({ title: "Design entfernt" });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });
};

export const useUploadFreeDesignImage = () => {
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      validateImageFile(file);
      const ext = file.name.split(".").pop();
      const path = `free-designs/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("org-design-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("org-design-images").getPublicUrl(path);
      return data.publicUrl;
    },
    onError: (e: Error) => toast({ title: "Upload fehlgeschlagen", description: e.message, variant: "destructive" }),
  });
};
