'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { uploadIngredients, getIngredients, subscribeIngredients, deleteIngredient, deleteIngredientPrice, updateIngredient, addIngredient } from '@/lib/firestore';
import {
  calculateMenuProfit,
  calculateMenuProfitMargin,
} from '@/types/business-metrics';
import { Ingredient, IngredientCategory, ProductInfo, Recipe, RecipeCategory, getRecipeCategoryColor } from '@/types/recipe';
import { format } from 'date-fns';
import AddRecipeModal from './AddRecipeModal';

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'category';

// 재료 이름을 기반으로 카테고리 분류
const getIngredientCategory = (name: string): IngredientCategory => {
  const lowerName = name.toLowerCase();
  
  // 조미료
  if (['간장', '고추장', '된장', '설탕', '소금', '고춧가루', '참기름', '식용유', '마늘', '생강'].some(ing => lowerName.includes(ing))) {
    return '조미료';
  }
  
  // 육류
  if (['고기', '돼지', '소고기', '닭', '앞다리살', '삼겹살', '목살'].some(ing => lowerName.includes(ing))) {
    return '육류';
  }
  
  // 채소
  if (['양파', '대파', '당근', '애호박', '시금치', '콩나물', '두부', '김치'].some(ing => lowerName.includes(ing))) {
    return '채소';
  }
  
  // 곡물
  if (['쌀', '밥', '콩', '검은콩'].some(ing => lowerName.includes(ing))) {
    return '곡물';
  }
  
  return '기타';
};

const recipeCategories: RecipeCategory[] = ['밥', '메인 요리', '사이드 요리', '기본 반찬', '국'];

