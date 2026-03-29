import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/utils";

export interface LabelDesign {
  id: string;
  label_id: string;
  name: string;
  image_url: string | null;
  glb_preview_url: string | null;
  lens_width_mm: number | null;
  bridge_width_mm: number | null;
  temple_length_mm: number | null;
  weight_g: number | null;
  face_shapes: string[];
  master_udi_di_base: string;
  version: number;
  is_latest: boolean;
  manufacturer_name: string | null;
  manufacturer_address: string | null;
  manufacturer_city: string | null;
  manufacturer_atu: string | null;
  manufacturer_contact: string | null;
  mdr_responsible_person: string | null;
  is_active: boolean;
  created_at: string;
}

export const useLabelDesigns = (labelId: string | undefined) =>
  useQuery({
    queryKey: ["label_designs", labelId],
    enabled: !!labelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("label_designs")
        .select("*")
        .eq("label_id", labelId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as LabelDesign[];
    },
  });

export interface CreateLabelDesignInput {
  label_id: string;
  name: string;
  image_url?: string;
  glb_preview_url?: string;
  lens_width_mm?: number;
  bridge_width_mm?: number;
  temple_length_mm?: number;
  weight_g?: number;
  face_shapes?: string[];
  master_udi_di_base: string;
  manufacturer_name?: string;
  manufacturer_address?: string;
  manufacturer_city?: string;
  manufacturer_atu?: string;
  manufacturer_contact?: string;
  mdr_responsible_person?: string;
}

export const useCreateLabelDesign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLabelDesignInput) => {
      const { data, error } = await supabase
        .from("label_designs")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["label_designs", v.label_id] });
      toast({ title: "Design angelegt" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useUpdateLabelDesign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label_id, ...input }: Partial<CreateLabelDesignInput> & { id: string; label_id: string }) => {
      const { data, error } = await supabase
        .from("label_designs")
        .update(input)
        .eq("id", id)
        .eq("label_id", label_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["label_designs", data.label_id] });
      toast({ title: "Design aktualisiert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useDeleteLabelDesign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, labelId }: { id: string; labelId: string }) => {
      const { error } = await supabase
        .from("label_designs")
        .update({ is_active: false })
        .eq("id", id)
        .eq("label_id", labelId);
      if (error) throw error;
      return labelId;
    },
    onSuccess: (labelId) => {
      qc.invalidateQueries({ queryKey: ["label_designs", labelId] });
      toast({ title: "Design entfernt" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useUploadLabelDesignImage = () =>
  useMutation({
    mutationFn: async ({ file, labelId }: { file: File; labelId: string }) => {
      validateImageFile(file);
      const ext = file.name.split(".").pop();
      const path = `${labelId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("label-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("label-assets")
        .getPublicUrl(path);
      return urlData.publicUrl;
    },
    onError: (err: Error) => {
      toast({ title: "Upload fehlgeschlagen", description: err.message, variant: "destructive" });
    },
  });
