'use client';

import { Dispatch, SetStateAction } from 'react';
import { DailyMenu } from '@/types/daily-menu';
import IngredientPrepView from './IngredientPrepView';
import CookingView from './CookingView';
import CookingCompleteView from './CookingCompleteView';

type ViewState = 'prep' | 'cooking' | 'complete';

interface CookingSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  dailyMenu: DailyMenu;
  viewState: ViewState;
  preparedIngredients: Set<string>;
  setPreparedIngredients: Dispatch<SetStateAction<Set<string>>>;
  completedSteps: Set<string>;
  setCompletedSteps: Dispatch<SetStateAction<Set<string>>>;
  onPrepComplete: () => void;
  onCookingComplete: () => void;
}

export default function CookingSidePanel({
  isOpen,
  onClose,
  dailyMenu,
  viewState,
  preparedIngredients,
  setPreparedIngredients,
  completedSteps,
  setCompletedSteps,
  onPrepComplete,
  onCookingComplete,
}: CookingSidePanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 사이드 패널 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 side-panel flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            {viewState === 'prep' && '재료 준비'}
            {viewState === 'cooking' && '조리 진행'}
            {viewState === 'complete' && '조리 완료'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {viewState === 'prep' && (
            <IngredientPrepView
              dailyMenu={dailyMenu}
              preparedIngredients={preparedIngredients}
              setPreparedIngredients={setPreparedIngredients}
              showButton={false}
            />
          )}
          {viewState === 'cooking' && (
            <CookingView
              dailyMenu={dailyMenu}
              completedSteps={completedSteps}
              setCompletedSteps={setCompletedSteps}
              onComplete={onCookingComplete}
            />
          )}
          {viewState === 'complete' && (
            <CookingCompleteView dailyMenu={dailyMenu} />
          )}
        </div>

        {/* 하단 고정 버튼 - 재료 준비: 조리 시작 / 조리 완료: 조리 완료(닫기) - 조리시작과 같은 위치 */}
        {viewState === 'prep' && (() => {
          const ingredientMap = new Map<string, string>();
          dailyMenu.recipes.forEach((recipe) => {
            recipe.ingredients.forEach((ing) => {
              const key = `${ing.name}_${ing.unit}`;
              if (!ingredientMap.has(key)) ingredientMap.set(key, key);
            });
          });
          const allIngredients = Array.from(ingredientMap.values());
          const isAllPrepared = allIngredients.every((key) => preparedIngredients.has(key));

          return (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button
                onClick={onPrepComplete}
                disabled={!isAllPrepared}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors shadow-md ${
                  isAllPrepared
                    ? 'bg-[#4D99CC] text-white hover:bg-[#3d89bc] cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                조리 시작
              </button>
            </div>
          );
        })()}
        {viewState === 'complete' && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-xl font-semibold text-lg transition-colors shadow-md bg-[#4D99CC] text-white hover:bg-[#3d89bc] cursor-pointer"
            >
              조리 완료
            </button>
          </div>
        )}
      </div>
    </>
  );
}
