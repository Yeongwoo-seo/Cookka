'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  calculateMenuProfit,
  calculateMenuProfitMargin,
} from '@/types/business-metrics';
import { Ingredient, IngredientCategory, ProductInfo, Recipe, RecipeCategory, getRecipeCategoryColor } from '@/types/recipe';
import { format } from 'date-fns';

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

export default function MenuAnalysisView() {
  const businessMetrics = useAppStore((state) => state.businessMetrics);
  const recipes = useAppStore((state) => state.recipes);
  const ingredientPrices = useAppStore((state) => state.ingredientPrices);
  const updateIngredientPrice = useAppStore((state) => state.updateIngredientPrice);
  const updateRecipe = useAppStore((state) => state.updateRecipe);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | '전체'>('전체');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'재료' | '메뉴'>('재료');
  
  // 레시피 보드 관련 상태
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<{ recipeId: string; ingredientId: string } | null>(null);
  const [editIngredientData, setEditIngredientData] = useState<{ name: string; quantity: string; unit: string } | null>(null);
  
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
  const [newProductInputs, setNewProductInputs] = useState<Map<string, { productName: string; supplier: string; weight: string; price: string }>>(new Map());

  // 모든 레시피에서 재료 수집 (중복 제거, 카테고리 추가)
  const allIngredients = useMemo(() => {
    const ingredientMap = new Map<string, Ingredient>();
    
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        const key = `${ing.name}_${ing.unit}`;
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, {
            ...ing,
            category: ing.category || getIngredientCategory(ing.name),
          });
        }
      });
    });
    
    return Array.from(ingredientMap.values());
  }, [recipes]);

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

  const [localPrices, setLocalPrices] = useState<Map<string, number>>(() => {
    const prices = new Map<string, number>();
    allIngredients.forEach((ing) => {
      const key = `${ing.name}_${ing.unit}`;
      const storedPrice = ingredientPrices.get(key);
      prices.set(key, storedPrice?.costPerUnit ?? ing.costPerUnit);
    });
    return prices;
  });

  // 필터링 및 정렬된 재료 목록
  const filteredAndSortedIngredients = useMemo(() => {
    let filtered = allIngredients.filter((ing) => {
      const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '전체' || ing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // 정렬
    filtered = [...filtered].sort((a, b) => {
      const keyA = `${a.name}_${a.unit}`;
      const keyB = `${b.name}_${b.unit}`;
      const priceA = localPrices.get(keyA) ?? a.costPerUnit;
      const priceB = localPrices.get(keyB) ?? b.costPerUnit;

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
  }, [allIngredients, searchQuery, selectedCategory, sortBy, localPrices]);

  const handlePriceChange = (name: string, unit: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const key = `${name}_${unit}`;
    setLocalPrices((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, numValue);
      return newMap;
    });
  };

  const handlePriceBlur = (name: string, unit: string) => {
    const key = `${name}_${unit}`;
    const price = localPrices.get(key) ?? 0;
    updateIngredientPrice(name, unit, price);
  };

  const handleAddProduct = (ingredientKey: string) => {
    const input = newProductInputs.get(ingredientKey);
    if (!input || !input.productName.trim() || !input.supplier.trim() || !input.weight.trim() || !input.price.trim()) {
      return;
    }

    const weight = parseFloat(input.weight);
    const price = parseFloat(input.price);
    if (isNaN(weight) || weight <= 0 || isNaN(price) || price <= 0) {
      return;
    }

    const newProduct: ProductInfo = {
      id: `${ingredientKey}_${Date.now()}`,
      productName: input.productName.trim(),
      supplier: input.supplier.trim(),
      weight: weight,
      price: price,
    };

    setIngredientProducts((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(ingredientKey) || [];
      newMap.set(ingredientKey, [...existing, newProduct]);
      return newMap;
    });

    // 입력 필드 초기화
    setNewProductInputs((prev) => {
      const newMap = new Map(prev);
      newMap.set(ingredientKey, { productName: '', supplier: '', weight: '', price: '' });
      return newMap;
    });
  };

  const handleProductInputChange = (ingredientKey: string, field: 'productName' | 'supplier' | 'weight' | 'price', value: string) => {
    setNewProductInputs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(ingredientKey) || { productName: '', supplier: '', weight: '', price: '' };
      newMap.set(ingredientKey, { ...current, [field]: value });
      return newMap;
    });
  };

  // 단위당 가격 계산 (예: kg당 가격)
  const getPricePerUnit = (ingredient: Ingredient): number => {
    const key = `${ingredient.name}_${ingredient.unit}`;
    const price = localPrices.get(key) ?? ingredient.costPerUnit;
    
    // 단위 변환 (예: g -> kg, ml은 그대로)
    let displayPrice = price;
    
    if (ingredient.unit === 'g') {
      displayPrice = price * 1000; // kg로 변환
    }
    
    return displayPrice;
  };

  // 1인당 원가 계산
  const calculateCostPerServing = (recipe: Recipe): number => {
    const totalCost = recipe.ingredients.reduce((sum, ing) => {
      return sum + (ing.costPerUnit * ing.quantity);
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

  if (!businessMetrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-7xl mx-auto px-4 pt-4 pb-24">
      {/* 재료 가격 입력 섹션 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-full overflow-hidden">
        {/* 탭 슬라이더 - 고정 */}
        <div className="relative flex items-center mb-6 pb-2 border-b border-gray-200 flex-shrink-0">
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
          {/* 슬라이딩 밑줄 */}
          <span 
            className={`absolute bottom-0 h-0.5 bg-gray-900 transition-all duration-300 ease-in-out ${
              activeTab === '재료' ? 'left-0' : 'left-1/2'
            }`}
            style={{ width: '50%' }}
          ></span>
        </div>

        {/* 재료 탭 내용 */}
        {activeTab === '재료' && (
          <div className="flex flex-col h-full overflow-hidden">
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

              {/* 필터 및 정렬 */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* 카테고리 필터 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">카테고리:</span>
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
                </div>

                {/* 정렬 */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-gray-600">정렬:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                  >
                    <option value="name">이름순</option>
                    <option value="price-asc">가격 낮은순</option>
                    <option value="price-desc">가격 높은순</option>
                    <option value="category">카테고리순</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 재료 목록 - 스크롤 가능 영역 */}
            {filteredAndSortedIngredients.length === 0 ? (
              <div className="text-center py-12 flex-1 flex items-center justify-center">
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {filteredAndSortedIngredients.map((ingredient) => {
                  const key = `${ingredient.name}_${ingredient.unit}`;
                  const price = localPrices.get(key) ?? ingredient.costPerUnit;
                  const displayUnit = ingredient.unit === 'g' ? 'kg' : ingredient.unit;
                  
                  // 제품 목록에서 가장 저렴한 제품의 단위당 금액 계산
                  const products = ingredientProducts.get(key) || ingredient.products || [];
                  let pricePerUnit: number | null = null;
                  
                  if (products.length > 0) {
                    const isLiquid = ingredient.unit === 'L' || ingredient.unit === 'ml';
                    const sortedProducts = [...products].sort((a, b) => {
                      const pricePerUnitA = a.weight > 0 ? a.price / a.weight : Infinity;
                      const pricePerUnitB = b.weight > 0 ? b.price / b.weight : Infinity;
                      return pricePerUnitA - pricePerUnitB;
                    });
                    
                    if (sortedProducts.length > 0) {
                      const cheapestProduct = sortedProducts[0];
                      const cheapestPricePerUnit = cheapestProduct.weight > 0 
                        ? cheapestProduct.price / cheapestProduct.weight 
                        : 0;
                      pricePerUnit = cheapestPricePerUnit;
                    }
                  }
                  
                  const isExpanded = expandedIngredient === key;
                  
                  return (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg border border-gray-200 hover:border-[#4D99CC] transition-colors overflow-hidden"
                    >
                        {/* 헤더 - 클릭 가능 */}
                        <div
                          onClick={() => setExpandedIngredient(isExpanded ? null : key)}
                          className="p-4 flex items-center justify-between cursor-pointer"
                        >
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
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-[#4D99CC]">
                              {pricePerUnit !== null 
                                ? `$${(pricePerUnit / 1000).toFixed(1)}/${displayUnit}`
                                : '-'
                              }
                            </p>
                            <svg
                              className={`w-5 h-5 transition-transform text-gray-400 ${
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
                          </div>
                        </div>
                        
                        {/* 펼쳐진 내용 */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
                            {/* 제품 정보 헤더 */}
                            <div className="mb-2">
                              <p className="text-sm font-medium text-gray-700">제품 정보</p>
                            </div>

                            {/* 제품 목록 표 */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">구매처</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      {(() => {
                                        const isLiquid = ingredient.unit === 'L' || ingredient.unit === 'ml';
                                        return isLiquid ? '용량' : '중량';
                                      })()}
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase" id={`price-header-${key}`}>
                                      {(() => {
                                        const isLiquid = ingredient.unit === 'L' || ingredient.unit === 'ml';
                                        return isLiquid ? '리터당 금액' : '중량당 금액';
                                      })()}
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">관리</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {(() => {
                                    const isLiquid = ingredient.unit === 'L' || ingredient.unit === 'ml';
                                    const unitLabel = isLiquid ? 'L' : 'kg';
                                    const priceLabel = isLiquid ? '리터당 금액' : '중량당 금액';
                                    
                                    const products = ingredientProducts.get(key) || ingredient.products || [];
                                    const sortedProducts = [...products].sort((a, b) => {
                                      const pricePerUnitA = a.weight > 0 ? a.price / a.weight : Infinity;
                                      const pricePerUnitB = b.weight > 0 ? b.price / b.weight : Infinity;
                                      return pricePerUnitA - pricePerUnitB;
                                    });
                                    
                                    if (sortedProducts.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                                            등록된 제품이 없습니다
                                          </td>
                                        </tr>
                                      );
                                    }
                                    
                                    return sortedProducts.map((product) => {
                                      const pricePerUnit = product.weight > 0 ? product.price / product.weight : 0;
                                      const displayWeight = isLiquid ? `${product.weight}L` : `${product.weight}kg`;
                                      const pricePerUnitFormatted = pricePerUnit > 0 ? (pricePerUnit / 1000).toFixed(1) : '0.0';
                                      const isMain = product.isMain || false;
                                      
                                      return (
                                        <tr 
                                          key={product.id} 
                                          className={`hover:bg-gray-50 ${isMain ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                                        >
                                          <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                              {isMain && (
                                                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
                                                  메인
                                                </span>
                                              )}
                                              <span className={`${isMain ? 'font-semibold text-blue-900' : 'text-gray-900'}`}>
                                                {product.productName}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-gray-600 w-20 truncate" title={product.supplier}>{product.supplier}</td>
                                          <td className="px-3 py-2 text-gray-600">{displayWeight}</td>
                                          <td className={`px-3 py-2 font-medium ${isMain ? 'text-blue-900' : 'text-gray-900'}`}>
                                            ${pricePerUnitFormatted}/{unitLabel}
                                          </td>
                                          <td className="px-3 py-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIngredientProducts((prev) => {
                                                  const newMap = new Map(prev);
                                                  const products = newMap.get(key) || [];
                                                  const updatedProducts = products.map((p) => ({
                                                    ...p,
                                                    isMain: p.id === product.id ? !isMain : false,
                                                  }));
                                                  newMap.set(key, updatedProducts);
                                                  
                                                  // 메인 제품으로 설정된 경우 해당 재료의 가격 업데이트
                                                  if (!isMain) {
                                                    const mainProduct = updatedProducts.find(p => p.id === product.id);
                                                    if (mainProduct && mainProduct.weight > 0) {
                                                      const newCostPerUnit = (mainProduct.price / mainProduct.weight) * 1000; // 원 단위로 변환
                                                      updateIngredientPrice(ingredient.name, ingredient.unit, newCostPerUnit);
                                                    }
                                                  }
                                                  
                                                  return newMap;
                                                });
                                              }}
                                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                                isMain 
                                                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                              title={isMain ? '메인 해제' : '메인 설정'}
                                            >
                                              {isMain ? '메인' : '메인 설정'}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
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
                                  className="flex-[2] min-w-0 px-1.5 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
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
                                  className="w-16 flex-shrink-0 px-1.5 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                />
                                <input
                                  type="number"
                                  placeholder={(() => {
                                    const isLiquid = ingredient.unit === 'L' || ingredient.unit === 'ml';
                                    return isLiquid ? '용량(L)' : '중량(kg)';
                                  })()}
                                  value={newProductInputs.get(key)?.weight || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleProductInputChange(key, 'weight', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 min-w-0 px-1.5 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                  min="0"
                                  step="0.01"
                                />
                                <input
                                  type="number"
                                  placeholder="금액"
                                  value={newProductInputs.get(key)?.price || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleProductInputChange(key, 'price', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 min-w-0 px-1.5 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC]"
                                  min="0"
                                  step="0.01"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddProduct(key);
                                  }}
                                  className="flex-shrink-0 w-8 h-8 bg-[#4D99CC] text-white rounded hover:bg-[#3d89bc] transition-colors flex items-center justify-center"
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
          <div className="flex flex-col h-full overflow-hidden">
            {recipes.length === 0 ? (
              <div className="text-center py-12 flex-1 flex items-center justify-center">
                <p className="text-gray-500">레시피가 없습니다.</p>
              </div>
            ) : (
              <>
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

                  {/* 카테고리 필터 및 정렬 */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* 카테고리 필터 및 정렬 */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* 카테고리 필터 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">카테고리:</span>
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
                    </div>

                    {/* 정렬 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">정렬:</span>
                      <select
                        value={recipeSortBy}
                        onChange={(e) => setRecipeSortBy(e.target.value as 'name' | 'cost-asc' | 'cost-desc' | 'category')}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                      >
                        <option value="name">이름순</option>
                        <option value="cost-asc">원가 낮은순</option>
                        <option value="cost-desc">원가 높은순</option>
                        <option value="category">카테고리순</option>
                      </select>
                    </div>
                  </div>
                  </div>
                </div>

                {/* 레시피 목록 - 스크롤 가능 영역 */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
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
                                ${(recipeCostPerServing / 1000).toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
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
                              ${(costPerServing / 1000).toFixed(1)}
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
                        <h4 className="font-semibold mb-3">필요 재료 (1인분 기준)</h4>
                        <div className="space-y-2">
                          {mainRecipe.ingredients.map((ingredient) => {
                            // 1인분 기준으로 수량 계산
                            const quantityPerServing = ingredient.quantity / mainRecipe.baseServings;
                            const ingredientCost = ingredient.costPerUnit * quantityPerServing;
                            
                            // 조미료인 경우 단위를 스푼으로 변경
                            const displayUnit = ingredient.category === '조미료' ? '스푼' : ingredient.unit;
                            
                            // 정수로 표시 (소수점이 없으면 정수로, 있으면 소수점 표시)
                            const displayQuantity = quantityPerServing % 1 === 0 
                              ? quantityPerServing.toString() 
                              : quantityPerServing.toFixed(1);
                            
                            return (
                              <div
                                key={ingredient.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group"
                              >
                                <span className="font-medium">{ingredient.name}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-blue-600 font-medium">
                                    {displayQuantity} {displayUnit}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ${(ingredientCost / 1000).toFixed(1)}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {editingIngredient?.recipeId === recipe.id && editingIngredient?.ingredientId === ingredient.id ? (
                                      <>
                                        <input
                                          type="text"
                                          value={editIngredientData?.name || ''}
                                          onChange={(e) => setEditIngredientData({ ...editIngredientData!, name: e.target.value })}
                                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                          placeholder="이름"
                                        />
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={editIngredientData?.quantity || ''}
                                          onChange={(e) => setEditIngredientData({ ...editIngredientData!, quantity: e.target.value })}
                                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                          placeholder="수량"
                                        />
                                        <input
                                          type="text"
                                          value={editIngredientData?.unit || ''}
                                          onChange={(e) => setEditIngredientData({ ...editIngredientData!, unit: e.target.value })}
                                          className="w-12 px-2 py-1 text-sm border border-gray-300 rounded"
                                          placeholder="단위"
                                        />
                                        <button
                                          onClick={() => {
                                            if (editIngredientData) {
                                              const newIngredients = mainRecipe.ingredients.map((ing) =>
                                                ing.id === ingredient.id
                                                  ? {
                                                      ...ing,
                                                      name: editIngredientData.name || ing.name,
                                                      quantity: parseFloat(editIngredientData.quantity) || ing.quantity,
                                                      unit: editIngredientData.unit || ing.unit,
                                                    }
                                                  : ing
                                              );
                                              const updatedRecipe = {
                                                ...recipe,
                                                ingredients: newIngredients,
                                                updatedAt: new Date(),
                                              };
                                              updateRecipe(updatedRecipe);
                                              setSelectedRecipe(updatedRecipe);
                                            }
                                            setEditingIngredient(null);
                                            setEditIngredientData(null);
                                          }}
                                          className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                          title="저장"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingIngredient(null);
                                            setEditIngredientData(null);
                                          }}
                                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
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
                                          onClick={() => {
                                            setEditingIngredient({ recipeId: recipe.id, ingredientId: ingredient.id });
                                            setEditIngredientData({
                                              name: ingredient.name,
                                              quantity: ingredient.quantity.toString(),
                                              unit: ingredient.unit,
                                            });
                                          }}
                                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                          title="수정"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm('이 재료를 삭제하시겠습니까?')) {
                                              const newIngredients = mainRecipe.ingredients.filter(
                                                (ing) => ing.id !== ingredient.id
                                              );
                                              const updatedRecipe = {
                                                ...recipe,
                                                ingredients: newIngredients,
                                                updatedAt: new Date(),
                                              };
                                              updateRecipe(updatedRecipe);
                                              setSelectedRecipe(updatedRecipe);
                                            }
                                          }}
                                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 조리 단계 */}
                      <div className="mb-6">
                        <h4 className="font-semibold mb-3">조리 단계</h4>
                        <div className="space-y-3">
                          {mainRecipe.steps.map((step) => (
                            <div
                              key={step.id}
                              className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                            >
                              <span className="flex-shrink-0 w-8 h-8 bg-[#4D99CC] text-white rounded-full flex items-center justify-center font-semibold">
                                {step.order}
                              </span>
                              <div className="flex-1">
                                <p>{step.description}</p>
                                {step.duration && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    소요 시간: {Math.floor(step.duration / 60)}분
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
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

    </div>
  );
}
