import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Utensils,
  Dumbbell,
  Flame,
  Trash2,
  Lock,
  Unlock,
  Plus,
  Play,
  FileText,
  Loader2,
  Upload,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";



interface ModuleDrawerProps {
  module: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (module: any) => void;
  onDelete?: (id: string) => void;
}

const TYPES = [
  { id: 'lessons', label: 'Videoaula', desc: 'Aulas gravadas em vídeo', icon: Play },
  { id: 'workouts', label: 'Treinos', desc: 'Rotinas e exercícios', icon: Dumbbell },
  { id: 'diets', label: 'Cardápio', desc: 'Planos alimentares PDF', icon: Utensils },
  { id: 'running', label: 'Corrida', desc: 'Planilhas de corrida', icon: Flame },
  { id: 'planner', label: 'Planner', desc: 'Metas e organização diária', icon: BookOpen },
];

export const ModuleDrawer = ({
  module,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ModuleDrawerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; current: string }>({ done: 0, total: 0, current: "" });
  const abortRef = useRef<AbortController | null>(null);

  if (!module) return null;

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsUploading(false);
    setUploadProgress({ done: 0, total: 0, current: "" });
    toast.info("Upload cancelado.");
  };

  const processSinglePdf = async (file: File, signal: AbortSignal): Promise<any | null> => {
    if (file.type !== 'application/pdf') {
      toast.error(`${file.name} não é PDF válido.`);
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `challenge-pdfs/${fileName}`;

    const { error: storageError } = await supabase.storage
      .from('challenge-files')
      .upload(filePath, file, { contentType: 'application/pdf' });

    if (storageError) throw storageError;
    if (signal.aborted) return null;

    const { data: { publicUrl } } = supabase.storage
      .from('challenge-files')
      .getPublicUrl(filePath);

    let functionName = "parse-training-pdf";
    if (module.type === 'diets') functionName = "parse-diet-pdf";

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Usuário não autenticado");

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const fileBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(fileBuffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const fileBase64 = btoa(binary);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileBase64, fileName: file.name }),
      });

      let lessonTitle = file.name.replace('.pdf', '');
      let lessonContent = "Conteúdo processado via PDF.";

      if (response.ok) {
        const data = await response.json();
        if (data?.plan) {
          const plan = data.plan;
          if (module.type === 'diets' && plan.meals && Array.isArray(plan.meals)) {
            lessonTitle = plan.title || lessonTitle;
            lessonContent = JSON.stringify(plan.meals, null, 2);
          } else if (plan.items && Array.isArray(plan.items)) {
            lessonTitle = plan.items[0]?.title || lessonTitle;
            lessonContent = plan.items.map((it: any) => `${it.title}\n${it.content}`).join("\n\n");
          } else if (plan.title) {
            lessonTitle = plan.title;
          }
        }
      } else {
        toast.warning(`PDF "${file.name}" não pôde ser analisado pela IA. Adicionado sem extração.`);
      }

      return {
        id: `item-${Date.now()}-${Math.random()}`,
        title: lessonTitle,
        order_index: 0,
        description: lessonContent,
        fileName: file.name,
        pdf_url: publicUrl,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsUploading(true);

    let currentLessons = [...(module.lessons || [])];
    let successCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        if (controller.signal.aborted) break;
        const file = files[i];
        setUploadProgress({ done: i, total: files.length, current: file.name });

        try {
          const result = await processSinglePdf(file, controller.signal);
          if (result) {
            result.order_index = currentLessons.length + 1;
            currentLessons = [...currentLessons, result];
            onSave({ ...module, lessons: currentLessons });
            successCount++;
          }
        } catch (err: any) {
          console.error("PDF error:", file.name, err);
          toast.error(`Erro no PDF "${file.name}": ${err.message}`);
        }
      }

      setUploadProgress({ done: files.length, total: files.length, current: "" });
      if (successCount > 0) {
        toast.success(`${successCount}/${files.length} PDFs processados!`);
      } else if (!controller.signal.aborted) {
        toast.error("Nenhum PDF processado com sucesso.");
      }
    } catch (err: any) {
      if (err.message?.includes("Bucket not found")) {
        toast.error("Bucket 'challenge-files' não encontrado. Crie-o no Storage.");
      } else if (err.name !== 'AbortError') {
        toast.error(err.message || "Falha ao processar PDFs.");
      }
    } finally {
      abortRef.current = null;
      setIsUploading(false);
      setUploadProgress({ done: 0, total: 0, current: "" });
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="font-cinzel text-xl font-black italic tracking-tight text-foreground">
            Configurar Módulo
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-widest font-medium">
            Ajuste visibilidade, conteúdo e tipo do módulo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-2">

          {/* 1. NOME / CAPA / isBonus */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome do Módulo</Label>
                <Input
                  id="title"
                  value={module.title}
                  onChange={(e) => onSave({ ...module, title: e.target.value })}
                  className="rounded-xl border-border/40 focus:border-accent/40 bg-muted/10"
                />
              </div>

              {/* isBonus toggle */}
              <div className="p-4 rounded-2xl bg-muted/5 border border-border/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star size={16} className={module.isBonus ? "text-amber-400" : "text-muted-foreground"} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-foreground">Módulo Bônus</p>
                    <p className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5">Destaque visual especial</p>
                  </div>
                </div>
                <button
                  onClick={() => onSave({ ...module, isBonus: !module.isBonus })}
                  className={cn("w-12 h-6 rounded-full transition-all relative border border-border/10", module.isBonus ? "bg-amber-400" : "bg-muted/20")}
                >
                  <div className={cn("absolute top-[1px] w-5 h-5 rounded-full bg-background transition-all shadow-md", module.isBonus ? "left-[22px]" : "left-0.5 border border-border/40")} />
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Capa do Módulo (4:5)</Label>
              <div
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => onSave({ ...module, cover_image: re.target?.result as string });
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="relative aspect-[4/5] w-28 rounded-3xl overflow-hidden border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group"
              >
                {module.cover_image ? (
                  <img src={module.cover_image} className="w-full h-full object-cover" alt="Capa" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-foreground/20 group-hover:text-primary gap-2">
                    <Plus size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-center">Subir Capa</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. ACESSO RESTRITO */}
          <div className="p-4 rounded-[2rem] bg-muted/5 border border-border/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl", module.access_restricted ? "bg-primary/20 text-primary" : "bg-muted/10 text-muted-foreground")}>
                  {module.access_restricted ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-foreground">Acesso Restrito</p>
                  <p className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 max-w-[150px]">Controle a liberação do conteúdo para a aluna</p>
                </div>
              </div>
              <button
                onClick={() => onSave({ ...module, access_restricted: !module.access_restricted })}
                className={cn("w-12 h-6 rounded-full transition-all relative border border-border/10", module.access_restricted ? "bg-primary" : "bg-muted/20")}
              >
                <div className={cn("absolute top-[1px] w-5 h-5 rounded-full bg-background transition-all shadow-md", module.access_restricted ? "left-[22px]" : "left-0.5 border border-border/40")} />
              </button>
            </div>

            {module.access_restricted && (
              <div className="pt-4 border-t border-border/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="text-[8px] font-black uppercase text-foreground/50 tracking-widest pl-1">Modo de Desbloqueio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSave({ ...module, unlock_type: 'MANUAL' })}
                      className={cn("py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", module.unlock_type === 'MANUAL' ? "bg-foreground text-background border-foreground shadow-md" : "bg-muted/5 text-muted-foreground border-border/20 hover:border-border/40")}
                    >
                      Manual
                    </button>
                    <button
                      onClick={() => onSave({ ...module, unlock_type: 'SCHEDULED' })}
                      className={cn("py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", module.unlock_type === 'SCHEDULED' ? "bg-foreground text-background border-foreground shadow-md" : "bg-muted/5 text-muted-foreground border-border/20 hover:border-border/40")}
                    >
                      Agendado
                    </button>
                  </div>
                </div>
                {module.unlock_type === 'SCHEDULED' && (
                  <div className="space-y-2">
                    <Label className="text-[8px] font-black uppercase text-foreground/50 tracking-widest pl-1">Data de Liberação</Label>
                    <Input
                      type="date"
                      value={module.unlock_at || ''}
                      onChange={(e) => onSave({ ...module, unlock_at: e.target.value })}
                      className="bg-muted/5 border-border/20 rounded-xl text-foreground text-xs h-10"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. TIPO DE CONTEÚDO — "URL Principal" do root do módulo removida conforme spec */}
          <div className="grid gap-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tipo de Conteúdo</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSave({ ...module, type: t.id })}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-2xl border transition-all text-left w-full group",
                    module.type === t.id
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-muted/5 border-border/20 text-muted-foreground hover:border-border/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <t.icon size={14} className={module.type === t.id ? "text-primary" : "opacity-60"} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{t.label}</p>
                  </div>
                  <p className="text-[8px] opacity-70 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. CONTEÚDO (Aulas e PDFs) */}
          <div className="space-y-4 pt-6 border-t border-border/20">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase text-foreground tracking-widest">Itens do Conteúdo</Label>
              {(['workouts', 'diets', 'running', 'planner'].includes(module.type)) ? (
                <>
                  <input
                    type="file"
                    id="multi-pdf-input"
                    className="hidden"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUploading}
                    className="h-8 text-[10px] gap-2 rounded-xl border-border/40 hover:bg-muted/20 hover:text-foreground text-muted-foreground shadow-sm"
                    onClick={() => document.getElementById('multi-pdf-input')?.click()}
                  >
                    {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {isUploading ? "Enviando..." : "Adicionar Material"}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] gap-2 rounded-xl border-border/40 hover:bg-muted/20 text-muted-foreground shadow-sm"
                  onClick={() => {
                    const newItems = [...(module.lessons || []), { id: `item-${Date.now()}`, title: "Nova Aula", duration: "05:00", order_index: (module.lessons?.length || 0) + 1 }];
                    onSave({ ...module, lessons: newItems });
                  }}
                >
                  <Plus size={12} /> Adicionar Material
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="bg-muted/5 border border-dashed border-border/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-3 w-full">
                  <Loader2 size={20} className="text-primary animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Processando {uploadProgress.done}/{uploadProgress.total}...
                    </p>
                    <p className="text-[8px] text-muted-foreground/60 truncate">{uploadProgress.current}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={cancelUpload}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </Button>
                </div>
                {uploadProgress.total > 0 && (
                  <div className="w-full bg-muted/20 rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.max(5, (uploadProgress.done / uploadProgress.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {(!module.lessons || module.lessons.length === 0) && !isUploading ? (
                <div className="text-center py-6 border border-dashed border-border/20 rounded-2xl bg-muted/5">
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">Ainda sem conteúdo</p>
                </div>
              ) : (
                module.lessons?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).map((lesson: any, idx: number) => (
                  <div key={lesson.id} className="p-3 bg-muted/5 border border-border/20 rounded-xl group hover:border-border/60 transition-all space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-background border border-border/40 flex items-center justify-center text-muted-foreground text-[10px] font-black">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <input
                          className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold p-0 text-foreground truncate"
                          placeholder="Título da Aula"
                          value={lesson.title}
                          onChange={(e) => {
                            const newLessons = module.lessons.map((l: any) => l.id === lesson.id ? { ...l, title: e.target.value } : l);
                            onSave({ ...module, lessons: newLessons });
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                          const newLessons = module.lessons.filter((l: any) => l.id !== lesson.id);
                          onSave({ ...module, lessons: newLessons });
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>

                    <div className="grid gap-2 px-1">
                      <div className="flex items-center gap-2 bg-background/50 rounded-lg px-2 py-1.5 border border-border/10">
                        <Play size={10} className="text-muted-foreground" />
                        <input
                          placeholder="URL do Vídeo (Vimeo, YouTube...)"
                          className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] p-0"
                          value={lesson.video_url || ''}
                          onChange={(e) => {
                            const newLessons = module.lessons.map((l: any) => l.id === lesson.id ? { ...l, video_url: e.target.value } : l);
                            onSave({ ...module, lessons: newLessons });
                          }}
                        />
                        <input 
                          type="file" 
                          accept=".mp4,video/mp4" 
                          className="hidden" 
                          id={`video-upload-${lesson.id}`}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploading(true);
                            try {
                              const ext = file.name.split('.').pop();
                              const filePath = `challenge-videos/${lesson.id}-${Date.now()}.${ext}`;
                              const { error } = await supabase.storage.from('challenge-files').upload(filePath, file, { contentType: 'video/mp4' });
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage.from('challenge-files').getPublicUrl(filePath);
                              const newLessons = module.lessons.map((l: any) => l.id === lesson.id ? { ...l, video_url: publicUrl } : l);
                              onSave({ ...module, lessons: newLessons });
                              toast.success("Vídeo enviado com sucesso!");
                            } catch (err: any) {
                              toast.error("Erro ao enviar vídeo: " + err.message);
                            } finally {
                              setIsUploading(false);
                            }
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => document.getElementById(`video-upload-${lesson.id}`)?.click()}
                          disabled={isUploading}
                        >
                          <Upload size={12} className="text-muted-foreground hover:text-accent" />
                        </Button>
                      </div>

                      {lesson.fileName && (
                        <div className="flex items-center gap-1.5 px-1 pb-1">
                          <FileText size={10} className="text-primary" />
                          <p className="text-[8px] uppercase tracking-wider text-muted-foreground truncate">{lesson.fileName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 pt-6 border-t border-border/20 flex gap-3">
          {onDelete && (
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest h-12"
              onClick={() => { if (confirm("Deseja realmente excluir este módulo?")) { onDelete(module.id); onClose(); } }}
            >
              Excluir
            </Button>
          )}
          <Button
            onClick={onClose}
            className="bg-foreground hover:bg-foreground/90 text-background rounded-xl h-12 flex-1 font-black text-xs uppercase tracking-widest shadow-md"
          >
            Pronto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
