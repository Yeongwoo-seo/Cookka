import { create } from 'zustand';
import { Recipe, sampleRecipes } from '@/types/recipe';
import { InventoryItem, sampleInventory } from '@/types/inventory';
import { BusinessMetrics, sampleBusinessMetrics } from '@/types/business-metrics';
import { Team, User } from '@/types/team';
import { DailyMenu } from '@/types/daily-menu';
import { format } from 'date-fns';
// Firebase 함수는 동적으로 import하여 서버 사이드에서의 실행 방지

interface IngredientPrice {
  name: string;
  unit: string;
  costPerUnit: number;
}

interface AppState {
  currentUser: User | null;
  team: Team | null;
  recipes: Recipe[];
  inventory: InventoryItem[];
  businessMetrics: BusinessMetrics | null;
  ingredientPrices: Map<string, IngredientPrice>; // key: "name_unit"
  dailyMenuHistory: Map<string, DailyMenu>; // key: "YYYY-MM-DD"
  isFirebaseEnabled: boolean; // Firebase 사용 여부

  // Actions
  setCurrentUser: (user: User | null) => void;
  setTeam: (team: Team | null) => void;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  addRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  updateIngredientPrice: (name: string, unit: string, costPerUnit: number) => Promise<void>;
  saveDailyMenu: (menu: DailyMenu) => Promise<void>;
  loadSampleData: () => void;
  loadFromFirebase: () => Promise<void>;
  syncWithFirebase: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  team: null,
  recipes: [],
  inventory: [],
  businessMetrics: null,
  ingredientPrices: new Map(),
  dailyMenuHistory: new Map(),
  isFirebaseEnabled: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setTeam: (team) => set({ team }),

