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
import { Recipe, Ingredient } from '@/types/recipe';
import { InventoryItem, PurchaseHistory } from '@/types/inventory';
import { DailyMenu, RawDailyMenu } from '@/types/daily-menu';
import { BusinessMetrics } from '@/types/business-metrics';
import { Team, User } from '@/types/team';
import { format } from 'date-fns';

// Date를 Firestore Timestamp로 변환
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Firestore Timestamp를 Date로 변환
const timestampToDate = (timestamp: Timestamp | Date | any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // 이미 Date 객체이거나 다른 형태인 경우
  if (timestamp.seconds) {
    // Timestamp 형태의 객체인 경우
    return new Date(timestamp.seconds * 1000);
  }
  // 문자열이나 숫자인 경우
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  // 알 수 없는 형태인 경우 현재 날짜 반환
  console.warn('알 수 없는 timestamp 형태:', timestamp);
  return new Date();
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
        createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : new Date(),
        ingredients: Array.isArray(data.ingredients) 
          ? data.ingredients.map((ing: any) => ({
              ...ing,
              category: ing.category || undefined,
            }))
          : [],
        steps: Array.isArray(data.steps)
          ? data.steps.map((step: any) => ({
              ...step,
              duration: step.duration || undefined,
            }))
          : [],
        images: Array.isArray(data.images) ? data.images : [],
        videos: Array.isArray(data.videos) ? data.videos : [],
        notes: data.notes || '',
        history: Array.isArray(data.history) ? data.history : [],
      } as Recipe;
    });
  } catch (error) {
    console.error('레시피 가져오기 오류:', error);
    return [];
  }
};

// undefined 값을 제거하는 헬퍼 함수
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
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
    // undefined 값 제거
    const cleanedData = removeUndefined(recipeData);
    await setDoc(recipeRef, cleanedData, { merge: true });
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
        createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : new Date(),
        ingredients: Array.isArray(data.ingredients) 
          ? data.ingredients.map((ing: any) => ({
              ...ing,
              category: ing.category || undefined,
            }))
          : [],
        steps: Array.isArray(data.steps)
          ? data.steps.map((step: any) => ({
              ...step,
              duration: step.duration || undefined,
            }))
          : [],
        images: Array.isArray(data.images) ? data.images : [],
        videos: Array.isArray(data.videos) ? data.videos : [],
        notes: data.notes || '',
        history: Array.isArray(data.history) ? data.history : [],
      } as Recipe;
    });
    callback(recipes);
  }, (error) => {
    console.error('레시피 실시간 동기화 오류:', error);
  });
  return unsubscribe;
};

// ============ 재고 관련 ============

export const getInventory = async (): Promise<InventoryItem[]> => {
  // 서버 사이드에서는 빈 배열 반환
  if (typeof window === 'undefined') {
    return [];
  }
  if (!isFirebaseConfigured()) {
    return [];
  }
  try {
    const db = getDb();
    const inventoryRef = collection(db, 'inventory');
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

// ============ 일일 메뉴 관련 (Lookup: Firestore에는 recipeIds만 저장, 표시 시 recipes에서 조회) ============

export const getDailyMenus = async (): Promise<Map<string, RawDailyMenu>> => {
  if (typeof window === 'undefined') {
    return new Map();
  }
  if (!isFirebaseConfigured()) {
    return new Map();
  }
  try {
    const db = getDb();
    const menusRef = collection(db, 'dailyMenus');
    const snapshot = await getDocs(menusRef);
    const menusMap = new Map<string, RawDailyMenu>();

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const date = timestampToDate(data.date);
      const dateKey = format(date, 'yyyy-MM-dd');
      const recipeIds = Array.isArray(data.recipeIds)
        ? data.recipeIds
        : (data.recipes || []).map((r: { id?: string }) => r?.id).filter(Boolean);
      menusMap.set(dateKey, {
        date,
        recipeIds,
        servings: data.servings ?? 50,
      });
    });

    return menusMap;
  } catch (error) {
    console.error('일일 메뉴 가져오기 오류:', error);
    return new Map();
  }
};

