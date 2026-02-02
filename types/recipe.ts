export type IngredientCategory = '조미료' | '육류' | '채소' | '곡물' | '기타';

export interface ProductInfo {
  id: string;
  productName: string;
  supplier: string; // 구매처
  weight: number; // 중량
  price: number; // 금액
  isMain?: boolean; // 메인 제품 여부
  /** 단위당 원가 (Firebase에 직접 저장된 경우 우선 사용, 없으면 price/weight로 계산) */
  costPerUnit?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  category?: IngredientCategory;
  products?: ProductInfo[]; // 제품 정보 목록 (선택적)
}

export interface RecipeStep {
  id: string;
  order: number;
  description: string;
  duration?: number; // seconds
  image?: string;
  video?: string;
}

export interface RecipeHistory {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
}

export type RecipeCategory = '밥' | '메인 요리' | '사이드 요리' | '기본 반찬' | '국';

// 레시피 카테고리 색상 통합 함수
export function getRecipeCategoryColor(cat: RecipeCategory): string {
  switch (cat) {
    case '밥':
      return 'bg-yellow-100 text-yellow-800';
    case '메인 요리':
      return 'bg-red-100 text-red-800';
    case '사이드 요리':
      return 'bg-green-100 text-green-800';
    case '기본 반찬':
      return 'bg-purple-100 text-purple-800';
    case '국':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  /** 요리 대표 색 (hex, 예: 카레=노랑). 메뉴/도시락 색조합 표시용 */
  color?: string;
  targetServings: number;
  baseServings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  images: string[];
  videos: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  history: RecipeHistory[];
}

export function scaledIngredients(
  ingredients: Ingredient[],
  servings: number,
  baseServings: number
): Ingredient[] {
  const scale = servings / baseServings;
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity * scale,
  }));
}

// 목업 데이터 제거됨 - Firebase에서 실제 데이터 사용
export const sampleRecipes: Recipe[] = [];