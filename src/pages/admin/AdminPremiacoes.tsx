import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trophy, Gift, Upload, Loader2, Check, AlertTriangle,
  Shuffle, Crown, Star, User, Flame, ImageIcon, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ──
const CATEGORIES = [
  { key: "essencial", label: "Essencial",   gradient: "from-emerald-600 to-emerald-400", icon: "🌱", color: "text-emerald-400", border: "border-emerald-500/30" },
  { key: "constancia",     label: "Constância",  gradient: "from-blue-600 to-blue-400",     icon: "⚡", color: "text-blue-400",    border: "border-blue-500/30" },
  { key: "elite",          label: "Elite",        gradient: "from-rose-600 to-rose-400",     icon: "🔥", color: "text-rose-400",    border: "border-rose-500/30" },
] as const;
type CategoryKey = typeof CATEGORIES[number]["key"];

const currentMonthRef = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

// ── Hooks ──
function usePremiacoes() {
  return useQuery({
    queryKey: ["admin-premiacoes", currentMonthRef()],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("premiacoes")
        .select("*, profiles:campeã_user_id (nome, avatar_url)")
        .eq("mes_referencia", currentMonthRef());
      if (error) throw error;
      const map: Record<string, any> = {};
      for (const row of (data || [])) map[row.categoria] = row;
      return map as Record<CategoryKey, any>;
    },
  });
}

