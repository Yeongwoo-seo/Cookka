import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebase';
import { Recipe } from '@/types/recipe';
import { InventoryItem, PurchaseHistory } from '@/types/inventory';
import { DailyMenu } from '@/types/daily-menu';
import { BusinessMetrics } from '@/types/business-metrics';
import { Team, User } from '@/types/team';
import { format } from 'date-fns';

// Date를 Firestore Timestamp로 변환
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Firestore Timestamp를 Date로 변환
const timestampToDate = (timestamp: Timestamp | Date): Date => {
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
};

// ============ 레시피 관련 ============

export const getRecipes = async (): Promise<Recipe[]> => {
  // 서버 사이드에서는 빈 배열 반환
  if (typeof window === 'undefined') {
    return [];
  }
  if (!isFirebaseConfigured()) {
    return [];
  }
  try {
    const db = getDb();
    const recipesRef = collection(db, 'recipes');
    const snapshot = await getDocs(recipesRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        ingredients: data.ingredients.map((ing: any) => ({
          ...ing,
          category: ing.category || undefined,
        })),
        steps: data.steps.map((step: any) => ({
          ...step,
          duration: step.duration || undefined,
        })),
      } as Recipe;
    });
  } catch (error) {
    console.error('레시피 가져오기 오류:', error);
    return [];
  }
};

export const saveRecipe = async (recipe: Recipe): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const recipeRef = doc(db, 'recipes', recipe.id);
    const recipeData = {
      ...recipe,
      createdAt: dateToTimestamp(recipe.createdAt),
      updatedAt: dateToTimestamp(recipe.updatedAt),
    };
    await setDoc(recipeRef, recipeData, { merge: true });
  } catch (error) {
    console.error('레시피 저장 오류:', error);
    throw error;
  }
};

export const deleteRecipe = async (recipeId: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const recipeRef = doc(db, 'recipes', recipeId);
    await deleteDoc(recipeRef);
  } catch (error) {
    console.error('레시피 삭제 오류:', error);
    throw error;
  }
};

export const subscribeRecipes = (
  callback: (recipes: Recipe[]) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}; // 서버 사이드에서는 빈 함수 반환
  }
  if (!isFirebaseConfigured()) {
    return () => {}; // 빈 unsubscribe 함수 반환
  }
  const db = getDb();
  const recipesRef = collection(db, 'recipes');
  const unsubscribe = onSnapshot(recipesRef, (snapshot) => {
    const recipes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        ingredients: data.ingredients.map((ing: any) => ({
          ...ing,
          category: ing.category || undefined,
        })),
        steps: data.steps.map((step: any) => ({
          ...step,
          duration: step.duration || undefined,
        })),
      } as Recipe;
    });
    callback(recipes);
  });
  return unsubscribe;
};

// ============ 재고 관련 ============

export const getInventory = async (): Promise<InventoryItem[]> => {
  try {
    const inventoryRef = collection(getDb(), 'inventory');
    const snapshot = await getDocs(inventoryRef);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        lastUpdated: timestampToDate(data.lastUpdated),
        expirationDate: data.expirationDate ? timestampToDate(data.expirationDate) : undefined,
        purchaseHistory: (data.purchaseHistory || []).map((ph: any) => ({
          ...ph,
          purchaseDate: timestampToDate(ph.purchaseDate),
        })) as PurchaseHistory[],
      } as InventoryItem;
    });
  } catch (error) {
    console.error('재고 가져오기 오류:', error);
    return [];
  }
};

export const saveInventoryItem = async (item: InventoryItem): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const itemRef = doc(db, 'inventory', item.id);
    const itemData = {
      ...item,
      lastUpdated: dateToTimestamp(item.lastUpdated),
      expirationDate: item.expirationDate ? dateToTimestamp(item.expirationDate) : null,
      purchaseHistory: (item.purchaseHistory || []).map((ph) => ({
        ...ph,
        purchaseDate: dateToTimestamp(ph.purchaseDate),
      })),
    };
    await setDoc(itemRef, itemData, { merge: true });
  } catch (error) {
    console.error('재고 저장 오류:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (itemId: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const itemRef = doc(db, 'inventory', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('재고 삭제 오류:', error);
    throw error;
  }
};

export const subscribeInventory = (
  callback: (inventory: InventoryItem[]) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}; // 서버 사이드에서는 빈 함수 반환
  }
  if (!isFirebaseConfigured()) {
    return () => {}; // 빈 unsubscribe 함수 반환
  }
  const db = getDb();
  const inventoryRef = collection(db, 'inventory');
  const unsubscribe = onSnapshot(inventoryRef, (snapshot) => {
    const inventory = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        lastUpdated: timestampToDate(data.lastUpdated),
        expirationDate: data.expirationDate ? timestampToDate(data.expirationDate) : undefined,
        purchaseHistory: (data.purchaseHistory || []).map((ph: any) => ({
          ...ph,
          purchaseDate: timestampToDate(ph.purchaseDate),
        })) as PurchaseHistory[],
      } as InventoryItem;
    });
    callback(inventory);
  });
  return unsubscribe;
};

// ============ 일일 메뉴 관련 ============

