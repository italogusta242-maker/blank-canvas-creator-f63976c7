import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Leaf, Clock, Flame, Check, AlertTriangle, ChevronDown, ChevronUp, ArrowLeftRight, MessageSquare, Target, Repeat2, ShoppingCart } from "lucide-react";
import ShoppingList from "@/components/diet/ShoppingList";
import DietPlan from "@/components/diet/DietPlan";
import { Card, CardContent } from "@/components/ui/card";
import { getToday } from "@/lib/dateUtils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDailyHabits } from "@/hooks/useDailyHabits";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { pickPreferredChallenge } from "@/lib/challenges";

// ── Types ──
interface FoodSubstitute {
  name: string;
  portion: string;
  displayPortion?: string;
  quantity?: string;
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ParsedFood {
  name: string;
  portion: string;
  substitutes: FoodSubstitute[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface ParsedMeal {
  id: string;
  time: string;
  label: string;
  foods: ParsedFood[];
  calories: number;
  macros: { protein: number; carbs: number; fats: number };
  notes: string;
}

/** A main meal with its alternative options grouped */
interface GroupedMeal {
  main: ParsedMeal;
  alternatives: ParsedMeal[];
}

const GoalDescriptionCard = ({ description }: { description: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="bg-card border-border mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary/15 border border-primary/30">
          <Target size={14} className="text-primary" />
        </div>
        <span className="font-cinzel text-sm font-bold text-foreground flex-1">Objetivo do Plano</span>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

/** Detect "Opção 2/3/4" alternative meals */
const isAlternativeMeal = (name: string) => /[–\-]\s*Op[çc][ãa]o\s*[2-9]/i.test(name);

/** Extract base meal name from an alternative (e.g. "08:00 – Café da manhã – Opção 2" → "Café da manhã") */
const getBaseMealName = (name: string): string => {
  return name.replace(/\s*[–\-]\s*Op[çc][ãa]o\s*[2-9].*/i, "").trim();
};

const Dieta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"dieta" | "lista">("dieta");

  // ── Shared JSON parsing helpers ──
  const parseFoodItem = (f: any): ParsedFood => ({
    name: f.name || f.alimento || f.food || "",
    portion: f.portion || f.porcao || f.displayPortion || "",
    calories: Number(f.calories || f.kcal || f.cal || 0),
    protein: Number(f.protein || f.proteina || f.p || 0),
    carbs: Number(f.carbs || f.carboidrato || f.c || 0),
    fat: Number(f.fat || f.gordura || f.g || 0),
    substitutes: (Array.isArray(f.substitutes) ? f.substitutes : Array.isArray(f.substitutos) ? f.substitutos : []).map((s: any) => ({
      name: s.name || s.alimento || "",
      portion: s.portion || s.porcao || "",
      calories: Number(s.calories || s.kcal || 0),
      protein: Number(s.protein || s.proteina || s.p || 0),
      carbs: Number(s.carbs || s.carboidrato || s.c || 0),
      fat: Number(s.fat || s.gordura || s.g || 0),
    })),
  });

  const parseMealFromJson = (m: any, idx: number) => {
    const rawFoods = Array.isArray(m.foods) ? m.foods
      : Array.isArray(m.alimentos) ? m.alimentos
      : Array.isArray(m.items) ? m.items
      : [];
    const foods = rawFoods.map(parseFoodItem).filter((f: any) => f.name);
    const mProtein = Number(m.protein || m.p || 0) || foods.reduce((acc: number, f: any) => acc + (f.protein || 0), 0);
    const mCarbs = Number(m.carbs || m.c || 0) || foods.reduce((acc: number, f: any) => acc + (f.carbs || 0), 0);
    const mFat = Number(m.fat || m.g || 0) || foods.reduce((acc: number, f: any) => acc + (f.fat || 0), 0);
    const mCal = Number(m.calories || m.kcal || m.cal || 0) || foods.reduce((acc: number, f: any) => acc + (f.calories || 0), 0);
    return {
      id: `meal-${idx}`,
      name: m.name || m.title || m.refeicao || `Refeição ${idx + 1}`,
      time: m.time || m.horario || "",
      foods,
      calories: Math.round(mCal),
      macros: { protein: Math.round(mProtein), carbs: Math.round(mCarbs), fats: Math.round(mFat) },
      notes: m.notes || m.observacao || m.obs || "",
    };
  };

  const looksLikeMeal = (obj: any) =>
    obj && typeof obj === "object" && !Array.isArray(obj) &&
    (obj.foods !== undefined || obj.alimentos !== undefined ||
     obj.refeicao !== undefined || obj.name !== undefined ||
     obj.title !== undefined || obj.time !== undefined ||
     obj.kcal !== undefined || obj.calories !== undefined);

  /** Try to parse a description string as JSON meals. Returns null if not valid JSON meal data. */
  const tryParseJsonMeals = (text: string): any[] | null => {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;

    let parsed: any = null;
    try {
      parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { return null; }
      }
    } catch {
      // Try repairing common JSON issues
      let repaired = trimmed;
      let braces = 0, brackets = 0;
      for (const c of repaired) { if (c === '{') braces++; if (c === '}') braces--; if (c === '[') brackets++; if (c === ']') brackets--; }
      while (brackets > 0) { repaired += ']'; brackets--; }
      while (braces > 0) { repaired += '}'; braces--; }
      repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try { parsed = JSON.parse(repaired); } catch { return null; }
    }

    if (Array.isArray(parsed) && parsed.length > 0 && looksLikeMeal(parsed[0])) {
      return parsed.map(parseMealFromJson);
    }
    if (parsed && !Array.isArray(parsed) && looksLikeMeal(parsed)) {
      return [parseMealFromJson(parsed, 0)];
    }
    if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].name || parsed[0].alimento)) {
      const foods = parsed.map(parseFoodItem).filter((f: any) => f.name);
      if (foods.length > 0) {
        const cal = foods.reduce((a: number, f: any) => a + (f.calories || 0), 0);
        const p = foods.reduce((a: number, f: any) => a + (f.protein || 0), 0);
        const c = foods.reduce((a: number, f: any) => a + (f.carbs || 0), 0);
        const g = foods.reduce((a: number, f: any) => a + (f.fat || 0), 0);
        return [{ id: "meal-0", name: "Refeição", time: "", foods, calories: Math.round(cal), macros: { protein: Math.round(p), carbs: Math.round(c), fats: Math.round(g) }, notes: "" }];
      }
    }
    return null;
  };

