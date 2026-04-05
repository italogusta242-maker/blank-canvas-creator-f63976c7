import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowRight, 
  Play, 
  Utensils, 
  Dumbbell, 
  MessageSquare, 
  BookOpen, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Lock,
  Download,
  MessageCircle,
  Clock,
  ExternalLink,
  Flame,
  Star,
  Send,
  Loader2,
  FileText,
  CornerDownRight,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import SkeletonLayout from "@/components/SkeletonLayout";
import { cn } from "@/lib/utils";
import { parseWorkoutDescription } from "@/components/training/helpers";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { pickPreferredChallenge } from "@/lib/challenges";
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

// --- Types ---
interface Challenge {
  id: string;
  title: string;
  description: string;
  banner_image_url: string;
  target_group_id: string | null;
}

interface Banner {
  id: string;
  title_top: string;
  title_main: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  features: string[];
  bg_color?: string;
}

interface Module {
  id: string;
  title: string;
  icon: string;
  type: 'lessons' | 'diets' | 'workouts' | 'community' | 'running' | 'planner';
  is_locked: boolean;
  cover_image?: string | null;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  video_url: string;
  pdf_url?: string;
  description?: string;
  isPlan?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    nome: string;
    avatar_url: string;
  };
}

interface DietPlan {
  id: string;
  title: string;
  goal_description: string;
  calories: number;
}

interface TrainingPlan {
  id: string;
  title: string;
  objetivo_mesociclo: string;
}

// --- Sub-Components ---

const BannerCarousel = ({ banners }: { banners: Banner[] }) => {
  const visibleBanners = banners.slice(0, 5);
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % visibleBanners.length);
  const prev = () => setCurrent((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);

  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [visibleBanners.length, current]);

  if (visibleBanners.length === 0) return null;

  return (
    <div className="relative w-full aspect-[21/9] max-h-[400px] overflow-hidden shadow-2xl group bg-white">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={visibleBanners[current].id}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 30, duration: 0.6 }}
          className="absolute inset-0"
        >
          <img 
            src={visibleBanners[current].image_url} 
            className="w-full h-full object-contain" 
            alt="Banner" 
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {visibleBanners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-accent' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>

      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden md:block">
        <ChevronLeft size={24} />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden md:block">
        <ChevronRight size={24} />
      </button>
    </div>
  );
};

