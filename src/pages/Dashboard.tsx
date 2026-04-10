import { useState, useEffect, useMemo, useCallback } from "react";
import { SFX } from "@/hooks/useSoundEffects";
import { optimisticFlameUpdate } from "@/lib/flameOptimistic";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Dumbbell, UtensilsCrossed, TrendingUp, Calendar, AlertTriangle, ChevronRight, X, Droplets, Plus, Minus, Flame, User, Check, Moon, Target } from "lucide-react";
import NotificationCenter from "@/components/NotificationCenter";
import { useNavigate } from "react-router-dom";
import InsanoLogo from "@/components/InsanoLogo";
import DailyCheckIn, { type MentalState, mentalStateLabels, type CheckInResult } from "@/components/DailyCheckIn";
import { useIsMobile } from "@/hooks/use-mobile";
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import { useProfile } from "@/hooks/useProfile";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealPerformance } from "@/hooks/useRealPerformance";
import PerformanceDetailModal from "@/components/PerformanceDetailModal";
// ThemeToggle removed as app is now light mode only
import { useAuth } from "@/contexts/AuthContext";
import { getToday, getDailyValue, setDailyValue } from "@/lib/dateUtils";
import { useDailyHabits } from "@/hooks/useDailyHabits";
import { useFlameState } from "@/hooks/useFlameState";
// FlameCard removed as it's now integrated into the hero card
import FlameBanner from "@/components/FlameBanner";
import DashboardHero from "@/components/dashboard/DashboardHero";
import DailyGoals from "@/components/dashboard/DailyGoals";
import PerformanceEvolution from "@/components/dashboard/PerformanceEvolution";
// WeeklyVolume removed
import { DashboardSkeleton } from "@/components/skeletons/AppSkeletons";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ── Removed static daily goals config as it is now dynamically fetched per planner ──
// Limites por grupo (editáveis pelo especialista — mock)
const volumeLimits: Record<string, { min: number; max: number }> = {
  "Peito": { min: 10, max: 20 },
  "Costas": { min: 10, max: 20 },
  "Ombro": { min: 10, max: 20 },
  "Bíceps": { min: 8, max: 16 },
  "Tríceps": { min: 8, max: 16 },
  "Trapézio": { min: 6, max: 14 },
  "Antebraço": { min: 4, max: 10 },
  "Quadríceps": { min: 10, max: 20 },
  "Posterior": { min: 10, max: 20 },
  "Glúteos": { min: 8, max: 16 },
  "Panturrilha": { min: 6, max: 12 },
  "Abdômen": { min: 6, max: 12 },
  "Core": { min: 6, max: 12 },
};

const getVolumeColor = (series: number, active: boolean, min = 10, max = 20) => {
  if (!active) return "hsl(270, 30%, 35%)";
  if (series < min) return "hsl(0, 70%, 45%)";
  if (series <= max) return "hsl(140, 60%, 40%)";
  return "hsl(40, 80%, 50%)";
};

const getVolumeLabel = (series: number, min = 10, max = 20) => {
  if (series < min) return "Abaixo do ideal";
  if (series <= max) return "Faixa ideal";
  return "Acima do ideal";
};

const VolumeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    const val = payload[0].value;
    const limits = volumeLimits[entry.grupo];
    const min = limits?.min ?? 10;
    const max = limits?.max ?? 20;
    return (
      <div style={{ background: "hsl(0, 0%, 10%)", border: "1px solid hsl(0, 0%, 16%)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "hsl(43, 30%, 85%)" }}>
        <p className="font-semibold">{val} séries</p>
        <p style={{ fontSize: "10px", color: val < min ? "hsl(0, 70%, 55%)" : val <= max ? "hsl(140, 60%, 50%)" : "hsl(40, 80%, 60%)" }}>
          {getVolumeLabel(val, min, max)} ({min}-{max})
        </p>
      </div>
    );
  }
  return null;
};

const VolumeLegend = () => (
  <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(0, 70%, 45%)" }} /> Abaixo</span>
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(140, 60%, 40%)" }} /> Ideal</span>
    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(40, 80%, 50%)" }} /> Acima</span>
  </div>
);

const VolumeResumoTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div style={{ background: "hsl(0, 0%, 10%)", border: "1px solid hsl(0, 0%, 16%)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "hsl(43, 30%, 85%)" }}>
        <p className="font-semibold">{entry.grupo}: {entry.series} séries totais</p>
        <p style={{ fontSize: "10px", color: "hsl(43, 10%, 55%)" }}>{entry.total} grupos musculares</p>
      </div>
    );
  }
  return null;
};

// ── Removed stoic quotes ──

const hasDietPlan = true;
import { getGoalsForUser } from "@/lib/progressiveGoals";

// Debug NormalizeInicianteButton removed for production

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = getToday();
  const { pushState, requestPermission, isInstallable, installPWA } = usePushNotifications();

  // Real performance data
  const {
    trainingScore,
    dietScore,
    waterScore,
    sleepScore,
    performanceScore,
    volumeDetalhado,
    volumeResumido,
    performanceData,
    performanceData30,
    todaySchedule,
    hasTrainingPlan,
    todayCheckin,
  } = useRealPerformance();

  const { state: flameState, streak, isLoading: isFlameLoading } = useFlameState();
  const adherence = Math.min(100, performanceScore);

  // Real training plan (from useTrainingPlan) for Hero display
  const { data: realTrainingPlan } = useTrainingPlan();
  const currentDayLabel = useMemo(() => {
    const days = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    return days[new Date().getDay()];
  }, []);

  const todayTrainingName = useMemo(() => {
    if (!realTrainingPlan || !Array.isArray(realTrainingPlan.groups) || realTrainingPlan.groups.length === 0) {
      return todaySchedule.name;
    }
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0) return "Descanso";
    const groups = realTrainingPlan.groups;
    const groupIndex = (dayOfWeek - 1) % groups.length;
    if (dayOfWeek - 1 >= groups.length) return "Descanso";
    const rawName = groups[groupIndex]?.name || realTrainingPlan.title || todaySchedule.name;
    return rawName.replace(/^(SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA|SÁBADO|DOMINGO)\s*[—–-]\s*/i, '');
  }, [realTrainingPlan, todaySchedule.name]);

  const hasRealPlan = !!realTrainingPlan || hasTrainingPlan;

  // Calculate days elapsed in challenge (for progressive goals)
  // First try challenge_participants, then fallback to active challenge start_date
  const { data: participantData } = useQuery({
    queryKey: ["challenge-participant-days", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Try participant record first
      const { data: participant } = await supabase
        .from("challenge_participants")
        .select("joined_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (participant?.joined_at) return { start: participant.joined_at };

      // Fallback: use active challenge start_date
      const { data: challenge } = await supabase
        .from("challenges")
        .select("start_date")
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (challenge?.start_date) return { start: challenge.start_date };

      return null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });
  const planDaysElapsed = participantData?.start
    ? Math.max(1, Math.ceil((Date.now() - new Date(participantData.start).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  const dynamicGoalsConfig = useMemo(() => {
    return getGoalsForUser((profile as any)?.planner_type, planDaysElapsed);
  }, [profile, planDaysElapsed]);

  const todayKey = `habits_${new Date().toISOString().split('T')[0]}_${user?.id || 'guest'}`;
  const [habits, setHabits] = useState({ treinou: false, dieta: false, agua: false, sono: false });
  useEffect(() => {
    const saved = localStorage.getItem(todayKey);
    if (saved) {
      try { setHabits(JSON.parse(saved)); } catch (e) {}
    }
  }, [todayKey]);

  const updateHabit = (key: keyof typeof habits, value: boolean) => {
    const newHabits = { ...habits, [key]: value };
    setHabits(newHabits);
    localStorage.setItem(todayKey, JSON.stringify(newHabits));
    if (value) {
      try { SFX.tap(); } catch (e) {}
    }
  };

  const HabitCheckbox = ({ label, checked, onChange, Icon }: any) => (
    <button 
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
        checked 
          ? 'bg-accent/10 border-accent/30 shadow-[0_0_15px_rgba(255,107,0,0.1)]' 
          : 'bg-secondary/20 border-border hover:border-accent/30'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
        checked ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-background/50 text-muted-foreground'
      }`}>
        {checked ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
      </div>
      <span className={`text-sm font-bold tracking-tight transition-colors ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </button>
  );

  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  // Daily check-in
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [volumeExpanded, setVolumeExpanded] = useState(false);
  const [volumeFilter, setVolumeFilter] = useState<"all" | "superior" | "inferior">("all");
  const moodToMentalState = (mood: number): MentalState => {
    if (mood >= 5) return "energizado";
    if (mood >= 4) return "focado";
    if (mood >= 3) return "neutro";
    if (mood >= 2) return "cansado";
    return "desanimado";
  };
  const [mentalState, setMentalState] = useState<MentalState>("focado");
  
  useEffect(() => {
    if (todayCheckin?.mood) {
      setMentalState(moodToMentalState(Number(todayCheckin.mood)));
    }
  }, [todayCheckin]);
  
  const filteredVolume = useMemo(() => {
    return volumeFilter === "all" ? volumeDetalhado : volumeDetalhado.filter(v => v.regiao === volumeFilter);
  }, [volumeFilter, volumeDetalhado]);

  // Water & meals from database
  const { waterIntake, setWater: setWaterIntake, mealsCompletedCount: mealsCompleted, completedMeals, toggleMeal } = useDailyHabits();

  // Fetch diet plan to get real total meals count (try diet_plans first, then challenge diet)
  const { data: dietPlanData } = useQuery({
    queryKey: ["diet-plan-meals-count", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Try user's personal diet plan first
      const { data } = await supabase
        .from("diet_plans")
        .select("meals")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.meals) return data;

      // Fallback: count meals from challenge diet module
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id")
        .eq("is_active", true);
      if (!challenges?.length) return null;

      for (const ch of challenges) {
        const { data: dietModule } = await supabase
          .from("challenge_modules")
          .select("id")
          .eq("challenge_id", ch.id)
          .eq("type", "diets")
          .maybeSingle();
        if (!dietModule) continue;

        const { data: lessons } = await supabase
          .from("challenge_lessons")
          .select("description")
          .eq("module_id", dietModule.id);
        if (!lessons?.length) continue;

        // Count meals from parsed JSON descriptions
        let mealCount = 0;
        for (const lesson of lessons) {
          try {
            const parsed = JSON.parse(lesson.description || "[]");
            if (Array.isArray(parsed)) mealCount += parsed.length;
          } catch {
            mealCount += 1; // plain text = 1 meal per lesson
          }
        }
        if (mealCount > 0) return { meals: new Array(mealCount) };
      }
      return null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });

  const totalMealsFromPlan = useMemo(() => {
    if (!dietPlanData?.meals) return 6;
    try {
      return (dietPlanData.meals as any[]).length || 6;
    } catch {
      return 6;
    }
  }, [dietPlanData]);

  const sleepHours = todayCheckin?.sleep_hours ? Number(todayCheckin.sleep_hours) : 0;

  const checkedIn = !!todayCheckin || localStorage.getItem("lastCheckIn") === new Date().toDateString();

  // Daily check-in popup removed

// Stoic Quote removed

  // Visual styles based on flame state
  const isFrozen = flameState === "frozen";
  const pageBg = undefined;
  const cardBg = "bg-card";
  const cardBorder = "border-border";
  const textMuted = "text-muted-foreground";

  // Button gradient based on flame state
  const buttonGradient = isFrozen
    ? "linear-gradient(135deg, hsl(210, 50%, 40%), hsl(210, 60%, 50%))"
    : "linear-gradient(135deg, hsl(var(--crimson)), hsl(var(--crimson-glow)))";
  const buttonShadow = isFrozen
    ? "0 0 20px hsl(210, 50%, 40%, 0.3)"
    : "0 0 20px hsl(var(--crimson) / 0.3)";

  // Chart/progress accent color based on flame state
  const chartColor = isFrozen ? "hsl(210, 50%, 50%)" : "hsl(342, 100%, 57%)";
  
  // Progress bar colors for daily goals
  const mealBarColor = isFrozen ? "hsl(210, 50%, 45%)" : "hsl(var(--primary))";
  const sleepBarColor = isFrozen ? "hsl(210, 40%, 42%)" : "hsl(270, 60%, 50%)";
  const waterBarColor = isFrozen ? "hsl(210, 45%, 48%)" : "hsl(220, 60%, 50%)";
  
  // Quote accent color
  const quoteAccent = isFrozen ? "hsl(210, 50%, 55%)" : "hsl(var(--accent))";
  const quoteBorder = isFrozen ? "hsl(210, 18%, 20%)" : "hsl(var(--border) / 0.5)";
  const quoteTextColor = isFrozen ? "hsl(210, 20%, 65%)" : "hsl(var(--foreground) / 0.8)";
  
  // Volume bar color override
  const volumeBarColor = isFrozen ? "hsl(210, 40%, 40%)" : "hsl(140, 60%, 40%)";
  
  // Stat badge colors
  const statBorderColor = isFrozen ? "hsl(210, 18%, 20%)" : undefined;
  
  // Icon accent color for misc icons (TrendingUp, Droplets, etc.)
  const iconAccentColor = isFrozen ? "hsl(210, 50%, 50%)" : undefined;
  const iconAccentClass = isFrozen ? "text-[hsl(210,50%,50%)]" : "text-accent";
  const dropletsClass = isFrozen ? "text-[hsl(210,50%,50%)]" : "text-[hsl(220,60%,50%)]";

  // Stoic Quote component removed


  // Stoic Quote component removed


  // Show skeleton while loading (unified — single skeleton only)
  if (isFlameLoading || isProfileLoading) {
    return <DashboardSkeleton />;
  }

  // NOTE: The Suspense boundary in AuthenticatedApp already shows DashboardSkeleton 
  // while the lazy chunk loads. This guard handles data-loading state AFTER mount.
  // Both never overlap because Suspense resolves before this component renders.

  // ========== MOBILE LAYOUT ==========
  if (isMobile) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4 relative min-h-screen transition-colors duration-500" style={{ backgroundColor: pageBg }}>
        {/* FlameBanner removed — message now in hero */}

        {/* Header Redesigned */}
        <div className="flex items-center justify-between pt-2 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center p-1 border border-accent/40 shadow-[0_0_15px_rgba(255,107,0,0.15)]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                <img src="/anaac-logo-white.png" alt="ANAAC" className="w-5 h-5 object-contain" />
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-sans font-semibold tracking-widest text-muted-foreground mb-0.5 uppercase`}>BEM-VINDA AO ANAAC CLUB</p>
              <h1 className="font-sans text-lg font-bold flex items-center gap-2">
                <span className="text-foreground">{(profile as any)?.full_name?.split(' ')[0] || "ATLETA"}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/aluno/perfil")}
              className="w-10 h-10 flex items-center justify-center text-foreground hover:text-accent transition-colors"
            >
              <User size={22} />
            </motion.button>
          </div>
        </div>



        <PushPermissionBanner
          pushState={pushState}
          onRequestPermission={requestPermission}
          isInstallable={isInstallable}
          onInstall={installPWA}
        />


        <DashboardHero 
          hasTrainingPlan={hasRealPlan}
          todayScheduleName={todayTrainingName}
          currentDayLabel={currentDayLabel}
          adherence={adherence}
          streak={streak}
          ranking={(profile as any)?.ranking || 1}
          flameState={flameState}
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
          {(profile as any)?.planner_type ? (
             <DailyGoals 
                 waterIntake={waterIntake}
                 waterGoal={dynamicGoalsConfig.waterGoal}
                 sleepHours={sleepHours}
                 sleepGoal={dynamicGoalsConfig.sleepGoal}
                 setWaterIntake={setWaterIntake}
                 iconAccentClass={iconAccentClass}
                 dropletsClass={dropletsClass}
                 waterBarColor={waterBarColor}
                 sleepBarColor={sleepBarColor}
                 performanceData={performanceData}
                 plannerType={(profile as any)?.planner_type}
                 planDaysElapsed={planDaysElapsed}
                 totalMealsInDiet={totalMealsFromPlan}
              />
          ) : (
             <div className={`${cardBg} ${cardBorder} border p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-70`}>
                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                  <Target className="text-muted-foreground w-6 h-6" />
                </div>
                <h4 className="font-cinzel text-lg font-bold text-foreground mb-1">Planner Inativo</h4>
                <p className="text-xs text-muted-foreground max-w-[200px]">Ative um plano de treinos e escolha seu planner para liberar as metas diárias.</p>
             </div>
          )}
          
          <PerformanceEvolution 
            performanceData={performanceData}
            chartColor={chartColor}
            setShowPerformanceModal={setShowPerformanceModal}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />

        </div>

        {/* Skeletons handled above if loading */}




        {/* DailyCheckIn popup removed */}
        <PerformanceDetailModal
          open={showPerformanceModal}
          onClose={() => setShowPerformanceModal(false)}
          weekData={performanceData}
          monthData={performanceData30}
          plannerType={(profile as any)?.planner_type}
          planDaysElapsed={planDaysElapsed}
        />

        {/* Debug buttons removed for production */}
      </div>
    );
  }

  // ========== DESKTOP LAYOUT ==========
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative min-h-screen transition-colors duration-500" style={{ backgroundColor: pageBg }}>
      {/* FlameBanner removed — message now in hero */}

      {/* Desktop Header Redesigned */}
      <div className="flex items-center justify-between relative z-10 pb-6 border-b border-white/5">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center p-1.5 border border-accent/40 shadow-[0_0_25px_rgba(255,107,0,0.15)]">
             <div className="w-full h-full rounded-full bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
               <img src="/anaac-logo-white.png" alt="ANAAC" className="w-8 h-8 object-contain" />
             </div>
           </div>
           <div>
            <p className="text-xs font-sans font-semibold tracking-widest text-muted-foreground uppercase mb-1">BEM-VINDA AO ANAAC CLUB</p>
            <h1 className="font-sans text-3xl font-bold flex items-center">
              <span className="text-foreground">{(profile as any)?.full_name?.toUpperCase() || "MIRI"}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <NotificationCenter />
        </div>
      </div>

      <DashboardHero 
        hasTrainingPlan={hasRealPlan}
        todayScheduleName={todayTrainingName}
        currentDayLabel={currentDayLabel}
        adherence={adherence}
        streak={streak}
        ranking={(profile as any)?.ranking || 1}
        
        flameState={flameState}
      />

      <PushPermissionBanner
        pushState={pushState}
        onRequestPermission={requestPermission}
        isInstallable={isInstallable}
        onInstall={installPWA}
      />

      {/* Balanced 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {(profile as any)?.planner_type ? (
           <DailyGoals 
              waterIntake={waterIntake}
              waterGoal={dynamicGoalsConfig.waterGoal}
              sleepHours={sleepHours}
              sleepGoal={dynamicGoalsConfig.sleepGoal}
              setWaterIntake={setWaterIntake}
              iconAccentClass={iconAccentClass}
              dropletsClass={dropletsClass}
              waterBarColor={waterBarColor}
              sleepBarColor={sleepBarColor}
              performanceData={performanceData}
              plannerType={(profile as any)?.planner_type}
              planDaysElapsed={planDaysElapsed}
              totalMealsInDiet={totalMealsFromPlan}
            />
        ) : (
             <div className={`${cardBg} ${cardBorder} border p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] flex flex-col items-center justify-center text-center w-full h-full min-h-[300px] opacity-70`}>
                <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                  <Target className="text-muted-foreground w-8 h-8" />
                </div>
                <h4 className="font-cinzel text-xl font-bold text-foreground mb-2">Planner Inativo</h4>
                <p className="text-sm text-muted-foreground max-w-[250px]">Ative um plano de treinos e escolha seu planner para liberar as metas e evoluir sua pontuação.</p>
             </div>
        )}

        <PerformanceEvolution 
          performanceData={performanceData}
          chartColor={chartColor}
          setShowPerformanceModal={setShowPerformanceModal}
          cardBg={cardBg}
          cardBorder={cardBorder}
        />
      </div>



      {/* DailyCheckIn popup removed */}
      <PerformanceDetailModal
        open={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        weekData={performanceData}
        monthData={performanceData30}
        plannerType={(profile as any)?.planner_type}
        planDaysElapsed={planDaysElapsed}
      />
    </div>
  );
};

export default Dashboard;
