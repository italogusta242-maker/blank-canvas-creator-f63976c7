import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Medal, User, Zap, ChevronUp, ChevronDown, Calendar, Infinity as InfinityIcon, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type RankPeriod = "weekly" | "monthly" | "alltime";

const PERIOD_LABELS: Record<RankPeriod, { label: string; icon: React.ComponentType<any>; desc: string }> = {
  weekly:  { label: "Semana",  icon: Flame,    desc: "Pontos acumulados esta semana" },
  monthly: { label: "Mês",     icon: Calendar, desc: "Pontos acumulados este mês" },
  alltime: { label: "Geral",   icon: InfinityIcon, desc: "Todos os pontos da história" },
};

function getPeriodStart(period: RankPeriod): string | null {
  const now = new Date();
  if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  if (period === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null; // alltime
}

function useRanking(period: RankPeriod, plannerType?: string) {
  const { user } = useAuth();
  const periodStart = getPeriodStart(period);

  return useQuery({
    queryKey: ["gym-rats-ranking", period, plannerType],
    queryFn: async () => {
      // For alltime, use hustle_points directly from profiles (cached total)
      if (period === "alltime") {
        let q = supabase
          .from("profiles")
          .select("id, nome, avatar_url, hustle_points")
          .gt("hustle_points", 0)
          
        if (plannerType) q = q.eq("planner_type", plannerType);
        
        const { data, error } = await q.order("hustle_points", { ascending: false }).limit(30);
        if (error) throw error;
        return (data || []).map((p: any, i: number) => ({
          user_id: p.id,
          nome: p.nome || "Aluna",
          avatar_url: p.avatar_url,
          points: p.hustle_points ?? 0,
          position: i + 1,
          isMe: p.id === user?.id,
        }));
      }

      // For weekly/monthly — use hustle_points table with inner join on profiles to filter planner
      let query: any = supabase
        .from("hustle_points")
        .select("user_id, points, profiles!inner(nome, avatar_url, planner_type)");

      if (plannerType) {
        query = query.eq("profiles.planner_type", plannerType);
      }

      if (periodStart) {
        query = query.gte("created_at", periodStart);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      const grouped = (data as any[]).reduce((acc: any, curr: any) => {
        const uid = curr.user_id;
        if (!acc[uid]) {
          acc[uid] = {
            user_id: uid,
            nome: curr.profiles?.nome || "Aluna",
            avatar_url: curr.profiles?.avatar_url,
            points: 0,
            isMe: uid === user?.id,
          };
        }
        acc[uid].points += curr.points ?? 0;
        return acc;
      }, {});

      return Object.values(grouped)
        .sort((a: any, b: any) => b.points - a.points)
        .slice(0, 30)
        .map((player: any, index: number) => ({ ...player, position: index + 1 }));
    },
    staleTime: 1000 * 60 * 3,
  });
}

const MEDAL_COLORS = [
  "border-accent shadow-[0_0_15px_rgba(255,107,0,0.3)]",
  "border-zinc-400 shadow-sm",
  "border-amber-700 shadow-sm",
];

const MEDAL_BG = ["bg-accent text-white", "bg-zinc-400 text-black", "bg-amber-700 text-white"];

export function GymRatsHub() {
  const { user } = useAuth();
  
  const { data: userProfile } = useQuery({
    queryKey: ["profile-planner", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("planner_type").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const [period, setPeriod] = useState<RankPeriod>("weekly");
  const { data: ranking = [], isLoading } = useRanking(period, userProfile?.planner_type);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-6">
      {/* Period Tabs */}
      <div className="flex gap-2 bg-secondary/30 p-1.5 rounded-2xl border border-border/50">
        {(Object.entries(PERIOD_LABELS) as [RankPeriod, typeof PERIOD_LABELS[RankPeriod]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold tracking-wider transition-all ${
              period === key
                ? "bg-accent text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <meta.icon size={12} />
            {meta.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center font-cinzel uppercase tracking-widest opacity-60">
        {PERIOD_LABELS[period].desc}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {top3.length > 0 && (
                <div className="flex justify-center gap-4 pt-8 pb-4 px-2">
                  {top3.map((player: any, idx) => {
                    // Visual order: 2nd, 1st, 3rd
                    const visualOrder = idx === 0 ? "order-2" : idx === 1 ? "order-1" : "order-3";
                    const isWinner = idx === 0;
                    const avatarSize = isWinner ? "w-20 h-20" : "w-16 h-16";
                    const iconSize = isWinner ? 32 : 24;

                    return (
                      <motion.div
                        key={player.user_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`flex flex-col items-center flex-1 min-w-0 ${visualOrder}`}
                      >
                        <div className="relative mb-3">
                          <div className={`rounded-full p-0.5 border-2 ${avatarSize} ${MEDAL_COLORS[idx]} overflow-hidden bg-card`}>
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt={player.nome} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-secondary rounded-full">
                                <User size={iconSize} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-lg font-bold text-[10px] ${MEDAL_BG[idx]}`}>
                            {player.position}
                          </div>
                          {isWinner && (
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute -top-7 left-1/2 -translate-x-1/2 text-orange-400"
                            >
                              <Trophy size={24} />
                            </motion.div>
                          )}
                        </div>
                        <p className={`text-[11px] font-bold font-cinzel text-center truncate w-full px-1 ${player.isMe ? "text-accent" : "text-foreground"}`}>
                          {player.nome?.split(' ')[0]}
                          {player.isMe && <span className="ml-1 text-accent">★</span>}
                        </p>
                        <div className="flex items-center gap-1 text-accent mt-0.5">
                          <Zap size={10} className="fill-accent" />
                          <span className="text-[10px] font-bold">{player.points.toLocaleString()} pts</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Full List (4th onwards) */}
              {rest.length > 0 && (
                <div className="bg-card/50 border border-border/60 rounded-3xl overflow-hidden divide-y divide-border/30 backdrop-blur-sm mt-4">
                  {rest.map((player: any) => (
                    <div
                      key={player.user_id}
                      className={`flex items-center gap-3 p-4 transition-colors ${player.isMe ? "bg-accent/10" : "hover:bg-white/5"}`}
                    >
                      <span className={`w-6 text-center font-cinzel text-xs font-bold ${player.position <= 3 ? "text-accent" : "text-muted-foreground"}`}>
                        {player.position}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden border border-border shrink-0">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt={player.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={16} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate flex items-center gap-2 ${player.isMe ? "text-accent" : ""}`}>
                          {player.nome}
                          {player.isMe && <span className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase font-bold">Você</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-accent shrink-0">
                        <Zap size={12} className="fill-accent" />
                        <span className="text-sm font-bold">{player.points.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ranking.length === 0 && (
                <div className="text-center py-16 opacity-50">
                  <Trophy size={48} className="mx-auto mb-3 opacity-10" />
                  <p className="text-xs font-cinzel">A arena ainda está vazia.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Seja a primeira a marcar pontos este período!</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
