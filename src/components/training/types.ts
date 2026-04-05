/**
 * @purpose Centralized type definitions for the training execution domain.
 * @dependencies Used by Treinos page, VictoryCard, RestTimer, helpers, hooks.
 */

export interface ExerciseSet {
  targetReps: string;
  weight: number | null;
  actualReps: number | null;
  done: boolean;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight: number | null;
  rest: string;
  videoId?: string;
  setsData: ExerciseSet[];
  description?: string;
  gif_url?: string;
  instructions?: string;
  /** If true, this is a free-text instruction, not a trackable exercise */
  freeText?: boolean;
  /** Runtime flag for free-text completion */
  _freeTextDone?: boolean;
}

export interface WorkoutGroup {
  name: string;
  exercises: Exercise[];
}

export interface TrainingPlan {
  id: string;
  title: string;
  groups: WorkoutGroup[];
  total_sessions: number;
  valid_until: string | null;
  avaliacao_postural?: string | null;
  pontos_melhoria?: string | null;
  objetivo_mesociclo?: string | null;
}

export interface WorkoutLog {
  id: string;
  group_name: string | null;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  effort_rating: number | null;
  comment: string | null;
  exercises: any;
}

export type TrainingView = "list" | "detail" | "execution" | "complete" | "share" | "history";
