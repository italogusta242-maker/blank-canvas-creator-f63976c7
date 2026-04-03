/**
 * @purpose Hook to fetch the user's active training plan filtered by their selection.
 * @dependencies useAuth, supabase, useQuery
 * 
 * Priority:
 * 1. Plan the user selected in "Área de Membros" (user_selected_plans)
 * 2. User's own training_plans (specialist-assigned)
 * 3. Challenge workout lessons (parsed from challenge_lessons)
 * 4. null (empty state)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TrainingPlan, WorkoutGroup } from "@/components/training/types";
import { parseWorkoutDescription, splitExercisesIntoGroups } from "@/components/training/helpers";

export function useTrainingPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["training-plan", user?.id],
    queryFn: async (): Promise<TrainingPlan | null> => {
      if (!user) return null;

      // 1. Check if user selected a specific plan via "Área de Membros"
      const { data: selectedPlan } = (await supabase
        .from("user_selected_plans")
        .select("source_plan_id, plan_type, plan_data")
        .eq("user_id", user.id)
        .eq("plan_type", "training")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: any };

      let basePlan: TrainingPlan | null = null;
      const isLesson = selectedPlan?.plan_data?.is_lesson === true;

      if (selectedPlan?.source_plan_id) {
        if (isLesson) {
          // Option A: Selection is a lesson ID (handle specific challenge content)
          const { data: lesson } = await supabase
            .from("challenge_lessons")
            .select("title, description")
            .eq("id", selectedPlan.source_plan_id)
            .maybeSingle();
          
          if (lesson) {
            let exercises = [];
            try {
              // Handle JSON structured exercises from challenge lessons
              if (lesson.description?.trim().startsWith('[')) {
                exercises = JSON.parse(lesson.description);
              } else {
                exercises = parseWorkoutDescription(lesson.description || '');
              }
            } catch (e) {
              console.error("Error parsing challenge lesson exercises:", e);
              exercises = parseWorkoutDescription(lesson.description || '');
            }

            basePlan = {
              id: selectedPlan.source_plan_id,
              title: lesson.title || 'Treino Selecionado',
              groups: Array.isArray(exercises) && exercises.length > 0
                ? splitExercisesIntoGroups(exercises, lesson.title || 'Treino')
                : [],
              total_sessions: 50,
              valid_until: null
            } as any;
          }
        } else {
          // Option B: Selection is a specific training_plans ID
          const { data: plan } = await supabase
            .from("training_plans")
            .select("*")
            .eq("id", selectedPlan.source_plan_id)
            .eq("active", true)
            .maybeSingle();

          if (plan) {
            basePlan = plan as unknown as TrainingPlan;
          }
        }
      }

      // 2. Fallback to specialist-assigned plan if no selection
      if (!basePlan) {
        const { data: ownPlan } = await supabase
          .from("training_plans")
          .select("*")
          .eq("user_id", user.id)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ownPlan) {
          basePlan = ownPlan as unknown as TrainingPlan;
        }
      }

      // 3. Last fallback: All challenge lessons (only if no selection/assigned plan)
      if (!basePlan) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("group_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.group_id) {
          const { data: challenge } = await supabase
            .from("challenges")
            .select("id, title")
            .eq("is_active", true)
            .eq("target_group_id", profile.group_id)
            .maybeSingle();

          if (challenge) {
            const { data: workoutModule } = await supabase
              .from("challenge_modules")
              .select("id")
              .eq("challenge_id", challenge.id)
              .eq("type", "workouts")
              .maybeSingle();

            if (workoutModule) {
              const { data: lessons } = await supabase
                .from("challenge_lessons")
                .select("id, title, description")
                .eq("module_id", workoutModule.id)
                .order("order_index", { ascending: true });

              if (lessons?.length) {
                basePlan = {
                  id: `challenge-${challenge.id}`,
                  title: challenge.title || 'Treino do Desafio',
                  groups: lessons.map(l => ({ 
                    name: l.title || "Treino", 
                    exercises: parseWorkoutDescription(l.description || '') 
                  })),
                  total_sessions: 50,
                  valid_until: null,
                };
              }
            }
          }
        }
      }

      if (!basePlan) return null;

      // 4. Force groups to be an array
      if (!Array.isArray(basePlan.groups)) {
        basePlan.groups = [];
      }

      // 4. Explosion Logic: If a group has internal __section__ headers, split them into separate groups
      const finalGroups: WorkoutGroup[] = [];
      basePlan.groups.forEach(group => {
        if (!group) return;
        const groupExercises = Array.isArray(group.exercises) ? group.exercises : [];
        const hasSections = groupExercises.some(ex => ex && ex.description === '__section__');
        if (hasSections) {
          const split = splitExercisesIntoGroups(groupExercises, group.name);
          finalGroups.push(...split);
        } else {
          finalGroups.push({ ...group, exercises: groupExercises });
        }
      });

      // 5. Filter out non-workout groups (Meta content like "Sobre o treino" or "Orientações")
      const filteredGroups = finalGroups.filter(g => {
        const name = g.name.toUpperCase();
        const blacklist = ["ORIENTAÇÕES GERAIS", "SOBRE O TREINO", "AVALIAÇÃO", "DICAS", "INTRODUÇÃO"];
        return !blacklist.some(item => name.includes(item));
      });

      return { ...basePlan, groups: filteredGroups };
    },
    enabled: !!user,
    refetchOnMount: "always",
  });
}
