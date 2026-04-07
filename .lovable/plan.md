

## Bug Fix: Adherence Exceeding 100% + UI Refinement

### Problem 1: Adherence > 100%

The adherence displayed in `DashboardHero` comes from `useFlameState().adherence`. This value starts from `calculateAdherence()` (already capped at 100), BUT `optimisticFlameUpdate` in `flameOptimistic.ts` adds deltas from multiple sources (meals, water, goals, workouts). Each action adds points (`adherenceDelta`) to the cached value. While `flameOptimistic.ts` does `Math.min(100, ...)`, the problem is the **accumulation**:

- `toggleMeal` adds `~7pts` per meal (40/6) — 6 meals = 40pts
- `setWater` adds up to 10pts  
- `toggleGoal` adds 3pts each
- Workout completion adds training points
- These stack on top of the DB-fetched adherence (which already includes workout days)

The root cause: `calculateAdherence()` returns workout-based adherence (e.g. 57%), then optimistic deltas from meals/water/goals add ON TOP of that, easily pushing past 100%.

### Problem 2: UI needs more breathing room

Cards in the diet/training sections need more padding, softer shadows, and better spacing between navigation tabs and content.

---

### Plan

#### Step 1: Cap adherence in all display points

**Files**: `src/components/dashboard/DashboardHero.tsx`, `src/pages/Dashboard.tsx`

- In `Dashboard.tsx` line 137: `const adherence = Math.min(100, adherenceReal);`
- In `DashboardHero.tsx`: cap the `adherence` prop usage: `const cappedAdherence = Math.min(adherence, 100);` and use it everywhere in the component
- In `DietPlan.tsx` line 78: `const mealProgress = Math.min(totalMeals > 0 ? (mealsCompleted / totalMeals) * 100 : 0, 100);`

#### Step 2: Fix optimistic flame delta accumulation

**File**: `src/hooks/useDailyHabits.ts`

The `optimisticFlameUpdate` calls use raw deltas that can inflate adherence. The `flameOptimistic.ts` already caps at 100, but verify and add safety:
- In `toggleMeal`: reduce per-meal delta from `40/mealCount` to be proportional (already fine, just ensure cap)
- The real fix is ensuring `flameOptimistic.ts` line 23 cap works — it does (`Math.min(100, ...)`), so the overflow must come from the initial value being wrong when `old` is null (line 21). Fix: `Math.min(Math.max(0, delta.adherenceDelta ?? 0), 100)`

#### Step 3: UI Refinement — Cards & Spacing

**Files**: `src/components/diet/DietPlan.tsx`, `src/pages/Desafio.tsx`

- **DietPlan.tsx meal cards**: Increase padding from `px-5 pt-5 pb-3` → `px-6 pt-6 pb-4`, use `rounded-2xl shadow-md`
- **DietPlan.tsx substitutions text**: Use `text-sm text-muted-foreground` for lighter appearance
- **DietPlan.tsx shopping cards**: Same padding increase
- **Desafio.tsx module section**: Add `mb-8` spacing between tabs/navigation and content area
- **Food items**: Ensure `text-sm` for portions, `text-muted-foreground` for secondary info
- **Check buttons**: Ensure `min-h-[44px]` touch target, `flex justify-between items-center` alignment

#### Step 4: Progress bar overflow protection

**File**: `src/components/ui/progress.tsx`

Add CSS clamp to prevent visual overflow:
```tsx
style={{ transform: `translateX(-${Math.max(0, 100 - (value || 0))}%)`, ... }}
```

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Cap adherence with `Math.min(100, ...)` |
| `src/components/dashboard/DashboardHero.tsx` | Cap adherence prop |
| `src/components/diet/DietPlan.tsx` | Cap progress, increase padding/spacing, softer shadows |
| `src/components/ui/progress.tsx` | Prevent visual overflow |
| `src/lib/flameOptimistic.ts` | Safety cap on initial state |
| `src/pages/Desafio.tsx` | Spacing between navigation and content |