function useSegmentLeaders() {
  return useQuery({
    queryKey: ["segment-leaders", currentMonthRef()],
    queryFn: async () => {
      const ms = monthStart();

      // Monthly hustle_points
      const { data: log, error } = await supabase
        .from("hustle_points")
        .select("user_id, points")
        .gte("created_at", ms);

      if (error) throw error;

      const monthly: Record<string, number> = {};
      for (const row of (log || [])) {
        monthly[row.user_id] = (monthly[row.user_id] ?? 0) + (row.points ?? 0);
      }

      // Plans per category
      const result: Record<CategoryKey, { leaders: any[]; isTie: boolean }> = {
        essencial: { leaders: [], isTie: false },
        constancia:     { leaders: [], isTie: false },
        elite:          { leaders: [], isTie: false },
      };

      for (const cat of CATEGORIES) {
        const { data: plans } = await (supabase as any)
          .from("user_selected_plans")
          .select("user_id")
          .eq("plan_type", cat.key);

        const userIds = [...new Set((plans || []).map((p: any) => p.user_id))] as string[];
        if (userIds.length === 0) continue;

        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, nome, avatar_url")
          .in("id", userIds);

        const { data: flames } = await supabase
          .from("flame_status")
          .select("user_id, streak")
          .in("user_id", userIds);

        const flameMap: Record<string, number> = {};
        for (const f of (flames || [])) flameMap[f.user_id] = f.streak;

        const sorted = (profiles || [])
          .map((p: any) => ({
            user_id: p.id,
            nome: p.nome || "Miri",
            avatar_url: p.avatar_url,
            score: monthly[p.id] ?? 0,
            streak: flameMap[p.id] ?? 0,
          }))
          .sort((a: any, b: any) => b.score - a.score);

        if (sorted.length === 0) continue;
        const top = sorted[0].score;
        const topGroup = sorted.filter((s: any) => s.score === top);
        result[cat.key] = { leaders: topGroup, isTie: topGroup.length > 1 };
      }

      return result;
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ── Kit Config Card ──
function KitConfigCard({ category, premiacaoData, onRefresh }: {
  category: typeof CATEGORIES[number];
  premiacaoData: any;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [desc, setDesc] = useState(premiacaoData?.descricao_kit ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${category.key}/${currentMonthRef()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("premiacoes")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("premiacoes").getPublicUrl(path);

      await upsertPremiacaoRow({ foto_kit_url: publicUrl });
      toast.success("Foto do Kit atualizada! ✅");
      onRefresh();
    } catch (e: any) {
      toast.error("Erro no upload: " + e.message);
    }
    setUploading(false);
  };

  const upsertPremiacaoRow = async (extra: Record<string, any> = {}) => {
    const base = {
      categoria: category.key,
      mes_referencia: currentMonthRef(),
      ...extra,
    };
    if (premiacaoData?.id) {
      await (supabase as any).from("premiacoes").update(extra).eq("id", premiacaoData.id);
    } else {
      await (supabase as any).from("premiacoes").insert(base);
    }
  };

  const handleSaveDesc = async () => {
    setSaving(true);
    try {
      await upsertPremiacaoRow({ descricao_kit: desc });
      toast.success("Descrição salva!");
      onRefresh();
    } catch (e: any) {
      toast.error("Erro ao salvar.");
    }
    setSaving(false);
  };

  const photoUrl = premiacaoData?.foto_kit_url;

  return (
    <div className={`bg-card border ${category.border} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${category.gradient} p-4 flex items-center gap-3`}>
        <span className="text-2xl">{category.icon}</span>
        <div>
          <p className="text-xs text-white/70 font-semibold uppercase tracking-wider">Categoria</p>
          <h3 className="font-cinzel text-lg font-bold text-white">{category.label}</h3>
        </div>
        {premiacaoData?.sorteio_realizado && (
          <div className="ml-auto flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
            <Check size={12} className="text-white" />
            <span className="text-[10px] text-white font-bold">Sorteado</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Kit Photo */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Foto do Kit</p>
          <div
            className="relative aspect-video rounded-xl overflow-hidden border border-border bg-secondary/30 cursor-pointer group"
            onClick={() => fileRef.current?.click()}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Kit" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon size={32} className="opacity-30" />
                <p className="text-xs">Clique para adicionar a foto do Kit</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-white" />
              ) : (
                <Upload size={24} className="text-white" />
              )}
            </div>
          </div>
          <input
            type="file"
            hidden
            ref={fileRef}
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
          />
        </div>

        {/* Description */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Descrição do Prêmio</p>
          <textarea
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: Kit completo LIVE com camiseta, legging e bolsa de treino..."
            className="w-full text-sm bg-secondary/50 border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          />
          <button
            onClick={handleSaveDesc}
            disabled={saving}
            className="mt-2 w-full py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar Descrição
          </button>
        </div>

        {/* Campeã revelada */}
        {premiacaoData?.sorteio_realizado && premiacaoData?.profiles && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
            <Crown size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Campeã do Mês</p>
              <p className="text-sm font-black text-foreground">{premiacaoData.profiles.nome}</p>
            </div>
            {premiacaoData.profiles.avatar_url && (
              <img src={premiacaoData.profiles.avatar_url} className="w-10 h-10 rounded-full object-cover ml-auto border-2 border-yellow-400" alt="" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SorteioChamada ──
function SorteioChamada({ category, leaders, premiacaoData, onDone }: {
  category: typeof CATEGORIES[number];
  leaders: any[];
  premiacaoData: any;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const [winner, setWinner] = useState<any>(null);

  const runSorteio = async () => {
    if (!leaders.length) return;
    setRunning(true);
    setWinner(null);

    // Roulette animation — cycle for 3 seconds
    let elapsed = 0;
    const interval = 120;
    const totalMs = 3000;
    const timer = setInterval(() => {
      elapsed += interval;
      setRouletteIndex((i) => (i + 1) % leaders.length);
      if (elapsed >= totalMs) {
        clearInterval(timer);
        // Pick winner
        const chosen = leaders[Math.floor(Math.random() * leaders.length)];
        setWinner(chosen);
        persistResult(chosen);
      }
    }, interval);
  };

  const persistResult = async (chosen: any) => {
    try {
      // Upsert premiacoes row
      const mes = currentMonthRef();
      if (premiacaoData?.id) {
        await (supabase as any).from("premiacoes").update({
          "campeã_user_id": chosen.user_id,
          sorteio_realizado: true,
        }).eq("id", premiacaoData.id);
      } else {
        const { data: inserted } = await (supabase as any).from("premiacoes").insert({
          categoria: category.key,
          mes_referencia: mes,
          "campeã_user_id": chosen.user_id,
          sorteio_realizado: true,
        }).select().single();
      }

      // Log sorteio
      await (supabase as any).from("sorteio_log").insert({
        candidatas: leaders,
        vencedora_user_id: chosen.user_id,
        executado_por: user?.id,
      });

      toast.success(`🏆 ${chosen.nome} é a campeã da categoria ${category.label}!`);
      onDone();
    } catch (e: any) {
      toast.error("Erro ao persistir resultado: " + e.message);
    }
    setRunning(false);
  };

  if (premiacaoData?.sorteio_realizado) {
    return (
      <div className="text-center py-3 text-muted-foreground text-xs">
        Sorteio já realizado para este mês.
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-3 text-muted-foreground text-xs">
        Nenhuma aluna nesta categoria ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Leader(s) */}
      {leaders.length === 1 ? (
        <div className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary border border-border shrink-0">
            {leaders[0].avatar_url ? (
              <img src={leaders[0].avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <User size={20} className="text-muted-foreground m-auto" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{leaders[0].nome}</p>
            <p className="text-xs text-primary font-black">{leaders[0].score.toLocaleString()} pts no mês</p>
          </div>
          <Star size={16} className="text-yellow-400" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
            <AlertTriangle size={16} className="text-orange-400 shrink-0" />
            <p className="text-xs text-orange-400 font-semibold">{leaders.length} alunas empatadas no 1º lugar!</p>
          </div>
          {/* Roulette animation */}
          <AnimatePresence>
            {running && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center"
              >
                <p className="text-xs text-muted-foreground mb-2 font-semibold">Sorteando...</p>
                <motion.p
                  key={rouletteIndex}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-cinzel text-xl font-black text-primary"
                >
                  {leaders[rouletteIndex]?.nome}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Winner reveal */}
          <AnimatePresence>
            {winner && !running && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center"
              >
                <Crown size={28} className="mx-auto text-yellow-400 mb-2" />
                <p className="font-cinzel text-lg font-black text-foreground">{winner.nome}</p>
                <p className="text-xs text-yellow-400 font-bold mt-1">Campeã da categoria {category.label}! 🏆</p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Candidates list */}
          <div className="space-y-1">
            {leaders.map((l: any) => (
              <div key={l.user_id} className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary border border-border shrink-0">
                  {l.avatar_url ? <img src={l.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={14} className="text-muted-foreground m-auto" />}
                </div>
                <span className="flex-1 text-xs font-semibold text-foreground">{l.nome}</span>
                <span className="text-[10px] text-primary font-black">{l.score.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={runSorteio}
        disabled={running}
        className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-black rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {running ? (
          <><Loader2 size={16} className="animate-spin" /> Sorteando...</>
        ) : (
          <><Shuffle size={16} /> {leaders.length === 1 ? "Confirmar Campeã" : "Executar Sorteio"}</>
        )}
      </button>
    </div>
  );
}

// ── Main Admin Premiacoes ──
export default function AdminPremiacoes() {
  const queryClient = useQueryClient();
  const { data: premiacoes = {}, isLoading: loadingPrem } = usePremiacoes();
  const { data: leaders, isLoading: loadingLeaders, refetch: refetchLeaders } = useSegmentLeaders();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-premiacoes"] });
    queryClient.invalidateQueries({ queryKey: ["segment-leaders"] });
  };

  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cinzel text-2xl font-black text-foreground flex items-center gap-3">
            <Gift size={28} className="text-primary" />
            Premiações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerenciamento do Kit Roupa LIVE! · Ciclo de <span className="font-bold text-foreground capitalize">{monthLabel}</span>
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 bg-secondary/60 hover:bg-secondary border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* ── Section 1: Kit config ── */}
      <div>
        <h2 className="text-sm font-cinzel font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Gift size={16} className="text-primary" /> Configuração do Kit por Categoria
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <KitConfigCard
              key={cat.key}
              category={cat}
              premiacaoData={(premiacoes as any)[cat.key]}
              onRefresh={refresh}
            />
          ))}
        </div>
      </div>

      {/* ── Section 2: Live Podium + Sorteio ── */}
      <div>
        <h2 className="text-sm font-cinzel font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" /> Pódio em Tempo Real e Engine de Sorteio
        </h2>

        {loadingLeaders ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => {
              const catLeaders = leaders?.[cat.key];
              return (
                <div key={cat.key} className={`bg-card border ${cat.border} rounded-2xl overflow-hidden`}>
                  <div className={`bg-gradient-to-r ${cat.gradient} p-3 flex items-center gap-2`}>
                    <span>{cat.icon}</span>
                    <h3 className="font-cinzel text-sm font-bold text-white">{cat.label}</h3>
                    {catLeaders?.isTie && (
                      <div className="ml-auto bg-orange-500/80 rounded-full px-2 py-0.5">
                        <span className="text-[9px] font-black text-white">EMPATE</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <SorteioChamada
                      category={cat}
                      leaders={catLeaders?.leaders ?? []}
                      premiacaoData={(premiacoes as any)[cat.key]}
                      onDone={refresh}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
