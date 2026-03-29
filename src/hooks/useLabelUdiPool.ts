import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LabelUdiPoolEntry {
  id: string;
  label_id: string;
  label_design_id: string;
  udi_di_value: string;
  price_cents: number;
  currency: string;
  is_available: boolean;
  created_at: string;
  design_name?: string;
}

export const useLabelUdiPool = (labelId: string | null) =>
  useQuery({
    queryKey: ["label_udi_pool", labelId],
    enabled: !!labelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("label_udi_pool")
        .select("*, label_designs(name)")
        .eq("label_id", labelId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        design_name: row.label_designs?.name ?? "–",
        label_designs: undefined,
      })) as LabelUdiPoolEntry[];
    },
  });

interface CreateLabelUdiInput {
  label_id: string;
  label_design_id: string;
  udi_di_value: string;
  price_cents: number;
}

export const useCreateLabelUdi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLabelUdiInput) => {
      const { data, error } = await supabase
        .from("label_udi_pool")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["label_udi_pool", v.label_id] });
      toast({ title: "UDI angelegt" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useCreateLabelUdiBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      label_id,
      label_design_id,
      udi_di_values,
      price_cents,
    }: {
      label_id: string;
      label_design_id: string;
      udi_di_values: string[];
      price_cents: number;
    }) => {
      const rows = udi_di_values.map((v) => ({
        label_id,
        label_design_id,
        udi_di_value: v,
        price_cents,
      }));
      const { data, error } = await supabase
        .from("label_udi_pool")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["label_udi_pool", v.label_id] });
      toast({ title: `${_d.length} UDIs angelegt` });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useUpdateLabelUdi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      label_id,
      price_cents,
    }: {
      id: string;
      label_id: string;
      price_cents: number;
    }) => {
      const { error } = await supabase
        .from("label_udi_pool")
        .update({ price_cents })
        .eq("id", id)
        .eq("label_id", label_id);
      if (error) throw error;
      return label_id;
    },
    onSuccess: (labelId) => {
      qc.invalidateQueries({ queryKey: ["label_udi_pool", labelId] });
      toast({ title: "Preis aktualisiert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useDeleteLabelUdi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label_id }: { id: string; label_id: string }) => {
      const { error } = await supabase
        .from("label_udi_pool")
        .delete()
        .eq("id", id)
        .eq("label_id", label_id)
        .eq("is_available", true);
      if (error) throw error;
      return label_id;
    },
    onSuccess: (labelId) => {
      qc.invalidateQueries({ queryKey: ["label_udi_pool", labelId] });
      toast({ title: "UDI gelöscht" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};
