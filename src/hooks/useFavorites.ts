import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const EMPTY_SET = new Set<string>();

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("design_id")
        .eq("user_id", user?.id ?? "");
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.design_id));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      designId,
      wasFav,
    }: {
      designId: string;
      wasFav: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (wasFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("design_id", designId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, design_id: designId });
        if (error) throw error;
      }
    },
    onMutate: async ({ designId }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      const prev =
        queryClient.getQueryData<Set<string>>(["favorites", user?.id]) ??
        new Set<string>();
      const next = new Set(prev);
      if (next.has(designId)) next.delete(designId);
      else next.add(designId);
      queryClient.setQueryData(["favorites", user?.id], next);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev)
        queryClient.setQueryData(["favorites", user?.id], context.prev);
      toast({
        title: "Fehler beim Aktualisieren der Favoriten",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });

  const toggle = (designId: string) => {
    const wasFav = query.data?.has(designId) ?? false;
    toggleMutation.mutate({ designId, wasFav });
  };

  return {
    favorites: query.data ?? EMPTY_SET,
    isLoading: query.isLoading,
    toggle,
  };
};
