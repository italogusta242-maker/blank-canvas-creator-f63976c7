import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, ShoppingCart, UtensilsCrossed, Check, ArrowLeftRight, ChevronDown, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ALL_DIETS, type DietPlanType } from "./DietPlanData";
import { useDailyHabits } from "@/hooks/useDailyHabits";

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

/** Parse a food text like "Café (80ml), 2 Ovos de galinha (110g)" into individual items */
function parseFoods(text: string): { name: string; portion: string }[] {
  // Split by ", " but not inside parentheses — simple approach: split by period-separated sentences first, then by commas
  const cleaned = text.replace(/\.\s*$/, ""); // remove trailing period
  const parts = cleaned.split(/,\s+(?![^(]*\))/);
  
  return parts.map(part => {
    const trimmed = part.replace(/^\s*e\s+/i, "").trim();
    // Extract portion in parentheses at the end
    const match = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      return { name: match[1].trim(), portion: match[2].trim() };
    }
    // Check for "Xg" pattern without parens
    const match2 = trimmed.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if (match2) {
      return { name: match2[1].trim(), portion: match2[2].trim() };
    }
    return { name: trimmed, portion: "" };
  }).filter(f => f.name.length > 0);
}

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
  // Track which option is selected per meal (mealIdx → optionIdx)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  // Track which meal has the option picker open
  const [optionPickerOpen, setOptionPickerOpen] = useState<number | null>(null);

  const diet: DietPlanType = ALL_DIETS[selectedIdx];
  const totalMeals = diet.meals.length;

  // Use daily habits for meal check-in integration with flame
  const mealPrefix = `config-diet-${diet.totalCalories}`;
  const { completedMeals, toggleMeal } = useDailyHabits();

  const mealsCompleted = diet.meals.filter((_, idx) => completedMeals.has(`${mealPrefix}-meal-${idx}`)).length;
  const mealProgress = Math.min(totalMeals > 0 ? (mealsCompleted / totalMeals) * 100 : 0, 100);

  const toggleItem = (item: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const clearCheckedItems = () => {
    setCheckedItems(new Set());
  };

  const totalItems = Object.values(diet.shoppingList).flat().length;
  const checkedCount = [...checkedItems].filter(i => Object.values(diet.shoppingList).flat().includes(i)).length;

  const getSelectedOption = (mealIdx: number) => selectedOptions[mealIdx] ?? 0;

  const selectOption = (mealIdx: number, optIdx: number) => {
    setSelectedOptions(prev => ({ ...prev, [mealIdx]: optIdx }));
    setOptionPickerOpen(null);
  };

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

          {/* Plan selector pills */}
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
          <TabsContent value="cardapio" className="mt-6 space-y-5">
            {/* Progress bar */}
            <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-primary" />
                    <p className="font-cinzel text-sm font-black text-foreground">Refeições Feitas</p>
                  </div>
                  <p className="text-xs font-bold text-primary">{mealsCompleted}/{totalMeals}</p>
                </div>
                <Progress value={mealProgress} className="h-2.5" indicatorColor="hsl(var(--primary))" />
              </CardContent>
            </Card>

            {diet.meals.map((meal, mealIdx) => {
              const isMealDone = completedMeals.has(`${mealPrefix}-meal-${mealIdx}`);
              const currentOptIdx = getSelectedOption(mealIdx);
              const currentOption = meal.options[currentOptIdx];
              const hasMultipleOptions = meal.options.length > 1;
              const foods = parseFoods(currentOption.principal);

              return (
                  <Card key={mealIdx} className={cn(
                  "bg-card border-border rounded-2xl overflow-hidden shadow-md transition-all",
                  isMealDone && "border-primary/30 bg-primary/5"
                )}>
                  <div className="flex items-center gap-3 px-6 pt-6 pb-4">
                    {/* Check-in circle */}
                    <button
                      onClick={() => toggleMeal(`${mealPrefix}-meal-${mealIdx}`, totalMeals)}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                        isMealDone
                          ? "bg-primary border-primary text-primary-foreground shadow-md"
                          : "border-border bg-transparent hover:border-primary/50"
                      )}
                    >
                      {isMealDone && <Check size={16} strokeWidth={3} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-cinzel text-sm font-black tracking-tight transition-all",
                        isMealDone ? "text-primary" : "text-foreground"
                      )}>{meal.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{meal.time}h</p>
                    </div>

                    {/* Option selector button */}
                    {hasMultipleOptions && (
                      <button
                        onClick={() => setOptionPickerOpen(optionPickerOpen === mealIdx ? null : mealIdx)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        {meal.options.length} opções
                        <ChevronDown size={12} className={cn("transition-transform", optionPickerOpen === mealIdx && "rotate-180")} />
                      </button>
                    )}
                  </div>

                  {/* Option picker dropdown */}
                  {hasMultipleOptions && optionPickerOpen === mealIdx && (
                    <div className="px-5 pb-3 space-y-1.5">
                      {meal.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => selectOption(mealIdx, optIdx)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            currentOptIdx === optIdx
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted/30 border-border text-foreground/70 hover:bg-muted/50"
                          )}
                        >
                          {opt.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <CardContent className="px-6 pb-6 pt-0">
                    {/* Selected option content */}
                    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                      {hasMultipleOptions && (
                        <div className="px-4 py-2 border-b border-border/50 bg-muted/50">
                          <p className="text-[10px] font-black uppercase tracking-wider text-foreground/60">{currentOption.title}</p>
                        </div>
                      )}
                      <div className="px-4 py-3 space-y-2.5">
                        {foods.map((food, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-foreground leading-tight">{food.name}</p>
                              {food.portion && (
                                <p className="text-[11px] text-muted-foreground">{food.portion}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {currentOption.substitutions && (
                        <Accordion type="single" collapsible>
                          <AccordionItem value={`sub-${mealIdx}`} className="border-0">
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
                                <p className="text-xs text-foreground/75 leading-relaxed">{currentOption.substitutions}</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* TAB: LISTA DE COMPRAS */}
          <TabsContent value="compras" className="mt-4 space-y-4">
            <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-cinzel text-sm font-black text-foreground">Progresso</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-muted-foreground">{checkedCount}/{totalItems} itens</p>
                    {checkedCount > 0 && (
                      <button
                        onClick={clearCheckedItems}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <RefreshCw size={10} />
                        Limpar
                      </button>
                    )}
                  </div>
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