  updateRecipe: async (recipe) => {
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === recipe.id ? recipe : r)),
    }));
    // Firebase에 저장
    try {
      if (typeof window !== 'undefined') {
        const { saveRecipe } = await import('../lib/firestore');
        await saveRecipe(recipe);
      }
    } catch (error) {
      console.error('레시피 업데이트 실패:', error);
    }
  },

  addRecipe: async (recipe) => {
    set((state) => ({
      recipes: [...state.recipes, recipe],
    }));
    // Firebase에 저장
    try {
      if (typeof window !== 'undefined') {
        const { saveRecipe } = await import('../lib/firestore');
        await saveRecipe(recipe);
      }
    } catch (error) {
      console.error('레시피 추가 실패:', error);
    }
  },

  deleteRecipe: async (recipeId) => {
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== recipeId),
    }));
    // Firebase에서 삭제
    try {
      if (typeof window !== 'undefined') {
        const { deleteRecipe } = await import('../lib/firestore');
        await deleteRecipe(recipeId);
      }
    } catch (error) {
      console.error('레시피 삭제 실패:', error);
    }
  },

  updateInventoryItem: async (item) => {
    set((state) => ({
      inventory: state.inventory.map((i) => (i.id === item.id ? item : i)),
    }));
    // Firebase에 저장
    try {
      if (typeof window !== 'undefined') {
        const { saveInventoryItem } = await import('../lib/firestore');
        await saveInventoryItem(item);
      }
    } catch (error) {
      console.error('재고 업데이트 실패:', error);
    }
  },

  addInventoryItem: async (item) => {
    set((state) => ({
      inventory: [...state.inventory, item],
    }));
    // Firebase에 저장
    try {
      if (typeof window !== 'undefined') {
        const { saveInventoryItem } = await import('../lib/firestore');
        await saveInventoryItem(item);
      }
    } catch (error) {
      console.error('재고 추가 실패:', error);
    }
  },

  deleteInventoryItem: async (itemId) => {
    set((state) => ({
      inventory: state.inventory.filter((i) => i.id !== itemId),
    }));
    // Firebase에서 삭제
    try {
      if (typeof window !== 'undefined') {
        const { deleteInventoryItem } = await import('../lib/firestore');
        await deleteInventoryItem(itemId);
      }
    } catch (error) {
      console.error('재고 삭제 실패:', error);
    }
  },

  updateIngredientPrice: async (name, unit, costPerUnit) => {
    set((state) => {
      const key = `${name}_${unit}`;
      const newPrices = new Map(state.ingredientPrices);
      newPrices.set(key, { name, unit, costPerUnit });
      
      // 모든 레시피의 해당 재료 가격도 업데이트
      const updatedRecipes = state.recipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ing) =>
          ing.name === name && ing.unit === unit
            ? { ...ing, costPerUnit }
            : ing
        ),
      }));

      return {
        ingredientPrices: newPrices,
        recipes: updatedRecipes,
      };
    });
    // Firebase에 저장
    try {
      if (typeof window !== 'undefined') {
        const { saveIngredientPrice } = await import('../lib/firestore');
        await saveIngredientPrice(name, unit, costPerUnit);
      }
    } catch (error) {
      console.error('재료 가격 업데이트 실패:', error);
    }
  },

  saveDailyMenu: async (menu) => {
    set((state) => {
      const dateKey = format(menu.date, 'yyyy-MM-dd');
      const newHistory = new Map(state.dailyMenuHistory);
      newHistory.set(dateKey, menu);
      return { dailyMenuHistory: newHistory };
    });
    // Firebase에 저장
    try {
      if (typeof window !== 'undefined') {
        const { saveDailyMenu } = await import('../lib/firestore');
        await saveDailyMenu(menu);
      }
    } catch (error) {
      console.error('일일 메뉴 저장 실패:', error);
    }
  },

  loadSampleData: () => {
    // 샘플 메뉴 히스토리 생성 (오늘부터 과거 7일)
    const sampleHistory = new Map<string, DailyMenu>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = format(today, 'yyyy-MM-dd');
    
    // 오늘의 메뉴: 흰쌀밥, 제육볶음, 어묵볶음, 콩자반, 콩나물무침
    const todayRecipes = sampleRecipes.filter(r => 
      ['1', '2', '3', '4', '5'].includes(r.id)
    );
    sampleHistory.set(todayKey, {
      date: today,
      recipes: todayRecipes,
      servings: 50,
    });
    
    // 과거 날짜들은 랜덤하게 메뉴 선택
    for (let i = 1; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      // 랜덤하게 메뉴 선택 (0~5개)
      const menuCount = Math.floor(Math.random() * 6);
      if (menuCount > 0) {
        sampleHistory.set(dateKey, {
          date: date,
          recipes: sampleRecipes.slice(0, menuCount),
          servings: 50,
        });
      }
    }
    
    set({
      recipes: sampleRecipes,
      inventory: sampleInventory,
      businessMetrics: sampleBusinessMetrics,
      ingredientPrices: new Map(),
      dailyMenuHistory: sampleHistory,
    });
  },

  loadFromFirebase: async () => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      // Firebase 함수 동적 import
      const {
        getRecipes,
        getInventory,
        getDailyMenus,
        getBusinessMetrics,
        getIngredientPrices,
      } = await import('../lib/firestore');
      
      // Firebase에서 데이터 로드
      const [recipes, inventory, dailyMenus, businessMetrics, ingredientPrices] = await Promise.all([
        getRecipes(),
        getInventory(),
        getDailyMenus(),
        getBusinessMetrics(),
        getIngredientPrices(),
      ]);

      set({
        recipes,
        inventory,
        dailyMenuHistory: dailyMenus,
        businessMetrics,
        ingredientPrices,
        isFirebaseEnabled: true,
      });
    } catch (error) {
      console.error('Firebase에서 데이터 로드 실패:', error);
      // Firebase 로드 실패 시 샘플 데이터 사용
      get().loadSampleData();
    }
  },

  syncWithFirebase: () => {
    if (typeof window === 'undefined') {
      return () => {}; // 서버 사이드에서는 빈 함수 반환
    }
    
    // 실시간 동기화 설정 (동적 import)
    const unsubscribers: Array<() => void> = [];
    
    (async () => {
      try {
        const {
          subscribeRecipes,
          subscribeInventory,
          subscribeDailyMenus,
        } = await import('../lib/firestore');
        
        const unsubRecipes = subscribeRecipes((recipes) => {
          set({ recipes });
        });
        unsubscribers.push(unsubRecipes);

        const unsubInventory = subscribeInventory((inventory) => {
          set({ inventory });
        });
        unsubscribers.push(unsubInventory);

        const unsubDailyMenus = subscribeDailyMenus((dailyMenus) => {
          set({ dailyMenuHistory: dailyMenus });
        });
        unsubscribers.push(unsubDailyMenus);

        set({ isFirebaseEnabled: true });
      } catch (error) {
        console.error('Firebase 실시간 동기화 설정 실패:', error);
      }
    })();

    // 정리 함수는 컴포넌트에서 호출해야 함
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  },
}));
