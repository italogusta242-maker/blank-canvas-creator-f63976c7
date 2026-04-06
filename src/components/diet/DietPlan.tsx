import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Clock, ShoppingCart, UtensilsCrossed, Check, ArrowLeftRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ALL_DIETS, type DietPlanType } from "./DietPlanData";

const CATEGORY_ICONS: Record<string, string> = {
  "Proteínas": "🥩",
  "Carboidratos": "🍚",
  "Laticínios": "🧀",
  "Frutas": "🍎",
  "Vegetais": "🥦",
  "Vegetais e Folhas": "🥦",
  "Grãos, Pães e Outros": "🍞",
  "Sementes e Fibras": "🌱",
  "Sementes e Gorduras": "🥜",
  "Frutas e Bebidas": "🍹",
  "Extras": "🍫",
};

interface DietPlanProps {
  initialCalories?: number;
  hideHeader?: boolean;
}

const DietPlan = ({ initialCalories, hideHeader }: DietPlanProps = {}) => {
  const navigate = useNavigate();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedIdx, setSelectedIdx] = useState(() => {
    if (initialCalories) {
      const idx = ALL_DIETS.findIndex(d => d.totalCalories === initialCalories);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const diet: DietPlanType = ALL_DIETS[selectedIdx];

  const toggleItem = (item: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const totalItems = Object.values(diet.shoppingList).flat().length;
  const checkedCount = [...checkedItems].filter(i => Object.values(diet.shoppingList).flat().includes(i)).length;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-accent/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.3),transparent_70%)]" />
        <div className="relative z-10 px-5 pt-12 pb-8">
          <button onClick={() => navigate(-1)} className="mb-5 p-2 -ml-2 rounded-xl text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <UtensilsCrossed size={20} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">Seu Plano Nutricional</p>
              <h1 className="font-cinzel text-xl font-black text-primary-foreground tracking-tight">Cardápio Diário</h1>
            </div>
          </div>

          {/* Plan selector pills — only show if no specific plan was pre-selected */}
          {!initialCalories && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {ALL_DIETS.map((d, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                    selectedIdx === idx
                      ? "bg-white/25 backdrop-blur-sm text-primary-foreground border-white/30 shadow-md"
                      : "bg-white/10 backdrop-blur-sm text-primary-foreground/60 border-white/10 hover:bg-white/15"
                  )}
                >
                  <Flame size={13} />
                  {d.totalCalories} kcal
                </button>
              ))}
            </div>
          )}
          {initialCalories && (
            <div className="flex gap-2 mt-4">
              <Badge className="bg-white/25 backdrop-blur-sm text-primary-foreground border-white/30 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md">
                <Flame size={13} className="mr-1.5" />
                {diet.totalCalories} kcal
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <Badge className="bg-white/15 backdrop-blur-sm text-primary-foreground border-white/20 font-bold text-xs px-3 py-1.5 rounded-xl">
              {diet.meals.length} refeições
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="px-4 -mt-3 relative z-20">
        <Tabs defaultValue="cardapio" className="w-full">
          <TabsList className="w-full bg-card border border-border rounded-2xl p-1 h-12 shadow-sm">
            <TabsTrigger
              value="cardapio"
              className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all h-10"
            >
              <UtensilsCrossed size={14} className="mr-2" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger
              value="compras"
              className="flex-1 rounded-xl font-bold text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all h-10"
            >
              <ShoppingCart size={14} className="mr-2" />
              Compras
            </TabsTrigger>
          </TabsList>

          {/* TAB: CARDÁPIO */}
          <TabsContent value="cardapio" className="mt-4 space-y-4">
            {diet.meals.map((meal, mealIdx) => (
              <Card key={mealIdx} className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-cinzel text-sm font-black text-foreground tracking-tight">{meal.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{meal.time}h</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary rounded-lg px-2 py-1">
                    {meal.options.length} {meal.options.length === 1 ? "opção" : "opções"}
                  </Badge>
                </div>

                <CardContent className="px-5 pb-5 pt-0 space-y-3">
                  {meal.options.map((option, optIdx) => (
                    <div key={optIdx} className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border/50 bg-muted/50">
                        <p className="text-xs font-black uppercase tracking-wider text-foreground/80">{option.title}</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-foreground/90 leading-relaxed">{option.principal}</p>
                      </div>
                      {option.substitutions && (
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`sub-${mealIdx}-${optIdx}`} className="border-0">
                            <AccordionTrigger className="px-4 py-2.5 hover:no-underline border-t border-border/30 bg-accent/5 hover:bg-accent/10 transition-colors">
                              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                                <ArrowLeftRight size={13} />
                                Ver Substituições
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-1">
                              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
                                  🔄 Trocas Equivalentes
                                </p>
                                <p className="text-xs text-foreground/75 leading-relaxed">{option.substitutions}</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* TAB: LISTA DE COMPRAS */}
          <TabsContent value="compras" className="mt-4 space-y-4">
            <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-cinzel text-sm font-black text-foreground">Progresso</p>
                  <p className="text-xs font-bold text-muted-foreground">{checkedCount}/{totalItems} itens</p>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                    style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {Object.entries(diet.shoppingList).map(([category, items]) => {
              const categoryChecked = items.filter(i => checkedItems.has(i)).length;
              return (
                <Card key={category} className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                    <span className="text-xl">{CATEGORY_ICONS[category] || "📦"}</span>
                    <div className="flex-1">
                      <p className="font-cinzel text-sm font-black text-foreground">{category}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {categoryChecked}/{items.length} marcados
                      </p>
                    </div>
                    {categoryChecked === items.length && items.length > 0 && (
                      <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center">
                        <Check size={14} className="text-green-500" />
                      </div>
                    )}
                  </div>
                  <CardContent className="px-5 pb-5 pt-0 space-y-1">
                    {items.map(item => (
                      <label
                        key={item}
                        className={cn(
                          "flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition-all",
                          checkedItems.has(item)
                            ? "bg-primary/5 border border-primary/15"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <Checkbox
                          checked={checkedItems.has(item)}
                          onCheckedChange={() => toggleItem(item)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className={cn(
                          "text-sm transition-all",
                          checkedItems.has(item) ? "line-through text-muted-foreground" : "text-foreground"
                        )}>
                          {item}
                        </span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DietPlan;
