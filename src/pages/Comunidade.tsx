import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Flame, Trophy, User, Users, Star,
  Loader2, X, Dumbbell, Check, Gift
} from "lucide-react";
import { PostCard } from "@/components/community/PostCard";
import { CreatePost } from "@/components/community/CreatePost";
import { PodiumCard, type PodiumEntry } from "@/components/community/PodiumCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/hooks/useStreak";

// ── Plan type map ──
const PLAN_MAPPING: Record<string, { label: string; color: string }> = {
  essencial: { label: "Essencial",     color: "text-emerald-400" },
  constancia:     { label: "Constância",    color: "text-blue-400" },
  elite:          { label: "Elite",         color: "text-rose-400" },
};
type PlanCategory = keyof typeof PLAN_MAPPING;

// ── Types ──
interface CommunityPost {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  isOptimistic?: boolean;
  profiles?: { full_name: string; avatar_url?: string };
  community_reactions?: { user_id: string; reaction_type: string }[];
}

// ── Segmented Ranking Query (by plan_type, monthly cycle) ──
function useSegmentedRanking(category: PlanCategory) {
  return useQuery<PodiumEntry[]>({
    queryKey: ["segmented-ranking", category],
    queryFn: async () => {
      // Get the start of current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 1. Fetch users in this category via profiles.planner_type
      const { data: profiledUsers, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("planner_type", category);

      if (profErr) throw profErr;
      const userIds = [...new Set((profiledUsers || []).map((p: any) => p.id))] as string[];
      if (userIds.length === 0) return [];

      // 2. Count unique days with community_posts this month per user
      const { data: posts } = await supabase
        .from("community_posts")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .gte("created_at", monthStart);

      // 3. Also count historic workout days this month
      const { data: workouts } = await supabase
        .from("workouts")
        .select("user_id, started_at")
        .in("user_id", userIds)
        .gte("started_at", monthStart);

      // Build active days per user
      const activeDaysMap: Record<string, Set<string>> = {};
      for (const p of (posts || [])) {
        const d = p.created_at?.split('T')[0];
        if (d) {
          if (!activeDaysMap[p.user_id]) activeDaysMap[p.user_id] = new Set();
          activeDaysMap[p.user_id].add(d);
        }
      }
      for (const w of (workouts || [])) {
        const d = (w as any).started_at?.split('T')[0];
        if (d) {
          if (!activeDaysMap[(w as any).user_id]) activeDaysMap[(w as any).user_id] = new Set();
          activeDaysMap[(w as any).user_id].add(d);
        }
      }

      // 4. Combine and sort by active days count
      const combined: PodiumEntry[] = (profiledUsers || []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name || "Miri",
        avatar_url: p.avatar_url,
        score: activeDaysMap[p.id]?.size ?? 0,
        streak: activeDaysMap[p.id]?.size ?? 0,
        rank: 0,
      }));

      combined.sort((a, b) => b.score - a.score);
      combined.forEach((e, i) => (e.rank = i + 1));
      return combined;
    },
    staleTime: 1000 * 60 * 3,
  });
}

