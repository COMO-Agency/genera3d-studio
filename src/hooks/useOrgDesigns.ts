import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/utils";

// Cache configuration
const STALE_TIME = 3 * 60 * 1000; // 3 minutes
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export interface OrgDesign {
  id: string;
  org_id: string;
  name: string;
  image_url: string | null;
  lens_width_mm: number | null;
  bridge_width_mm: number | null;
  temple_length_mm: number | null;
  weight_g: number | null;
  master_udi_di_base: string | null;
  collection: string | null;
  size: string | null;
  construction_type: string | null;
  serial_prefix: string | null;
  fixed_gtin: string | null;
  is_active: boolean;
  created_at: string;
}

export const useOrgDesigns = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["org_designs", orgId],
    enabled: !!orgId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_designs")
        .select(
          "id, org_id, name, image_url, lens_width_mm, bridge_width_mm, temple_length_mm, weight_g, master_udi_di_base, collection, size, construction_type, serial_prefix, fixed_gtin, is_active, created_at",
        )
        .eq("org_id", orgId as string)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrgDesign[];
    },
  });
};

export interface CreateOrgDesignInput {
  name: string;
  image_url?: string;
  lens_width_mm?: number;
  bridge_width_mm?: number;
  temple_length_mm?: number;
  weight_g?: number;
  master_udi_di_base?: string;
  collection?: string;
  size?: string;
  construction_type?: string;
  serial_prefix?: string;
  fixed_gtin?: string;
}

export const useCreateOrgDesign = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrgDesignInput) => {
      if (!orgId) throw new Error("Keine Organisation");
      const { data, error } = await supabase
        .from("org_designs")
        .insert({ ...input, org_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_designs"] });
      toast({
        title: "Design angelegt",
        description: "Eigenes Design wurde gespeichert.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOrgDesign = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<CreateOrgDesignInput> & { id: string }) => {
      if (!orgId) throw new Error("Keine Organisation");
      const { data, error } = await supabase
        .from("org_designs")
        .update(input)
        .eq("id", id)
        .eq("org_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_designs"] });
      toast({ title: "Design aktualisiert" });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteOrgDesign = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error("Keine Organisation");
      const { error } = await supabase
        .from("org_designs")
        .update({ is_active: false })
        .eq("id", id)
        .eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_designs"] });
      toast({ title: "Design entfernt" });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    },
  });
};

export const useUploadDesignImage = () => {
  return useMutation({
    mutationFn: async ({ file, orgId }: { file: File; orgId: string }) => {
      validateImageFile(file);
      const ext = file.name.split(".").pop();
      const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("org-design-images")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("org-design-images")
        .getPublicUrl(path);
      return urlData.publicUrl;
    },
    onError: (err: Error) => {
      toast({
        title: "Upload fehlgeschlagen",
        description: err.message,
        variant: "destructive",
      });
    },
  });
};
