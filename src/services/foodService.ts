/**
 * @purpose Service layer for foods CRUD operations.
 * @dependencies supabase client.
 */
import { supabase } from "@/integrations/supabase/client";
import type { FoodDBItem } from "@/types/diet";

/** Search foods by name with optional category filter */
export async function searchFoods(
  search: string,
  category: string | null,
  limit = 100
): Promise<FoodDBItem[]> {
  let query = (supabase as any).from("foods")
    .select("id, name, portion, calories, protein, carbs, fat, fiber, category, source")
    .order("name");
  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
  if (category) query = query.eq("category", category);
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return (data ?? []) as FoodDBItem[];
}

/** Autocomplete search (lightweight, fewer fields) */
export async function autocompleteFoods(term: string, limit = 8): Promise<FoodDBItem[]> {
  if (term.length < 2) return [];
  const { data } = await (supabase as any)
    .from("foods")
    .select("id, name, portion, calories, protein, carbs, fat, category, source")
    .ilike("name", `%${term}%`)
    .order("name")
    .limit(limit);
  return (data ?? []) as FoodDBItem[];
}

/** Insert a new food item */
export async function createFood(food: {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  category: string;
  created_by?: string;
}): Promise<void> {
  const { error } = await (supabase as any).from("foods").insert(food);
  if (error) throw error;
}

/** Delete a food item by ID */
export async function deleteFood(id: string): Promise<void> {
  const { error } = await (supabase as any).from("foods").delete().eq("id", id);
  if (error) throw error;
}
