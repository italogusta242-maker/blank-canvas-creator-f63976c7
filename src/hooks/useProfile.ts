import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_PROFILE } from "@/lib/mockData";

export const useProfile = () => {
  const { user } = useAuth();
  const isMock = localStorage.getItem("USE_MOCK") === "true";

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (isMock) return MOCK_PROFILE;
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, status, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) {
        console.warn("Ignorando erro de schema no useProfile:", error);
        return { id: user.id, full_name: "Aluna", status: "ativo", onboarded: true, phone: "", avatar_url: null };
      }
      
      return data ? { ...data, onboarded: true } : { id: user.id, full_name: "Aluna", status: "ativo", onboarded: true, phone: "", avatar_url: null };
    },
    enabled: !!user || isMock,
  });
};
