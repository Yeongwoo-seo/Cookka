'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { Recipe, RecipeCategory, Ingredient, RecipeStep, getRecipeCategoryColor } from '@/types/recipe';
import { format } from 'date-fns';
import AddRecipeModal from './AddRecipeModal';

const categories: RecipeCategory[] = ['메인 요리', '사이드 요리', '기본 반찬', '국'];

export default function RecipeBoardView() {
  const recipes = useAppStore((state) => state.recipes);
  const updateRecipe = useAppStore((state) => state.updateRecipe);
  const addRecipe = useAppStore((state) => state.addRecipe);
  const deleteRecipe = useAppStore((state) => state.deleteRecipe);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);
  const loadSampleData = useAppStore((state) => state.loadSampleData);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeVariant, setSelectedRecipeVariant] = useState<string>('메인');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | '전체'>('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editIngredientData, setEditIngredientData] = useState<{ name: string; quantity: string; unit: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로딩
  useEffect(() => {
    if (recipes.length === 0) {
      loadSampleData();
    }
    // 데이터가 로드되면 로딩 상태 해제
    if (recipes.length > 0) {
      setIsLoading(false);
    }
  }, [recipes.length, loadSampleData]);

  // 1인당 원가 계산
  const calculateCostPerServing = (recipe: Recipe): number => {
    const totalCost = recipe.ingredients.reduce((sum, ing) => {
      return sum + (ing.costPerUnit * ing.quantity);
    }, 0);
    return totalCost / recipe.baseServings;
  };

  // 필터링된 레시피 목록 (밥 제외)
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // 밥 카테고리는 제외
      if (recipe.category === '밥') return false;
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '전체' || recipe.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, searchQuery, selectedCategory]);

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

  if (isLoading || recipes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-full flex flex-col overflow-hidden">
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* 카테고리 필터 */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-[#4D99CC] text-white'
                          : `${getRecipeCategoryColor(category)} hover:opacity-80`
                      }`}
                    >
                      {category}
                    </button>
                  ))}
            </div>
          </div>
        </div>

        {/* 검색 */}
        <div className="mb-4 flex-shrink-0">
              <input
                type="text"
                placeholder="레시피 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
              />
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
                      className={`bg-gray-50 rounded-lg border transition-colors cursor-pointer overflow-hidden flex flex-col h-32 ${
                        selectedRecipe?.id === r.id
                          ? 'border-[#4D99CC]'
                          : 'border-gray-200 hover:border-[#4D99CC]'
                      }`}
                    >
                      {/* 헤더 */}
                      <div className="p-4 flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {/* 왼쪽: 레시피 이름과 카테고리 */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <p className="font-semibold text-base text-[#1A1A1A] truncate">
                              {r.name}
                            </p>
                            {r.category && (
                              <span 
                                className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                  getRecipeCategoryColor(r.category)
                                }`}
                              >
                                {r.category}
                              </span>
                            )}
                          </div>
                          
                          {/* 오른쪽: 수정/삭제 아이콘 */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRecipe(r);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="수정"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`"${r.name}" 레시피를 삭제하시겠습니까?`)) {
                                  deleteRecipe(r.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {r.description && (
                          <p className="text-sm text-gray-600 truncate">{r.description}</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
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
                              ${(costPerServing / 1000).toFixed(1)}
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
                        <h4 className="font-semibold mb-3">필요 재료 ({displayRecipe.baseServings}인분 기준)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {displayRecipe.ingredients.map((ingredient) => {
                            const ingredientCost = ingredient.costPerUnit * ingredient.quantity;
                            return (
                              <div
                                key={ingredient.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group"
                              >
                                <span className="font-medium">{ingredient.name}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-600">
                                    {ingredient.quantity % 1 === 0 ? ingredient.quantity.toString() : ingredient.quantity.toFixed(1)} {ingredient.unit}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ${(ingredientCost / 1000).toFixed(1)}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {editingIngredient === ingredient.id ? (
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
                                              const newIngredients = displayRecipe.ingredients.map((ing) =>
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
                                            setEditingIngredient(ingredient.id);
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
                                              const newIngredients = displayRecipe.ingredients.filter(
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

                      {/* 주의사항 */}
                      {displayRecipe.notes && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800">
                            ⚠️ 주의사항
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">{displayRecipe.notes}</p>
                        </div>
                      )}

                      {/* 업데이트 정보 */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          마지막 업데이트:{' '}
                          {format(displayRecipe.updatedAt, 'yyyy년 MM월 dd일 HH:mm')}
                          {displayRecipe.updatedBy && ` by ${displayRecipe.updatedBy}`}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 레시피 추가 모달 */}
      {isAddModalOpen && (
        <AddRecipeModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(recipe) => {
            addRecipe(recipe);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* 레시피 수정 모달 */}
      {editingRecipe && (
        <AddRecipeModal
          initialRecipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onAdd={(recipe) => {
            updateRecipe(recipe);
            setEditingRecipe(null);
            // 수정된 레시피가 선택되어 있으면 업데이트
            if (selectedRecipe?.id === recipe.id) {
              setSelectedRecipe(recipe);
            }
          }}
        />
      )}

      {/* Floating 레시피 추가 버튼 - 모달이 열려있을 때는 숨김 */}
      {!isAddModalOpen && (
        <div className="fixed bottom-24 right-6 z-50">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-[#4D99CC] text-white rounded-full shadow-lg hover:bg-[#3d89bc] transition-colors flex items-center gap-2 font-medium"
          >
            <svg
              className="w-5 h-5"
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
            레시피 추가
          </button>
        </div>
      )}
    </div>
  );
}
