'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { isLowStock, isExpiringSoon, isExpired, InventoryItem } from '@/types/inventory';
import { IngredientCategory } from '@/types/recipe';
import { format } from 'date-fns';
import AddInventoryModal from './AddInventoryModal';
import InventoryHistoryModal from './InventoryHistoryModal';

type SortField = 'name' | 'category' | 'currentStock' | 'expirationDate' | 'purchaseDate' | 'averageCost' | null;
type SortDirection = 'asc' | 'desc' | null;

// 재료 이름을 기반으로 카테고리 분류 (재료 가격과 동일)
const getInventoryCategory = (name: string): IngredientCategory => {
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

// 재료 카테고리 색상 매핑 (재료 가격과 동일)
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

// FIFO 방식으로 원가 계산
const calculateFIFOCost = (item: InventoryItem): number => {
  if (!item.purchaseHistory || item.purchaseHistory.length === 0) {
    return item.costPerUnit;
  }

  // 구매 이력을 날짜순으로 정렬 (오래된 것부터)
  const sortedHistory = [...item.purchaseHistory].sort(
    (a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()
  );

  let remainingStock = item.currentStock;
  let totalCost = 0;

  for (const purchase of sortedHistory) {
    if (remainingStock <= 0) break;
    
    const usedQuantity = Math.min(remainingStock, purchase.quantity);
    totalCost += usedQuantity * purchase.costPerUnit;
    remainingStock -= usedQuantity;
  }

  // 구매 이력으로 모두 커버되지 않으면 나머지는 현재 costPerUnit 사용
  if (remainingStock > 0) {
    totalCost += remainingStock * item.costPerUnit;
  }

  return item.currentStock > 0 ? totalCost / item.currentStock : item.costPerUnit;
};

// Weighted Average 방식으로 원가 계산
const calculateWeightedAverageCost = (item: InventoryItem): number => {
  if (!item.purchaseHistory || item.purchaseHistory.length === 0) {
    return item.costPerUnit;
  }

  let totalQuantity = 0;
  let totalCost = 0;

  for (const purchase of item.purchaseHistory) {
    totalQuantity += purchase.quantity;
    totalCost += purchase.quantity * purchase.costPerUnit;
  }

  // 구매 이력의 총량이 현재 재고보다 적으면 나머지는 현재 costPerUnit 사용
  if (totalQuantity < item.currentStock) {
    const remainingQuantity = item.currentStock - totalQuantity;
    totalQuantity += remainingQuantity;
    totalCost += remainingQuantity * item.costPerUnit;
  }

  return totalQuantity > 0 ? totalCost / totalQuantity : item.costPerUnit;
};

// 가장 최근 구매일 가져오기
const getLatestPurchaseDate = (item: InventoryItem): Date | null => {
  if (!item.purchaseHistory || item.purchaseHistory.length === 0) {
    return null;
  }
  
  // 구매 이력을 날짜순으로 정렬 (최신 것부터)
  const sortedHistory = [...item.purchaseHistory].sort(
    (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
  );
  
  return sortedHistory[0].purchaseDate;
};

export default function InventoryView() {
  const inventory = useAppStore((state) => state.inventory);
  const updateInventoryItem = useAppStore((state) => state.updateInventoryItem);
  const addInventoryItem = useAppStore((state) => state.addInventoryItem);
  const deleteInventoryItem = useAppStore((state) => state.deleteInventoryItem);

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | '전체'>('전체');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const lowStockItems = inventory.filter(isLowStock);
  const expiringItems = inventory.filter(isExpiringSoon);
  const expiredItems = inventory.filter(isExpired);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 방향 토글
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 카테고리별로 그룹화
  const groupedInventory = useMemo(() => {
    const grouped = new Map<IngredientCategory, InventoryItem[]>();
    
    inventory.forEach((item) => {
      const category = getInventoryCategory(item.name);
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    });

    // 각 카테고리 내에서 정렬
    grouped.forEach((items, category) => {
      if (sortField && sortDirection) {
        items.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (sortField) {
            case 'name':
              aValue = a.name;
              bValue = b.name;
              break;
            case 'category':
          aValue = getInventoryCategory(a.name);
          bValue = getInventoryCategory(b.name);
          break;
            case 'currentStock':
              aValue = a.currentStock;
              bValue = b.currentStock;
              break;
            case 'expirationDate':
              aValue = a.expirationDate?.getTime() || 0;
              bValue = b.expirationDate?.getTime() || 0;
              break;
            case 'purchaseDate':
              aValue = getLatestPurchaseDate(a)?.getTime() || 0;
              bValue = getLatestPurchaseDate(b)?.getTime() || 0;
              break;
            case 'averageCost':
              aValue = calculateWeightedAverageCost(a);
              bValue = calculateWeightedAverageCost(b);
              break;
            default:
              return 0;
          }

          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
    });

    return grouped;
  }, [inventory, sortField, sortDirection]);

  // 필터링된 재고 목록
  const filteredInventory = useMemo(() => {
    if (selectedCategory === '전체') {
      return inventory;
    }
    return groupedInventory.get(selectedCategory) || [];
  }, [inventory, selectedCategory, groupedInventory]);

  const sortedInventory = useMemo(() => {
    if (!sortField || !sortDirection) return filteredInventory;

    return [...filteredInventory].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'category':
          aValue = getInventoryCategory(a.name);
          bValue = getInventoryCategory(b.name);
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'expirationDate':
          aValue = a.expirationDate?.getTime() || 0;
          bValue = b.expirationDate?.getTime() || 0;
          break;
        case 'purchaseDate':
          aValue = getLatestPurchaseDate(a)?.getTime() || 0;
          bValue = getLatestPurchaseDate(b)?.getTime() || 0;
          break;
        case 'averageCost':
          aValue = calculateWeightedAverageCost(a);
          bValue = calculateWeightedAverageCost(b);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInventory, sortField, sortDirection]);

  const categories: (IngredientCategory | '전체')[] = ['전체', '육류', '채소', '조미료', '곡물', '기타'];

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">

        {/* 수정 모드 토글 버튼 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
          {categories.map((category) => {
          const count = category === '전체' 
            ? inventory.length 
            : groupedInventory.get(category)?.length || 0;
          
          if (category !== '전체' && count === 0) return null;
          
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#4D99CC] text-white'
                  : category === '전체'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : `${getIngredientCategoryColor(category)} hover:opacity-80`
              }`}
            >
              {category}
            </button>
          );
        })}
        </div>
        
        {/* 수정 모드 토글 버튼 */}
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isEditMode
              ? 'bg-[#4D99CC] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isEditMode ? '수정 완료' : '수정'}
        </button>
      </div>

      {/* 재고 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-2">
                    <span>카테고리</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${sortField === 'category' && sortDirection === 'asc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${sortField === 'category' && sortDirection === 'desc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    <span>상품명</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${sortField === 'name' && sortDirection === 'asc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${sortField === 'name' && sortDirection === 'desc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('currentStock')}
                >
                  <div className="flex items-center gap-2">
                    <span>현재 재고</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${sortField === 'currentStock' && sortDirection === 'asc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${sortField === 'currentStock' && sortDirection === 'desc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('purchaseDate')}
                >
                  <div className="flex items-center gap-2">
                    <span>구매일</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${sortField === 'purchaseDate' && sortDirection === 'asc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${sortField === 'purchaseDate' && sortDirection === 'desc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('expirationDate')}
                >
                  <div className="flex items-center gap-2">
                    <span>유통기한</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${sortField === 'expirationDate' && sortDirection === 'asc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${sortField === 'expirationDate' && sortDirection === 'desc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('averageCost')}
                >
                  <div className="flex items-center gap-2">
                    <span>원가</span>
                    <div className="flex flex-col">
                      <svg
                        className={`w-3 h-3 ${sortField === 'averageCost' && sortDirection === 'asc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      <svg
                        className={`w-3 h-3 -mt-1 ${sortField === 'averageCost' && sortDirection === 'desc' ? 'text-black' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <span>{isEditMode ? '수정/삭제' : '관리'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedInventory.map((item) => {
                const lowStock = isLowStock(item);
                const expiring = isExpiringSoon(item);
                const expired = isExpired(item);
                const category = getInventoryCategory(item.name);

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getIngredientCategoryColor(category)}`}>
                        {category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.currentStock} {item.unit}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getLatestPurchaseDate(item)
                          ? format(getLatestPurchaseDate(item)!, 'yyyy-MM-dd')
                          : ''}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.expirationDate
                          ? format(item.expirationDate, 'yyyy-MM-dd')
                          : ''}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${(calculateWeightedAverageCost(item) / 1000).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {isEditMode ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="수정"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${item.name}" 재고를 삭제하시겠습니까?`)) {
                                deleteInventoryItem(item.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedItemForHistory(item);
                            setIsHistoryModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-[#4D99CC] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          히스토리
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* 재고 등록/수정 모달 */}
      <AddInventoryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onAdd={(item) => {
          if (editingItem) {
            updateInventoryItem(item);
            setEditingItem(null);
          } else {
            addInventoryItem(item);
          }
        }}
        initialItem={editingItem || undefined}
      />

      {/* 입/출고 히스토리 모달 */}
      <InventoryHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedItemForHistory(null);
        }}
        item={selectedItemForHistory}
      />

      {/* 재고 등록 플로팅 버튼 */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-[#4D99CC] text-white rounded-full shadow-lg hover:bg-[#3d89bc] transition-colors flex items-center justify-center"
        title="재고 등록"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </>
  );
}
