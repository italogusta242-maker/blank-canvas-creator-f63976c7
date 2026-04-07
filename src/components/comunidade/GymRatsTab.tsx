import { useState } from "react";
import { Trophy, Medal, Flame, User, Dumbbell, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface RankedUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  hustle_points: number;
  streak: number;
  workouts_count: number;
  rank: number;
  level: string;
}

// ── Tier Logic ──
function deriveLevel(points: number): string {
  if (points >= 5000) return "diamond";
  if (points >= 2000) return "gold";
  if (points >= 800) return "silver";
  return "bronze";
}

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  bronze: { bg: "bg-amber-900/20", text: "text-amber-600", border: "border-amber-700/30", label: "Bronze" },
  silver: { bg: "bg-gray-300/20", text: "text-gray-400", border: "border-gray-400/30", label: "Prata" },
  gold: { bg: "bg-yellow-500/20", text: "text-yellow-500", border: "border-yellow-500/30", label: "Ouro" },
  diamond: { bg: "bg-cyan-400/20", text: "text-cyan-400", border: "border-cyan-400/30", label: "Diamante" },
};

function InlineBadge({ level }: { level: string }) {
  const c = LEVEL_COLORS[level] || LEVEL_COLORS.bronze;
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

// ── Category Tabs ──
const CATEGORIES = [
  { id: "points", label: "Pontos Totais", icon: Trophy },
  { id: "streak", label: "Ofensiva", icon: Flame },
  { id: "workouts", label: "Treinos", icon: Dumbbell },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

// ── Main Component ──
export function GymRatsTab() {
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryId>("points");
  const [selectedUser, setSelectedUser] = useState<RankedUser | null>(null);

  const { data: ranking = [], isLoading } = useQuery<RankedUser[]>({
    queryKey: ["gym-rats-ranking", category],
    queryFn: async () => {
      // 1. Fetch profiles with hustle_points
      const { data: profiles, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, hustle_points")
        .order("hustle_points", { ascending: false })
        .limit(50);
      if (error) throw error;

      // 2. Fetch streaks for all these users
      const userIds = (profiles || []).map((p: any) => p.id);
      const { data: flames } = await supabase
        .from("flame_status")
        .select("user_id, streak")
        .in("user_id", userIds);
      const flameMap = new Map<string, number>();
      for (const f of flames || []) flameMap.set(f.user_id, f.streak ?? 0);

      // 3. Count finished workouts
      const { data: workouts } = await supabase
        .from("workouts")
        .select("user_id")
        .in("user_id", userIds)
        .not("finished_at", "is", null);
      const workoutMap = new Map<string, number>();
      for (const w of workouts || []) {
        workoutMap.set(w.user_id, (workoutMap.get(w.user_id) || 0) + 1);
      }

      // 4. Build combined array
      let combined: RankedUser[] = (profiles || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name || "Miri",
        avatar_url: p.avatar_url,
        hustle_points: p.hustle_points ?? 0,
        streak: flameMap.get(p.id) || 0,
        workouts_count: workoutMap.get(p.id) || 0,
        rank: 0,
        level: deriveLevel(p.hustle_points ?? 0),
      }));

      // 5. Sort by selected category
      if (category === "streak") combined.sort((a, b) => b.streak - a.streak);
      else if (category === "workouts") combined.sort((a, b) => b.workouts_count - a.workouts_count);
      else combined.sort((a, b) => b.hustle_points - a.hustle_points);

      // 6. Assign ranks
      combined.forEach((u, i) => (u.rank = i + 1));
      return combined;
    },
    staleTime: 1000 * 60 * 3,
  });

  const myEntry = ranking.find((u) => u.id === user?.id);
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3, 20);

  if (isLoading) {
    return (
      <div className="pb-12 space-y-6">
        <div className="text-center space-y-2 animate-pulse">
          <div className="h-6 w-40 bg-muted rounded mx-auto" />
          <div className="h-4 w-56 bg-muted/60 rounded mx-auto" />
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border">
          {[1,2,3].map(i => <div key={i} className="flex-1 h-8 bg-muted rounded-lg animate-pulse" />)}
        </div>
        <div className="flex items-end justify-center gap-3 h-56 pt-4 animate-pulse">
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="w-full h-28 rounded-t-xl bg-muted/60" />
          </div>
          <div className="flex flex-col items-center flex-1 gap-2 -mt-6">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="w-full h-40 rounded-t-xl bg-muted/60" />
          </div>
          <div className="flex flex-col items-center flex-1 gap-2">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="w-full h-20 rounded-t-xl bg-muted/60" />
          </div>
        </div>
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border animate-pulse">
              <div className="w-6 h-4 bg-muted rounded" />
              <div className="w-9 h-9 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-2 w-16 bg-muted/60 rounded" />
              </div>
              <div className="h-4 w-10 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="font-cinzel text-xl font-black italic tracking-wider text-foreground uppercase flex items-center justify-center gap-2">
          <Trophy className="text-amber-500" /> TOP MIRIES
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Mantenha a consistência, suba de nível!</p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
              category === cat.id
                ? "bg-primary text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <cat.icon size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {podium.length >= 3 && (
        <div className="flex items-end justify-center gap-3 h-56 pt-4">
          <PodiumSeat user={podium[1]} position={2} height="h-28" accent="silver" />
          <PodiumSeat user={podium[0]} position={1} height="h-40" accent="gold" isCenter />
          <PodiumSeat user={podium[2]} position={3} height="h-20" accent="bronze" />
        </div>
      )}

      {/* My Position - only if not in top 3 */}
      {myEntry && myEntry.rank > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">
            #{myEntry.rank}
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">Sua Posição</p>
            <InlineBadge level={myEntry.level} />
          </div>
          <div className="text-right">
            <p className="font-black text-foreground text-sm">
              {category === "streak" ? `${myEntry.streak} dias` : category === "workouts" ? `${myEntry.workouts_count} treinos` : `${myEntry.hustle_points} pts`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Ranking List */}
      <div className="space-y-2">
        {rest.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setSelectedUser(entry)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
              entry.id === user?.id
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <span className="font-cinzel font-bold text-primary w-6 text-center text-sm">{entry.rank}</span>
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border shrink-0">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <User size={16} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm truncate flex items-center gap-2">
                {entry.full_name}
                {entry.id === user?.id && (
                  <span className="text-[9px] bg-primary text-white px-1.5 rounded">VOCÊ</span>
                )}
              </p>
              <InlineBadge level={entry.level} />
            </div>
            <div className="text-right">
              <p className="font-black text-foreground text-sm">
                {category === "streak" ? `${entry.streak}🔥` : category === "workouts" ? entry.workouts_count : entry.hustle_points}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {category === "streak" ? "dias" : category === "workouts" ? "treinos" : "pts"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {ranking.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhum dado de pontuação disponível ainda.
        </div>
      )}

      {/* Profile Sheet */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-end"
            onClick={() => setSelectedUser(null)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-card w-full max-w-lg mx-auto rounded-t-3xl border-t border-border shadow-2xl p-6 pb-10"
            >
              <div className="w-12 h-1.5 bg-secondary rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User size={28} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedUser.full_name}</h3>
                  <InlineBadge level={selectedUser.level} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Trophy size={14} className="mx-auto text-amber-500 mb-1" />
                  <p className="font-black text-foreground">{selectedUser.hustle_points}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Pontos</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Flame size={14} className="mx-auto text-orange-500 mb-1" />
                  <p className="font-black text-foreground">{selectedUser.streak}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Dias</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <Dumbbell size={14} className="mx-auto text-blue-500 mb-1" />
                  <p className="font-black text-foreground">{selectedUser.workouts_count}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Treinos</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Podium Seat ──
function PodiumSeat({
  user,
  position,
  height,
  accent,
  isCenter,
}: {
  user: RankedUser;
  position: number;
  height: string;
  accent: "gold" | "silver" | "bronze";
  isCenter?: boolean;
}) {
  const accentColors = {
    gold: "bg-yellow-500/20 border-yellow-500/30 text-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.25)]",
    silver: "bg-gray-300/20 border-gray-400/30 text-gray-400",
    bronze: "bg-amber-700/20 border-amber-700/30 text-amber-600",
  };

  return (
    <div className="flex flex-col items-center flex-1 max-w-[110px]">
      <div className={`relative flex flex-col items-center mb-2 ${isCenter ? "-mt-6 z-10" : ""}`}>
        {isCenter && <Trophy size={20} className="text-yellow-500 mb-1.5 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}
        <div className="w-12 h-12 rounded-full bg-secondary border-2 border-background flex items-center justify-center shadow-lg overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="font-cinzel font-bold text-foreground">{user.full_name.charAt(0)}</span>
          )}
        </div>
        <p className="font-bold text-foreground text-xs mt-1 truncate w-20 text-center">{user.full_name}</p>
        <InlineBadge level={user.level} />
      </div>
      <div className={`w-full ${height} ${accentColors[accent]} rounded-t-xl border-t border-l border-r flex flex-col items-center justify-start pt-3 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <span className="font-cinzel text-2xl font-black opacity-50 relative z-10">{position}</span>
        <span className="text-[9px] font-bold mt-0.5 opacity-70 relative z-10">{user.hustle_points} pts</span>
      </div>
    </div>
  );
}
