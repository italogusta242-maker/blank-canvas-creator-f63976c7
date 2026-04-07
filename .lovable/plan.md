

## Problem Analysis

Two distinct issues identified:

### Issue 1: Dashboard always shows "Planner Inativo"
**Root cause**: `src/hooks/useProfile.ts` selects only `id, full_name, status, phone, avatar_url, onboarded` — it does NOT include `planner_type`. The Dashboard checks `(profile as any)?.planner_type` which is always `undefined`, so the "Planner Inativo" card always renders.

### Issue 2: Stutter/slow reload on planner selection
**Root cause**: `src/pages/Desafio.tsx` line 197 does `window.location.reload()` after selecting a planner. This causes a full page reload (re-fetching everything, re-rendering the entire app), creating the stutter. A simple React Query invalidation is sufficient.

---

## Plan

### Step 1: Add `planner_type` to useProfile select
**File**: `src/hooks/useProfile.ts`
- Change the select string to include `planner_type`:
  `"id, full_name, status, phone, avatar_url, onboarded, planner_type"`

### Step 2: Remove `window.location.reload()` from planner selection
**File**: `src/pages/Desafio.tsx`
- Remove the `setTimeout(() => { window.location.reload(); }, 500)` block
- The existing `queryClient.invalidateQueries` calls already handle cache refresh
- Add invalidation for `"flame-state"` and `"training-plan"` queries to ensure Dashboard updates reactively

### Expected Result
- Dashboard will immediately show DailyGoals when a planner is selected
- No full page reload — smooth transition via React Query cache invalidation
- No more stutter on planner selection