const Challenge = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [pendingPlanSelection, setPendingPlanSelection] = useState<{ id: string; type: string; title?: string } | null>(null);
  const [isChangingPlanner, setIsChangingPlanner] = useState(false);
  const [isUpdatingPlanner, setIsUpdatingPlanner] = useState(false);

  const handleSelectPlanner = async (plannerType: string) => {
    if (!user) return;
    setIsUpdatingPlanner(true);
    try {
      const { error } = await supabase.from("profiles").update({ planner_type: plannerType }).eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile-group"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsChangingPlanner(false);
      toast.success("Planner ativado com sucesso!");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch(err) {
      console.error(err);
      toast.error("Erro ao ativar o planner.");
    } finally {
      setIsUpdatingPlanner(false);
    }
  };

  const userProfile = useQuery({
    queryKey: ["profile-group", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("group_id, planner_type").eq("id", user.id).maybeSingle();
      if (error) { console.error("Profile fetch error:", error); return null; }
      return data;
    },
    enabled: !!user,
  });

  const profileLoaded = userProfile.isSuccess;

  const userGroupId = userProfile.data?.group_id ?? null;

  const { data: userGroupName } = useQuery({
    queryKey: ["user-group-name", userGroupId],
    queryFn: async () => {
      if (!userGroupId) return null;
      const { data } = await supabase.from("user_groups").select("name").eq("id", userGroupId).maybeSingle();
      return data?.name || "Sem Turma";
    },
    enabled: !!userGroupId,
  });

  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ["challenges", userGroupId, userProfile.data?.planner_type],
    queryFn: async () => {
      let query = supabase.from("challenges").select("*").eq("is_active", true);
      
      if (userGroupId) {
        query = query.or(`target_group_id.is.null,target_group_id.eq.${userGroupId}`);
      } else {
        query = query.is("target_group_id", null);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data as Challenge[];
    },
    enabled: profileLoaded,
  });

  const activeChallenge = useMemo(() => pickPreferredChallenge(challenges), [challenges]);

  const { data: challengeBanners = [] } = useQuery({
    queryKey: ["banners", activeChallenge?.id],
    queryFn: async () => {
      if (!activeChallenge) return [];
      const { data, error } = await supabase.from("challenge_banners").select("*").eq("challenge_id", activeChallenge.id).eq("is_active", true).order("created_at", { ascending: true });
      if (error) throw error;
      return data as Banner[];
    },
    enabled: !!activeChallenge,
  });

  const { data: challengeModules = [] } = useQuery({
    queryKey: ["modules", activeChallenge?.id],
    queryFn: async () => {
      if (!activeChallenge) return [];
      const { data, error } = await supabase.from("challenge_modules").select("*").eq("challenge_id", activeChallenge.id).order("order_index", { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
    enabled: !!activeChallenge,
  });

  useEffect(() => {
    if (challengeModules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(challengeModules[0].id);
    }
  }, [challengeModules, selectedModuleId]);

  const selectedModule = challengeModules.find(m => m.id === selectedModuleId) || challengeModules[0];

  const { data: moduleLessons = [] } = useQuery({
    queryKey: ["lessons", selectedModuleId],
    queryFn: async () => {
      if (!selectedModuleId) return [];
      const { data, error } = await supabase.from("challenge_lessons").select("*").eq("module_id", selectedModuleId).order("order_index", { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!selectedModuleId && selectedModule?.type !== 'community',
  });


  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("lesson_progress").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: dietPlans = [] } = useQuery({
    queryKey: ["all-diets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("diet_plans").select("*").eq("active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data as DietPlan[];
    },
    enabled: !!user && selectedModule?.type === 'diets',
  });

  const { data: trainingPlans = [] } = useQuery({
    queryKey: ["all-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_plans").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as TrainingPlan[];
    },
    enabled: !!user && selectedModule?.type === 'workouts',
  });

  const unifiedContent = useMemo(() => {
    const moduleType = selectedModule?.type;
    let list = [...moduleLessons];

    if (moduleType === 'diets' || moduleType === 'workouts') {
      const pItems = (moduleType === 'diets' ? dietPlans : trainingPlans).map(p => ({
        id: p.id,
        title: p.title,
        duration: "PLANO",
        video_url: "",
        description: (p as any).goal_description || (p as any).objetivo_mesociclo || "Plano disponível para visualização e importação.",
        isPlan: true
      }));
      pItems.forEach(pi => {
        if (!list.some(l => l.title === pi.title)) list.push(pi as any);
      });
    }
    return list;
  }, [moduleLessons, dietPlans, trainingPlans, selectedModule?.type]);

  const allLessonIds = useMemo(() => unifiedContent.map(l => l.id), [unifiedContent]);
  const challengeCommentKey = activeChallenge?.id || 'none';
  
  const { data: lessonComments = [] } = useQuery({
    queryKey: ["challenge-comments", challengeCommentKey, allLessonIds],
    queryFn: async () => {
      if (allLessonIds.length === 0) return [];
      const { data, error } = await supabase.from("lesson_comments").select(`id, content, created_at, user_id, profiles ( nome, avatar_url )`).in("lesson_id", allLessonIds).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as any as Comment[];
    },
    enabled: allLessonIds.length > 0,
  });


  useEffect(() => {
    if (unifiedContent.length > 0) {
      const currentExists = unifiedContent.some(l => l.id === activeLessonId);
      if (!activeLessonId || !currentExists) {
        setActiveLessonId(unifiedContent[0].id);
      }
    }
  }, [selectedModuleId, unifiedContent.length]);

  const activeLesson = unifiedContent.find(l => l.id === activeLessonId) || unifiedContent[0];

  const { data: selectedPlans = [] } = useQuery({
    queryKey: ["user-selected-plans", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("user_selected_plans").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const isAlreadyImported = (sourceId: string, planType: string) => {
    const type = (planType === 'training' || planType === 'treino' || planType === 'workouts' || planType === 'running') ? 'training' : (planType === 'planner' ? 'planner' : 'diet');
    const isLessonInList = unifiedContent.some(l => l.id === sourceId && !(l as any).isPlan);
    
    if (!selectedPlans || selectedPlans.length === 0) return false;

    const latestRecord = [...selectedPlans]
      .filter((p: any) => {
        const pNormalizedType = (p.plan_type === 'training' || p.plan_type === 'treino' || p.plan_type === 'workouts') ? 'training' : (p.plan_type === 'planner' ? 'planner' : 'diet');
        return pNormalizedType === type;
      })
      .sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })[0];

    if (!latestRecord) return false;

    const isRecordLesson = !!latestRecord.plan_data?.is_lesson;
    return latestRecord.source_plan_id === sourceId && isRecordLesson === isLessonInList;
  };

  const toggleProgressMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) { console.error("No user found"); return; }
      const existing = progress.find((p: any) => p.lesson_id === lessonId);
      const newStatus = existing?.status === 'completed' ? 'in_progress' : 'completed';
      const { error } = await supabase.from("lesson_progress").upsert({
          user_id: user.id,
          lesson_id: lessonId,
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        }, { onConflict: 'user_id,lesson_id' });
      if (error) { console.error("Progress upsert error:", error); throw error; }
    },
    onError: (err) => {
      console.error("Mutation error:", err);
      toast.error("Erro ao atualizar progresso. Verifique sua conexão.");
    },
    onMutate: async (lessonId) => {
      await queryClient.cancelQueries({ queryKey: ["lesson-progress", user?.id] });
      const prev = queryClient.getQueryData(["lesson-progress", user?.id]);
      queryClient.setQueryData(["lesson-progress", user?.id], (old: any[] | undefined) => {
        if (!old) return old;
        const existing = old.find((p: any) => p.lesson_id === lessonId);
        if (existing) {
          return old.map((p: any) => p.lesson_id === lessonId ? { ...p, status: p.status === 'completed' ? 'in_progress' : 'completed' } : p);
        }
        return [...old, { id: `temp-${Date.now()}`, lesson_id: lessonId, user_id: user?.id, status: 'completed', completed_at: new Date().toISOString() }];
      });
      return { prev };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["lesson-progress", user?.id] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const targetLessonId = activeLessonId || allLessonIds[0];
      if (!user || !targetLessonId) return;
      
      let finalContent = content;
      if (replyingTo) {
        finalContent = `[reply:${replyingTo.id}] ${content}`;
      }
      
      const { error } = await supabase.from("lesson_comments").insert([{ lesson_id: targetLessonId, user_id: user.id, content: finalContent }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["challenge-comments", challengeCommentKey, allLessonIds] });
    }
  });

  const importPlanMutation = useMutation({
    mutationFn: async ({ sourceId, planType, planData, planTitle }: { sourceId: string; planType: string; planData?: any; planTitle?: string }) => {
      if (!user) { console.error("[importPlan] No user found"); return; }
      
      const normalizedType = (planType === 'training' || planType === 'treino' || planType === 'workouts' || planType === 'running') ? 'training' : (planType === 'planner' ? 'planner' : 'diet');
      const isLessonInList = unifiedContent.some(l => l.id === sourceId && !(l as any).isPlan);

      const lessonTitle = (planTitle || unifiedContent.find(l => l.id === sourceId)?.title || "").toLowerCase().trim();
      let newPlannerType: string | null = null;
      
      if (lessonTitle.includes('essencial') || lessonTitle.includes('iniciante') || lessonTitle.includes('vital')) {
        newPlannerType = 'foco_essencial';
      } else if (lessonTitle.includes('constância') || lessonTitle.includes('constancia') || lessonTitle.includes('intermediário') || lessonTitle.includes('intermediario') || lessonTitle.includes('pro')) {
        newPlannerType = 'constancia';
      } else if (lessonTitle.includes('elite') || lessonTitle.includes('avançado') || lessonTitle.includes('avancado') || lessonTitle.includes('hardcore')) {
        newPlannerType = 'elite';
      }

      if (newPlannerType) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ planner_type: newPlannerType })
          .eq('id', user.id);
        
        if (profileErr) {
          toast.error("Erro ao atualizar liga: " + profileErr.message);
          throw profileErr;
        }
      }
      const { error } = await supabase.from("user_selected_plans").upsert({
          user_id: user.id,
          challenge_id: activeChallenge?.id || null, 
          module_id: selectedModuleId,
          plan_type: normalizedType,
          source_plan_id: sourceId,
          plan_data: { ...(planData || {}), is_lesson: isLessonInList },
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id,plan_type,source_plan_id' });
      if (error) { console.error("[importPlan] ❌ Plan upsert error:", error); throw error; }
      
      return { newPlannerType };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["user-selected-plans"] });
      await queryClient.cancelQueries({ queryKey: ["profile-group"] });
      await queryClient.cancelQueries({ queryKey: ["profile"] });
      await queryClient.cancelQueries({ queryKey: ["profile-planner-type"] });
      
      const previousSelectedPlans = queryClient.getQueryData(["user-selected-plans", user?.id]);
      const previousProfileGroup = queryClient.getQueryData(["profile-group", user?.id]);
      const previousProfile = queryClient.getQueryData(["profile", user?.id]);
      const previousPlannerType = queryClient.getQueryData(["profile-planner-type", user?.id]);
      
      const normalizedType = (variables.planType === 'training' || variables.planType === 'treino' || variables.planType === 'workouts' || variables.planType === 'running') ? 'training' : (variables.planType === 'planner' ? 'planner' : 'diet');
      
      queryClient.setQueryData(["user-selected-plans", user?.id], (old: any) => {
        const plans = Array.isArray(old) ? old : [];
        return [...plans.filter((p: any) => p.plan_type !== normalizedType), {
          source_plan_id: variables.sourceId,
          plan_type: normalizedType,
          plan_data: { is_lesson: true },
          created_at: new Date().toISOString(),
        }];
      });

      if (variables.planType === 'planner') {
         const lessonTitle = (variables.planTitle || "").toLowerCase().trim();
         let newPlannerType: string | null = null;
         if (lessonTitle.includes('essencial') || lessonTitle.includes('iniciante') || lessonTitle.includes('vital')) {
           newPlannerType = 'foco_essencial';
         } else if (lessonTitle.includes('constância') || lessonTitle.includes('constancia') || lessonTitle.includes('intermediário') || lessonTitle.includes('intermediario') || lessonTitle.includes('pro')) {
           newPlannerType = 'constancia';
         } else if (lessonTitle.includes('elite') || lessonTitle.includes('avançado') || lessonTitle.includes('avancado') || lessonTitle.includes('hardcore')) {
           newPlannerType = 'elite';
         }
         
         if (newPlannerType) {
           queryClient.setQueryData(["profile-group", user?.id], (old: any) => {
             if (!old) return { planner_type: newPlannerType };
             return { ...old, planner_type: newPlannerType };
           });
           queryClient.setQueryData(["profile", user?.id], (old: any) => {
             if (!old) return { planner_type: newPlannerType };
             return { ...old, planner_type: newPlannerType };
           });
           queryClient.setQueryData(["profile-planner-type", user?.id], (old: any) => {
             if (!old) return { planner_type: newPlannerType };
             return { ...old, planner_type: newPlannerType };
           });
         }
      }

      return { previousSelectedPlans, previousProfileGroup, previousProfile, previousPlannerType };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-selected-plans", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["training-plan", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["diet-plan", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-group", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-planner-type", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["segmented-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      
      const label = (variables.planType === 'training' || variables.planType === 'treino' || variables.planType === 'workouts') ? 'Treino' : (variables.planType === 'planner' ? 'Planner' : 'Dieta');
      
      if (variables.planType === 'planner' && result?.newPlannerType) {
        const plannerLabel = result.newPlannerType === 'elite' ? 'Elite 100%' : result.newPlannerType === 'constancia' ? 'Constância PRO' : 'Foco Essencial';
        toast.success(`Liga ${plannerLabel} ativada com sucesso! 🎯`);
      } else {
        toast.success(`${label} selecionado(a) com sucesso!`);
      }
    },
    onError: (err: any, variables, context: any) => {
      const msg = err.message || (typeof err === 'string' ? err : 'Tente novamente');
      toast.error(`Erro ao selecionar plano: ${msg}`);
      
      if (context?.previousSelectedPlans) {
        queryClient.setQueryData(["user-selected-plans", user?.id], context.previousSelectedPlans);
      }
      if (context?.previousProfileGroup) {
        queryClient.setQueryData(["profile-group", user?.id], context.previousProfileGroup);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(["profile", user?.id], context.previousProfile);
      }
      if (context?.previousPlannerType) {
        queryClient.setQueryData(["profile-planner-type", user?.id], context.previousPlannerType);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user-selected-plans", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-group", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-planner-type", user?.id] });
    }
  });

  const toggleItem = (id: string, type: string) => {
    importPlanMutation.mutate({ sourceId: id, planType: type });
  };

  const calculateCycleDay = () => {
    const startDate = new Date('2026-04-06T00:00:00-03:00').getTime();
    const now = new Date().getTime();
    
    if (now < startDate) return 1;
    
    const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    return (diffDays % 21) + 1;
  };
  
  const cycleDay = calculateCycleDay();
  const isCompleted = (lessonId: string) => progress.some((p: any) => p.lesson_id === lessonId && p.status === 'completed');

  if (!profileLoaded || loadingChallenges) return <SkeletonLayout />;

  const formatPlannerName = (pType?: string) => {
    if (pType === "foco_essencial") return "Foco Essencial";
    if (pType === "constancia") return "Constância PRO";
    if (pType === "elite") return "Elite 100%";
    return "Liga Não Definida";
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-7xl mx-auto px-4 pt-6 md:px-6 md:pt-12">
        <div className="mb-6 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-4">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-cinzel font-black tracking-tighter italic text-foreground uppercase">
              {activeChallenge?.title || "Área de Membros"}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {userGroupId && (
                <div className="bg-background border border-border px-3 py-1.5 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <BookOpen size={12} className="text-primary" /> Turma: <span className="text-foreground">{userGroupName || "Carregando..."}</span>
                  </span>
                </div>
              )}
              
              <div 
                className="bg-accent/10 border border-accent/30 px-3 py-1.5 rounded-full flex items-center justify-center shadow-sm group"
              >
                 <span className="text-[11px] font-black text-accent uppercase tracking-wider flex items-center gap-1.5">
                   <Star size={12} fill="currentColor" /> Liga: {formatPlannerName(userProfile.data?.planner_type)}
                 </span>
              </div>
            </div>
          </div>
          <div className="bg-background border border-border px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl flex flex-col gap-2 w-full md:min-w-[280px] md:w-auto shadow-sm">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Seu Ciclo</span>
                <span className="text-sm font-bold text-accent">Dia {cycleDay} <span className="text-foreground/40 font-normal">de 21</span></span>
             </div>
             <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${(cycleDay/21)*100}%` }} />
             </div>
          </div>
        </div>
      </div>

      <div className="mb-10 w-full">
        <BannerCarousel banners={challengeBanners} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-12">
          <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar scroll-smooth">
            {challengeModules.map((mod) => {
              const Icon = mod.icon === 'Utensils' ? Utensils : mod.icon === 'Dumbbell' ? Dumbbell : mod.icon === 'Users' ? Users : mod.icon === 'Flame' ? Flame : BookOpen;
              const isActive = selectedModuleId === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className={cn("flex-shrink-0 w-32 md:w-40 lg:w-48 aspect-[3/4] rounded-2xl md:rounded-3xl relative overflow-hidden group transition-all duration-300 border-2", isActive ? 'border-accent scale-95 shadow-glow' : 'border-border')}
                >
                  {mod.cover_image ? <img src={mod.cover_image} alt={mod.title} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-muted/20" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-4 z-20">
                    {!mod.cover_image && <Icon size={32} className={cn("mb-2", isActive ? 'text-accent' : 'text-foreground/40')} />}
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center leading-tight">{mod.title}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area — Professional Player Layout */}
        <div className="bg-card/30 backdrop-blur-sm border border-border rounded-2xl md:rounded-[2.5rem] overflow-hidden min-h-[500px] shadow-3xl transition-all duration-500">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedModule?.id || 'empty'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              {(() => {
                const currentLesson = activeLesson;
                const ytId = currentLesson?.video_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)?.[1];
                const moduleType = selectedModule?.type;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
                    {/* Main Content Column (Left - 2/3) */}
                    <div className="lg:col-span-2 p-4 md:p-8 space-y-6">
                      {/* Video Player or Material Preview */}
                      {ytId ? (
                        <div className="aspect-video rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black relative">
                          <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`} className="w-full h-full border-0" allowFullScreen />
                        </div>
                      ) : currentLesson?.video_url && (
                        currentLesson.video_url.includes('supabase.co') ||
                        currentLesson.video_url.match(/\.(mp4|mov|webm|mkv)$/i) ||
                        currentLesson.video_url.startsWith('/') // Support direct local paths
                      ) ? (
                        <div className="aspect-video rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black relative">
                          <video controls className="w-full aspect-video rounded-3xl object-cover" src={currentLesson.video_url} playsInline preload="metadata" />
                        </div>
                      ) : (
                        <div className="min-h-[400px] bg-secondary/10 border border-white/5 rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group">
                           {/* Content Preview */}
                           {currentLesson?.description ? (
                             <div className="w-full text-left space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="space-y-2">
                                  <h3 className="text-3xl font-serif font-black italic tracking-tight">{currentLesson.title}</h3>
                                  <div className="h-1 w-12 bg-accent rounded-full" />
                                </div>

                                {/* Formatted Workout/Diet List */}
                                <div className="grid gap-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                  {(() => {
                                    const text = currentLesson.description || '';
                                    if (selectedModule?.type === 'workouts' || selectedModule?.type === 'running') {
                                      const exercises = parseWorkoutDescription(text);
                                      return exercises
                                        .filter(ex => ex.name.trim() !== '') // Ignore empty section markers
                                        .map((ex, i) => (
                                          <div key={i} className={cn("p-4 rounded-2xl border transition-all", ex.description === '__section__' ? "bg-accent/10 border-accent/20 mt-4" : "bg-white/5 border-white/5")}>
                                            <div className="flex items-center justify-between">
                                              <span className={cn("font-bold text-sm", ex.description === '__section__' ? "text-accent uppercase tracking-widest" : "text-foreground")}>
                                                {ex.name}
                                              </span>
                                              {ex.description !== '__section__' && <span className="text-[10px] text-muted-foreground uppercase font-black">{ex.sets}x {ex.reps}</span>}
                                            </div>
                                            {ex.description && ex.description !== '__section__' && <p className="text-[10px] text-muted-foreground mt-1 lowercase italic">• {ex.description}</p>}
                                          </div>
                                        ));
                                    }
                                    
                                    // Handle JSON Diet Description
                                    if (selectedModule?.type === 'diets' && text.trim().startsWith('[')) {
                                      try {
                                        const meals = JSON.parse(text);
                                        return (
                                          <div className="space-y-6">
                                            {meals.filter((m: any) => !m.refeicao?.includes("Opção 2") && !m.refeicao?.includes("Opção 3")).map((meal: any, i: number) => (
                                              <div key={i} className="space-y-2 pb-4 border-b border-white/5 last:border-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black bg-accent/20 text-accent px-2 py-0.5 rounded uppercase tracking-tighter">
                                                    {meal.time || "HORÁRIO"}
                                                  </span>
                                                  <h4 className="text-sm font-bold text-foreground font-cinzel italic">{meal.refeicao || meal.name}</h4>
                                                </div>
                                                <div className="pl-2 space-y-1">
                                                  {(meal.alimentos || meal.foods || []).map((food: any, fi: number) => (
                                                    <p key={fi} className="text-[11px] text-muted-foreground leading-tight italic">
                                                      • {food.alimento || food.name}: <span className="text-foreground/70 not-italic font-bold">{food.porcao || food.portion}</span>
                                                    </p>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                            <p className="text-[9px] text-accent/60 uppercase tracking-widest font-bold pt-2 italic">
                                              * Abra a aba Dieta para ver substituições e macros completos.
                                            </p>
                                          </div>
                                        );
                                      } catch (e) {
                                        console.error("Error parsing diet JSON in preview:", e);
                                      }
                                    }

                                    return (
                                      <div className="prose prose-invert prose-sm max-w-none">
                                        {text.split('\n').map((line, i) => (
                                          <p key={i} className="text-muted-foreground leading-relaxed italic border-b border-white/5 pb-2 last:border-0">{line}</p>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Import/Selection Action */}
                                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center gap-4">
                                   <Button 
                                     onClick={() => {
                                       const pType = selectedModule?.type === 'workouts' ? 'treino' : (selectedModule?.type === 'planner' ? 'planner' : 'dieta');
                                       if (pType === 'planner') {
                                         setPendingPlanSelection({ id: currentLesson.id, type: pType, title: currentLesson.title });
                                       } else {
                                         toggleItem(currentLesson.id, pType);
                                       }
                                     }}
                                      className={cn("h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-2xl transition-all", 
                                        isAlreadyImported(currentLesson.id, selectedModule?.type === 'workouts' ? 'treino' : (selectedModule?.type === 'planner' ? 'planner' : 'dieta')) 
                                         ? "bg-green-500/10 text-green-500 hover:text-white hover:bg-green-500/80 border border-green-500/20" 
                                         : "crimson-gradient text-white shadow-accent/20 hover:scale-105 active:scale-95"
                                      )}
                                    >
                                       {isAlreadyImported(currentLesson.id, selectedModule?.type === 'workouts' ? 'treino' : (selectedModule?.type === 'planner' ? 'planner' : 'dieta')) ? <CheckCircle2 size={18} /> : <Star size={18} className="fill-white" />}
                                       {isAlreadyImported(currentLesson.id, selectedModule?.type === 'workouts' ? 'treino' : (selectedModule?.type === 'planner' ? 'planner' : 'dieta')) ? "PLANO ATIVO" : "SELECIONAR ESTE PLANO"}
                                   </Button>
                                   <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Importar p/ meu dashboard principal</p>
                                </div>
                             </div>
                           ) : (
                             <div className="space-y-4">
                                <p className="italic text-sm text-muted-foreground">Selecione um conteúdo no menu lateral para visualizar</p>
                             </div>
                           )}
                        </div>
                      )}

                      {/* Lesson Info Header */}
                      {currentLesson && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                          <div className="space-y-1">
                            <h2 className="text-2xl md:text-3xl font-serif font-bold italic tracking-tight text-foreground">{currentLesson.title}</h2>
                            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground font-black">
                              {!currentLesson.isPlan && currentLesson.video_url && (
                                <span className="flex items-center gap-1.5 text-accent/80">
                                  <Clock size={12} /> {currentLesson.duration && currentLesson.duration !== '05:00' ? currentLesson.duration : 'Aula'}
                                </span>
                              )}
                              <span>Módulo: {selectedModule?.title}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reading Material (Only if it's a video lesson) */}
                      {currentLesson?.description && (ytId || (currentLesson.video_url && (currentLesson.video_url.includes('supabase.co') || currentLesson.video_url.endsWith('.mp4')))) && (
                        <div className="bg-secondary/10 border border-white/5 rounded-3xl p-6 md:p-8 space-y-4">
                           <h4 className="text-[10px] font-black uppercase text-accent tracking-[0.3em]">Material de Leitura</h4>
                           <p className="text-sm text-muted-foreground leading-relaxed italic">{currentLesson.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Sidebar Column (Right - 1/3) */}
                    <div className="lg:border-l lg:border-white/5 flex flex-col bg-secondary/5">
                       <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
                          <div className="flex items-center gap-3 mb-6">
                             <div className="h-6 w-1 bg-accent rounded-full" />
                             <h3 className="text-sm font-black italic uppercase tracking-wider">Conteúdo</h3>
                          </div>
                          <div className="space-y-2">
                             {unifiedContent.map((lesson) => {
                                 const isActive = activeLessonId === lesson.id;
                                 const completed = isCompleted(lesson.id);
                                 const isPlan = (lesson as any).isPlan || (!lesson.video_url && (selectedModule?.type === 'diets' || selectedModule?.type === 'workouts' || lesson.pdf_url));

                                 return (
                                   <button key={lesson.id} onClick={() => setActiveLessonId(lesson.id)} className={cn("w-full rounded-2xl p-4 flex items-center gap-4 transition-all border text-left", isActive ? "bg-accent/10 border-accent/30 scale-[1.02]" : "bg-transparent border-transparent hover:bg-white/5")}>
                                     <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isActive ? "bg-accent text-white" : "bg-secondary text-muted-foreground shadow-inner")}>
                                       {completed ? <CheckCircle2 size={18} /> : isPlan ? <FileText size={18} /> : <Play size={18} className={isActive ? "fill-white" : "fill-current opacity-60"} />}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className={cn("text-xs font-bold truncate", isActive ? "text-accent" : "text-foreground/70")}>{lesson.title}</p>
                                        <div className="flex items-center gap-2">
                                           {!isPlan && lesson.video_url && (
                                             <span className="text-[9px] uppercase text-muted-foreground tracking-tighter">
                                               {lesson.duration && lesson.duration !== '05:00' ? lesson.duration : 'Aula'}
                                             </span>
                                           )}
                                           {isPlan && <span className="text-[7px] bg-accent/20 text-accent px-1 rounded font-black tracking-widest">DOC</span>}
                                        </div>
                                     </div>
                                   </button>
                                 )
                               })}
                          </div>
                       </div>

                       {/* Comments Sidebar Integration */}
                       <div className="p-6 border-t border-white/5 space-y-6">
                          <div className="flex items-center justify-between"><h4 className="text-[10px] font-black uppercase text-accent tracking-[0.4em]">Comentários</h4><span className="text-[9px] text-muted-foreground uppercase">{lessonComments.length}</span></div>
                          <div className="space-y-6 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                             {(() => {
                               const processedComments = lessonComments.filter((c: any) => !c.content.startsWith("[reply:"));
                               const replies = lessonComments.filter((c: any) => c.content.startsWith("[reply:"));
                               
                               const getRepliesFor = (id: string) => {
                                 return replies.filter((r: any) => r.content.includes(`[reply:${id}]`)).map((r: any) => ({
                                   ...r,
                                   cleanContent: r.content.split("] ").slice(1).join("] ")
                                 }));
                               };

                               if (processedComments.length === 0) {
                                  return <p className="text-center text-[10px] text-muted-foreground italic py-4">Seja o primeiro a comentar! 🔥</p>;
                               }

                               return processedComments.map((comment: any) => (
                                 <div key={comment.id} className="space-y-3">
                                   <div className="flex gap-3 group/comment">
                                     <div className="w-8 h-8 rounded-full border border-white/10 bg-secondary flex items-center justify-center text-[10px] text-accent font-black shrink-0 overflow-hidden relative">
                                       {comment.profiles?.avatar_url ? (
                                         <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                       ) : (
                                         comment.profiles?.nome?.charAt(0) || "A"
                                       )}
                                     </div>
                                     <div className="flex-1 space-y-1 mt-0.5">
                                       <p className="text-[11px] leading-relaxed text-foreground">
                                         <span className="font-black font-cinzel uppercase italic mr-2 opacity-50">{comment.profiles?.nome}:</span>
                                         {comment.content}
                                       </p>
                                       <div className="flex items-center gap-3">
                                          <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                                          </span>
                                          <button 
                                            onClick={() => setReplyingTo(comment)}
                                            className="text-[9px] text-accent hover:text-white uppercase font-black transition-colors"
                                          >
                                            Responder
                                          </button>
                                       </div>
                                     </div>
                                   </div>

                                   {getRepliesFor(comment.id).length > 0 && (
                                     <div className="pl-11 space-y-3">
                                       {getRepliesFor(comment.id).map((rep) => (
                                         <div key={rep.id} className="flex gap-2.5">
                                           <CornerDownRight size={14} className="text-muted-foreground/30 mt-1 shrink-0" />
                                           <div className="w-6 h-6 rounded-full border border-white/10 bg-secondary flex items-center justify-center text-[8px] text-accent font-black shrink-0 overflow-hidden relative">
                                             {rep.profiles?.avatar_url ? (
                                               <img src={rep.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                             ) : (
                                               rep.profiles?.nome?.charAt(0) || "A"
                                             )}
                                           </div>
                                           <div className="flex-1 mt-0.5">
                                             <p className="text-[10px] leading-relaxed text-foreground">
                                               <span className="font-black font-cinzel uppercase italic mr-1.5 opacity-50">{rep.profiles?.nome}:</span>
                                               {rep.cleanContent}
                                             </p>
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               ))
                             })()}
                          </div>
                          
                          <div className="space-y-3">
                            <AnimatePresence>
                              {replyingTo && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="flex items-center justify-between bg-accent/10 px-3 py-2 rounded-xl border border-accent/20"
                                >
                                  <p className="text-[10px] font-bold text-accent italic">
                                    Respondendo a {replyingTo.profiles?.nome}...
                                  </p>
                                  <button onClick={() => setReplyingTo(null)} className="text-accent hover:text-foreground">
                                    <X size={12} />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="relative">
                              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newComment.trim() && addCommentMutation.mutate(newComment)} placeholder="Dúvidas? Comente..." className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-4 pr-10 py-3 text-[10px] focus:border-accent/40 outline-none" />
                              <button disabled={!newComment.trim() || addCommentMutation.isPending} onClick={() => newComment.trim() && addCommentMutation.mutate(newComment)} className="absolute right-2 top-[55%] -translate-y-1/2 text-accent disabled:opacity-30">
                                {addCommentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              </button>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <AlertDialog open={!!pendingPlanSelection} onOpenChange={(open) => !open && setPendingPlanSelection(null)}>
        <AlertDialogContent className="bg-card border border-white/10 rounded-3xl max-w-sm p-6 text-center text-foreground">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="font-sans text-2xl font-black italic uppercase text-center mx-auto text-foreground tracking-tight">
              Atenção
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm font-medium">
              Você está prestes a definir sua Liga oficial. Isso impactará suas metas diárias e sua posição no Ranking da Comunidade.
              <br /><br />
              Deseja confirmar sua escolha?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-6">
            <AlertDialogAction 
              onClick={() => {
                if (pendingPlanSelection) {
                  importPlanMutation.mutate({ sourceId: pendingPlanSelection.id, planType: pendingPlanSelection.type, planTitle: pendingPlanSelection.title });
                  setPendingPlanSelection(null);
                }
              }}
              className="w-full bg-accent text-white font-black uppercase tracking-widest text-xs h-12 rounded-xl"
            >
              Confirmar Liga
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0 bg-transparent border-white/10 hover:bg-white/5 hover:text-white font-bold text-xs h-12 rounded-xl">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Challenge;
