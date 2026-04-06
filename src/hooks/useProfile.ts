import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_PROFILE } from "@/lib/mockData";

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, status, phone, avatar_url, onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Perfil não encontrado para o usuário autenticado.");

      return data;
    },
    enabled: !!user,
  });
};
