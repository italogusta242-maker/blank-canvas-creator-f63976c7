/**
 * @purpose Pure utility functions for the training domain.
 * @dependencies Used by Treinos page and training sub-components.
 */
import type { Exercise, ExerciseSet, WorkoutGroup } from "./types";

/** Initialize set data for an exercise */
export const initSetsData = (ex: Exercise): ExerciseSet[] =>
  Array(ex.sets).fill(null).map(() => ({
    targetReps: ex.reps,
    weight: ex.weight,
    actualReps: null,
    done: false,
  }));

/** Format seconds as MM:SS */
export const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

/** Parse rest string like "1'30\"", "2'", "1'30\" a 2'" into seconds (uses first value) */
export const parseRestSeconds = (rest: string): number => {
  if (!rest) return 90;
  const match = rest.match(/(\d+)'(?:\s*(\d+)"?)?/);
  if (!match) return 90;
  const minutes = parseInt(match[1]) || 0;
  const seconds = parseInt(match[2]) || 0;
  return minutes * 60 + seconds;
};

/** Calculate total volume from live exercise data */
export const calcVolume = (exercises: Exercise[]) => {
  let total = 0;
  exercises.forEach((ex) => {
    ex.setsData.forEach((s) => {
      if (s.done && s.weight && s.actualReps) {
        total += s.weight * s.actualReps;
      }
    });
  });
  return total;
};

/** Calculate total volume from JSON exercise data (history) */
export const calcVolumeFromJson = (exercises: any) => {
  if (!exercises || !Array.isArray(exercises)) return 0;
  let total = 0;
  exercises.forEach((ex: any) => {
    if (ex.setsData && Array.isArray(ex.setsData)) {
      ex.setsData.forEach((s: any) => {
        if (s.done && s.weight && s.actualReps) {
          total += s.weight * s.actualReps;
        }
      });
    }
  });
  return total;
};

/** Parse workout description text into Exercise[] (from challenge lessons) */
export function parseWorkoutDescription(text: string): Exercise[] {
  if (!text) return [];
  const exercises: Exercise[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Match lines like "TREINO A", "Treino 1", "Treino A", "SUPERIOR", "INFERIOR"
  // Case-insensitive check for TREINO pattern, and allow digits/letters after it
  const sectionHeaderRegex = /^((?:TREINO|Treino|treino)\s+[A-Z0-9]+|SUPERIOR|INFERIOR|FULLBODY|GLÚTEOS|MEMBROS\s+INFERIORES|MEMBROS\s+SUPERIORES|AQUECIMENTO|CARDIO|MOBILIDADE|ALONGAMENTO)(?:\s*[\-\–\—\:]\s*.*)?$|^[A-ZÀÁÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s\+\-\–\—\/\(\)]{4,}$/;

  let currentExerciseName = '';
  let currentInstructions: string[] = [];

  const flushExercise = () => {
    if (currentExerciseName) {
      const instrText = currentInstructions.join(' • ');
      const setsMatch = instrText.match(/(\d+)\s*séries?/i) || instrText.match(/(\d+)[ºª°]\s*série/i);
      const repsMatch = instrText.match(/(\d+)\s*(repetições?|rep)/i);
      // Count numbered series lines (1º série, 2º série, etc.)
      const numberedSeries = currentInstructions.filter(l => /^\d+[ºª°]\s*série/i.test(l.replace(/^[-–•*]\s*/, ''))).length;
      const finalSets = setsMatch ? parseInt(setsMatch[1]) : (numberedSeries > 0 ? numberedSeries : 4);
      
      const isFreeText = !setsMatch && !repsMatch && !numberedSeries && (instrText.length > 50 || currentExerciseName.length > 40);

      exercises.push({
        name: currentExerciseName,
        sets: finalSets,
        reps: repsMatch ? `${repsMatch[1]}` : 'ver instruções',
        weight: null,
        rest: "1'00\"",
        setsData: [],
        description: instrText || undefined,
        freeText: isFreeText,
      });
    }
    currentExerciseName = '';
    currentInstructions = [];
  };

  for (const line of lines) {
    // 1. Check if it's a section header or a literal section marker
    if (line === '__section__' || sectionHeaderRegex.test(line)) {
      flushExercise();
      const isLiteralSection = line === '__section__';
      exercises.push({
        name: isLiteralSection ? '' : `🏋️ ${line}`,
        sets: 0,
        reps: '',
        weight: null,
        rest: '',
        setsData: [],
        description: '__section__',
      });
      continue;
    }

    // 2. Identify if it's a detail/instruction or an exercise name
    const cleanLine = line.replace(/^[•\-\*]\s*/, '');
    const isBulleted = /^[•\-\*]/.test(line);
    const isDetailKeyword = /série|repetiç|rep\s|rep\.|reps|segundos|isometria|drop|cluster|descanso|descans|carga|peso|utilize|kg|minutos|min\s|seg\.|intervalo|pausa|reduza|aumento|coloque|faça|mantendo|descendo|subindo|diretas|unilateral/i.test(line);
    
    // An exercise name:
    // - Is not detected as a section header
    // - Is reasonably short
    // - Doesn't contain "technical" detail keywords
    // - If bulleted, it's ONLY an exercise if it doesn't look like a detail
    const looksLikeExercise = cleanLine.length > 2 && cleanLine.length < 70 && !isDetailKeyword && !/^\d+[ºª°]\s/i.test(cleanLine);
    const isIntroText = line.length > 100 || /^(essa|esta|planilha|seguida|focado|explicando|use\s|descanse|com\s+(a\s+)?mesma)/i.test(line);

    if (looksLikeExercise && !isIntroText && (!isBulleted || currentExerciseName === '')) {
      flushExercise();
      currentExerciseName = cleanLine;
    } else {
      currentInstructions.push(line);
    }
  }
  flushExercise();

  return exercises;
}

/** Split a list of exercises into groups based on __section__ markers */
export function splitExercisesIntoGroups(exercises: Exercise[], fallbackName: string = "Treino"): WorkoutGroup[] {
  const groups: WorkoutGroup[] = [];
  let currentGroup: WorkoutGroup | null = null;

  exercises.forEach(ex => {
    if (ex.description === '__section__') {
      // If we have a pending group, push it before starting the new one
      if (currentGroup && currentGroup.exercises.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = {
        name: ex.name.replace(/🏋️\s?/, ''),
        exercises: []
      };
    } else {
      if (!currentGroup) {
        currentGroup = { name: fallbackName, exercises: [] };
      }
      currentGroup.exercises.push(ex);
    }
  });

  if (currentGroup && currentGroup.exercises.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