// ── Segmented Ranking UI ──
function SegmentedRanking({ onAvatarClick }: { onAvatarClick: (id: string) => void }) {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile-planner-type", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("planner_type").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const [category, setCategory] = useState<PlanCategory | null>(null);

  // Sync state with profile once loaded
  useEffect(() => {
    if (profile?.planner_type && PLAN_MAPPING[profile.planner_type]) {
      setCategory(profile.planner_type as PlanCategory);
    } else if (profile && !PLAN_MAPPING[profile?.planner_type ?? '']) {
      setCategory("essencial");
    }
  }, [profile]);

  const resolvedCategory = category ?? "essencial";
  const { data: entries = [], isLoading } = useSegmentedRanking(resolvedCategory);
  const isFullLoading = isProfileLoading || category === null || isLoading;
  const userEntry = entries.find(e => e.user_id === user?.id);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Category header */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
         <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sua Liga</span>
            <span className={`font-sans font-bold text-lg ${PLAN_MAPPING[resolvedCategory]?.color || 'text-foreground'}`}>
              Liga {PLAN_MAPPING[resolvedCategory]?.label || 'Desafiante'}
            </span>
         </div>
         <Trophy className={PLAN_MAPPING[resolvedCategory]?.color || 'text-muted-foreground'} size={24} />
      </div>

      <div className="p-2 space-y-2">
        {isFullLoading ? (
          <div className="space-y-2 p-2">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-2 w-16 bg-muted/60 rounded" />
                </div>
                <div className="h-4 w-10 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {entries.length === 0 ? (
              <div className="text-center py-12 px-4 opacity-80">
                <Trophy size={48} className={`mx-auto mb-3 opacity-20 ${PLAN_MAPPING[resolvedCategory]?.color || ''}`} />
                <p className="font-cinzel text-sm font-bold text-foreground">Você é a primeira da Liga {PLAN_MAPPING[resolvedCategory]?.label || ""} a chegar aqui!</p>
                <p className="text-[11px] text-muted-foreground mt-1">Comece a treinar para dominar o topo do ranking este mês.</p>
              </div>
            ) : (
              <PodiumCard entries={entries} onAvatarClick={onAvatarClick} />
            )}
            
            {/* Show user's own position if not in Top 10 */}
            {userEntry && userEntry.rank > 10 && (
              <div className="mt-2 pt-2 border-t border-border px-2">
                <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-primary w-5">#{userEntry.rank}</span>
                    <span className="text-xs font-bold text-foreground">Sua Posição</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                    <span>{userEntry.score} dias</span>
                    <span>{userEntry.streak}🔥</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Prizes for current month ──
function RankingPrizes() {
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const { data: prizes = [] } = useQuery({
    queryKey: ["community-prizes", currentMonth],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("premiacoes")
        .select("*")
        .eq("mes_referencia", currentMonth);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (prizes.length === 0) return null;

  const categoryLabels: Record<string, { label: string; color: string }> = {
    essencial: { label: "Essencial", color: "text-emerald-400" },
    constancia: { label: "Constância", color: "text-blue-400" },
    elite: { label: "Elite", color: "text-rose-400" },
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <Gift size={16} className="text-primary" />
        <h3 className="font-sans text-sm font-bold text-foreground uppercase tracking-tight">
          Prêmios do Mês
        </h3>
      </div>
      <div className="p-3 space-y-3">
        {prizes.map((prize: any) => {
          const cat = categoryLabels[prize.categoria] || { label: prize.categoria, color: "text-muted-foreground" };
          return (
            <div key={prize.id} className="flex gap-3 items-start p-3 rounded-xl bg-secondary/30 border border-border/50">
              {prize.foto_kit_url && (
                <img
                  src={prize.foto_kit_url}
                  alt="Prêmio"
                  className="w-16 h-16 rounded-lg object-cover border border-border shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-black uppercase tracking-wider ${cat.color}`}>
                  {cat.label}
                </span>
                <p className="text-sm text-foreground font-medium mt-0.5 line-clamp-2">
                  {prize.descricao_kit || "Kit Surpresa 🎁"}
                </p>
                {prize.sorteio_realizado && (
                  <span className="text-[10px] text-muted-foreground mt-1 inline-block">✅ Sorteio realizado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──
export default function Comunidade() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"feed" | "ranking">("feed");
  const { user } = useAuth();
  
  const { data: streakData } = useStreak();
  const currentStreak = streakData?.streak ?? 0;

  // Rolling 7-day window
  const { data: weekActivity = [] } = useQuery({
    queryKey: ["week-activity", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().split("T")[0], obj: d };
      });
      // Fetch posts + workouts for the week
      const [{ data: posts }, { data: workouts }] = await Promise.all([
        supabase
          .from("community_posts")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", `${days[0].date}T00:00:00`)
          .lte("created_at", `${days[6].date}T23:59:59`),
        supabase
          .from("workouts")
          .select("finished_at")
          .eq("user_id", user.id)
          .not("finished_at", "is", null)
          .gte("finished_at", `${days[0].date}T00:00:00`)
          .lte("finished_at", `${days[6].date}T23:59:59`),
      ]);
      const activeDays = new Set<string>();
      (posts || []).forEach((p: any) => { const d = p.created_at?.split("T")[0]; if (d) activeDays.add(d); });
      (workouts || []).forEach((w: any) => { const d = w.finished_at?.split("T")[0]; if (d) activeDays.add(d); });
      
      const today = new Date();
      today.setHours(0,0,0,0);

      const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
      return days.map((d) => {
        const active = activeDays.has(d.date);
        const isSunday = d.obj.getDay() === 0;
        const isPast = d.obj < today;
        const frozen = !active && isPast && !isSunday;
        const dayLabel = DAY_LABELS[d.obj.getDay()];
        return { date: d.date, active, frozen, dayLabel };
      });
    },
    enabled: !!user,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["community-posts"],
    queryFn: async ({ pageParam = 0 }: any) => {
      const { data, error } = await (supabase as any)
        .from("community_posts")
        .select(`
          id, 
          content, 
          image_url, 
          created_at, 
          user_id, 
          profiles (id, full_name, avatar_url, is_verified),
          community_reactions (user_id, reaction_type)
        `)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + 9);
      if (error) throw error;
      return data as CommunityPost[];
    },
    getNextPageParam: (lastPage: CommunityPost[], allPages: CommunityPost[][]) =>
      lastPage.length === 10 ? allPages.length * 10 : undefined,
    initialPageParam: 0,
  });

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    observerRef.current.observe(node);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flat() ?? [];

  // dayLabels now come from weekActivity data
  
  const handleAvatarClick = (id: string) => {
    navigate(`/aluno/perfil/${id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 transition-colors duration-500">
      <div className="max-w-xl mx-auto pt-8 px-4 md:px-0 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-sans text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 text-foreground">
            Comunidade
          </h1>
          <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border">
            {(["feed", "ranking"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab === "feed" ? <span className="flex items-center gap-1"><Users size={12} /> Feed</span> : <span className="flex items-center gap-1"><Star size={12} /> Ranking</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Trilho 7 dias (Rolling Window) ── */}
        <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-orange-500" />
            <h3 className="font-cinzel text-sm font-bold text-foreground tracking-tight uppercase">Esta Semana</h3>
            <span className="text-xs font-black text-orange-500 ml-auto bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              {currentStreak} {currentStreak === 1 ? "Dia Ativo" : "Dias Ativos"} 🔥
            </span>
          </div>
          <div className="flex items-center gap-2">
            {weekActivity.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  day.active
                    ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                    : day.frozen
                    ? "bg-gradient-to-br from-blue-400 to-cyan-300 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                    : "bg-secondary/60 border border-border text-muted-foreground"
                }`}>
                  {day.active ? "✓" : day.frozen ? "❄" : ""}
                </div>
                <span className="text-[9px] text-muted-foreground uppercase">{day.dayLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {activeTab === "ranking" && (
          <>
            <SegmentedRanking onAvatarClick={handleAvatarClick} />
            <RankingPrizes />
          </>
        )}

        {activeTab === "feed" && (
          <>
            <CreatePost onPosted={() => queryClient.invalidateQueries({ queryKey: ["community-posts"] })} />

            {status === "pending" ? (
              <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                {[1,2,3].map(i => (
                  <div key={i} className="p-4 space-y-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-24 bg-muted rounded" />
                        <div className="h-2 w-16 bg-muted/60 rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted/50 rounded" />
                      <div className="h-3 w-3/4 bg-muted/40 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border">
                <Trophy className="mx-auto mb-4 opacity-10" size={64} />
                <p className="font-cinzel font-bold text-foreground/50">O Feed está silencioso...</p>
                <p className="text-sm">Seja a primeira a compartilhar sua vitória!</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onAvatarClick={handleAvatarClick} />
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={loadMoreRef} className="h-4" />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
