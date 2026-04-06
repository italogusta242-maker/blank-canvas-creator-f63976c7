import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Play, 
  Utensils, 
  Dumbbell, 
  Users, 
  MessageSquare,
  Flame,
  Star,
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { InlineEdit } from "./InlineEdit";
import { cn } from "@/lib/utils";

export interface ChallengeViewProps {
  challenge: any;
  editorMode: "edit" | "view";
  onChange?: (partial: any) => void;
  onAddModule?: () => void;
  onEditModule?: (moduleId: string) => void;
  onUploadBanner?: (file: File) => void;
}

export const ChallengeView = ({
  challenge,
  editorMode,
  onChange,
  onAddModule,
  onEditModule,
  onUploadBanner
}: ChallengeViewProps) => {
  const isEdit = editorMode === "edit";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch groups for dropdown
  const { data: groups = [] } = useQuery({
    queryKey: ["user-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("user_groups").select("id, name").order("name");
      return data || [];
    },
  });
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    challenge.modules?.[0]?.id || null
  );
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const banners = challenge.banners || [];
  const currentBanner = banners[currentBannerIndex];

  const handleReorder = (newOrder: any[]) => {
    // Update sort_order based on new array position
    const fixedOrder = newOrder.map((m, idx) => ({ ...m, sort_order: idx }));
    onChange?.({ modules: fixedOrder });
  };

  const selectedModule = challenge.modules?.find((m: any) => m.id === selectedModuleId) || challenge.modules?.[0];
  const activeLesson = selectedModule?.lessons?.find((l: any) => l.id === activeLessonId) || selectedModule?.lessons?.[0];

  // Effect to set initial active lesson or reset when module changes
  useEffect(() => {
    if (selectedModule?.lessons?.[0]) {
      setActiveLessonId(selectedModule.lessons[0].id);
    } else {
      setActiveLessonId("");
    }
  }, [selectedModuleId]);

  // Helper for icons
  const getModuleIcon = (type: string) => {
    switch(type) {
      case 'diets': return Utensils;
      case 'workouts': return Dumbbell;
      case 'running': return Flame;
      case 'planner': return BookOpen;
      default: return Play;
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground pb-32 transition-colors duration-500 max-w-7xl mx-auto px-6 pt-12 animate-in fade-in",
      isEdit && "border-x border-dashed border-accent/20"
    )}>
      
      {/* Header - Sutil */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/10">
        <div className="space-y-2">
            <InlineEdit
              value={challenge.title}
              editorMode={isEdit}
              onChange={(title) => onChange?.({ title })}
              as="h1"
              className="text-4xl md:text-6xl font-cinzel font-black tracking-tighter italic text-foreground"
            />
            <p className="text-muted-foreground/40 mt-2 uppercase tracking-[0.3em] font-black text-[10px]">
              {isEdit ? "Modo de Edição Ativo" : "Explorando Desafio"}
            </p>
            {isEdit && (
              <div className="mt-4 flex items-center gap-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grupo de Acesso</Label>
                <Select
                  value={challenge.target_group_id || "all"}
                  onValueChange={(v) => onChange?.({ target_group_id: v === "all" ? null : v })}
                >
                  <SelectTrigger className="w-[220px] bg-background border-border">
                    <SelectValue placeholder="Todos os Alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Alunos</SelectItem>
                    {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
      </div>

      {/* Hero Banner Carousel Area - Evolution v3 (Stretched 21:9) */}
      <div className="mb-14 w-full">
        <div 
          className="relative w-full aspect-[21/9] md:aspect-[21/7] group overflow-hidden bg-anaac-bg border-b border-white/10 shadow-2xl rounded-[3rem]"
          style={{ isolation: 'isolate' }}
        >
          <AnimatePresence mode="wait">
            {banners.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-foreground/40 gap-4"
              >
                 <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center border border-border/20">
                   <ImageIcon size={32} />
                 </div>
                 <p className="font-black text-[10px] tracking-[0.2em] uppercase opacity-60 text-center px-10 leading-relaxed italic">
                   Adicione banners usando os botões de "+"
                 </p>
              </motion.div>
            ) : (
              <motion.div 
                key={currentBanner?.id || currentBannerIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <img 
                  src={currentBanner?.image_url} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  alt="Banner" 
                />
                <div className={cn("absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10", !currentBanner && "opacity-0")} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent "+" Buttons (Edit Mode Only) */}
          {isEdit && (
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 z-40 flex justify-between pointer-events-none w-full px-16 -ml-8">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-glow-sm pointer-events-auto active:scale-90 transition-all border-4 border-anaac-bg"
                title="Adicionar Slide"
              >
                <Plus size={20} />
              </button>
              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-glow-sm pointer-events-auto active:scale-90 transition-all border-4 border-anaac-bg"
                 title="Adicionar Slide"
              >
                <Plus size={20} />
              </button>
            </div>
          )}

          {/* Navigation Arrows */}
          {banners.length > 1 && (
            <div className="absolute inset-x-24 top-1/2 -translate-y-1/2 z-30 flex justify-between pointer-events-none w-full px-48 -ml-24">
              <Button 
                variant="ghost" size="icon" 
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md pointer-events-auto"
                onClick={() => setCurrentBannerIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1))}
              >
                <ChevronLeft size={20} />
              </Button>
              <Button 
                variant="ghost" size="icon" 
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md pointer-events-auto"
                onClick={() => setCurrentBannerIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1))}
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {/* Delete Button (Edit Only) */}
          {isEdit && banners.length > 0 && (
            <div className="absolute top-6 right-6 z-40">
               <Button 
                 variant="destructive" size="icon" 
                 className="w-10 h-10 rounded-full shadow-2xl scale-90 hover:scale-100 transition-transform"
                 onClick={() => {
                   const newBanners = banners.filter((_: any, i: number) => i !== currentBannerIndex);
                   onChange?.({ banners: newBanners });
                   setCurrentBannerIndex(0);
                 }}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
               </Button>
            </div>
          )}

          {/* Banner Content (Title/Description) */}
          <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 z-20 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <div className="h-1 w-8 bg-primary rounded-full" />
              </div>
              <InlineEdit
                value={challenge.description || "Adicione uma descrição impactante que aparecerá sobre o banner principal."}
                editorMode={isEdit}
                alwaysVisible={isEdit}
                onChange={(description) => onChange?.({ description })}
                multiline
                className="text-white font-bold text-sm md:text-base leading-snug drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
        
        {/* Carousel Pagination */}
        {banners.length > 1 && (
           <div className="flex justify-center gap-2 mt-6">
              {banners.map((_: any, i: number) => (
                <div key={i} className={cn("h-1 rounded-full transition-all", i === currentBannerIndex ? "w-8 bg-primary" : "w-2 bg-white/20")} />
              ))}
           </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onUploadBanner?.(file);
      }} />

      {/* Modules Selection Grid (4:5 Ratio maintained for cards) */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-sm font-black text-foreground/30 uppercase tracking-[0.4em] px-2">SELECIONE O MÓDULO</h3>
        </div>

        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar scroll-smooth p-2">
          <Reorder.Group 
            axis="x" 
            values={challenge.modules || []} 
            onReorder={isEdit ? handleReorder : () => {}}
            className="flex gap-4"
          >
            {challenge.modules?.sort((a: any, b: any) => a.sort_order - b.sort_order).map((mod: any) => {
              const active = selectedModule?.id === mod.id;
              return (
                <Reorder.Item
                  key={mod.id}
                  value={mod}
                  drag={isEdit ? "x" : false}
                  onClick={() => {
                    if (active && isEdit) onEditModule?.(mod.id);
                    setSelectedModuleId(mod.id);
                  }}
                  className={cn(
                    "flex-shrink-0 w-40 md:w-52 aspect-[4/5] rounded-[2rem] relative overflow-hidden group transition-all duration-300 border-2 bg-card cursor-pointer",
                    active ? "border-primary scale-95 shadow-glow-sm" : "border-border/10 hover:border-border/30",
                    isEdit && "border-border/30"
                  )}
                >
                  {/* Module Cover Image */}
                  {mod.cover_image || mod.banner_image_url ? (
                    <img 
                      src={mod.cover_image || mod.banner_image_url} 
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      alt={mod.title}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center opacity-40">
                       <ImageIcon size={32} className="text-primary/40" />
                    </div>
                  )}
                                 {/* Subtle dark gradient overlay at bottom for text contrast */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

                  <div className="absolute inset-x-0 bottom-0 p-5 z-20">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase text-white tracking-widest bg-black/40 px-2 py-0.5 rounded-full inline-block mb-1 shadow-sm drop-shadow-md">
                        {mod.type === 'lessons' ? 'Videoaula' : mod.type === 'diets' ? 'Cardápio' : mod.type === 'workouts' ? 'Treino' : mod.type === 'running' ? 'Corrida' : mod.type === 'planner' ? 'Planner' : 'Módulo'}
                      </span>
                      <div className="pr-4 drop-shadow-md">
                        <InlineEdit
                          value={mod.title}
                          editorMode={isEdit}
                          alwaysVisible={isEdit}
                          onChange={(title) => onChange?.({ 
                            modules: challenge.modules.map((m: any) => m.id === mod.id ? { ...m, title } : m) 
                          })}
                          className="text-white text-[11px] md:text-sm font-black tracking-wider leading-tight transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {isEdit && (
                    <div className="absolute top-4 right-4 z-40">
                       <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-anaac-card">
                          <Plus size={14} className="text-white rotate-45" /> {/* Represents 'Edit/Settings' indicator */}
                       </div>
                    </div>
                  )}

                  {active && (
                    <motion.div layoutId="glow-mod" className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary/40 blur-[40px]" />
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {isEdit && (
            <button 
              onClick={onAddModule}
              className="flex-shrink-0 w-40 md:w-52 aspect-[4/5] rounded-[2rem] border-2 border-dashed border-border/40 bg-muted/10 hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-glow-sm group-hover:scale-110 transition-transform">
                <Plus size={24} className="text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Novo Módulo</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedModule?.id || 'empty'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-card border border-border/10 rounded-[2.5rem] overflow-hidden min-h-[500px] shadow-3xl flex flex-col relative transition-colors"
        >
          {selectedModule ? (
            <div className="w-full h-full p-6 md:p-12">
               {selectedModule.type === "lessons" ? (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                   <div className="lg:col-span-2 space-y-6">
                      <div className="aspect-video bg-muted rounded-3xl border border-border/10 overflow-hidden shadow-2xl relative flex items-center justify-center">
                         {activeLesson?.video_url || selectedModule.video_url ? (
                           (() => {
                             const vUrl = activeLesson?.video_url || selectedModule.video_url;
                             const ytId = vUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)?.[1];
                             if (ytId) {
                               return (
                                 <iframe
                                   src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`}
                                   className="w-full h-full border-0"
                                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                   allowFullScreen
                                   title="YouTube video player"
                                 />
                               );
                             }
                             if (vUrl && (vUrl.includes('supabase.co') || vUrl.endsWith('.mp4'))) {
                               return (
                                 <video controls className="w-full h-full rounded-2xl object-cover bg-black" src={vUrl} />
                               );
                             }
                             return (
                               <a href={vUrl} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center bg-black/50 hover:bg-black/30 transition-all group">
                                   <Play size={64} className="text-white mb-4 group-hover:scale-110 transition-transform" />
                                   <span className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-white/20 rounded-full text-white">Abrir Mídia Externa</span>
                               </a>
                             );
                           })()
                         ) : isEdit ? (
                             <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                <Play size={64} />
                                <p className="font-bold text-xs uppercase tracking-widest">Player de Vídeo (Preview)</p>
                             </div>
                          ) : (
                             <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-4">
                                <Play size={64} className="text-accent" />
                                <p className="font-bold text-sm tracking-widest uppercase">Pronto para Começar</p>
                             </div>
                          )}
                      </div>
                      <div className="space-y-4">
                         <h2 className="text-2xl font-bold italic tracking-tight text-foreground">{activeLesson?.title || selectedModule.title}</h2>
                         <p className="text-muted-foreground leading-relaxed max-w-2xl">{activeLesson?.description || selectedModule.description || "Este módulo contém conteúdos focados no objetivo do desafio."}</p>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="bg-secondary/20 rounded-3xl p-6 border border-border/10">
                         <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-4">Lista de Aulas</h4>
                         <div className="space-y-2">
                           {(!selectedModule.lessons || selectedModule.lessons.length === 0) ? (
                              <p className="text-[10px] text-muted-foreground italic uppercase py-4">Nenhuma aula cadastrada</p>
                           ) : (
                             selectedModule.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((lesson: any, i: number) => (
                               <div 
                                 key={lesson.id} 
                                 onClick={() => setActiveLessonId(lesson.id)}
                                 className={cn(
                                   "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                   activeLessonId === lesson.id ? "bg-accent/10 border-accent/40" : "border-border/10 bg-background hover:bg-muted"
                                 )}
                                >
                                   <div className={cn(
                                     "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold",
                                     activeLessonId === lesson.id ? "bg-accent text-white shadow-glow-sm" : "bg-muted text-muted-foreground"
                                   )}>{i + 1}</div>
                                   <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate text-foreground">{lesson.title}</p>
                                      <p className="text-[9px] text-muted-foreground">{lesson.duration || "05:00"}</p>
                                   </div>
                                   {activeLessonId === lesson.id && <Play size={10} className="text-accent" />}
                                </div>
                             ))
                           )}
                         </div>
                      </div>
                   </div>
                 </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    <div className="lg:col-span-2 space-y-6">
                       <div className="bg-secondary/30 border border-border rounded-3xl p-8 max-h-[600px] overflow-y-auto no-scrollbar shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                               <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                                  <FileText size={24} />
                               </div>
                               <h2 className="text-2xl font-bold italic tracking-tight text-foreground">{activeLesson?.title || selectedModule.title}</h2>
                            </div>
                            
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                              <div className="text-foreground leading-relaxed space-y-4 text-sm max-w-4xl">
                                 {activeLesson?.description ? (
                                   activeLesson.description.split('\n').map((line: string, i: number) => {
                                     const trimmed = line.trim();
                                     if (!trimmed) return null;
                                     
                                     const isHeader = trimmed.endsWith(':') || 
                                                     (trimmed.length < 50 && !trimmed.includes('.') && trimmed === trimmed.toUpperCase());
                                     
                                     if (isHeader) {
                                       return <h5 key={i} className="text-accent uppercase tracking-[0.15em] font-black mt-6 mb-2 text-sm">{trimmed}</h5>;
                                     }
                                     
                                     return (
                                       <div key={i} className="flex items-start gap-3 pl-2 py-1">
                                         <span className="text-accent shrink-0 mt-0.5">•</span>
                                         <span className="text-foreground leading-loose">{trimmed}</span>
                                       </div>
                                     );
                                   })
                                 ) : (
                                   <p className="italic text-muted-foreground">{selectedModule.description || "Nenhum conteúdo descritivo detalhado para esta aula."}</p>
                                 )}
                              </div>
                            </div>
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                       <div className="bg-secondary/20 rounded-3xl p-6 border border-border/10">
                          <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-4">Conteúdo do Módulo</h4>
                          <div className="space-y-2">
                            {(!selectedModule.lessons || selectedModule.lessons.length === 0) ? (
                               <p className="text-[10px] text-muted-foreground italic uppercase py-4">Nenhum item cadastrado</p>
                            ) : (
                              selectedModule.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((lesson: any, i: number) => (
                                <div 
                                  key={lesson.id} 
                                  onClick={() => setActiveLessonId(lesson.id)}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                                    activeLessonId === lesson.id 
                                      ? "bg-accent/20 border-accent text-accent" 
                                      : "bg-card/60 border-border text-foreground hover:bg-accent/10"
                                  )}
                                 >
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors",
                                      activeLessonId === lesson.id 
                                        ? "bg-accent text-white shadow-glow-sm" 
                                        : "bg-secondary text-muted-foreground group-hover:text-accent"
                                    )}>
                                      {lesson.pdf_url ? <FileText size={14} /> : i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className={cn("text-xs font-bold truncate transition-colors", activeLessonId === lesson.id ? "text-accent" : "text-foreground")}>
                                         {lesson.title}
                                       </p>
                                       <p className="text-[9px] text-muted-foreground">{lesson.duration || "Leitura"}</p>
                                    </div>
                                 </div>
                              ))
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground italic gap-4">
               <BookOpen size={64} className="opacity-10" />
               <p>Selecione um módulo para visualizar o conteúdo.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
};