/** 숫자 포맷팅: .0이면 정수로 표시, 천 단위 구분자 추가 */
function formatNumber(num: number, decimals: number = 1): string {
  const fixed = num.toFixed(decimals);
  const numValue = parseFloat(fixed);
  const baseValue = numValue % 1 === 0 ? numValue.toString() : fixed;
  // 천 단위 구분자 추가
  const parts = baseValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/** 제품별 단위당 원가 (Firebase product.costPerUnit 우선, 없으면 price/weight) */
function getProductCostPerUnit(p: ProductInfo): number {
  if (typeof p.costPerUnit === 'number' && p.costPerUnit > 0) return p.costPerUnit;
  if (p.weight > 0) return p.price / p.weight;
  return 0;
}

/** products 배열에서 단위당 원가 도출 (메인 제품 또는 가장 저렴한 제품). product.costPerUnit 우선 사용. products가 없으면 0 반환 */
function getEffectiveCostPerUnit(
  ing: Ingredient,
  productsMap?: Map<string, ProductInfo[]>
): number {
  const key = `${ing.name}_${ing.unit}`;
  const products = productsMap?.get(key) ?? ing.products ?? [];
  if (products.length > 0) {
    const main = products.find((p) => p.isMain);
    const src = main ?? products[0];
    if (src) {
      const cost = getProductCostPerUnit(src);
      if (cost > 0) return cost;
    }
    const sorted = [...products]
      .map((p) => ({ p, cost: getProductCostPerUnit(p) }))
      .filter((x) => x.cost > 0)
      .sort((a, b) => a.cost - b.cost);
    if (sorted.length > 0) return sorted[0].cost;
  }
  // products가 없으면 가격 표시 안 함 (0 반환)
  return 0;
}

export default function MenuAnalysisView() {
  const businessMetrics = useAppStore((state) => state.businessMetrics);
  const recipes = useAppStore((state) => state.recipes);
  const ingredientPrices = useAppStore((state) => state.ingredientPrices);
  const updateIngredientPrice = useAppStore((state) => state.updateIngredientPrice);
  const updateRecipe = useAppStore((state) => state.updateRecipe);
  const addRecipe = useAppStore((state) => state.addRecipe);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | '전체'>('전체');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'재료' | '메뉴'>('메뉴');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  
  // 레시피 보드 관련 상태
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // 필요 재료: 전부 수정 모드 (recipeId) / 전부 수정용 데이터
  const [editingRecipeIngredientsId, setEditingRecipeIngredientsId] = useState<string | null>(null);
  const [editAllIngredientsData, setEditAllIngredientsData] = useState<{ id: string; name: string; quantity: string; unit: string }[]>([]);
  const [editingBaseServings, setEditingBaseServings] = useState<string>('');
  // 필요 재료: 선택 삭제 모드 (recipeId) / 선택된 재료 id 집합
  const [deleteSelectRecipeId, setDeleteSelectRecipeId] = useState<string | null>(null);
  const [selectedIngredientIdsForDelete, setSelectedIngredientIdsForDelete] = useState<Set<string>>(new Set());
  // 조리단계 수정 모드
  const [editingRecipeStepsId, setEditingRecipeStepsId] = useState<string | null>(null);
  const [editStepsData, setEditStepsData] = useState<{ id: string; order: number; description: string }[]>([]);
  
  // 저장 상태 관리
  const [savingPrices, setSavingPrices] = useState<Set<string>>(new Set());
  const [saveMessages, setSaveMessages] = useState<Map<string, { type: 'success' | 'error'; message: string }>>(new Map());
  
  // 재료 편집 상태
  const [editingIngredientKey, setEditingIngredientKey] = useState<string | null>(null);
  const [editingIngredientData, setEditingIngredientData] = useState<{ name: string; category: IngredientCategory }>({ name: '', category: '기타' });
  
  // 제품 정보 편집 상태
  const [editingProductsData, setEditingProductsData] = useState<Map<string, { productName: string; supplier: string; unitPrice: string }>>(new Map());

  
  
  // 재료 데이터 업로드 상태 (UI에서 제거되어 더 이상 필요 없음)
  
  // Firebase 재료 데이터 상태
  const [firebaseIngredients, setFirebaseIngredients] = useState<Ingredient[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  
  // 메뉴 탭으로 전환할 때 선택된 레시피 초기화
  useEffect(() => {
    if (activeTab === '메뉴') {
      // 메뉴 탭으로 전환할 때는 선택 해제
      setSelectedRecipe(null);
    }
  }, [activeTab]);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState<RecipeCategory | '전체'>('전체');
  const [recipeSortBy, setRecipeSortBy] = useState<'name' | 'cost-asc' | 'cost-desc' | 'category'>('name');
  
  // 제품 정보 관리 (key: ingredientKey, value: ProductInfo[])
  const [ingredientProducts, setIngredientProducts] = useState<Map<string, ProductInfo[]>>(new Map());
  
  // 제품 추가 입력 상태
  const [newProductInputs, setNewProductInputs] = useState<Map<string, { productName: string; supplier: string; unitPrice: string }>>(new Map());
  
  // 재료 추가 인라인 모드
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [newIngredientData, setNewIngredientData] = useState({ name: '', category: '기타' as IngredientCategory, unit: 'g' });

  // 재료는 원가관리에서 먼저 등록한 것만 표시 (Firebase 전용). 레시피는 이 목록을 Lookup
  const allIngredients = useMemo(() => {
    return firebaseIngredients.map((ing) => ({
      ...ing,
      category: ing.category || getIngredientCategory(ing.name),
    }));
  }, [firebaseIngredients]);

  // allIngredients가 변경될 때 제품 정보 초기화
  useEffect(() => {
    const map = new Map<string, ProductInfo[]>();
    allIngredients.forEach((ing) => {
      const key = `${ing.name}_${ing.unit}`;
      if (ing.products && ing.products.length > 0) {
        map.set(key, ing.products);
      }
    });
    setIngredientProducts((prev) => {
      // 기존 데이터와 병합 (새로 추가된 제품은 유지)
      const merged = new Map(prev);
      map.forEach((products, key) => {
        if (!merged.has(key)) {
          merged.set(key, products);
        }
      });
      return merged;
    });
  }, [allIngredients]);

  // 원가관리 가격 숫자: products 배열에서만 costPerUnit 참조 (products가 없으면 0)
  useEffect(() => {
    const next = new Map<string, number>();
    allIngredients.forEach((ing) => {
      const key = `${ing.name}_${ing.unit}`;
      const products = ing.products ?? [];
      // products가 있을 때만 가격 저장
      if (products.length > 0) {
        const cost = getEffectiveCostPerUnit(ing);
        if (cost > 0) {
          next.set(key, cost);
        }
      }
    });
    setLocalPrices(next);
  }, [allIngredients]);

  // 고유한 카테고리 목록 (순서: 육류, 채소, 조미료, 곡물, 기타)
  const uniqueCategories = useMemo(() => {
    const categoryOrder: IngredientCategory[] = ['육류', '채소', '조미료', '곡물', '기타'];
    const categories = new Set<IngredientCategory>();
    allIngredients.forEach((ing) => {
      if (ing.category) {
        categories.add(ing.category);
      }
    });
    return categoryOrder.filter(cat => categories.has(cat));
  }, [allIngredients]);

  const [localPrices, setLocalPrices] = useState<Map<string, number>>(new Map());

  // 필터링 및 정렬된 재료 목록
  const filteredAndSortedIngredients = useMemo(() => {
    let filtered = allIngredients.filter((ing) => {
      const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '전체' || ing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // 정렬 (가격은 products 기준 costPerUnit 사용)
    filtered = [...filtered].sort((a, b) => {
      const keyA = `${a.name}_${a.unit}`;
      const keyB = `${b.name}_${b.unit}`;
      const priceA = localPrices.get(keyA) ?? getEffectiveCostPerUnit(a, ingredientProducts);
      const priceB = localPrices.get(keyB) ?? getEffectiveCostPerUnit(b, ingredientProducts);

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'category':
          const categoryA = a.category || '기타';
          const categoryB = b.category || '기타';
          return categoryA.localeCompare(categoryB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allIngredients, searchQuery, selectedCategory, sortBy, localPrices, ingredientProducts]);

  const handlePriceChange = (name: string, unit: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const key = `${name}_${unit}`;
    setLocalPrices((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, numValue);
      return newMap;
    });
  };

  const handlePriceBlur = async (name: string, unit: string) => {
    const key = `${name}_${unit}`;
    const price = localPrices.get(key) ?? 0;
    
    console.log('💾 재료 가격 저장 시도:', { name, unit, price });
    
    // 저장 중 상태 설정
    setSavingPrices(prev => new Set(prev).add(key));
    
    try {
      await updateIngredientPrice(name, unit, price);
      console.log('✅ 재료 가격 저장 성공:', key);
      // 성공 피드백
      setSaveMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(key, { type: 'success', message: '저장됨' });
        return newMap;
      });
      
      // 2초 후 메시지 제거
      setTimeout(() => {
        setSaveMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ 재료 가격 저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorCode = (error as any)?.code;
      console.error('오류 상세:', errorMessage, errorCode);
      // 에러 피드백
      setSaveMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(key, { type: 'error', message: `저장 실패: ${errorCode || errorMessage}` });
        return newMap;
      });
      
      // 5초 후 에러 메시지 제거 (디버깅을 위해 더 길게)
      setTimeout(() => {
        setSaveMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      }, 5000);
    } finally {
      // 저장 중 상태 제거
      setSavingPrices(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const handleAddProduct = async (ingredientKey: string) => {
    const input = newProductInputs.get(ingredientKey);
    if (!input || !input.productName.trim() || !input.supplier.trim() || !input.unitPrice.trim()) {
      return;
    }

    const unitPricePerKg = parseFloat(input.unitPrice);
    if (isNaN(unitPricePerKg) || unitPricePerKg <= 0) {
      return;
    }
    const costPerUnit = unitPricePerKg; // $/kg 단위로 저장 (변환 없이)

    const newProduct: ProductInfo = {
      id: `${ingredientKey}_${Date.now()}`,
      productName: input.productName.trim(),
      supplier: input.supplier.trim(),
      weight: 1,
      price: costPerUnit,
      costPerUnit,
    };

    try {
      // ingredientKey에서 이름과 단위 추출
      const [ingredientName, ingredientUnit] = ingredientKey.split('_');
      
      // Firebase에서 해당 재료 찾기
      const matchingFirebaseIngredient = firebaseIngredients.find(
        ing => ing.name === ingredientName && ing.unit === ingredientUnit
      );

      // 현재 제품 목록에 새 제품 추가
      const existingProducts = ingredientProducts.get(ingredientKey) || [];
      const updatedProducts = [...existingProducts, newProduct];

      // 가장 싼 제품을 메인으로 설정
      const sortedProducts = [...updatedProducts]
        .map((p) => ({ p, cost: getProductCostPerUnit(p) }))
        .filter((x) => x.cost > 0)
        .sort((a, b) => a.cost - b.cost);
      
      if (sortedProducts.length > 0) {
        // 모든 제품의 isMain을 false로 설정하고, 가장 싼 제품만 true로 설정
        updatedProducts.forEach((p) => {
          p.isMain = p.id === sortedProducts[0].p.id;
        });
      }

      // Firebase에서 재료 정보 업데이트
      if (matchingFirebaseIngredient) {
        await updateIngredient(matchingFirebaseIngredient.id, {
          products: updatedProducts
        });
        console.log(`✅ Firebase 제품 추가 완료: ${newProduct.productName}`);
        if (sortedProducts.length > 0 && newProduct.id === sortedProducts[0].p.id) {
          console.log(`  💰 가장 싼 제품으로 메인 설정: ${newProduct.productName} ($${sortedProducts[0].cost}/kg)`);
        }
      }

      // 로컬 상태 업데이트
      setIngredientProducts((prev) => {
        const newMap = new Map(prev);
        newMap.set(ingredientKey, updatedProducts);
        return newMap;
      });

      // 입력 필드 초기화
      setNewProductInputs((prev) => {
        const newMap = new Map(prev);
        newMap.set(ingredientKey, { productName: '', supplier: '', unitPrice: '' });
        return newMap;
      });

      // Firebase 재료 목록 새로고침
      await loadFirebaseIngredients();

      console.log(`✅ 제품 추가 완료: ${newProduct.productName}`);

    } catch (error) {
      console.error('제품 추가 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`제품 추가에 실패했습니다: ${errorMessage}`);
    }
  };

  const handleProductInputChange = (ingredientKey: string, field: 'productName' | 'supplier' | 'unitPrice', value: string) => {
    setNewProductInputs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(ingredientKey) || { productName: '', supplier: '', unitPrice: '' };
      newMap.set(ingredientKey, { ...current, [field]: value });
      return newMap;
    });
  };

  // 제품 삭제 함수
  const handleDeleteProduct = async (ingredientKey: string, productId: string) => {
    if (!confirm('이 제품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // ingredientKey에서 이름과 단위 추출 (예: "간장_L" -> ["간장", "L"])
      const [ingredientName, ingredientUnit] = ingredientKey.split('_');
      
      // Firebase에서 해당 재료 찾기
      const matchingFirebaseIngredient = firebaseIngredients.find(
        ing => ing.name === ingredientName && ing.unit === ingredientUnit
      );

      // 로컬 상태에서 업데이트할 제품 목록 준비
      const currentProducts = ingredientProducts.get(ingredientKey) || [];
      const updatedProducts = currentProducts.filter(p => p.id !== productId);
      
      // 삭제된 제품이 메인이었다면 가장 싼 제품을 메인으로 설정
      const deletedProduct = currentProducts.find(p => p.id === productId);
      if (deletedProduct?.isMain && updatedProducts.length > 0) {
        // 가장 싼 제품 찾기
        const sortedProducts = [...updatedProducts]
          .map((p) => ({ p, cost: getProductCostPerUnit(p) }))
          .filter((x) => x.cost > 0)
          .sort((a, b) => a.cost - b.cost);
        
        if (sortedProducts.length > 0) {
          // 모든 제품의 isMain을 false로 설정하고, 가장 싼 제품만 true로 설정
          updatedProducts.forEach((p) => {
            p.isMain = p.id === sortedProducts[0].p.id;
          });
        } else {
          // 원가 정보가 없으면 첫 번째 제품을 메인으로 설정
          updatedProducts[0].isMain = true;
        }
      }

      // Firebase에서 재료 정보 업데이트
      if (matchingFirebaseIngredient) {
        await updateIngredient(matchingFirebaseIngredient.id, {
          products: updatedProducts
        });
        console.log(`✅ Firebase 제품 삭제 완료: ${productId}`);
      }

      // 로컬 상태 업데이트
      setIngredientProducts((prev) => {
        const newMap = new Map(prev);
        if (updatedProducts.length > 0) {
          newMap.set(ingredientKey, updatedProducts);
        } else {
          newMap.delete(ingredientKey);
        }
        return newMap;
      });

      // Firebase 재료 목록 새로고침
      await loadFirebaseIngredients();

      console.log(`🗑️ 제품 삭제 완료: ${productId}`);
      
    } catch (error) {
      console.error('제품 삭제 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`제품 삭제에 실패했습니다: ${errorMessage}`);
    }
  };
  
  // Firebase에서 재료 데이터 로드
  const loadFirebaseIngredients = async () => {
    setIsLoadingIngredients(true);
    try {
      const ingredients = await getIngredients();
      setFirebaseIngredients(ingredients);
      console.log(`✅ Firebase 재료 데이터 로드 완료: ${ingredients.length}개`);
    } catch (error) {
      console.error('Firebase 재료 로드 실패:', error);
      setFirebaseIngredients([]);
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  // 새 재료 추가
  const handleAddIngredient = async () => {
    if (!newIngredientData.name.trim()) {
      alert('재료명을 입력해주세요.');
      return;
    }

    try {
      // 중복 체크: 같은 이름과 단위의 재료가 이미 있는지 확인
      const key = `${newIngredientData.name}_${newIngredientData.unit}`;
      const existingIngredient = firebaseIngredients.find(
        ing => ing.name === newIngredientData.name && ing.unit === newIngredientData.unit
      );
      
      if (existingIngredient) {
        alert(`이미 "${newIngredientData.name} (${newIngredientData.unit})" 재료가 존재합니다.`);
        return;
      }

      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: newIngredientData.name,
        category: newIngredientData.category,
        unit: newIngredientData.unit,
        quantity: 0, // 기본값
        costPerUnit: 0, // 기본값
        products: []
      };

      // Firebase에 저장 (merge 옵션 사용하여 기존 데이터 보존)
      await addIngredient(newIngredient);

      // 입력 초기화
      setNewIngredientData({ name: '', category: '기타', unit: 'g' }); // unit은 항상 'g'로 고정

      // 데이터 새로고침
      await loadFirebaseIngredients();
      
      alert('재료가 추가되었습니다.');
    } catch (error) {
      console.error('재료 추가 실패:', error);
      alert('재료 추가에 실패했습니다.');
    }
  };

  // Firebase 재료 실시간 구독 (원가관리-재료 탭 동기화)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsLoadingIngredients(true);
    const unsubscribe = subscribeIngredients((ingredients) => {
      setFirebaseIngredients(ingredients);
      setIsLoadingIngredients(false);
    });
    return () => unsubscribe();
  }, []);

  // 재료 편집 시작
  const handleStartEditIngredient = (ingredient: Ingredient) => {
    const key = `${ingredient.name}_${ingredient.unit}`;
    setEditingIngredientKey(key);
    setEditingIngredientData({
      name: ingredient.name,
      category: ingredient.category || '기타'
    });
    
    // 제품 정보도 편집 모드로 설정
    const products = ingredientProducts.get(key) || ingredient.products || [];
    const productsEditData = new Map<string, { productName: string; supplier: string; unitPrice: string }>();
    
    products.forEach(product => {
      const costPerG = getProductCostPerUnit(product);
      const unitPricePerKg = costPerG > 0 ? costPerG * 1000 : 0; // 원/g → 원/kg 표시
      productsEditData.set(product.id, {
        productName: product.productName,
        supplier: product.supplier,
        unitPrice: unitPricePerKg > 0 ? unitPricePerKg.toString() : '0'
      });
    });
    
    setEditingProductsData(productsEditData);
  };

  // 재료 편집 저장
  const handleSaveEditIngredient = async (oldKey: string, ingredient: Ingredient) => {
    if (!editingIngredientData.name.trim()) {
      alert('재료 이름을 입력해주세요.');
      return;
    }

    const newKey = `${editingIngredientData.name}_${ingredient.unit}`;
    
    try {
      // 기존 가격 정보 가져오기
      const oldPrice = localPrices.get(oldKey) ?? ingredient.costPerUnit;
      
      // Firebase에서 재료 정보 업데이트
      const matchingFirebaseIngredient = firebaseIngredients.find(
        ing => ing.name === ingredient.name && ing.unit === ingredient.unit
      );
      
      if (matchingFirebaseIngredient) {
        // ingredients 컬렉션에서 재료 정보 업데이트
        await updateIngredient(matchingFirebaseIngredient.id, {
          name: editingIngredientData.name,
          category: editingIngredientData.category,
        });
        
        // 이름이 변경된 경우 가격 정보도 업데이트
        if (oldKey !== newKey) {
          // 기존 가격 삭제
          await deleteIngredientPrice(ingredient.name, ingredient.unit);
          // 새 가격 추가
          await updateIngredientPrice(editingIngredientData.name, ingredient.unit, oldPrice);
          
          // 로컬 상태에서도 업데이트
          setLocalPrices(prev => {
            const newMap = new Map(prev);
            newMap.delete(oldKey);
            newMap.set(newKey, oldPrice);
            return newMap;
          });
        }
        
        console.log(`✅ Firebase 재료 정보 업데이트: ${ingredient.name} → ${editingIngredientData.name}`);
        
        // Firebase 재료 목록 새로고침
        await loadFirebaseIngredients();
      } else {
        // Firebase에 없는 재료인 경우 로컬에서만 처리
        console.log(`⚠️ Firebase에 없는 재료: ${ingredient.name}_${ingredient.unit} (로컬에서만 처리)`);
        
        if (oldKey !== newKey) {
          await updateIngredientPrice(editingIngredientData.name, ingredient.unit, oldPrice);
          
          setLocalPrices(prev => {
            const newMap = new Map(prev);
            newMap.delete(oldKey);
            newMap.set(newKey, oldPrice);
            return newMap;
          });
        }
      }
      
      // 제품 정보 저장
      const updatedProducts: ProductInfo[] = [];
      const existingProducts = ingredientProducts.get(oldKey) || ingredient.products || [];
      
          existingProducts.forEach(product => {
        const editData = editingProductsData.get(product.id);
        if (editData) {
          const unitPricePerKg = parseFloat(editData.unitPrice) || 0;
          const costPerUnit = unitPricePerKg; // $/kg 단위로 저장 (변환 없이)
          updatedProducts.push({
            ...product,
            productName: editData.productName.trim() || product.productName,
            supplier: editData.supplier.trim() || product.supplier,
            price: costPerUnit * product.weight,
            costPerUnit,
          });
        } else {
          updatedProducts.push(product);
        }
      });
      
      // Firebase에 제품 정보 저장 (이미 찾은 matchingFirebaseIngredient 재사용)
      if (matchingFirebaseIngredient) {
        // 재료 이름이 변경된 경우 새 이름으로 다시 찾기
        const finalMatchingIngredient = oldKey !== newKey 
          ? firebaseIngredients.find(ing => ing.name === editingIngredientData.name && ing.unit === ingredient.unit)
          : matchingFirebaseIngredient;
        
        if (finalMatchingIngredient) {
          await updateIngredient(finalMatchingIngredient.id, {
            products: updatedProducts
          });
          console.log(`✅ Firebase 제품 정보 업데이트 완료: ${ingredient.name}`);
        }
      }
      
      // 로컬 제품 정보 상태 업데이트
      setIngredientProducts(prev => {
        const newMap = new Map(prev);
        if (oldKey !== newKey) {
          // 키가 변경된 경우 기존 키는 삭제하고 새 키로 설정
          newMap.delete(oldKey);
        }
        newMap.set(newKey, updatedProducts);
        return newMap;
      });
      
      // Firebase 재료 목록 새로고침
      await loadFirebaseIngredients();
      
      setEditingIngredientKey(null);
      setEditingIngredientData({ name: '', category: '기타' });
      setEditingProductsData(new Map());
      // 저장 후에는 펼쳐진 상태 유지
      
    } catch (error) {
      console.error('재료 편집 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`재료 편집에 실패했습니다: ${errorMessage}`);
    }
  };

  // 재료 편집 취소
  const handleCancelEditIngredient = () => {
    setEditingIngredientKey(null);
    setEditingIngredientData({ name: '', category: '기타' });
    setEditingProductsData(new Map());
    // 편집 취소 시 펼쳐진 상태도 닫기
    setExpandedIngredient(null);
  };



  // 재료 삭제
  const handleDeleteIngredient = async (ingredient: Ingredient) => {
    const key = `${ingredient.name}_${ingredient.unit}`;
    
    if (!confirm(`"${ingredient.name}" 재료를 삭제하시겠습니까?\n관련된 가격 정보도 모두 삭제됩니다.`)) {
      return;
    }

    try {
      // 로컬 상태에서 제거
      setLocalPrices(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });

      // 제품 정보도 제거
      setIngredientProducts(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });

      console.log(`🗑️ 재료 삭제: ${ingredient.name}`);
      
      // 상태 초기화
      setExpandedIngredient(null);
      setEditingIngredientKey(null);
      
      // Firebase에서 재료 삭제 (ID로 정확히 매칭)
      try {
        // ingredients 컬렉션에서 해당 재료 ID로 찾아서 삭제
        const matchingFirebaseIngredient = firebaseIngredients.find(
          ing => ing.id === ingredient.id || (ing.name === ingredient.name && ing.unit === ingredient.unit)
        );
        
        if (matchingFirebaseIngredient) {
          await deleteIngredient(matchingFirebaseIngredient.id);
          console.log(`🗑️ Firebase 재료 삭제 완료: ${ingredient.name}_${ingredient.unit} (ID: ${matchingFirebaseIngredient.id})`);
          
          // 가격 정보도 초기화 (ingredients 컬렉션의 costPerUnit을 0으로 설정)
          await deleteIngredientPrice(ingredient.name, ingredient.unit);
        } else {
          console.warn(`⚠️ Firebase에서 재료를 찾을 수 없음: ${ingredient.name}_${ingredient.unit}`);
        }
        
        // Firebase 재료 목록 새로고침
        await loadFirebaseIngredients();
        
      } catch (error) {
        console.error('Firebase 재료 삭제 실패:', error);
        // Firebase 삭제 실패해도 로컬에서는 제거된 상태 유지
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        alert(`Firebase에서 재료 삭제에 실패했습니다: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('재료 삭제 실패:', error);
      alert('재료 삭제에 실패했습니다.');
    }
  };

  // 재료 데이터 Firebase 업로드 함수 제거됨 (UI에서 제거)

  // 단위당 가격 계산 ($/g 기준). products 배열에서 costPerUnit 참조
  const getPricePerUnit = (ingredient: Ingredient): number => {
    const key = `${ingredient.name}_${ingredient.unit}`;
    const price = localPrices.get(key) ?? getEffectiveCostPerUnit(ingredient, ingredientProducts);
    const u = (ingredient.unit || 'g').toLowerCase();
    if (u === 'kg' || u === 'l') return price / 1000; // $/kg 또는 $/L → $/g
    return price;
  };

  // 1인당 원가 계산 (재료 단가는 products 기준 costPerUnit 사용)
  const calculateCostPerServing = (recipe: Recipe): number => {
    const totalCost = recipe.ingredients.reduce((sum, ing) => {
      const matching = allIngredients.find((i) => i.name === ing.name && i.unit === ing.unit);
      const cost = localPrices.get(`${ing.name}_${ing.unit}`) ?? getEffectiveCostPerUnit(matching ?? ing, ingredientProducts);
      return sum + cost * ing.quantity;
    }, 0);
    return totalCost / recipe.baseServings;
  };

  // 재료 카테고리 색상 매핑
  const getIngredientCategoryColor = (category: IngredientCategory): string => {
    switch (category) {
      case '육류':
        return 'bg-red-100 text-red-800';
      case '곡물':
        return 'bg-yellow-100 text-yellow-800';
      case '채소':
        return 'bg-green-100 text-green-800';
      case '조미료':
        return 'bg-blue-100 text-blue-800';
      case '기타':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };


  // 필터링 및 정렬된 레시피 목록
  const filteredRecipes = useMemo(() => {
    let filtered = recipes.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(recipeSearchQuery.toLowerCase());
      const matchesCategory = selectedRecipeCategory === '전체' || recipe.category === selectedRecipeCategory;
      return matchesSearch && matchesCategory;
    });

    // 정렬
    filtered = [...filtered].sort((a, b) => {
      const costA = calculateCostPerServing(a);
      const costB = calculateCostPerServing(b);

      switch (recipeSortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cost-asc':
          return costA - costB;
        case 'cost-desc':
          return costB - costA;
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [recipes, recipeSearchQuery, selectedRecipeCategory, recipeSortBy]);

  // 필터링된 레시피가 변경되면 선택된 레시피가 필터링 결과에 없으면 선택 해제
  useEffect(() => {
    if (selectedRecipe) {
      const isSelectedInFiltered = filteredRecipes.find(r => r.id === selectedRecipe.id);
      if (!isSelectedInFiltered) {
        setSelectedRecipe(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecipes]);

  // businessMetrics가 없을 경우 기본값 사용
  const metrics = businessMetrics || {
    todayRevenue: 0,
    todayCost: 0,
    menuPerformance: [],
    productionCount: 0,
    lastUpdated: new Date(),
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto px-4 pt-4 pb-6">
      {/* 재료 가격 입력 섹션 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-full overflow-hidden">
        {/* 탭 슬라이더 - 고정 */}
        <div className="relative flex items-center mb-4 pb-2 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('메뉴')}
            className={`flex-1 relative pb-2 text-base font-medium transition-colors duration-300 text-center z-10 ${
              activeTab === '메뉴'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            메뉴 원가
          </button>
          <button
            onClick={() => setActiveTab('재료')}
            className={`flex-1 relative pb-2 text-base font-medium transition-colors duration-300 text-center z-10 ${
              activeTab === '재료'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            재료 가격
          </button>
          {/* 슬라이딩 밑줄 */}
          <span 
            className={`absolute bottom-0 h-0.5 bg-gray-900 transition-all duration-300 ease-in-out ${
              activeTab === '메뉴' ? 'left-0' : 'left-1/2'
            }`}
            style={{ width: '50%' }}
          ></span>
        </div>

        {/* 재료 탭 내용 */}
        {activeTab === '재료' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* 필터 및 검색 - 고정 */}
            <div className="mb-6 space-y-4 flex-shrink-0">
              {/* 검색 */}
              <div>
                <input
                  type="text"
                  placeholder="재료명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                />
              </div>

              {/* 필터: 카테고리 버튼 | 정렬 셀렉트 | 삭제 버튼 (텍스트 없음) */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCategory('전체')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategory === '전체'
                          ? 'bg-[#4D99CC] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      전체
                    </button>
                    {uniqueCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-[#4D99CC] text-white'
                            : `${getIngredientCategoryColor(category)} hover:opacity-80`
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                    title="정렬"
                  >
                    <option value="name">이름순</option>
                    <option value="price-asc">가격 낮은순</option>
                    <option value="price-desc">가격 높은순</option>
                    <option value="category">카테고리순</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDeleteMode(!isDeleteMode);
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    title={isDeleteMode ? '삭제 모드 끄기' : '삭제 모드'}
                  >
                    {isDeleteMode ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingIngredient(true);
                      setNewIngredientData({ name: '', category: '기타', unit: 'g' });
                    }}
                    className="px-3 py-1.5 bg-[#4D99CC] text-white rounded-lg text-sm font-medium hover:bg-[#3d89bc] transition-colors"
                    title="재료 추가"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>

            {/* 재료 목록 - 스크롤 가능 영역 */}
            {filteredAndSortedIngredients.length === 0 && !isAddingIngredient ? (
              <div className="text-center py-12 flex-1 flex items-center justify-center">
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6">
                {/* 새 재료 추가 입력 행 */}
                {isAddingIngredient && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-[#4D99CC] shadow-md p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select
                        value={newIngredientData.category}
                        onChange={(e) => setNewIngredientData(prev => ({ ...prev, category: e.target.value as IngredientCategory }))}
                        className="px-4 py-2.5 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#4D99CC] focus:border-[#4D99CC] transition-all font-medium"
                        title="카테고리 선택"
                      >
                        <option value="육류">육류</option>
                        <option value="채소">채소</option>
                        <option value="조미료">조미료</option>
                        <option value="기타">기타</option>
                      </select>
                      <input
                        type="text"
                        value={newIngredientData.name}
                        onChange={(e) => setNewIngredientData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="재료명을 입력하세요"
                        className="flex-1 px-4 py-2.5 text-sm sm:text-base border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#4D99CC] focus:border-[#4D99CC] transition-all"
                        title="재료명"
                        autoFocus
                      />
                      <div className="flex gap-2 sm:gap-3">
                        <button
                          onClick={async () => {
                            await handleAddIngredient();
                            setIsAddingIngredient(false);
                          }}
                          className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-[#4D99CC] text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-[#3d89bc] active:scale-95 transition-all shadow-sm hover:shadow-md"
                          title="저장"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingIngredient(false);
                            setNewIngredientData({ name: '', category: '기타', unit: 'g' });
                          }}
                          className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-95 transition-all bg-white"
                          title="취소"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {filteredAndSortedIngredients.map((ingredient) => {
                  const key = `${ingredient.name}_${ingredient.unit}`;
                  // 가격 숫자: products 배열에서만 costPerUnit 참조 (products가 없으면 가격 표시 안 함)
                  const products = ingredientProducts.get(key) || ingredient.products || [];
                  const hasProducts = products.length > 0;
                  const price = hasProducts ? (localPrices.get(key) ?? getEffectiveCostPerUnit(ingredient, ingredientProducts)) : 0;
                  const displayUnit = 'kg';
                  const pricePerUnit = hasProducts && price > 0 ? price : null; // $/kg 단위로 표시 (변환 없이)
                  
                  const isExpanded = expandedIngredient === key;
                  const isEditing = editingIngredientKey === key;
                  
                  return (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg border border-gray-200 hover:border-[#4D99CC] transition-colors overflow-hidden"
                    >
                        {/* 헤더 */}
                        <div 
                          className={`p-4 flex items-center justify-between ${!isEditing && !isDeleteMode ? 'cursor-pointer' : ''}`}
                          onClick={!isEditing && !isDeleteMode ? () => setExpandedIngredient(isExpanded ? null : key) : undefined}
                        >
                          {isEditing ? (
                            // 편집 모드
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingIngredientData.name}
                                onChange={(e) => setEditingIngredientData(prev => ({ ...prev, name: e.target.value }))}
                                className="font-semibold text-base px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <select
                                value={editingIngredientData.category}
                                onChange={(e) => setEditingIngredientData(prev => ({ ...prev, category: e.target.value as IngredientCategory }))}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="육류">육류</option>
                                <option value="곡물">곡물</option>
                                <option value="채소">채소</option>
                                <option value="조미료">조미료</option>
                                <option value="기타">기타</option>
                              </select>
                            </div>
                          ) : (
                            // 일반 모드
                            <div className="flex items-center gap-2 flex-1">
                              <p className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
                                {ingredient.name}
                              </p>
                              {ingredient.category && (
                                <span 
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    ingredient.category === '육류' ? 'bg-red-100 text-red-800' :
                                    ingredient.category === '곡물' ? 'bg-yellow-100 text-yellow-800' :
                                    ingredient.category === '채소' ? 'bg-green-100 text-green-800' :
                                    ingredient.category === '조미료' ? 'bg-blue-100 text-blue-800' :
                                    'bg-purple-100 text-purple-800' // 기타
                                  }`}
                                >
                                  {ingredient.category}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {!isEditing && (
                              <>
                                {(() => {
                                  // 메인 제품명 표시
                                  const products = ingredientProducts.get(key) || ingredient.products || [];
                                  const mainProduct = products.find(p => p.isMain);
                                  
                                  if (mainProduct) {
                                    return (
                                      <p className="text-xs text-gray-500 max-w-[120px] truncate mr-2">
                                        {mainProduct.productName}
                                      </p>
                                    );
                                  }
                                  return null;
                                })()}
                                <p className="text-sm font-medium text-[#4D99CC]">
                                  {pricePerUnit !== null 
                                    ? `$${formatNumber(pricePerUnit, 1)}/${displayUnit}`
                                    : '-'
                                  }
                                </p>
                              </>
                            )}
                            
                            {!isEditing && (
                              <div className="flex items-center gap-1">
                                {/* 삭제 모드일 때 X 버튼 표시 */}
                                {isDeleteMode && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleDeleteIngredient(ingredient);
                                    }}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    title="삭제"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                                
                                {/* 펼치기/접기 버튼 (삭제 모드가 아닐 때만) */}
                                {!isDeleteMode && (
                                  <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                                    <svg
                                      className={`w-5 h-5 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* 편집 모드에서도 펼침/접힘 버튼 */}
                            {isEditing && (
                              <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors ml-2">
                                <svg
                                  className={`w-5 h-5 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* 펼쳐진 내용 */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-white">
                            {/* 제품 정보 헤더 */}
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-700">제품 정보</p>
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  // 편집 모드 버튼들
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveEditIngredient(key, ingredient);
                                      }}
                                      className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                      title="저장"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelEditIngredient();
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      title="취소"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditIngredient(ingredient);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="수정"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteIngredient(ingredient);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="삭제"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 제품 목록 */}
                            <div className="space-y-2">
                              {(() => {
                                const unitLabel = 'kg';
                                const products = ingredientProducts.get(key) || ingredient.products || [];
                                const sortedProducts = [...products].sort((a, b) => {
                                  const pricePerUnitA = getProductCostPerUnit(a) || Infinity;
                                  const pricePerUnitB = getProductCostPerUnit(b) || Infinity;
                                  return pricePerUnitA - pricePerUnitB;
                                });
                                
                                if (sortedProducts.length === 0) {
                                  return (
                                    <div className="px-4 py-6 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                                      등록된 제품이 없습니다
                                    </div>
                                  );
                                }
                                
                                return sortedProducts.map((product) => {
                                  const pricePerUnit = getProductCostPerUnit(product); // $/kg 단위로 저장되어 있으므로 변환 없이 사용
                                  const pricePerUnitFormatted = pricePerUnit > 0 ? formatNumber(pricePerUnit, 2) : '0';
                                  const isMain = product.isMain || false;
                                  
                                  return (
                                    <div 
                                      key={product.id} 
                                      className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                                        isMain 
                                          ? 'bg-blue-50 border-blue-200' 
                                          : 'bg-white border-gray-200 hover:border-gray-300'
                                      }`}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!isMain) {
                                          try {
                                            // 현재 제품들에서 메인 제품 업데이트
                                            const currentProducts = ingredientProducts.get(key) || [];
                                            const updatedProducts = currentProducts.map((p) => ({
                                              ...p,
                                              isMain: p.id === product.id,
                                            }));

                                            // Firebase에서 재료 정보 업데이트
                                            const matchingFirebaseIngredient = firebaseIngredients.find(
                                              ing => ing.name === ingredient.name && ing.unit === ingredient.unit
                                            );

                                            if (matchingFirebaseIngredient) {
                                              await updateIngredient(matchingFirebaseIngredient.id, {
                                                products: updatedProducts
                                              });
                                              console.log(`✅ Firebase 메인 제품 변경 완료: ${product.productName}`);
                                            }

                                            // 로컬 상태 업데이트
                                            setIngredientProducts((prev) => {
                                              const newMap = new Map(prev);
                                              newMap.set(key, updatedProducts);
                                              return newMap;
                                            });
                                            
                                            // 메인 제품이 변경된 경우 해당 재료의 가격 업데이트
                                            const newMainProduct = updatedProducts.find(p => p.isMain);
                                            if (newMainProduct && newMainProduct.weight > 0) {
                                              const newCostPerUnit = getProductCostPerUnit(newMainProduct);
                                              
                                              // Firebase/앱 스토어 가격 업데이트
                                              updateIngredientPrice(ingredient.name, ingredient.unit, newCostPerUnit);
                                              
                                              // 로컬 가격 상태도 즉시 업데이트 (UI 반영을 위해)
                                              setLocalPrices(prevPrices => {
                                                const newPrices = new Map(prevPrices);
                                                newPrices.set(key, newCostPerUnit);
                                                return newPrices;
                                              });
                                              
                                              console.log(`🔄 메인 제품 변경: ${ingredient.name} 가격이 $${formatNumber(newCostPerUnit, 2)}/${ingredient.unit}로 업데이트됨`);
                                            }

                                            // Firebase 재료 목록 새로고침
                                            await loadFirebaseIngredients();

                                          } catch (error) {
                                            console.error('메인 제품 변경 실패:', error);
                                            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
                                            alert(`메인 제품 변경에 실패했습니다: ${errorMessage}`);
                                          }
                                        }
                                      }}
                                    >
                                      {/* 왼쪽: 메인 선택 불렛 + 제품 정보 */}
                                      <div className="flex items-center gap-3 flex-1">
                                        {/* 메인 선택 라디오 버튼 */}
                                        <input
                                          type="radio"
                                          name={`main-product-${key}`}
                                          checked={isMain}
                                          readOnly
                                        />
                                        
                                        {/* 제품 정보 */}
                                        <div className="flex-1">
                                          {isEditing ? (
                                            // 편집 모드
                                            <div className="space-y-1">
                                              <input
                                                type="text"
                                                value={editingProductsData.get(product.id)?.productName || product.productName}
                                                onChange={(e) => {
                                                  e.stopPropagation();
                                                  setEditingProductsData(prev => {
                                                    const newMap = new Map(prev);
                                                    const current = newMap.get(product.id) || { 
                                                      productName: product.productName, 
                                                      supplier: product.supplier, 
                                                      unitPrice: (getProductCostPerUnit(product) > 0 ? getProductCostPerUnit(product).toString() : '0')
                                                    };
                                                    newMap.set(product.id, { ...current, productName: e.target.value });
                                                    return newMap;
                                                  });
                                                }}
                                                onBlur={async () => {
                                                  // 제품 정보를 Firebase에 실시간 저장
                                                  const editData = editingProductsData.get(product.id);
                                                  if (!editData) return;
                                                  
                                                  try {
                                                    const unitPricePerKg = parseFloat(editData.unitPrice) || 0;
                                                    const costPerUnit = unitPricePerKg; // $/kg 단위로 저장 (변환 없이)
                                                    const updatedProduct = {
                                                      ...product,
                                                      productName: editData.productName.trim() || product.productName,
                                                      supplier: editData.supplier.trim() || product.supplier,
                                                      price: costPerUnit * product.weight,
                                                      costPerUnit,
                                                    };
                                                    
                                                    const currentProducts = ingredientProducts.get(key) || [];
                                                    const updatedProducts = currentProducts.map(p => 
                                                      p.id === product.id ? updatedProduct : p
                                                    );
                                                    
                                                    // 가장 싼 제품을 메인으로 설정
                                                    const sortedProducts = [...updatedProducts]
                                                      .map((p) => ({ p, cost: getProductCostPerUnit(p) }))
                                                      .filter((x) => x.cost > 0)
                                                      .sort((a, b) => a.cost - b.cost);
                                                    
                                                    if (sortedProducts.length > 0) {
                                                      // 모든 제품의 isMain을 false로 설정하고, 가장 싼 제품만 true로 설정
                                                      updatedProducts.forEach((p) => {
                                                        p.isMain = p.id === sortedProducts[0].p.id;
                                                      });
                                                    }
                                                    
                                                    const matchingFirebaseIngredient = firebaseIngredients.find(
                                                      ing => ing.name === ingredient.name && ing.unit === ingredient.unit
                                                    );
                                                    
                                                    if (matchingFirebaseIngredient) {
                                                      await updateIngredient(matchingFirebaseIngredient.id, {
                                                        products: updatedProducts
                                                      });
                                                      console.log(`✅ Firebase 제품 정보 실시간 업데이트: ${updatedProduct.productName}`);
                                                      if (sortedProducts.length > 0) {
                                                        console.log(`  💰 가장 싼 제품을 메인으로 설정: ${sortedProducts[0].p.productName} ($${sortedProducts[0].cost}/kg)`);
                                                      }
                                                    }
                                                    
                                                    setIngredientProducts(prev => {
                                                      const newMap = new Map(prev);
                                                      newMap.set(key, updatedProducts);
                                                      return newMap;
                                                    });
                                                    
                                                    await loadFirebaseIngredients();
                                                  } catch (error) {
                                                    console.error('제품 정보 실시간 업데이트 실패:', error);
                                                  }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full text-base font-medium px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                                placeholder="제품명"
                                              />
                                              <div className="flex gap-2">
                                                <input
                                                  type="text"
                                                  value={editingProductsData.get(product.id)?.supplier || product.supplier}
                                                  onChange={(e) => {
                                                    e.stopPropagation();
                                                    setEditingProductsData(prev => {
                                                      const newMap = new Map(prev);
                                                      const current = newMap.get(product.id) || { 
                                                        productName: product.productName, 
                                                        supplier: product.supplier, 
                                                        unitPrice: (getProductCostPerUnit(product) > 0 ? getProductCostPerUnit(product).toString() : '0')
                                                      };
                                                      newMap.set(product.id, { ...current, supplier: e.target.value });
                                                      return newMap;
                                                    });
                                                  }}
                                                  onBlur={async () => {
                                                    // 제품 정보를 Firebase에 실시간 저장
                                                    const editData = editingProductsData.get(product.id);
                                                    if (!editData) return;
                                                    
                                                    try {
                                                      const unitPricePerKg = parseFloat(editData.unitPrice) || 0;
                                                    const costPerUnit = unitPricePerKg; // $/kg 단위로 저장 (변환 없이)
                                                      const updatedProduct = {
                                                        ...product,
                                                        productName: editData.productName.trim() || product.productName,
                                                        supplier: editData.supplier.trim() || product.supplier,
                                                        price: costPerUnit * product.weight,
                                                        costPerUnit,
                                                      };
                                                      
                                                      const currentProducts = ingredientProducts.get(key) || [];
                                                      const updatedProducts = currentProducts.map(p => 
                                                        p.id === product.id ? updatedProduct : p
                                                      );
                                                      
                                                      const matchingFirebaseIngredient = firebaseIngredients.find(
                                                        ing => ing.name === ingredient.name && ing.unit === ingredient.unit
                                                      );
                                                      
                                                      if (matchingFirebaseIngredient) {
                                                        await updateIngredient(matchingFirebaseIngredient.id, {
                                                          products: updatedProducts
                                                        });
                                                        console.log(`✅ Firebase 제품 정보 실시간 업데이트: ${updatedProduct.productName}`);
                                                      }
                                                      
                                                    setIngredientProducts(prev => {
                                                        const newMap = new Map(prev);
                                                        newMap.set(key, updatedProducts);
                                                        return newMap;
                                                      });
                                                      
                                                      await loadFirebaseIngredients();
                                                    } catch (error) {
                                                      console.error('제품 정보 실시간 업데이트 실패:', error);
                                                    }
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                                  placeholder="공급업체"
                                                />
                                                <input
                                                  type="number"
                                                  value={editingProductsData.get(product.id)?.unitPrice || (getProductCostPerUnit(product) > 0 ? getProductCostPerUnit(product).toString() : '0')}
                                                  onChange={(e) => {
                                                    e.stopPropagation();
                                                    setEditingProductsData(prev => {
                                                      const newMap = new Map(prev);
                                                      const current = newMap.get(product.id) || { 
                                                        productName: product.productName, 
                                                        supplier: product.supplier, 
                                                        unitPrice: (getProductCostPerUnit(product) > 0 ? getProductCostPerUnit(product).toString() : '0')
                                                      };
                                                      newMap.set(product.id, { ...current, unitPrice: e.target.value });
                                                      return newMap;
                                                    });
                                                  }}
                                                  onBlur={async () => {
                                                    // 제품 정보를 Firebase에 실시간 저장
                                                    const editData = editingProductsData.get(product.id);
                                                    if (!editData) return;
                                                    
                                                    try {
                                                      const unitPricePerKg = parseFloat(editData.unitPrice) || 0;
                                                    const costPerUnit = unitPricePerKg; // $/kg 단위로 저장 (변환 없이)
                                                      const updatedProduct = {
                                                        ...product,
                                                        productName: editData.productName.trim() || product.productName,
                                                        supplier: editData.supplier.trim() || product.supplier,
                                                        price: costPerUnit * product.weight,
                                                        costPerUnit,
                                                      };

                                                      const currentProducts = ingredientProducts.get(key) || [];
                                                      const updatedProducts = currentProducts.map(p => 
                                                        p.id === product.id ? updatedProduct : p
                                                      );
                                                      
                                                      const matchingFirebaseIngredient = firebaseIngredients.find(
                                                        ing => ing.name === ingredient.name && ing.unit === ingredient.unit
                                                      );
                                                      
                                                      if (matchingFirebaseIngredient) {
                                                        await updateIngredient(matchingFirebaseIngredient.id, {
                                                          products: updatedProducts
                                                        });
                                                        console.log(`✅ Firebase 제품 정보 실시간 업데이트: ${updatedProduct.productName}`);
                                                        
                                                        // 메인 제품인 경우 재료 단가도 업데이트 (가장 싼 제품의 costPerUnit 사용)
                                                        const mainProduct = updatedProducts.find(p => p.isMain);
                                                        if (mainProduct) {
                                                          const newCostPerUnit = getProductCostPerUnit(mainProduct);
                                                          updateIngredientPrice(ingredient.name, ingredient.unit, newCostPerUnit);
                                                          setLocalPrices(prevPrices => {
                                                            const newPrices = new Map(prevPrices);
                                                            newPrices.set(key, newCostPerUnit);
                                                            return newPrices;
                                                          });
                                                        }
                                                      }
                                                      
                                                      setIngredientProducts(prev => {
                                                        const newMap = new Map(prev);
                                                        newMap.set(key, updatedProducts);
                                                        return newMap;
                                                      });
                                                      
                                                      await loadFirebaseIngredients();
                                                    } catch (error) {
                                                      console.error('제품 정보 실시간 업데이트 실패:', error);
                                                    }
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="w-20 text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                                  placeholder="$/단위"
                                                  min="0"
                                                  step="0.01"
                                                />
                                              </div>
                                            </div>
                                          ) : (
                                            // 일반 모드
                                            <>
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-base font-medium ${isMain ? 'text-blue-900' : 'text-gray-900'}`}>
                                                  {product.productName}
                                                </span>
                                                {isMain && (
                                                  <span className="text-sm">
                                                    ⭐
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span>{product.supplier}</span>
                                                <span className={`font-medium ${isMain ? 'text-blue-700' : 'text-gray-800'}`}>
                                                  ${pricePerUnitFormatted}/{unitLabel}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* X 삭제 버튼 */}
                                      {!isEditing && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProduct(key, product.id);
                                          }}
                                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="제품 삭제"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      )}
                                      
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            {/* 제품 추가 입력 폼 */}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex gap-1.5 items-center">
                                <input
                                  type="text"
                                  placeholder="제품명"
                                  value={newProductInputs.get(key)?.productName || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleProductInputChange(key, 'productName', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-[2] min-w-0 px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                />
                                <input
                                  type="text"
                                  placeholder="구매처"
                                  value={newProductInputs.get(key)?.supplier || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleProductInputChange(key, 'supplier', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                />
                                <input
                                  type="number"
                                  placeholder="$/kg"
                                  value={newProductInputs.get(key)?.unitPrice || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleProductInputChange(key, 'unitPrice', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                  min="0"
                                  step="0.01"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddProduct(key);
                                  }}
                                  className="flex-shrink-0 w-9 h-9 bg-[#4D99CC] text-white rounded hover:bg-[#3d89bc] transition-colors flex items-center justify-center"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 메뉴 탭 내용 */}
        {activeTab === '메뉴' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {recipes.length === 0 ? (
              <div className="text-center py-12 flex-1 flex items-center justify-center">
                <p className="text-gray-500">레시피가 없습니다.</p>
              </div>
            ) : (
              <div className="contents">
                {/* 필터 및 검색 - 고정 */}
                <div className="mb-6 space-y-4 flex-shrink-0">
                  {/* 검색 */}
                  <div>
                    <input
                      type="text"
                      placeholder="레시피 검색..."
                      value={recipeSearchQuery}
                      onChange={(e) => setRecipeSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedRecipeCategory('전체')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedRecipeCategory === '전체'
                              ? 'bg-[#4D99CC] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          전체
                        </button>
                        {recipeCategories.map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedRecipeCategory(category)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              selectedRecipeCategory === category
                                ? 'bg-[#4D99CC] text-white'
                                : `${getRecipeCategoryColor(category)} hover:opacity-80`
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={recipeSortBy}
                        onChange={(e) => setRecipeSortBy(e.target.value as 'name' | 'cost-asc' | 'cost-desc' | 'category')}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                        title="정렬"
                      >
                        <option value="name">이름순</option>
                        <option value="cost-asc">원가 낮은순</option>
                        <option value="cost-desc">원가 높은순</option>
                        <option value="category">카테고리순</option>
                      </select>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-1.5 text-sm bg-[#4D99CC] text-white rounded-lg hover:bg-[#3d7aa3] transition-colors font-medium"
                      >
                        레시피 추가
                      </button>
                    </div>
                  </div>
                </div>

                {/* 레시피 목록 - 스크롤 가능 영역 */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6">
                  {filteredRecipes.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">검색 결과가 없습니다.</p>
                    </div>
                  ) : (
                    filteredRecipes.map((r) => {
                      const recipeCostPerServing = calculateCostPerServing(r);
                      
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRecipe(r)}
                          className={`bg-gray-50 rounded-lg border transition-colors cursor-pointer overflow-hidden ${
                            selectedRecipe?.id === r.id
                              ? 'border-[#4D99CC]'
                              : 'border-gray-200 hover:border-[#4D99CC]'
                          }`}
                        >
                          {/* 헤더 - 클릭 가능 */}
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <p className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
                                {r.name}
                              </p>
                              {r.category && (
                                <span 
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    getRecipeCategoryColor(r.category)
                                  }`}
                                >
                                  {r.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-medium text-[#4D99CC]">
                                ${formatNumber(recipeCostPerServing / 1000, 1)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 레시피 상세 모달 */}
        {selectedRecipe && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={() => setSelectedRecipe(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {(() => {
                  const recipe = selectedRecipe;
                  const costPerServing = calculateCostPerServing(recipe);
                  
                  // DailyMenu에서 메인 레시피 찾기 (오늘 날짜 기준)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const todayKey = format(today, 'yyyy-MM-dd');
                  const todayMenu = dailyMenuHistory.get(todayKey);
                  const mainRecipe = todayMenu?.recipes.find(r => r.name === recipe.name) || recipe;
                  
                  return (
                    <>
                      {/* 모달 헤더 */}
                      <div className="mb-6 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-2">{recipe.name}</h3>
                          <p className="text-gray-600">{recipe.description}</p>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">1인당 원가</p>
                            <p className="text-2xl font-bold text-[#4D99CC]">
                              ${formatNumber(costPerServing / 1000, 1)}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedRecipe(null)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 재료 목록 */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">
                              {editingRecipeIngredientsId === recipe.id 
                                ? `필요 재료 (${editingBaseServings || mainRecipe.baseServings}인분 기준)`
                                : `필요 재료 (1인분 기준)`}
                            </h4>
                            {editingRecipeIngredientsId === recipe.id && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <label htmlFor="baseServings-input" className="sr-only">기준 인분</label>
                                <input
                                  id="baseServings-input"
                                  type="number"
                                  min="1"
                                  value={editingBaseServings}
                                  onChange={(e) => setEditingBaseServings(e.target.value)}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                                  aria-label="기준 인분 수"
                                />
                                <span>인분 기준</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {editingRecipeIngredientsId === recipe.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    const newIngredients = editAllIngredientsData.map((row) => {
                                      const orig = mainRecipe.ingredients.find((i) => i.id === row.id);
                                      return {
                                        ...(orig || {}),
                                        id: row.id,
                                        name: row.name?.trim() || orig?.name || '재료',
                                        quantity: parseFloat(row.quantity) ?? orig?.quantity ?? 0,
                                        unit: 'g', // 원가관리 통일: g
                                      };
                                    });
                                    const newBaseServings = parseInt(editingBaseServings) || mainRecipe.baseServings;
                                    // 수정 모드에서 입력한 수량은 이미 n인분 기준이므로 그대로 사용
                                    const updatedRecipe = {
                                      ...recipe,
                                      ingredients: newIngredients,
                                      baseServings: newBaseServings,
                                      updatedAt: new Date(),
                                    };
                                    updateRecipe(updatedRecipe);
                                    setSelectedRecipe(updatedRecipe);
                                    setEditingRecipeIngredientsId(null);
                                    setEditAllIngredientsData([]);
                                    setEditingBaseServings('');
                                  }}
                                  className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors font-medium"
                                  title="저장"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRecipeIngredientsId(null);
                                    setEditAllIngredientsData([]);
                                    setEditingBaseServings('');
                                  }}
                                  className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors font-medium"
                                  title="취소"
                                >
                                  취소
                                </button>
                              </>
                            ) : deleteSelectRecipeId === recipe.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (selectedIngredientIdsForDelete.size === 0) return;
                                    if (!confirm(`선택한 ${selectedIngredientIdsForDelete.size}개 재료를 삭제하시겠습니까?`)) return;
                                    const newIngredients = mainRecipe.ingredients.filter(
                                      (ing) => !selectedIngredientIdsForDelete.has(ing.id)
                                    );
                                    const updatedRecipe = {
                                      ...recipe,
                                      ingredients: newIngredients,
                                      updatedAt: new Date(),
                                    };
                                    updateRecipe(updatedRecipe);
                                    setSelectedRecipe(updatedRecipe);
                                    setDeleteSelectRecipeId(null);
                                    setSelectedIngredientIdsForDelete(new Set());
                                  }}
                                  className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="선택 삭제"
                                >
                                  선택 삭제
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteSelectRecipeId(null);
                                    setSelectedIngredientIdsForDelete(new Set());
                                  }}
                                  className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors font-medium"
                                  title="취소"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingRecipeIngredientsId(recipe.id);
                                    // 수정 모드: n인분 기준으로 그대로 표시 (변환하지 않음)
                                    setEditAllIngredientsData(
                                      mainRecipe.ingredients.map((ing) => ({
                                        id: ing.id,
                                        name: ing.name,
                                        quantity: ing.quantity.toString(), // n인분 기준 그대로
                                        unit: ing.unit || 'g',
                                      }))
                                    );
                                    setEditingBaseServings(mainRecipe.baseServings.toString());
                                    setDeleteSelectRecipeId(null);
                                    setSelectedIngredientIdsForDelete(new Set());
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                                  title="수정"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteSelectRecipeId(recipe.id);
                                    setSelectedIngredientIdsForDelete(new Set());
                                    setEditingRecipeIngredientsId(null);
                                    setEditAllIngredientsData([]);
                                    setEditingBaseServings('');
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                                  title="삭제"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(editingRecipeIngredientsId === recipe.id ? editAllIngredientsData : mainRecipe.ingredients).map((ingredient, idx) => {
                            const ing = editingRecipeIngredientsId === recipe.id
                              ? mainRecipe.ingredients.find((i) => i.id === (ingredient as { id: string; name: string; quantity: string; unit: string }).id) ?? ingredient
                              : ingredient;
                            const isEditRow = editingRecipeIngredientsId === recipe.id;
                            const rowData = isEditRow ? (ingredient as { id: string; name: string; quantity: string; unit: string }) : null;
                            const displayIng = isEditRow && rowData ? { ...ing, name: rowData.name, quantity: parseFloat(rowData.quantity) || 0, unit: rowData.unit } : (ing as typeof mainRecipe.ingredients[0]);
                            // 수정 모드: n인분 기준 그대로, 일반 모드: 1인분 기준으로 변환
                            const currentBaseServings = editingRecipeIngredientsId === recipe.id ? (parseInt(editingBaseServings) || mainRecipe.baseServings) : mainRecipe.baseServings;
                            const quantityPerServing = isEditRow ? displayIng.quantity : displayIng.quantity / mainRecipe.baseServings;
                            const displayQuantityForEdit = isEditRow ? displayIng.quantity : quantityPerServing;
                            const matching = allIngredients.find((i) => i.name === displayIng.name && i.unit === displayIng.unit);
                            const costPerUnit = localPrices.get(`${displayIng.name}_${displayIng.unit}`) ?? getEffectiveCostPerUnit(matching ?? displayIng, ingredientProducts);
                            // 수정 모드: n인분 기준 수량으로 원가 계산, 일반 모드: 1인분 기준
                            const quantityForCost = isEditRow ? displayIng.quantity : quantityPerServing;
                            const ingredientCost = costPerUnit * quantityForCost;
                            const displayUnit = 'g';
                            const toG = (q: number, u: string) => {
                              const uu = (u || 'g').toLowerCase();
                              if (uu === 'kg' || uu === 'l') return q * 1000;
                              return q;
                            };
                            // 수정 모드: n인분 기준 수량 그대로, 일반 모드: 1인분 기준으로 변환
                            const quantityToDisplay = isEditRow ? displayIng.quantity : quantityPerServing;
                            const qtyG = toG(quantityToDisplay, displayIng.unit);
                            const displayQuantity = formatNumber(qtyG, 1);
                            const isDeleteSelect = deleteSelectRecipeId === recipe.id;
                            const isSelectedForDelete = selectedIngredientIdsForDelete.has(displayIng.id);

                            return (
                              <div
                                key={displayIng.id}
                                className={`flex justify-between items-center gap-2 p-3 rounded-lg min-w-0 ${isSelectedForDelete ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
                              >
                                {isDeleteSelect && (
                                  <label className="flex items-center gap-1 flex-shrink-0 cursor-pointer" aria-label="삭제 대상 선택">
                                    <input
                                      type="checkbox"
                                      checked={isSelectedForDelete}
                                      aria-label={`${displayIng.name} 삭제 선택`}
                                      onChange={() => {
                                        setSelectedIngredientIdsForDelete((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(displayIng.id)) next.delete(displayIng.id);
                                          else next.add(displayIng.id);
                                          return next;
                                        });
                                      }}
                                      className="w-4 h-4 rounded border-gray-300"
                                    />
                                  </label>
                                )}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {isEditRow && rowData ? (
                                    <>
                                      <input
                                        type="text"
                                        value={rowData.name}
                                        onChange={(e) =>
                                          setEditAllIngredientsData((prev) =>
                                            prev.map((r) => (r.id === rowData.id ? { ...r, name: e.target.value } : r))
                                          )
                                        }
                                        className="flex-1 min-w-0 max-w-[100px] px-2 py-1 text-sm border border-gray-300 rounded"
                                        placeholder="이름"
                                      />
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={rowData.quantity}
                                        onChange={(e) =>
                                          setEditAllIngredientsData((prev) =>
                                            prev.map((r) => (r.id === rowData.id ? { ...r, quantity: e.target.value } : r))
                                          )
                                        }
                                        className="w-12 px-2 py-1 text-sm border border-gray-300 rounded"
                                        placeholder="수량"
                                      />
                                      <span className="text-sm text-gray-600 flex-shrink-0">g</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-medium truncate">{displayIng.name}</span>
                                      <span className="text-black font-medium flex-shrink-0">
                                        {displayQuantity} {displayUnit}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {!isEditRow && (
                                  <span className="text-sm text-blue-600 font-medium flex-shrink-0 ml-1">
                                    ${formatNumber(ingredientCost / 1000, 1)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 조리 단계 */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">조리 단계</h4>
                          {editingRecipeStepsId === recipe.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  const updatedSteps = editStepsData.map((stepData) => ({
                                    id: stepData.id,
                                    order: stepData.order,
                                    description: stepData.description,
                                    duration: mainRecipe.steps.find(s => s.id === stepData.id)?.duration || 0,
                                  }));
                                  const updatedRecipe = {
                                    ...mainRecipe,
                                    steps: updatedSteps,
                                  };
                                  updateRecipe(updatedRecipe);
                                  setEditingRecipeStepsId(null);
                                  setEditStepsData([]);
                                }}
                                className="px-3 py-1 text-sm bg-[#4D99CC] text-white rounded hover:bg-[#3d89bc] transition-colors font-medium"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRecipeStepsId(null);
                                  setEditStepsData([]);
                                }}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors font-medium"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingRecipeStepsId(recipe.id);
                                setEditStepsData(
                                  mainRecipe.steps.map((step) => ({
                                    id: step.id,
                                    order: step.order,
                                    description: step.description,
                                  }))
                                );
                              }}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                              title="조리단계 수정"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {(editingRecipeStepsId === recipe.id ? editStepsData : mainRecipe.steps).map((step, index) => {
                            const isEditMode = editingRecipeStepsId === recipe.id;
                            const stepData = isEditMode ? (step as { id: string; order: number; description: string }) : step;
                            const originalStep = mainRecipe.steps.find(s => s.id === stepData.id);
                            
                            return (
                              <div
                                key={stepData.id}
                                className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                              >
                                <span className="flex-shrink-0 w-8 h-8 bg-[#4D99CC] text-white rounded-full flex items-center justify-center font-semibold">
                                  {stepData.order}
                                </span>
                                <div className="flex-1 flex items-center gap-2">
                                  {isEditMode ? (
                                    <>
                                      <input
                                        type="text"
                                        value={stepData.description}
                                        onChange={(e) => {
                                          const updated = editStepsData.map((s) =>
                                            s.id === stepData.id ? { ...s, description: e.target.value } : s
                                          );
                                          setEditStepsData(updated);
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                                      />
                                      <button
                                        onClick={() => {
                                          const updated = editStepsData.filter((s) => s.id !== stepData.id);
                                          const reordered = updated.map((s, idx) => ({
                                            ...s,
                                            order: idx + 1,
                                          }));
                                          setEditStepsData(reordered);
                                        }}
                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                        title="삭제"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex-1">
                                        <p>{stepData.description}</p>
                                        {originalStep?.duration && (
                                          <p className="text-sm text-gray-500 mt-1">
                                            소요 시간: {Math.floor(originalStep.duration / 60)}분
                                          </p>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {editingRecipeStepsId === recipe.id && (
                            <button
                              onClick={() => {
                                const newStep = {
                                  id: `step-${Date.now()}`,
                                  order: editStepsData.length + 1,
                                  description: '',
                                };
                                setEditStepsData([...editStepsData, newStep]);
                              }}
                              className="w-full px-4 py-2 text-sm text-[#4D99CC] border border-[#4D99CC] rounded-lg hover:bg-[#4D99CC] hover:text-white transition-colors"
                            >
                              + 단계 추가
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 주의사항 */}
                      {recipe.notes && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800">
                            ⚠️ 주의사항
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">{recipe.notes}</p>
                        </div>
                      )}

                      {/* 업데이트 정보 */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          마지막 업데이트:{' '}
                          {format(recipe.updatedAt, 'yyyy년 MM월 dd일 HH:mm')}
                          {recipe.updatedBy && ` by ${recipe.updatedBy}`}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 레시피 추가 모달 */}
      <AddRecipeModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedRecipe(null);
        }}
        onAdd={(recipe) => {
          if (selectedRecipe) {
            updateRecipe(recipe);
          } else {
            addRecipe(recipe);
          }
          setIsAddModalOpen(false);
          setSelectedRecipe(null);
        }}
        initialRecipe={selectedRecipe || undefined}
      />
    </div>
  );
}