export const saveDailyMenu = async (menu: DailyMenu): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
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
      recipeIds: menu.recipes.map((r) => r.id),
      servings: menu.servings,
    };
    await setDoc(menuRef, menuData, { merge: true });
  } catch (error) {
    console.error('일일 메뉴 저장 오류:', error);
    throw error;
  }
};

export const subscribeDailyMenus = (
  callback: (menus: Map<string, RawDailyMenu>) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  if (!isFirebaseConfigured()) {
    return () => {};
  }
  const db = getDb();
  const menusRef = collection(db, 'dailyMenus');
  const unsubscribe = onSnapshot(menusRef, (snapshot) => {
    const menusMap = new Map<string, RawDailyMenu>();
    snapshot.docs.forEach((d) => {
      const data = d.data();
      const date = timestampToDate(data.date);
      const dateKey = format(date, 'yyyy-MM-dd');
      const recipeIds = Array.isArray(data.recipeIds)
        ? data.recipeIds
        : (data.recipes || []).map((r: { id?: string }) => r?.id).filter(Boolean);
      menusMap.set(dateKey, {
        date,
        recipeIds,
        servings: data.servings ?? 50,
      });
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
    // ingredients 컬렉션에서 가격 정보 추출
    const ingredients = await getIngredients();
    const pricesMap = new Map<string, IngredientPrice>();
    
    ingredients.forEach((ingredient) => {
      const key = `${ingredient.name}_${ingredient.unit}`;
      pricesMap.set(key, {
        name: ingredient.name,
        unit: ingredient.unit,
        costPerUnit: ingredient.costPerUnit || 0
      });
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
    // ingredients 컬렉션에서 해당 재료 찾기
    const ingredients = await getIngredients();
    const matchingIngredient = ingredients.find(
      ing => ing.name === name && ing.unit === unit
    );
    
    if (matchingIngredient) {
      // 기존 재료가 있으면 costPerUnit 업데이트
      await updateIngredient(matchingIngredient.id, { costPerUnit });
      console.log(`✅ 재료 가격 업데이트: ${name}_${unit} = ${costPerUnit}`);
    } else {
      // 재료가 없으면 새로 생성
      const newIngredient: Ingredient = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        category: '기타',
        unit,
        quantity: 0,
        costPerUnit,
        products: []
      };
      await addIngredient(newIngredient);
      console.log(`✅ 새 재료 및 가격 추가: ${name}_${unit} = ${costPerUnit}`);
    }
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

// ============ 재료 데이터 관리 ============

/** Firestore 문서 → Ingredient 변환 (id, products 배열 보장) */
function docToIngredient(docSnap: { id: string; data: () => Record<string, unknown> | DocumentData }): Ingredient {
  const data = docSnap.data() as Record<string, unknown>;
  const products = Array.isArray(data?.products) ? data.products : [];
  return {
    id: docSnap.id,
    name: typeof data?.name === 'string' ? data.name : '',
    quantity: typeof data?.quantity === 'number' ? data.quantity : 0,
    unit: typeof data?.unit === 'string' ? data.unit : 'g',
    costPerUnit: typeof data?.costPerUnit === 'number' ? data.costPerUnit : 0,
    category: (data?.category as Ingredient['category']) ?? undefined,
    products: products.map((p: Record<string, unknown>) => ({
      id: typeof p?.id === 'string' ? p.id : '',
      productName: typeof p?.productName === 'string' ? p.productName : '',
      supplier: typeof p?.supplier === 'string' ? p.supplier : '',
      weight: typeof p?.weight === 'number' ? p.weight : 0,
      price: typeof p?.price === 'number' ? p.price : 0,
      isMain: p?.isMain === true,
      costPerUnit: typeof p?.costPerUnit === 'number' ? p.costPerUnit : undefined,
    })),
  };
}

export const getIngredients = async (): Promise<Ingredient[]> => {
  if (typeof window === 'undefined') {
    return []; // 서버 사이드에서는 빈 배열 반환
  }
  if (!isFirebaseConfigured()) {
    return [];
  }
  try {
    const db = getDb();
    const ingredientsRef = collection(db, 'ingredients');
    const snapshot = await getDocs(ingredientsRef);
    const ingredients: Ingredient[] = snapshot.docs.map((d) =>
      docToIngredient({ id: d.id, data: () => d.data() })
    );
    console.log(`🔍 Firebase에서 ${ingredients.length}개 재료 로드 완료`);
    return ingredients;
  } catch (error) {
    console.error('재료 가져오기 오류:', error);
    return [];
  }
};

/** 재료 컬렉션 실시간 구독 (원가관리-재료 탭 동기화용) */
export const subscribeIngredients = (callback: (ingredients: Ingredient[]) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  if (!isFirebaseConfigured()) {
    return () => {};
  }
  try {
    const db = getDb();
    const ingredientsRef = collection(db, 'ingredients');
    const unsubscribe = onSnapshot(ingredientsRef, (snapshot) => {
      const ingredients: Ingredient[] = snapshot.docs.map((d) =>
        docToIngredient({ id: d.id, data: () => d.data() })
      );
      callback(ingredients);
    });
    return unsubscribe;
  } catch (error) {
    console.error('subscribeIngredients 오류:', error);
    return () => {};
  }
};

export const addIngredient = async (ingredient: Ingredient): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  try {
    const db = getDb();
    const ingredientRef = doc(db, 'ingredients', ingredient.id);
    // merge 옵션을 사용하여 기존 데이터를 보존
    await setDoc(ingredientRef, ingredient, { merge: true });
    console.log(`✅ 재료가 추가되었습니다: ${ingredient.name}`);
  } catch (error) {
    console.error('재료 추가 실패:', error);
    throw error;
  }
};

export const uploadIngredients = async (ingredients: Ingredient[]): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  
  try {
    const db = getDb();
    const uploadPromises = ingredients.map(async (ingredient) => {
      const ingredientRef = doc(db, 'ingredients', ingredient.id);
      await setDoc(ingredientRef, ingredient, { merge: true });
      console.log(`✅ 재료 업로드 완료: ${ingredient.name}`);
    });
    
    await Promise.all(uploadPromises);
    console.log(`🎉 모든 재료 업로드 완료! 총 ${ingredients.length}개`);
  } catch (error) {
    console.error('재료 업로드 오류:', error);
    throw error;
  }
};

export const deleteIngredient = async (ingredientId: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const ingredientRef = doc(db, 'ingredients', ingredientId);
    await deleteDoc(ingredientRef);
    console.log(`🗑️ Firebase에서 재료 삭제 완료: ${ingredientId}`);
  } catch (error) {
    console.error('재료 삭제 오류:', error);
    throw error;
  }
};

export const deleteIngredientPrice = async (name: string, unit: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    // ingredients 컬렉션에서 해당 재료 찾아서 costPerUnit을 0으로 설정
    const ingredients = await getIngredients();
    const matchingIngredient = ingredients.find(
      ing => ing.name === name && ing.unit === unit
    );
    
    if (matchingIngredient) {
      await updateIngredient(matchingIngredient.id, { costPerUnit: 0 });
      console.log(`🗑️ 재료 가격 초기화: ${name}_${unit}`);
    }
  } catch (error) {
    console.error('재료 가격 삭제 오류:', error);
    throw error;
  }
};

export const updateIngredient = async (ingredientId: string, updates: Partial<Ingredient>): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // 서버 사이드에서는 무시
  }
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  try {
    const db = getDb();
    const ingredientRef = doc(db, 'ingredients', ingredientId);
    await updateDoc(ingredientRef, updates);
    console.log(`✅ Firebase에서 재료 업데이트 완료: ${ingredientId}`);
  } catch (error) {
    console.error('재료 업데이트 오류:', error);
    throw error;
  }
};
