import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LabelMember {
  id: string;
  label_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

/** All label memberships for the current user */
export const useMyLabelMemberships = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["label_members", "my", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("label_members")
        .select("*")
        .eq("user_id", user?.id ?? "");
      if (error) throw error;
      return data as LabelMember[];
    },
  });
};

/** Check if current user is admin of any label — returns first label_id or null */
export const useIsLabelAdmin = () => {
  const { data: memberships, isLoading } = useMyLabelMemberships();
  const adminMembership = memberships?.find((m) => m.role === "label_admin");
  return {
    isLabelAdmin: !!adminMembership,
    labelId: adminMembership?.label_id ?? null,
    isLoading,
  };
};
