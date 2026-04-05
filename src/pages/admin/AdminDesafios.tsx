import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, ImageIcon, Loader2, Users, BookOpen, BarChart2, TrendingUp, Trash2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BuilderHeader } from "@/components/admin/BuilderHeader";
import { ChallengeView } from "@/components/admin/ChallengeView";
import { ModuleDrawer } from "@/components/admin/ModuleDrawer";
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
interface ChallengeBanner {
  id: string;
  image_url: string;
  sort_order?: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  banner_image_url?: string;
  is_active: boolean;
  banners?: ChallengeBanner[];
  start_date: string;
  end_date: string;
  created_at: string;
}

interface Module {
  id: string;
  challenge_id: string;
  title: string;
  description: string;
  icon: string;
  order_index: number;
  type: string;
  is_locked: boolean;
}

// ============================
// METRICS PANEL COMPONENT
// ============================
function ChallengeMetricsPanel({ challengeCount }: { challengeCount: number }) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-challenge-metrics"],
    queryFn: async () => {
      // Count total unique users with lesson progress
      const { count: activeUsers } = await supabase
        .from("lesson_progress")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "completed");

      // Count total completed lessons
      const { count: completedLessons } = await supabase
        .from("lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed");

      // Count total community posts this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weekPosts } = await (supabase as any)
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      return {
        activeUsers: activeUsers ?? 0,
        completedLessons: completedLessons ?? 0,
        weekPosts: weekPosts ?? 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const stats = [
    { label: "Desafios Ativos", value: challengeCount, icon: BarChart2, color: "text-accent", bg: "bg-accent/10 border-accent/20" },
    { label: "Alunas Ativas", value: metrics?.activeUsers ?? "—", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Aulas Concluídas", value: metrics?.completedLessons ?? "—", icon: BookOpen, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { label: "Posts Esta Semana", value: metrics?.weekPosts ?? "—", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl border p-5 flex items-center gap-4 ${stat.bg}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} shrink-0`}>
            <stat.icon size={20} className={stat.color} />
          </div>
          <div>
            <p className={`text-2xl font-black font-cinzel ${stat.color}`}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : stat.value.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================
// MAIN COMPONENT
// ============================
const AdminDesafios = () => {

  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "builder">("list");
  const [editorMode, setEditorMode] = useState<"edit" | "view">("edit");
  const [localChallenge, setLocalChallenge] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  const editingModule = localChallenge?.modules?.find((m: any) => m.id === editingModuleId);

  // Queries
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          banners:challenge_banners(*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Challenge[];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["admin-modules", localChallenge?.id],
    queryFn: async () => {
      if (!localChallenge?.id) return [];
      const { data, error } = await supabase
        .from("challenge_modules")
        .select(`
          *,
          lessons:challenge_lessons(*)
        `)
        .eq("challenge_id", localChallenge.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      if (data) {
         data.forEach((mod: any) => {
           if (mod.lessons && Array.isArray(mod.lessons)) {
             mod.lessons.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
           }
         });
      }
      return data as any[];
    },
    enabled: !!localChallenge?.id && view === "builder",
  });

  // Effect to sync local challenge with modules
  useEffect(() => {
    if (view === "builder" && localChallenge && modules.length > 0) {
      if (!localChallenge.modules || localChallenge.modules.length !== modules.length) {
        setLocalChallenge((prev: any) => ({ ...prev, modules }));
      }
    }
  }, [modules, view]);

  // Mutations
  // Mutations
  const saveAllM = useMutation({
    mutationFn: async (challenge: any) => {
      // 1. Save Challenge Base
      let challengeId = challenge.id;
      const challengeBaseData: Record<string, any> = {
        title: challenge.title,
        description: challenge.description,
        is_active: challenge.is_active,
        banner_image_url: challenge.banner_image_url,
        scoring_rules: challenge.scoring_rules || { workout: 30, diet: 40, running: 30 },
        target_group_id: challenge.target_group_id || null,
      };

      if (challengeId && !challengeId.startsWith("temp-")) {
        const { error } = await supabase.from("challenges").update(challengeBaseData).eq("id", challengeId);
        if (error) throw error;
      } else {
        const { data: newC, error } = await supabase.from("challenges").insert([{ ...challengeBaseData, title: challenge.title || "Novo Desafio" } as any]).select().single();
        if (error) throw error;
        challengeId = newC.id;
      }

      // 2. Sync Banners
      const banners = challenge.banners || [];
      const currentBannerIds = banners.filter((b: any) => !b.id.startsWith('temp-')).map((b: any) => b.id);
      
      const { data: existingBanners } = await supabase.from('challenge_banners').select('id').eq('challenge_id', challengeId);
      const bannersToDelete = existingBanners?.filter(eb => !currentBannerIds.includes(eb.id)).map(eb => eb.id) || [];
      
      if (bannersToDelete.length > 0) {
        await supabase.from('challenge_banners').delete().in('id', bannersToDelete);
      }

      for (const banner of banners) {
        const isNew = banner.id.startsWith('temp-');
        const bannerData = {
          challenge_id: challengeId,
          image_url: banner.image_url,
          title_main: challenge.title
        };
        if (isNew) {
           await supabase.from('challenge_banners').insert(bannerData);
        } else {
           await supabase.from('challenge_banners').update(bannerData).eq('id', banner.id);
        }
      }

      // 3. Sync Modules
      const modules = challenge.modules || [];
      const currentModuleIds = modules.filter((m: any) => !m.id.startsWith('temp-')).map((m: any) => m.id);
      
      const { data: existingModules } = await supabase.from('challenge_modules').select('id').eq('challenge_id', challengeId);
      const modulesToDelete = existingModules?.filter(em => !currentModuleIds.includes(em.id)).map(em => em.id) || [];

      if (modulesToDelete.length > 0) {
        await supabase.from('challenge_modules').delete().in('id', modulesToDelete);
      }

      // 3. Prepare Batch Upserts
      const modulesToUpsert = modules.map(mod => {
        const base: Record<string, any> = {
          challenge_id: challengeId,
          title: mod.title,
          description: mod.description,
          type: mod.type,
          icon: mod.icon || 'BookOpen',
          order_index: mod.sort_order ?? mod.order_index ?? 0,
          cover_image: mod.cover_image,
          is_locked: mod.access_restricted ?? mod.is_locked ?? false
        };
        if (!mod.id.startsWith('temp-')) base.id = mod.id;
        return base;
      });

      const { data: syncedModules, error: modError } = await supabase
        .from('challenge_modules')
        .upsert(modulesToUpsert)
        .select();

      if (modError) throw modError;

      // 4. Sync Lessons
      const lessonsToUpsert: any[] = [];
      const lessonsToInsert: any[] = [];
      const moduleMap = new Map(syncedModules.map((m, idx) => [modules[idx].id, m.id]));

      for (const mod of modules) {
        const dbModuleId = moduleMap.get(mod.id);
        if (!dbModuleId) continue;

        const lessons = mod.lessons || [];
        const currentLessonIds = lessons
          .map((l: any) => l.id)
          .filter((id: unknown): id is string => typeof id === 'string' && !id.startsWith('temp-') && !id.startsWith('item-'));
        
        // Cleanup deleted lessons for this module
        const { data: existingLessons } = await supabase.from('challenge_lessons').select('id').eq('module_id', dbModuleId);
        const lessonsToDelete = existingLessons?.filter(el => !currentLessonIds.includes(el.id)).map(el => el.id) || [];
        if (lessonsToDelete.length > 0) {
          await supabase.from('challenge_lessons').delete().in('id', lessonsToDelete);
        }

        lessons.forEach((lesson: any) => {
          const lessonBase: Record<string, any> = {
            module_id: dbModuleId,
            title: lesson.title,
            description: lesson.description || '',
            video_url: lesson.video_url || '',
            duration: lesson.duration || '05:00',
            order_index: lesson.sort_order ?? lesson.order_index ?? 0,
          };

          if (typeof lesson.id === 'string' && !lesson.id.startsWith('temp-') && !lesson.id.startsWith('item-')) {
            lessonsToUpsert.push({ ...lessonBase, id: lesson.id });
          } else {
            lessonsToInsert.push(lessonBase);
          }
        });
      }

      if (lessonsToUpsert.length > 0) {
        const { error: lessonUpsertError } = await supabase
          .from('challenge_lessons')
          .upsert(lessonsToUpsert);
        if (lessonUpsertError) throw lessonUpsertError;
      }

      if (lessonsToInsert.length > 0) {
        const { error: lessonInsertError } = await supabase
          .from('challenge_lessons')
          .insert(lessonsToInsert);
        if (lessonInsertError) throw lessonInsertError;
      }

      return { ...challenge, id: challengeId };
    },
    onSuccess: (savedChallenge) => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["admin-modules", savedChallenge.id] });
      setIsDirty(false);
      setLocalChallenge(savedChallenge);
      toast.success("Design e conteúdos salvos com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao sincronizar: " + err.message),
  });

  // --- Image Upload Helper ---
  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `challenge-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('challenge-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-images')
        .getPublicUrl(filePath);

      setLocalChallenge((prev: any) => {
        const newBanners = [...(prev.banners || [])];
        newBanners.push({
          id: `temp-b-${Date.now()}`,
          image_url: publicUrl,
          sort_order: newBanners.length
        });
        return { ...prev, banners: newBanners };
      });
      setIsDirty(true);
      toast.success("Banner adicionado ao carrossel!");
    } catch (error: any) {
      if (error.message?.includes("Bucket not found")) {
        toast.error("Erro: O bucket 'challenge-images' não foi encontrado no seu Supabase. Crie-o no dashboard do Storage.");
      } else {
        toast.error("Erro inesperado: " + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm("Você tem alterações não salvas. Deseja sair?")) {
        setView("list");
        setIsDirty(false);
      }
    } else {
      setView("list");
    }
  };

  const openBuilder = (c?: Challenge) => {
    setLocalChallenge(c || { title: "Novo Desafio", description: "", is_active: true, modules: [] });
    setEditorMode("edit");
    setIsDirty(false);
    setView("builder");
  };

  const handleChange = (partial: any) => {
    setLocalChallenge((prev: any) => ({ ...prev, ...partial }));
    setIsDirty(true);
  };

  const handleAddModule = () => {
    const newMod = {
      id: `temp-${Date.now()}`,
      title: "Novo Módulo",
      type: "lessons",
      icon: "BookOpen",
      order_index: (localChallenge?.modules?.length || 0),
    };
    setLocalChallenge((prev: any) => ({
      ...prev,
      modules: [...(prev.modules || []), newMod]
    }));
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-foreground tracking-tight">Gestão de Desafios</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Dashboard Administrativo</p>
          </div>
          <Button onClick={() => openBuilder()} className="gap-2 bg-accent hover:bg-accent/90 text-white font-black uppercase text-xs tracking-widest px-6 h-12 rounded-2xl shadow-glow">
            <Plus size={18} /> Novo Desafio
          </Button>
        </div>

        {/* Metrics Row */}
        <ChallengeMetricsPanel challengeCount={challenges.length} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c) => (
            <Card key={c.id} className="bg-card border-border overflow-hidden group hover:border-accent/40 transition-all rounded-[2rem] shadow-sm hover:shadow-xl relative">
              <div className="cursor-pointer" onClick={() => openBuilder(c)}>
                <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                  {c.banner_image_url ? (
                    <img src={c.banner_image_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/20"><ImageIcon size={64} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge className={`absolute top-4 left-4 font-black tracking-widest text-[10px] ${c.is_active ? "bg-green-500 text-white" : "bg-zinc-800 text-white"}`}>
                    {c.is_active ? "ATIVO" : "RASCUNHO"}
                  </Badge>
                </div>
                <CardHeader className="p-6">
                  <CardTitle className="text-xl font-black italic tracking-tight">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                    {c.description || "Sem descrição definida"}
                  </CardDescription>
                </CardHeader>
              </div>
              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/50 text-white/70 hover:text-red-400 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Excluir desafio"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}

          <button
            onClick={() => openBuilder()}
            className="aspect-[16/10] rounded-[2rem] border-2 border-dashed border-border hover:border-accent/40 transition-all flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-accent group bg-muted/5"
          >
            <div className="w-16 h-16 rounded-3xl bg-muted/50 group-hover:bg-accent/10 flex items-center justify-center transition-all group-hover:scale-110">
              <Plus size={32} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Criar Experiência</span>
          </button>
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Desafio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza de que deseja eliminar o desafio <strong>"{deleteTarget?.title}"</strong>? Esta ação é irreversível e removerá todos os módulos e aulas associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!deleteTarget) return;
                  try {
                    // Delete in order: lessons → modules → banners → participants → challenge
                    const { data: mods } = await supabase.from("challenge_modules").select("id").eq("challenge_id", deleteTarget.id);
                    const modIds = (mods || []).map(m => m.id);
                    if (modIds.length > 0) {
                      await supabase.from("challenge_lessons").delete().in("module_id", modIds);
                      await supabase.from("challenge_modules").delete().eq("challenge_id", deleteTarget.id);
                    }
                    await supabase.from("challenge_banners").delete().eq("challenge_id", deleteTarget.id);
                    await supabase.from("challenge_participants").delete().eq("challenge_id", deleteTarget.id);
                    const { error } = await supabase.from("challenges").delete().eq("id", deleteTarget.id);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
                    toast.success("Desafio excluído com sucesso!");
                  } catch (err: any) {
                    toast.error("Erro ao excluir: " + err.message);
                  }
                  setDeleteTarget(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen -mt-10 -mx-4 md:-mx-8">
      <BuilderHeader
        editorMode={editorMode}
        onToggleMode={() => setEditorMode(editorMode === "edit" ? "view" : "edit")}
        onSave={() => saveAllM.mutate(localChallenge)}
        isDirty={isDirty}
        title={localChallenge?.title}
        status={localChallenge?.is_active ? 'PUBLISHED' : 'DRAFT'}
        onStatusChange={(newStatus) => {
          setLocalChallenge((prev: any) => ({ ...prev, is_active: newStatus === 'PUBLISHED' }));
          setIsDirty(true);
        }}
        onBack={() => {
          if (isDirty) {
            if (confirm("Você tem alterações não salvas. Deseja realmente sair?")) {
              setView("list");
              setLocalChallenge(null);
              setIsDirty(false);
            }
          } else {
            setView("list");
            setLocalChallenge(null);
          }
        }}
      />
      
      <main className="bg-background animate-in fade-in duration-500 pb-20">
        <ChallengeView
          challenge={localChallenge}
          editorMode={editorMode}
          onChange={handleChange}
          onAddModule={handleAddModule}
          onUploadBanner={handleImageUpload}
          onEditModule={(id) => setEditingModuleId(id)}
        />

        <ModuleDrawer
          module={editingModule}
          isOpen={!!editingModuleId}
          onClose={() => setEditingModuleId(null)}
          onSave={(updatedMod) => {
            setLocalChallenge((prev: any) => ({
              ...prev,
              modules: prev.modules.map((m: any) => m.id === updatedMod.id ? updatedMod : m)
            }));
            setIsDirty(true);
          }}
          onDelete={(id) => {
            setLocalChallenge((prev: any) => ({
              ...prev,
              modules: prev.modules.filter((m: any) => m.id !== id)
            }));
            setIsDirty(true);
            setEditingModuleId(null);
          }}
        />
      </main>
    </div>
  );
};

export default AdminDesafios;
