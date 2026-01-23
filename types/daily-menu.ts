import { Recipe } from './recipe';

export interface DailyMenu {
  date: Date;
  recipes: Recipe[];
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