  /** Parse a lesson description text into meal foods (plain text fallback) */
  const parseDietDescription = (text: string): ParsedFood[] => {
    if (!text) return [];
    const foods: ParsedFood[] = [];
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{3,}$/.test(line) && !line.match(/\d/)) continue;
      if (/^[-–•*]+$/.test(line)) continue;
      const portionMatch = line.match(/^(.+?)\s*[-–:]\s*(.+)$/);
      if (portionMatch) {
        foods.push({ name: portionMatch[1].replace(/^[-–•*]\s*/, "").trim(), portion: portionMatch[2].trim(), substitutes: [] });
      } else {
        foods.push({ name: line.replace(/^[-–•*]\s*/, "").trim(), portion: "", substitutes: [] });
      }
    }
    return foods;
  };

  const { data: dietPlan, isLoading } = useQuery({
    queryKey: ["diet-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // 1. Try Single Source of Truth: user_selected_plans
      const { data: selected, error: selErr } = (await supabase
        .from("user_selected_plans")
        .select("source_plan_id, plan_data")
        .eq("user_id", user.id)
        .eq("plan_type", "diet")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: any; error: any };

      // Check for config diet (hardcoded plans from DietPlanData)
      if (selected?.plan_data?.is_config_diet) {
        return {
          id: selected.source_plan_id || `config-diet-${selected.plan_data.calories}`,
          name: `Cardápio ${selected.plan_data.calories} kcal`,
          active: true,
          is_config_diet: true,
          config_calories: selected.plan_data.calories,
          meals: [],
        } as any;
      }

      if (selected?.source_plan_id) {
        const isLesson = selected.plan_data?.is_lesson === true;
        
        if (isLesson) {
          const { data: lesson } = await supabase
            .from("challenge_lessons")
            .select("title, description")
            .eq("id", selected.source_plan_id)
            .maybeSingle();
          
          if (lesson) {
            const jsonMeals = tryParseJsonMeals(lesson.description || "");
            let meals: any[];

            if (jsonMeals && jsonMeals.length > 0) {
              meals = jsonMeals.map((m, i) => ({ ...m, id: `sel-meal-${i}` }));
            } else {
              const desc = (lesson.description || "").trim();
              const isLikelyJson = desc.startsWith("[") || desc.startsWith("{");
              const plainText = isLikelyJson ? "" : desc;
              const parsedFoods = parseDietDescription(plainText).filter(f => f.name);
              meals = parsedFoods.length > 0 ? [{
                id: `sel-${selected.source_plan_id}`,
                name: lesson.title || "Refeição",
                time: "",
                foods: parsedFoods,
                calories: 0,
                macros: { protein: 0, carbs: 0, fats: 0 },
                notes: "",
              }] : [];
            }

            return {
              id: selected.source_plan_id,
              name: lesson.title || "Dieta Selecionada",
              active: true,
              meals,
            } as any;
          }
        } else {
          const { data: refPlan } = await supabase
            .from("diet_plans")
            .select("*")
            .eq("id", selected.source_plan_id)
            .maybeSingle();
          if (refPlan) return refPlan;
        }
      }

      // 2. Fallback to older legacy own plan
      const { data: ownPlan, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (ownPlan) return ownPlan;

      // 3. Fallback: fetch plan from the preferred active challenge
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const challenge = pickPreferredChallenge(challenges as { id: string; title: string | null }[] | null);
      if (!challenge) return null;

      // Find the diets module for this challenge
      const { data: dietModule } = await supabase
        .from("challenge_modules")
        .select("id")
        .eq("challenge_id", challenge.id)
        .eq("type", "diets")
        .maybeSingle();
      if (!dietModule) return null;

      // Get lessons from the diet module
      const { data: lessons } = await supabase
        .from("challenge_lessons")
        .select("title, description, order_index")
        .eq("module_id", dietModule.id)
        .order("order_index");

      if (!lessons?.length) return null;

      // Parse lessons into meals format — try JSON first, then plain text
      const meals: any[] = [];
      for (const lesson of lessons) {
        const desc = lesson.description || "";
        const jsonMeals = tryParseJsonMeals(desc);
        if (jsonMeals && jsonMeals.length > 0) {
          // JSON lesson: each parsed meal becomes a separate meal entry
          jsonMeals.forEach((m, mi) => meals.push({ ...m, id: `challenge-diet-${meals.length + mi}` }));
        } else {
          // Plain text fallback — skip if it looks like broken JSON
          const trimmed = desc.trim();
          const isLikelyJson = trimmed.startsWith("[") || trimmed.startsWith("{");
          const plainFoods = isLikelyJson ? [] : parseDietDescription(desc).filter(f => f.name);
          if (plainFoods.length > 0) {
            meals.push({
              id: `challenge-diet-${meals.length}`,
              name: lesson.title,
              time: "",
              foods: plainFoods,
              calories: 0,
              macros: { protein: 0, carbs: 0, fats: 0 },
              notes: "",
            });
          }
        }
      }

      return {
        id: `challenge-diet-${challenge.id}`,
        meals,
        active: true,
        goal_description: null,
        name: "Cardápio do Desafio",
      } as any;
    },
    enabled: !!user,
  });

  const allMeals: ParsedMeal[] = useMemo(() => {
    if (!dietPlan?.meals) return [];
    try {
      const raw = dietPlan.meals as any[];
      return raw.map((meal: any, idx: number) => {
        const mealId = meal.id || `m${idx + 1}`;

        if (meal.foods !== undefined) {
          const foods: ParsedFood[] = (meal.foods as any[])
            .filter((f: any) => f.name)
            .map((f: any) => {
              const subs: FoodSubstitute[] = f.substitutes ?? [];
              if (f.substitute && !subs.length) subs.push(f.substitute);
              let portion = f.displayPortion || "";
              // Filter out corrupted "0 undefined" values
              if (portion === "0 undefined" || portion === "0undefined") portion = "";
              if (!portion) {
                portion = f.quantity
                  ? (String(f.quantity).match(/[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]/)
                    ? String(f.quantity)
                    : f.unit && f.unit !== "undefined" ? `${f.quantity} ${f.unit}` : `${f.quantity}g`)
                  : (f.portion || "");
              }
              // Final safety: don't show "0g" or empty-ish portions
              if (portion === "0g" || portion === "0 g") portion = "";
              return { name: f.name, portion, substitutes: subs };
            });

          let mealCalories = meal.macros?.calories || 0;
          let mealProtein = meal.macros?.protein || 0;
          let mealCarbs = meal.macros?.carbs || 0;
          let mealFat = meal.macros?.fat || 0;

          if (mealCalories === 0 && (meal.foods ?? []).length > 0) {
            for (const fd of meal.foods ?? []) {
              mealCalories += Number(fd.calories) || 0;
              mealProtein += Number(fd.protein) || 0;
              mealCarbs += Number(fd.carbs) || 0;
              mealFat += Number(fd.fat) || 0;
            }
            if (mealCalories === 0 && (mealProtein > 0 || mealCarbs > 0 || mealFat > 0)) {
              mealCalories = Math.round(mealProtein * 4 + mealCarbs * 4 + mealFat * 9);
            }
          }

          return {
            id: mealId, time: meal.time || "",
            label: meal.name || `Refeição ${idx + 1}`, foods,
            calories: Math.round(mealCalories),
            macros: { protein: Math.round(mealProtein), carbs: Math.round(mealCarbs), fats: Math.round(mealFat) },
            notes: meal.notes || "",
          };
        }

        // Legacy format
        const opt = meal.options?.[0] || {};
        const items: string[] = opt.items || [];
        const foods: ParsedFood[] = items.map((item: string, i: number) => ({
          name: item, portion: "",
          substitutes: opt.substitutes?.[i] ? [opt.substitutes[i]] : [],
        }));
        return {
          id: mealId, time: meal.time || "",
          label: meal.label || meal.name || `Refeição ${idx + 1}`, foods,
          calories: opt.calories || 0,
          macros: { protein: opt.macros?.protein || 0, carbs: opt.macros?.carbs || 0, fats: opt.macros?.fats || 0 },
          notes: "",
        };
      });
    } catch {
      return [];
    }
  }, [dietPlan]);

  // Group alternatives under their parent meal
  const groupedMeals: GroupedMeal[] = useMemo(() => {
    const groups: GroupedMeal[] = [];
    const usedIndices = new Set<number>();

    // Helper to get group key
    const getGroupKey = (meal: ParsedMeal) => {
      if (meal.time && meal.time.trim() !== "") return `time:${meal.time.trim()}`;
      const cleanName = meal.label.replace(/^\d{1,2}:\d{2}\s*[–\-]\s*/, "");
      return `name:${cleanName.split(/\s*[–\-]\s*/)[0].trim().toLowerCase()}`;
    };

    allMeals.forEach((meal, idx) => {
      if (usedIndices.has(idx)) return;
      
      const baseKey = getGroupKey(meal);
      const alternatives: ParsedMeal[] = [];

      allMeals.forEach((other, otherIdx) => {
        if (otherIdx === idx || usedIndices.has(otherIdx)) return;
        const otherKey = getGroupKey(other);
        if (baseKey === otherKey) {
          alternatives.push(other);
          usedIndices.add(otherIdx);
        }
      });

      usedIndices.add(idx);
      groups.push({ main: meal, alternatives });
    });

    return groups;
  }, [allMeals]);

  const mainMeals = groupedMeals.map(g => g.main);

  const { completedMeals, toggleMeal: toggleMealInDb } = useDailyHabits();

  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [showSubstitute, setShowSubstitute] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  // Track which alternative the user selected for each meal
  const [selectedAlternative, setSelectedAlternative] = useState<Record<string, number>>({});

  const totalMacros = useMemo(() => {
    return mainMeals.reduce(
      (acc, meal) => ({
        cal: acc.cal + meal.calories,
        prot: acc.prot + meal.macros.protein,
        carb: acc.carb + meal.macros.carbs,
        fat: acc.fat + meal.macros.fats,
      }),
      { cal: 0, prot: 0, carb: 0, fat: 0 }
    );
  }, [mainMeals]);

  // If it's a config diet (hardcoded), render DietPlan component directly
  if (dietPlan?.is_config_diet) {
    return <DietPlan initialCalories={dietPlan.config_calories} />;
  }

  if (!isLoading && allMeals.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto flex flex-col">
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button onClick={() => navigate("/aluno")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-primary" />
            <span className="font-cinzel font-bold text-foreground">PLANO ALIMENTAR</span>
          </div>
        </div>
        
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <Leaf size={40} className="text-primary" />
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <p className="text-sm font-bold text-foreground leading-relaxed">
                Seu plano está sendo processado pela nossa equipe de especialistas. Em breve estará disponível.
              </p>
            </div>
          </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate("/aluno")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Leaf size={20} className="text-primary" />
          <span className="font-cinzel font-bold text-foreground">PLANO ALIMENTAR</span>
        </div>
      </div>
      <div className="flex bg-secondary/50 p-1 rounded-xl mb-6">
        <button 
          onClick={() => setActiveTab("dieta")} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "dieta" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <Leaf size={14} />
          Refeições
        </button>
        <button 
          onClick={() => setActiveTab("lista")} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "lista" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <ShoppingCart size={14} />
          Lista de Compras
        </button>
      </div>

      {activeTab === "dieta" ? (
        <>
          {/* ── Premium Header (mirrors Treinos detail header) ── */}
          <div className="crimson-gradient rounded-xl p-5 mb-4 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
            <p className="relative text-[10px] uppercase tracking-[0.25em] text-primary-foreground/70 font-bold mb-1">
              Plano Alimentar
            </p>
            <h2 className="relative font-cinzel text-lg font-bold text-primary-foreground tracking-wide uppercase mb-3">
              {dietPlan?.name || dietPlan?.title || "Cardápio Selecionado"}
            </h2>
            <div className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 backdrop-blur-sm">
              <Flame size={16} className="text-primary-foreground" />
              <span className="font-cinzel text-xl font-bold text-primary-foreground">{totalMacros.cal}</span>
              <span className="text-[10px] uppercase font-bold text-primary-foreground/70 tracking-widest mt-0.5">Kcal / Dia</span>
            </div>
            {/* Macro bar */}
            <div className="relative flex items-center justify-center gap-4 mt-3 text-[10px] font-bold text-primary-foreground/80 uppercase tracking-wider">
              <span>P: {totalMacros.prot}g</span>
              <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
              <span>C: {totalMacros.carb}g</span>
              <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
              <span>G: {totalMacros.fat}g</span>
            </div>
          </div>

          {dietPlan?.goal_description && (
            <GoalDescriptionCard description={dietPlan.goal_description} />
          )}

          {/* Meal counter (progress bar) */}
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs text-muted-foreground">Refeições feitas</p>
            <p className="text-sm font-bold text-foreground">
              {mainMeals.filter(m => completedMeals.has(m.id)).length} / {mainMeals.length}
            </p>
          </div>
          <div className="flex gap-1.5 mb-5 px-1">
            {mainMeals.map((meal) => (
              <div
                key={meal.id}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{
                  background: completedMeals.has(meal.id) ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                }}
              />
            ))}
          </div>

          {/* ── Meal Accordion Cards (mirrors Treinos exercise cards) ── */}
          <div className="space-y-2">
            {groupedMeals.map((group, groupIdx) => {
              const { main: meal, alternatives } = group;
              const hasAlternatives = alternatives.length > 0;
              const isCompleted = completedMeals.has(meal.id);
              const isExpanded = expandedMeal === meal.id;
              const isAltOpen = showAlternatives === meal.id;
              const selectedAltIdx = selectedAlternative[meal.id];
              const displayMeal = selectedAltIdx !== undefined ? alternatives[selectedAltIdx] : meal;

              // Choose emoji icon based on meal index / time
              const mealEmojis = ["☕", "🍎", "🍲", "🥤", "🍽️", "🌙"];
              const emoji = mealEmojis[groupIdx % mealEmojis.length];

              return (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIdx * 0.04 }}
                  className="bg-secondary/50 border border-border rounded-xl overflow-hidden"
                >
                  {/* ── Card Header (icon left, name center, chevron right) ── */}
                  <button
                    onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                    className="w-full flex items-center gap-3 p-3"
                  >
                    {/* Check-in / Emoji icon */}
                    <div
                      role="button"
                      onClick={(e) => { e.stopPropagation(); toggleMealInDb(meal.id, mainMeals.length); }}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all",
                        isCompleted
                          ? "bg-primary/20 border border-primary/40"
                          : "bg-secondary border border-border/50"
                      )}
                    >
                      {isCompleted ? (
                        <Check size={18} className="text-primary" />
                      ) : (
                        <span className="text-base">{emoji}</span>
                      )}
                    </div>

                    {/* Meal name + macros */}
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn(
                        "text-sm font-medium text-foreground",
                        isCompleted && "line-through text-muted-foreground/50"
                      )}>
                        {meal.time ? `${meal.time} – ` : ""}{meal.label.replace(/^\d{1,2}:\d{2}\s*[–\-]\s*/, "").split(/\s*[–\-]\s*/)[0].trim()}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-bold uppercase">
                        <span className="text-accent">{displayMeal.calories} kcal</span>
                        <span>P:{displayMeal.macros.protein}g</span>
                        <span>C:{displayMeal.macros.carbs}g</span>
                        <span>G:{displayMeal.macros.fats}g</span>
                      </div>
                    </div>

                    {/* Alternatives button */}
                    {hasAlternatives && (
                      <div
                        role="button"
                        onClick={(e) => { e.stopPropagation(); setShowAlternatives(isAltOpen ? null : meal.id); }}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                          isAltOpen ? "bg-accent/10 border border-accent/30" : "bg-secondary/80 border border-border/50"
                        )}
                      >
                        <Repeat2 size={14} className={isAltOpen ? "text-accent" : "text-muted-foreground"} />
                      </div>
                    )}

                    {/* Chevron */}
                    <div className={cn(
                      "w-7 h-7 rounded-lg bg-secondary/80 border border-border/50 flex items-center justify-center transition-transform duration-300",
                      isExpanded ? "rotate-180" : ""
                    )}>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </div>
                  </button>

                  {/* ── Alternative selector dropdown ── */}
                  <AnimatePresence>
                    {isAltOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-secondary/20"
                      >
                        <div className="p-3 space-y-2 border-t border-border/50">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 mb-1">Opções Disponíveis:</p>
                          <button
                            onClick={() => { setSelectedAlternative({ ...selectedAlternative, [meal.id]: undefined as any }); setShowAlternatives(null); }}
                            className={cn("w-full text-left p-3 rounded-xl border transition-all", selectedAltIdx === undefined ? "bg-accent/5 border-accent/20" : "bg-card border-border/50 hover:bg-secondary/30")}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  {meal.label.split(/\s*[–\-]\s*/).length > 1 ? meal.label.split(/\s*[–\-]\s*/).slice(1).join(" - ") : "Opção Principal"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{meal.calories} kcal</p>
                              </div>
                              {selectedAltIdx === undefined && <Check size={14} className="text-accent" />}
                            </div>
                          </button>
                          {alternatives.map((alt, altIdx) => (
                            <button
                              key={alt.id}
                              onClick={() => { setSelectedAlternative({ ...selectedAlternative, [meal.id]: altIdx }); setShowAlternatives(null); }}
                              className={cn("w-full text-left p-3 rounded-xl border transition-all", selectedAltIdx === altIdx ? "bg-accent/5 border-accent/20" : "bg-card border-border/50 hover:bg-secondary/30")}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-foreground">
                                    {alt.label.split(/\s*[–\-]\s*/).length > 1 ? alt.label.split(/\s*[–\-]\s*/).slice(1).join(" - ") : `Opção ${altIdx + 2}`}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{alt.calories} kcal</p>
                                </div>
                                {selectedAltIdx === altIdx && <Check size={14} className="text-accent" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Expanded Content (drill-down) ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-4 space-y-3">
                          {/* Block 1: Main foods */}
                          <div className="space-y-2">
                            {displayMeal.foods.map((food, foodIdx) => {
                              const subKey = `${displayMeal.id}-${foodIdx}`;
                              const hasSubs = food.substitutes.length > 0;
                              const isSubOpen = showSubstitute === subKey;

                              return (
                                <div key={foodIdx} className="bg-card border border-border/50 rounded-lg p-3 space-y-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-bold text-foreground tracking-tight">{food.name}</p>
                                      {food.portion && (
                                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">{food.portion}</p>
                                      )}
                                    </div>
                                    {food.calories ? (
                                      <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-0.5 rounded-full border border-accent/10">{food.calories}kcal</span>
                                    ) : null}
                                  </div>

                                  {(food.protein || food.carbs || food.fat) ? (
                                    <div className="flex gap-3 pt-1 border-t border-border/30">
                                      <span className="text-[9px] text-muted-foreground uppercase">P: <span className="text-foreground/60">{food.protein || 0}g</span></span>
                                      <span className="text-[9px] text-muted-foreground uppercase">C: <span className="text-foreground/60">{food.carbs || 0}g</span></span>
                                      <span className="text-[9px] text-muted-foreground uppercase">G: <span className="text-foreground/60">{food.fat || 0}g</span></span>
                                    </div>
                                  ) : null}

                                  {/* Block 2: Substitutions (visually separated like Trainer notes) */}
                                  {hasSubs && (
                                    <div className="pt-1">
                                      <button
                                        onClick={() => setShowSubstitute(isSubOpen ? null : subKey)}
                                        className="w-full flex items-center justify-between gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors bg-accent/5 border border-accent/10 rounded-lg px-3 py-2.5"
                                      >
                                        <div className="flex items-center gap-2">
                                          <ArrowLeftRight size={12} strokeWidth={3} />
                                          <span>Substituições ({food.substitutes.length})</span>
                                        </div>
                                        <ChevronDown size={14} className={cn("transition-transform duration-300", isSubOpen ? "rotate-180" : "")} />
                                      </button>

                                      <AnimatePresence>
                                        {isSubOpen && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                          >
                                            {/* Gold-tinted block like Trainer notes in Treinos */}
                                            <div className="mt-2 bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.2)] rounded-lg p-3 space-y-2">
                                              <div className="flex items-center gap-2 mb-1">
                                                <ArrowLeftRight size={12} className="text-[hsl(var(--gold))]" />
                                                <span className="text-[10px] font-bold text-[hsl(var(--gold))] uppercase tracking-wider">Opções de Troca</span>
                                              </div>
                                              {food.substitutes.map((sub, si) => (
                                                <div key={si} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-1">
                                                  <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-foreground">{sub.name}</p>
                                                    {sub.calories > 0 && <span className="text-[8px] font-black text-accent">{sub.calories}kcal</span>}
                                                  </div>
                                                  <p className="text-[10px] text-muted-foreground italic">
                                                    {sub.displayPortion || (sub.quantity ? `${sub.quantity}${sub.unit || 'g'}` : sub.portion)}
                                                  </p>
                                                  <div className="flex gap-3 text-[8px] uppercase tracking-tighter text-muted-foreground">
                                                    <span>P: {sub.protein}g</span>
                                                    <span>C: {sub.carbs}g</span>
                                                    <span>G: {sub.fat}g</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Notes (Dica Miris - like Trainer instructions block) */}
                          {displayMeal.notes && (
                            <div className="bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.2)] rounded-lg p-3 flex gap-3">
                              <MessageSquare size={14} className="text-[hsl(var(--gold))] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--gold))] font-black mb-1">Dica Miris:</p>
                                <p className="text-xs text-foreground/80 leading-relaxed italic">{displayMeal.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <ShoppingList />
      )}
    </div>
);
};

export default Dieta;
