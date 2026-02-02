import { Recipe } from './recipe';

export interface DailyMenu {
  date: Date;
  recipes: Recipe[];
  servings: number;
}

/** Firestore 저장용: 레시피는 ID만 저장하고, 표시 시 recipes 컬렉션에서 Lookup */
export interface RawDailyMenu {
  date: Date;
  recipeIds: string[];
  servings: number;
}

export interface CookingSession {
  id: string;
  date: Date;
  menus: Recipe[];
  status: 'preparing' | 'cooking' | 'completed';
  preparedIngredients: Set<string>;
  completedSteps: Set<string>;
  photos: string[];
}
