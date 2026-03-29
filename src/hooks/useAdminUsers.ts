import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Cache configuration
const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  org_id: string | null;
  org_name?: string | null;
  roles: string[];
  label_memberships: { id: string; label_id: string; label_name: string; role: string }[];
}

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ["admin-users"],
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const [profilesRes, rolesRes, membersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, org_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("label_members").select("id, user_id, label_id, role, labels(name)"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (membersRes.error) throw membersRes.error;
      const profiles = profilesRes.data;
      const roles = rolesRes.data;
      const members = membersRes.data;

      const orgIds = [...new Set(profiles?.filter(p => p.org_id).map(p => p.org_id as string))];
      const orgMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        orgs?.forEach(o => { orgMap[o.id] = o.name; });
      }

      const rolesMap: Record<string, string[]> = {};
      roles?.forEach(r => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      const membersMap: Record<string, AdminUser["label_memberships"]> = {};
      members?.forEach((m: { id: string; user_id: string; label_id: string; role: string; labels: { name: string } | null }) => {
        if (!membersMap[m.user_id]) membersMap[m.user_id] = [];
        membersMap[m.user_id].push({
          id: m.id,
          label_id: m.label_id,
          label_name: m.labels?.name ?? "–",
          role: m.role,
        });
      });

      return (profiles ?? []).map((p): AdminUser => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        org_id: p.org_id,
        org_name: p.org_id ? orgMap[p.org_id] ?? null : null,
        roles: rolesMap[p.id] ?? [],
        label_memberships: membersMap[p.id] ?? [],
      }));
    },
  });
};

export const useAllLabels = () => {
  return useQuery({
    queryKey: ["all-labels"],
    staleTime: 5 * 60 * 1000, // 5 minutes - labels rarely change
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labels")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useToggleAdminRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Rolle aktualisiert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useAddLabelMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, labelId, role }: { userId: string; labelId: string; role: string }) => {
      const { error } = await supabase
        .from("label_members")
        .insert({ user_id: userId, label_id: labelId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Label-Mitgliedschaft hinzugefügt" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};

export const useRemoveLabelMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId }: { membershipId: string }) => {
      const { error } = await supabase
        .from("label_members")
        .delete()
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Label-Mitgliedschaft entfernt" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
};
