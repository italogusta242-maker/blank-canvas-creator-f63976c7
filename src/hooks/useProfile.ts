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
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, status, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        return data ? { ...data, onboarded: true } : { id: user.id, full_name: "Aluna", status: "ativo", onboarded: true, phone: "" };
      } catch (err) {
        console.warn("useProfile: fetch failed (schema error), fallback to Ghost Profile:", err);
        return { id: user.id, full_name: "Aluna", status: "ativo", onboarded: true, phone: "" };
      }
    },
    enabled: !!user || isMock,
  });
};
