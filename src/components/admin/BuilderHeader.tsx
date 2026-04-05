import { Button } from "@/components/ui/button";
import { Eye, Edit3, Save, ArrowLeft, ChevronDown, CheckCircle2, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BuilderHeaderProps {
  editorMode: "edit" | "view";
  onToggleMode: () => void;
  onSave: () => void;
  isDirty: boolean;
  onBack: () => void;
  title?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  onStatusChange?: (status: 'DRAFT' | 'PUBLISHED') => void;
}

export const BuilderHeader = ({
  editorMode,
  onToggleMode,
  onSave,
  isDirty,
  onBack,
  title,
  status = 'DRAFT',
  onStatusChange,
}: BuilderHeaderProps) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <header className="sticky top-0 z-[100] w-full bg-background/95 backdrop-blur-md border-b border-border px-6 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/10 rounded-xl transition-all"
        >
          <ArrowLeft size={18} className="mr-2" />
          Voltar
        </Button>
        
        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-1">
              Editando Experiência
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-foreground tracking-tight italic">
                {title || "Sem Nome"}
              </p>
              
              {/* Status Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                    status === 'PUBLISHED' 
                      ? "bg-green-500/10 border-green-500/30 text-green-500" 
                      : "bg-muted/30 border-border text-muted-foreground"
                  )}
                >
                  {status === 'PUBLISHED' ? <CheckCircle2 size={10} /> : <History size={10} />}
                  {status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                  <ChevronDown size={10} className={cn("transition-transform", showStatusMenu && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showStatusMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-32 bg-card border border-border rounded-xl overflow-hidden shadow-lg z-50 p-1"
                    >
                      {[
                        { id: 'DRAFT', label: 'Rascunho', icon: History, color: 'text-muted-foreground' },
                        { id: 'PUBLISHED', label: 'Publicado', icon: CheckCircle2, color: 'text-green-500' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onStatusChange?.(item.id as any);
                            setShowStatusMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-muted/20 transition-all text-left",
                            item.color,
                            status === item.id && "bg-muted/10"
                          )}
                        >
                          <item.icon size={12} />
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-muted/20 p-1 rounded-2xl border border-border">
          <button
            onClick={() => editorMode !== "edit" && onToggleMode()}
            className={cn(
               "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               editorMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Edit3 size={14} />
            Editar
          </button>
          <button
            onClick={() => editorMode !== "view" && onToggleMode()}
            className={cn(
               "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               editorMode === "view" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Eye size={14} />
            Preview
          </button>
        </div>

        <Button
          disabled={!isDirty}
          onClick={onSave}
          className={cn(
            "gap-2 font-black text-xs uppercase tracking-[0.2em] px-8 h-9 rounded-2xl transition-all shadow-glow",
            isDirty 
              ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20" 
              : "bg-muted/30 text-muted-foreground/50 border border-border"
          )}
        >
          {isDirty ? <Save size={16} /> : <CheckCircle2 size={16} />}
          {isDirty ? "Salvar" : "Salvo"}
        </Button>
      </div>
    </header>
  );
};
