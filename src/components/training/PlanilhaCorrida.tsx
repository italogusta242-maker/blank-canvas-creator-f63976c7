import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Calendar, 
  Activity, 
  Flame, 
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Workout Data Matrix ──
const RUNNING_WORKOUTS = {
  essencial: {
    title: "Liga Essencial",
    level: "Iniciante",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Foco em alternar caminhada e corrida para construir base e resistência.",
    weeks: {
      1: [
        { day: "D1", type: "Intervalado", desc: "1 min corrida + 2 min caminhada (20 min total)" },
        { day: "D2", type: "Ativo", desc: "Descanso ou caminhada leve" },
        { day: "D3", type: "Intervalado", desc: "2 min corrida + 2 min caminhada (20 min)" },
        { day: "D4", type: "Descanso", desc: "Descanso absoluto" },
        { day: "D5", type: "Intervalado", desc: "3 min corrida + 2 min caminhada (20 min)" },
        { day: "D6", type: "Caminhada", desc: "Caminhada acelerada 25 min" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ],
      2: [
        { day: "D1", type: "Intervalado", desc: "4 min corrida + 2 min caminhada (22 min)" },
        { day: "D2", type: "Descanso", desc: "Descanso" },
        { day: "D3", type: "Intervalado", desc: "5 min corrida + 2 min caminhada (22 min)" },
        { day: "D4", type: "Ativo", desc: "Caminhada leve recover" },
        { day: "D5", type: "Intervalado", desc: "6 min corrida + 2 min caminhada (24 min)" },
        { day: "D6", type: "Caminhada", desc: "Caminhada acelerada 30 min" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ],
      3: [
        { day: "D1", type: "Intervalado", desc: "8 min corrida + 2 min caminhada (24 min)" },
        { day: "D2", type: "Descanso", desc: "Descanso" },
        { day: "D3", type: "Contínuo", desc: "10 min corrida contínua (mantenha o ritmo)" },
        { day: "D4", type: "Ativo", desc: "Caminhada leve" },
        { day: "D5", type: "Contínuo", desc: "12–15 min corrida contínua (auto-desafio)" },
        { day: "D6", type: "Misto", desc: "Caminhada + trote leve livre" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ]
    }
  },
  constancia: {
    title: "Liga Constância",
    level: "Intermediário",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Foco em volume e treinos intervalados de tempo (ritmo).",
    weeks: {
      1: [
        { day: "D1", type: "Contínuo", desc: "4 km corrida leve" },
        { day: "D2", type: "Ativo", desc: "Descanso ou mobilidade articular" },
        { day: "D3", type: "Intervalado", desc: "4x (2 min forte + 2 min leve)" },
        { day: "D4", type: "Descanso", desc: "Descanso" },
        { day: "D5", type: "Progressivo", desc: "5 km progressivo (termina mais forte)" },
        { day: "D6", type: "Ativo", desc: "Descanso ou caminhada leve" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ],
      2: [
        { day: "D1", type: "Contínuo", desc: "5 km corrida leve" },
        { day: "D2", type: "Descanso", desc: "Descanso" },
        { day: "D3", type: "Intervalado", desc: "5x (2 min forte + 2 min leve)" },
        { day: "D4", type: "Descanso", desc: "Descanso" },
        { day: "D5", type: "Progressivo", desc: "6 km progressivo (aceleração gradual)" },
        { day: "D6", type: "Descanso", desc: "Descanso" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ],
      3: [
        { day: "D1", type: "Contínuo", desc: "5 km corrida leve" },
        { day: "D2", type: "Descanso", desc: "Descanso" },
        { day: "D3", type: "Ritmo", desc: "3 km ritmo moderado contínuo" },
        { day: "D4", type: "Descanso", desc: "Descanso" },
        { day: "D5", type: "Volume", desc: "7 km (últimos 2 km mais fortes)" },
        { day: "D6", type: "Descanso", desc: "Descanso" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ]
    }
  },
  elite: {
    title: "Liga Elite",
    level: "Avançado",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    description: "Treinos de performance, tiros de velocidade e ritmos intensos.",
    weeks: {
      1: [
        { day: "D1", type: "Misto", desc: "6 km leve + 4 acelerações (tiros curtos de 100m)" },
        { day: "D2", type: "Ativo", desc: "Descanso ou mobilidade" },
        { day: "D3", type: "Tiros", desc: "6x (400m forte + 1 min leve)" },
        { day: "D4", type: "Descanso", desc: "Descanso" },
        { day: "D5", type: "Ritmo", desc: "5 km ritmo (forte controlado)" },
        { day: "D6", type: "Ativo", desc: "Descanso ou mobilidade" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ],
      2: [
        { day: "D1", type: "Misto", desc: "7 km leve + 4 acelerações" },
        { day: "D2", type: "Descanso", desc: "Descanso" },
        { day: "D3", type: "Tiros", desc: "8x (400m forte + 1 min leve)" },
        { day: "D4", type: "Descanso", desc: "Descanso" },
        { day: "D5", type: "Ritmo", desc: "6 km ritmo" },
        { day: "D6", type: "Descanso", desc: "Descanso" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ],
      3: [
        { day: "D1", type: "Misto", desc: "6 km leve + 5 acelerações" },
        { day: "D2", type: "Descanso", desc: "Descanso" },
        { day: "D3", type: "Tiros", desc: "5x (800m forte + 2 min leve)" },
        { day: "D4", type: "Descanso", desc: "Descanso" },
        { day: "D5", type: "Ritmo", desc: "7 km ritmo" },
        { day: "D6", type: "Descanso", desc: "Descanso" },
        { day: "D7", type: "Descanso", desc: "Descanso" },
      ]
    }
  }
};

// ── Component ──
const PlanilhaCorrida = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // 1. Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
    enabled: !!user
  });

  const currentPlannerType = (profile?.planner_type || "essencial") as keyof typeof RUNNING_WORKOUTS;
  
  // 2. Local states
  const [activeLeague, setActiveLeague] = useState<keyof typeof RUNNING_WORKOUTS>(currentPlannerType);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingLeague, setPendingLeague] = useState<keyof typeof RUNNING_WORKOUTS | null>(null);

  // Sync activeLeague when profile loads
  useEffect(() => {
    if (profile?.planner_type) {
      setActiveLeague(profile.planner_type as keyof typeof RUNNING_WORKOUTS);
    }
  }, [profile]);

  // 3. Cycle Calculation
  const calculateCycleDay = () => {
    const startDate = new Date("2026-04-06T00:00:00-03:00").getTime();
    const now = new Date().getTime();
    if (now < startDate) return 1;
    const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    return (diffDays % 21) + 1;
  };
  
  const cycleDay = calculateCycleDay();
  const activeWeek = cycleDay <= 7 ? 1 : cycleDay <= 14 ? 2 : 3;

  // 4. Mutation to update profile
  const updateLeagueMutation = useMutation({
    mutationFn: async (newType: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ planner_type: newType })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile-planner-type"] });
      queryClient.invalidateQueries({ queryKey: ["segmented-ranking"] });
      toast.success("Liga de corrida atualizada com sucesso! 🏃‍♀️💨");
      setShowConfirmModal(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao mudar liga: " + err.message);
      setShowConfirmModal(false);
    }
  });

  const handleTabClick = (league: keyof typeof RUNNING_WORKOUTS) => {
    if (league === currentPlannerType) {
      setActiveLeague(league);
      return;
    }
    setPendingLeague(league);
    setShowConfirmModal(true);
  };

  const confirmLeagueChange = () => {
    if (pendingLeague) {
      updateLeagueMutation.mutate(pendingLeague);
      setActiveLeague(pendingLeague);
    }
  };

  if (isLoading) return (
     <div className="p-8 flex justify-center items-center h-48">
        <Activity className="animate-spin text-primary" size={32} />
     </div>
  );

  const leagueData = RUNNING_WORKOUTS[activeLeague] || RUNNING_WORKOUTS.essencial;
  const workouts = leagueData.weeks[activeWeek as 1 | 2 | 3] || [];

  return (
    <div className="space-y-6">
      {/* ── League Tabs UI ── */}
      <div className="flex bg-secondary/50 p-1.5 rounded-2xl border border-border/10 backdrop-blur-md">
        {(Object.keys(RUNNING_WORKOUTS) as Array<keyof typeof RUNNING_WORKOUTS>).map((key) => {
          const l = RUNNING_WORKOUTS[key];
          const isActive = activeLeague === key;
          const isUserLeague = currentPlannerType === key;
          
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              className={cn(
                "flex-1 py-3 px-2 rounded-xl transition-all duration-300 relative group",
                isActive ? "bg-background shadow-glow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-60", isActive && l.color)}>
                  {l.level}
                </span>
                <span className={cn("text-[10px] md:text-xs font-bold font-cinzel transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {l.title.replace("Liga ", "")}
                </span>
              </div>
              {isUserLeague && (
                <div className="absolute top-1 right-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── League Info Banner ── */}
      <AnimatePresence mode="wait">
        <motion.div
           key={activeLeague}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           className={cn("p-4 rounded-2xl border flex items-center gap-4", leagueData.bg, leagueData.border)}
        >
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", leagueData.bg)}>
            <Trophy className={leagueData.color} size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
               <h4 className={cn("font-cinzel font-bold text-sm", leagueData.color)}>{leagueData.title}</h4>
               <Badge className="bg-background/20 text-white border-none text-[8px] h-4">Semana {activeWeek}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{leagueData.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Weekly Spreadsheet ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
           <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Planilha Semanal</h5>
           <span className="text-[10px] font-bold text-primary flex items-center gap-1">
              <Calendar size={10} /> Dia {cycleDay} / 21
           </span>
        </div>

        <div className="grid gap-3">
          {workouts.map((w, index) => {
            const isToday = (index + 1) === (cycleDay % 7 === 0 ? 7 : cycleDay % 7);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "p-4 rounded-2xl border transition-all group relative overflow-hidden",
                  isToday 
                    ? "bg-secondary border-primary/40 shadow-glow-sm" 
                    : "bg-card border-border/50 hover:border-border"
                )}
              >
                {isToday && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-full bg-primary" />
                )}
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[9px] font-black uppercase", isToday ? "text-primary" : "text-muted-foreground")}>
                           {w.day}
                        </span>
                        <Badge variant="outline" className="text-[8px] py-0 h-4 uppercase border-border/30 opacity-60">
                           {w.type}
                        </Badge>
                     </div>
                     <p className={cn("text-xs leading-relaxed font-medium transition-colors", isToday ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground")}>
                        {w.desc}
                     </p>
                  </div>
                  
                  {isToday ? (
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <Activity size={16} />
                     </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center text-muted-foreground/30 border border-border/30 shrink-0">
                        <Flame size={14} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Intercept Modal ── */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent className="max-w-xs rounded-[2rem] border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel text-lg flex items-center gap-2">
              <AlertTriangle className="text-primary" size={20} />
              Atenção
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Mudar o nível da corrida também mudará seu nível principal no **Planner** e sua posição no **Ranking** da Comunidade. <br/><br/>
              Deseja assumir este novo desafio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 mt-4">
            <AlertDialogAction
              onClick={confirmLeagueChange}
              disabled={updateLeagueMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl"
            >
              {updateLeagueMutation.isPending ? "ATUALIZANDO..." : "SIM, QUERO MUDAR"}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="w-full border-none bg-secondary/50 hover:bg-secondary text-muted-foreground font-bold h-12 rounded-xl"
            >
              CANCELAR
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlanilhaCorrida;
