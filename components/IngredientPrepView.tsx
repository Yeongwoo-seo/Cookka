'use client';

import { useState, useMemo, Dispatch, SetStateAction } from 'react';
import { DailyMenu } from '@/types/daily-menu';
import { Ingredient } from '@/types/recipe';

interface IngredientPrepViewProps {
  dailyMenu: DailyMenu;
  preparedIngredients: Set<string>;
  setPreparedIngredients: Dispatch<SetStateAction<Set<string>>>;
  onComplete?: () => void;
  showButton?: boolean;
}

export default function IngredientPrepView({
  dailyMenu,
  preparedIngredients,
  setPreparedIngredients,
  onComplete,
  showButton = true,
}: IngredientPrepViewProps) {
  const [recentlyChecked, setRecentlyChecked] = useState<Set<string>>(new Set());
  // 모든 레시피의 재료를 통합하고 중복 제거
  const allIngredients = useMemo(() => {
    const ingredientMap = new Map<string, Ingredient>();

    dailyMenu.recipes.forEach((recipe) => {
      const scale = dailyMenu.servings / recipe.baseServings;
      recipe.ingredients.forEach((ing) => {
        const key = `${ing.name}_${ing.unit}`;
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.quantity += ing.quantity * scale;
        } else {
          ingredientMap.set(key, {
            ...ing,
            id: key, // 통합된 재료는 key를 id로 사용
            quantity: ing.quantity * scale,
          });
        }
      });
    });

    return Array.from(ingredientMap.values());
  }, [dailyMenu]);

  const toggleIngredient = (ingredientId: string) => {
    const newSet = new Set(preparedIngredients);
    if (newSet.has(ingredientId)) {
      newSet.delete(ingredientId);
      setRecentlyChecked((prev) => {
        const updated = new Set(prev);
        updated.delete(ingredientId);
        return updated;
      });
    } else {
      newSet.add(ingredientId);
      setRecentlyChecked((prev) => {
        const updated = new Set(prev);
        updated.add(ingredientId);
        // 0.5초 후 애니메이션 제거
        setTimeout(() => {
          setRecentlyChecked((current) => {
            const updated = new Set(current);
            updated.delete(ingredientId);
            return updated;
          });
        }, 500);
        return updated;
      });
    }
    setPreparedIngredients(newSet);
  };

  const isAllPrepared = allIngredients.every((ing) =>
    preparedIngredients.has(ing.id)
  );

  const toggleAll = () => {
    if (isAllPrepared) {
      // 모두 해제
      setPreparedIngredients(new Set());
    } else {
      // 모두 선택
      const allIds = new Set(allIngredients.map((ing) => ing.id));
      setPreparedIngredients(allIds);
    }
  };

  // 2열로 나누기
  const leftColumn = allIngredients.filter((_, index) => index % 2 === 0);
  const rightColumn = allIngredients.filter((_, index) => index % 2 === 1);

  return (
    <div className="w-full">
      <div className="bg-transparent">
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleAll}
            className="px-4 py-2 text-sm font-medium text-[#4D99CC] hover:text-[#3d89bc] transition-colors"
          >
            {isAllPrepared ? '모두 해제' : '모두 선택'}
          </button>
        </div>
        <div className="bg-gray-100 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            {/* 왼쪽 열 */}
            <div className="space-y-3">
              {leftColumn.map((ingredient) => {
                const isChecked = preparedIngredients.has(ingredient.id);
                return (
                  <label
                    key={ingredient.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleIngredient(ingredient.id)}
                      className={`w-5 h-5 rounded border-2 cursor-pointer ${
                        recentlyChecked.has(ingredient.id) ? 'checkbox-animate' : ''
                      }`}
                      style={{
                        accentColor: isChecked ? '#4D99CC' : '#9CA3AF',
                      }}
                    />
                    <span
                      className={`text-base ${
                        isChecked ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {ingredient.name}{' '}
                      {ingredient.quantity.toFixed(1)} {ingredient.unit}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* 오른쪽 열 */}
            <div className="space-y-3">
              {rightColumn.map((ingredient) => {
                const isChecked = preparedIngredients.has(ingredient.id);
                return (
                  <label
                    key={ingredient.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleIngredient(ingredient.id)}
                      className={`w-5 h-5 rounded border-2 cursor-pointer ${
                        recentlyChecked.has(ingredient.id) ? 'checkbox-animate' : ''
                      }`}
                      style={{
                        accentColor: isChecked ? '#4D99CC' : '#9CA3AF',
                      }}
                    />
                    <span
                      className={`text-base ${
                        isChecked ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {ingredient.name}{' '}
                      {ingredient.quantity.toFixed(1)} {ingredient.unit}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* 플로팅 조리 시작 버튼 - 네비게이션 바로 위 */}
      {showButton && onComplete && (
        <div 
          className="fixed left-0 right-0 z-50 px-4"
          style={{
            bottom: `calc(var(--safari-address-bar-height, 44px) + 70px + 13px + var(--safe-area-inset-bottom))`
          }}
        >
          <div className="max-w-4xl mx-auto">
            <button
              onClick={onComplete}
              disabled={!isAllPrepared}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg ${
                isAllPrepared
                  ? 'bg-[#4D99CC] text-white hover:bg-[#3d89bc] cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              조리 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
