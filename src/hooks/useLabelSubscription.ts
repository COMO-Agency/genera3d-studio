import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

export interface LabelSubscription {
  id: string;
  label_id: string;
  org_id: string;
  accepted_tc_at: string | null;
  status: string;
  created_at: string;
}

export const useLabelSubscriptions = () => {
  const { data: profile } = useProfile();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ["label_subscriptions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("label_subscriptions")
        .select("*")
        .eq("org_id", orgId as string)
        .eq("status", "active");
      if (error) throw error;
      return data as LabelSubscription[];
    },
  });
};

export const useIsSubscribed = (labelId: string | undefined) => {
  const { data: subs, isLoading } = useLabelSubscriptions();
  return {
    isSubscribed: subs?.some((s) => s.label_id === labelId) ?? false,
    isLoading,
  };
};

export const useSubscribeToLabel = () => {
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      if (!profile?.org_id) throw new Error("Keine Organisation zugeordnet.");
      const { data, error } = await supabase
        .from("label_subscriptions")
        .insert({
          label_id: labelId,
          org_id: profile.org_id,
          accepted_tc_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["label_subscriptions"] });
      qc.invalidateQueries({ queryKey: ["label_designs_subscribed"] });
      toast({
        title: "Abonniert",
        description: "Du hast das Label erfolgreich abonniert.",
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

export const useUnsubscribeFromLabel = () => {
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      if (!profile?.org_id) throw new Error("Keine Organisation zugeordnet.");
      // Query fresh to avoid stale closure
      const { data: freshSubs, error: fetchErr } = await supabase
        .from("label_subscriptions")
        .select("id")
        .eq("org_id", profile.org_id)
        .eq("label_id", labelId)
        .eq("status", "active")
        .limit(1)
        .single();
      if (fetchErr || !freshSubs) throw new Error("Kein Abo gefunden.");
      const { error } = await supabase
        .from("label_subscriptions")
        .delete()
        .eq("id", freshSubs.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["label_subscriptions"] });
      qc.invalidateQueries({ queryKey: ["label_designs_subscribed"] });
      toast({ title: "Abgemeldet" });
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