export const getDailyMenus = async (): Promise<Map<string, DailyMenu>> => {
  if (typeof window === 'undefined') {
    return new Map(); // 서버 사이드에서는 빈 Map 반환
  }
  if (!isFirebaseConfigured()) {
    return new Map();
  }
  try {
    const db = getDb();
    const menusRef = collection(db, 'dailyMenus');
    const snapshot = await getDocs(menusRef);
    const menusMap = new Map<string, DailyMenu>();
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const menu: DailyMenu = {
        date: timestampToDate(data.date),
        recipes: data.recipes || [],
        servings: data.servings || 50,
      };
      const dateKey = format(menu.date, 'yyyy-MM-dd');
      menusMap.set(dateKey, menu);
    });
    
    return menusMap;
  } catch (error) {
    console.error('일일 메뉴 가져오기 오류:', error);
    return new Map();
  }
};

export const saveDailyMenu = async (menu: DailyMenu): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const dateKey = format(menu.date, 'yyyy-MM-dd');
    const menuRef = doc(db, 'dailyMenus', dateKey);
    const menuData = {
      date: dateToTimestamp(menu.date),
      recipes: menu.recipes,
      servings: menu.servings,
    };
    await setDoc(menuRef, menuData, { merge: true });
  } catch (error) {
    console.error('일일 메뉴 저장 오류:', error);
    throw error;
  }
};

export const subscribeDailyMenus = (
  callback: (menus: Map<string, DailyMenu>) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}; // 서버 사이드에서는 빈 함수 반환
  }
  if (!isFirebaseConfigured()) {
    return () => {}; // 빈 unsubscribe 함수 반환
  }
  const db = getDb();
  const menusRef = collection(db, 'dailyMenus');
  const unsubscribe = onSnapshot(menusRef, (snapshot) => {
    const menusMap = new Map<string, DailyMenu>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const menu: DailyMenu = {
        date: timestampToDate(data.date),
        recipes: data.recipes || [],
        servings: data.servings || 50,
      };
      const dateKey = format(menu.date, 'yyyy-MM-dd');
      menusMap.set(dateKey, menu);
    });
    callback(menusMap);
  });
  return unsubscribe;
};

// ============ 비즈니스 메트릭스 관련 ============

export const getBusinessMetrics = async (): Promise<BusinessMetrics | null> => {
  if (typeof window === 'undefined') {
    return null; // 서버 사이드에서는 null 반환
  }
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const db = getDb();
    const metricsRef = doc(db, 'businessMetrics', 'current');
    const docSnap = await getDoc(metricsRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        lastUpdated: timestampToDate(data.lastUpdated),
      } as BusinessMetrics;
    }
    return null;
  } catch (error) {
    console.error('비즈니스 메트릭스 가져오기 오류:', error);
    return null;
  }
};

export const saveBusinessMetrics = async (metrics: BusinessMetrics): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const metricsRef = doc(db, 'businessMetrics', 'current');
    const metricsData = {
      ...metrics,
      lastUpdated: dateToTimestamp(metrics.lastUpdated),
    };
    await setDoc(metricsRef, metricsData, { merge: true });
  } catch (error) {
    console.error('비즈니스 메트릭스 저장 오류:', error);
    throw error;
  }
};

// ============ 재료 가격 관련 ============

export interface IngredientPrice {
  name: string;
  unit: string;
  costPerUnit: number;
}

export const getIngredientPrices = async (): Promise<Map<string, IngredientPrice>> => {
  if (typeof window === 'undefined') {
    return new Map(); // 서버 사이드에서는 빈 Map 반환
  }
  if (!isFirebaseConfigured()) {
    return new Map();
  }
  try {
    const db = getDb();
    const pricesRef = collection(db, 'ingredientPrices');
    const snapshot = await getDocs(pricesRef);
    const pricesMap = new Map<string, IngredientPrice>();
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as IngredientPrice;
      const key = `${data.name}_${data.unit}`;
      pricesMap.set(key, data);
    });
    
    return pricesMap;
  } catch (error) {
    console.error('재료 가격 가져오기 오류:', error);
    return new Map();
  }
};

export const saveIngredientPrice = async (name: string, unit: string, costPerUnit: number): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const key = `${name}_${unit}`;
    const priceRef = doc(db, 'ingredientPrices', key);
    await setDoc(priceRef, { name, unit, costPerUnit }, { merge: true });
  } catch (error) {
    console.error('재료 가격 저장 오류:', error);
    throw error;
  }
};

// ============ 팀 설정 관련 ============

export const getTeam = async (teamId: string): Promise<Team | null> => {
  if (typeof window === 'undefined') {
    return null; // 서버 사이드에서는 null 반환
  }
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const db = getDb();
    const teamRef = doc(db, 'teams', teamId);
    const docSnap = await getDoc(teamRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        members: (data.members || []).map((member: any) => ({
          ...member,
          joinedAt: timestampToDate(member.joinedAt),
        })),
        createdAt: timestampToDate(data.createdAt),
      } as Team;
    }
    return null;
  } catch (error) {
    console.error('팀 가져오기 오류:', error);
    return null;
  }
};

export const saveTeam = async (team: Team): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const teamRef = doc(db, 'teams', team.id);
    const teamData = {
      ...team,
      members: team.members.map((member) => ({
        ...member,
        joinedAt: dateToTimestamp(member.joinedAt),
      })),
      createdAt: dateToTimestamp(team.createdAt),
    };
    await setDoc(teamRef, teamData, { merge: true });
  } catch (error) {
    console.error('팀 저장 오류:', error);
    throw error;
  }
};
