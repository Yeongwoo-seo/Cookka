'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { Recipe, RecipeCategory, Ingredient, RecipeStep, getRecipeCategoryColor } from '@/types/recipe';
import { format } from 'date-fns';
import AddRecipeModal from './AddRecipeModal';
import { getIngredients } from '@/lib/firestore';

const categories: RecipeCategory[] = ['메인 요리', '사이드 요리', '기본 반찬', '국'];

/** 숫자 포맷팅: .0이면 정수로 표시 */
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

export default function RecipeBoardView() {
  const recipes = useAppStore((state) => state.recipes);
  const updateRecipe = useAppStore((state) => state.updateRecipe);
  const addRecipe = useAppStore((state) => state.addRecipe);
  const deleteRecipe = useAppStore((state) => state.deleteRecipe);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);
  const loadSampleData = useAppStore((state) => state.loadSampleData);
  const ingredientPrices = useAppStore((state) => state.ingredientPrices);
  const [firebaseIngredients, setFirebaseIngredients] = useState<Ingredient[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeVariant, setSelectedRecipeVariant] = useState<string>('메인');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | '전체'>('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editIngredientData, setEditIngredientData] = useState<{ name: string; quantity: string; unit: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Firebase 재료 데이터 로드
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const ingredients = await getIngredients();
        setFirebaseIngredients(ingredients);
      } catch (error) {
        console.error('재료 데이터 로드 실패:', error);
      }
    };
    loadIngredients();
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    if (hasInitialized) return;
    
    console.log(`📚 RecipeBoardView 마운트 - 현재 레시피 수: ${recipes.length}`);
    
    // 레시피가 없으면 샘플 데이터 로드 시도
    if (recipes.length === 0) {
      console.log('📚 레시피가 없어서 샘플 데이터 로드 시도');
      loadSampleData();
    }
    
    // 매우 짧은 시간 후 로딩 해제 (샘플 데이터 로드 시간 고려)
    const timer = setTimeout(() => {
      console.log('📚 초기 로딩 완료');
      setIsLoading(false);
      setHasInitialized(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [hasInitialized, recipes.length, loadSampleData]);

  // 레시피가 있으면 즉시 로딩 해제
  useEffect(() => {
    if (recipes.length > 0) {
      console.log(`📚 레시피 ${recipes.length}개 발견 - 즉시 로딩 해제`);
      setIsLoading(false);
      setHasInitialized(true);
    }
  }, [recipes.length]);

  // 1인당 원가 계산 (분석 탭의 메인 제품 가격 사용)
  const calculateCostPerServing = (recipe: Recipe): number => {
    const totalCost = recipe.ingredients.reduce((sum, ing) => {
      // 분석 탭의 재료 정보에서 메인 제품 가격 조회
      const key = `${ing.name}_${ing.unit}`;
      const matchingIngredient = firebaseIngredients.find(
        firebaseIng => firebaseIng.name === ing.name && firebaseIng.unit === ing.unit
      );
      
      let costPerUnit = ing.costPerUnit;
      if (matchingIngredient && matchingIngredient.products && matchingIngredient.products.length > 0) {
        const mainProduct = matchingIngredient.products.find(p => p.isMain);
        if (mainProduct && mainProduct.weight > 0) {
          costPerUnit = mainProduct.price / mainProduct.weight;
        } else {
          // 메인 제품이 없으면 가장 저렴한 제품의 가격 사용
          const sortedProducts = [...matchingIngredient.products].sort((a, b) => {
            const pricePerUnitA = a.weight > 0 ? a.price / a.weight : Infinity;
            const pricePerUnitB = b.weight > 0 ? b.price / b.weight : Infinity;
            return pricePerUnitA - pricePerUnitB;
          });
          if (sortedProducts.length > 0 && sortedProducts[0].weight > 0) {
            costPerUnit = sortedProducts[0].price / sortedProducts[0].weight;
          }
        }
      } else {
        // Firebase에 없으면 ingredientPrices에서 조회
        const priceData = ingredientPrices.get(key);
        costPerUnit = priceData?.costPerUnit ?? ing.costPerUnit;
      }
      
      return sum + (costPerUnit * ing.quantity);
    }, 0);
    
    return recipe.baseServings > 0 ? totalCost / recipe.baseServings : totalCost;
  };

  // 필터링 및 정렬된 레시피
  const filteredRecipes = useMemo(() => {
    let filtered = recipes.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '전체' || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // 정렬은 이름순으로 고정
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, [recipes, searchQuery, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          레시피
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          레시피를 관리하고 조리 방법을 확인하세요
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="레시피 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('전체')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === '전체'
                ? 'bg-[#4D99CC] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#4D99CC] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 레시피 목록 - 2열 그리드 */}
      <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto min-h-0">
            {filteredRecipes.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
              </div>
            ) : (
              filteredRecipes.map((r) => {
                const youtubeLink = r.videos && r.videos.length > 0 ? r.videos[0] : null;
                
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecipe(r)}
                    className={`bg-gray-50 rounded-lg border transition-colors cursor-pointer overflow-hidden flex flex-col h-32 relative ${
                      selectedRecipe?.id === r.id
                        ? 'border-[#4D99CC]'
                        : 'border-gray-200 hover:border-[#4D99CC]'
                    }`}
                    style={r.color ? { borderLeftWidth: '4px', borderLeftColor: r.color } : undefined}
                  >
                    {/* 헤더 */}
                    <div className="p-4 flex-1">
                      {/* 첫 번째 줄: 카테고리, 색 점, 수정/삭제 버튼 */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {r.category && (
                            <span 
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                                getRecipeCategoryColor(r.category)
                              }`}
                            >
                              {r.category}
                            </span>
                          )}
                          {r.color && (
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
                              style={{ backgroundColor: r.color }}
                              title="요리 색"
                            />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRecipe(r);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="수정"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`"${r.name}" 레시피를 삭제하시겠습니까?`)) {
                                deleteRecipe(r.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded transition-colors"
                            title="삭제"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* 두 번째 줄: 메뉴 이름 */}
                      <p className="font-semibold text-base text-[#1A1A1A] mb-2">
                        {r.name}
                      </p>
                      
                      {/* 세 번째 줄: 설명 */}
                      {r.description && (
                        <p className="text-sm text-gray-600 truncate mt-1">{r.description}</p>
                      )}
                    </div>
                    
                    {/* 유튜브 링크 - 오른쪽 아래 */}
                    {youtubeLink && (
                      <div className="p-4 pt-0 flex justify-end">
                        <a
                          href={youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>레시피 보기</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
      </div>

      {/* 레시피 상세 모달 */}
      {selectedRecipe && (() => {
        // 레시피 버전 목록 생성 (예시: 된장찌개는 정호영, 백종원, 류수영 레시피가 있다고 가정)
        const getRecipeVariants = (recipeName: string): string[] => {
          if (recipeName === '된장찌개') {
            return ['메인', '정호영', '백종원', '류수영'];
          }
          // 다른 레시피는 기본적으로 메인만
          return ['메인'];
        };

        const recipeVariants = getRecipeVariants(selectedRecipe.name);
        const currentVariant = selectedRecipeVariant;
        
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] bg-black bg-opacity-50"
            onClick={() => {
              setSelectedRecipe(null);
              setSelectedRecipeVariant('메인');
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 overflow-y-auto flex-1">
                {(() => {
                  const recipe = selectedRecipe;
                  const costPerServing = calculateCostPerServing(recipe);
                  
                  // DailyMenu에서 메인 레시피 찾기 (오늘 날짜 기준)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const todayKey = format(today, 'yyyy-MM-dd');
                  const todayMenu = dailyMenuHistory.get(todayKey);
                  const mainRecipe = todayMenu?.recipes.find(r => r.name === recipe.name) || recipe;
                  
                  // 선택한 버전에 따라 레시피 데이터 변경 (현재는 메인만 사용)
                  const displayRecipe = mainRecipe;
                  
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
                            onClick={() => {
                              setSelectedRecipe(null);
                              setSelectedRecipeVariant('메인');
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="닫기"
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

                      {/* 레시피 버전 선택 탭 */}
                      <div className="mb-6">
                        <div className="flex gap-2 flex-wrap">
                          {recipeVariants.map((variant) => (
                            <button
                              key={variant}
                              onClick={() => setSelectedRecipeVariant(variant)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentVariant === variant
                                  ? 'bg-[#4D99CC] text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {variant === '메인' && (
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                              )}
                              {variant}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 재료 목록 */}
                      <div className="mb-6">
                        <h4 className="font-semibold mb-3">필요 재료 (1인분 기준)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {displayRecipe.ingredients.map((ingredient) => {
                            // 분석 탭의 재료 정보에서 메인 제품 가격 조회
                            const key = `${ingredient.name}_${ingredient.unit}`;
                            const matchingIngredient = firebaseIngredients.find(
                              ing => ing.name === ingredient.name && ing.unit === ingredient.unit
                            );
                            
                            // 메인 제품의 단위당 가격 계산
                            let costPerUnit = ingredient.costPerUnit;
                            if (matchingIngredient && matchingIngredient.products && matchingIngredient.products.length > 0) {
                              const mainProduct = matchingIngredient.products.find(p => p.isMain);
                              if (mainProduct && mainProduct.weight > 0) {
                                // 메인 제품의 단위당 가격
                                costPerUnit = mainProduct.price / mainProduct.weight;
                              } else {
                                // 메인 제품이 없으면 가장 저렴한 제품의 가격 사용
                                const sortedProducts = [...matchingIngredient.products].sort((a, b) => {
                                  const pricePerUnitA = a.weight > 0 ? a.price / a.weight : Infinity;
                                  const pricePerUnitB = b.weight > 0 ? b.price / b.weight : Infinity;
                                  return pricePerUnitA - pricePerUnitB;
                                });
                                if (sortedProducts.length > 0 && sortedProducts[0].weight > 0) {
                                  costPerUnit = sortedProducts[0].price / sortedProducts[0].weight;
                                }
                              }
                            } else {
                              // Firebase에 없으면 ingredientPrices에서 조회
                              const priceData = ingredientPrices.get(key);
                              costPerUnit = priceData?.costPerUnit ?? ingredient.costPerUnit;
                            }
                            
                            // 1인분 기준 수량 계산
                            const quantityPerServing = displayRecipe.baseServings > 0 
                              ? ingredient.quantity / displayRecipe.baseServings 
                              : ingredient.quantity;
                            
                            const ingredientCost = costPerUnit * quantityPerServing;
                            // 원가 표시: 재료 탭과 동일하게 /kg로 표시
                            const displayUnit = 'kg';
                            const pricePerUnit = costPerUnit > 0 ? costPerUnit : 0; // $/kg 단위로 표시 (변환 없이)
                            return (
                              <div
                                key={ingredient.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg min-w-0"
                              >
                                <span className="font-medium truncate flex-shrink-0 mr-2">{ingredient.name}</span>
                                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                                  <span className="text-gray-600 text-sm sm:text-base whitespace-nowrap">
                                    {formatNumber(quantityPerServing, 1)} g
                                  </span>
                                  <span className="text-sm font-medium text-[#4D99CC] whitespace-nowrap">
                                    {pricePerUnit > 0 ? `$${formatNumber(pricePerUnit, 1)}/${displayUnit}` : '-'}
                                  </span>
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
                          {displayRecipe.steps.map((step) => (
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
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 레시피 추가/수정 모달 */}
      <AddRecipeModal
        isOpen={isAddModalOpen || editingRecipe !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecipe(null);
        }}
        onAdd={(recipe) => {
          if (editingRecipe) {
            updateRecipe(recipe);
          } else {
            addRecipe(recipe);
          }
          setIsAddModalOpen(false);
          setEditingRecipe(null);
        }}
        initialRecipe={editingRecipe || undefined}
      />
    </div>
  );
}
