'use client';

import { useState } from 'react';
import { Recipe, RecipeCategory, sampleRecipes, getRecipeCategoryColor } from '@/types/recipe';

interface RecipeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipeIds: string[]) => void;
  currentRecipeIds: string[];
}

const categories: RecipeCategory[] = ['밥', '메인 요리', '사이드 요리', '기본 반찬', '국'];

export default function RecipeSelectModal({
  isOpen,
  onClose,
  onSelect,
  currentRecipeIds,
}: RecipeSelectModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentRecipeIds));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | '전체'>('전체');

  if (!isOpen) return null;

  const filteredRecipes = sampleRecipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleRecipe = (recipeId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(recipeId)) {
      newSet.delete(recipeId);
    } else {
      newSet.add(recipeId);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            메뉴 등록
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-4 border-b border-gray-200">
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
                    : `${getRecipeCategoryColor(category)} hover:opacity-80`
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="레시피 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
          />
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {filteredRecipes.map((recipe) => {
              const isSelected = selectedIds.has(recipe.id);
              return (
                <div
                  key={recipe.id}
                  onClick={() => toggleRecipe(recipe.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#4D99CC] bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg" style={{ color: '#1A1A1A' }}>
                        {recipe.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{recipe.description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ml-4 ${
                        isSelected
                          ? 'bg-[#4D99CC] border-[#4D99CC]'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#4D99CC] text-white rounded-lg hover:bg-[#3d89bc] transition-colors text-sm font-medium"
          >
            등록 ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
