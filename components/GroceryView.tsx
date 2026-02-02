'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { getIngredients } from '@/lib/firestore';
import { format, startOfWeek, getDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Recipe, Ingredient } from '@/types/recipe';
import { scaledIngredients } from '@/types/recipe';

const STORAGE_KEY_PREFIX = 'grocery-done-';

interface GroceryItem {
  name: string;
  unit: string;
  quantity: number;
  key: string; // `${supplier}|${name}|${unit}` for checkbox id
}

/** 주간(월~금) 날짜 배열 */
function getWeekDays(refDate: Date): Date[] {
  const day = getDay(refDate);
  const monOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(refDate, monOffset);
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    days.push(addDays(monday, i));
  }
  return days;
}

/** 해당 주의 스토리지 키 (월요일 날짜 기준) */
function getWeekStorageKey(refDate: Date): string {
  const monday = getWeekDays(refDate)[0];
  return `${STORAGE_KEY_PREFIX}${format(monday, 'yyyy-MM-dd')}`;
}

/** 주간 식단표 기준 필요한 재료 집계 (이름+단위별 수량 합) */
function aggregateWeeklyIngredients(
  dailyMenuHistory: Map<string, { recipes: Recipe[]; servings: number }>,
  weekDays: Date[],
  recipesById: Map<string, Recipe>
): Map<string, { name: string; unit: string; quantity: number }> {
  const agg = new Map<string, { name: string; unit: string; quantity: number }>();
  const key = (name: string, unit: string) => `${name}|${unit}`;

  weekDays.forEach((d) => {
    const dateKey = format(d, 'yyyy-MM-dd');
    const menu = dailyMenuHistory.get(dateKey);
    if (!menu || !menu.recipes.length) return;
    const servings = menu.servings;
    menu.recipes.forEach((r) => {
      const full = recipesById.get(r.id) || r;
      const scaled = scaledIngredients(full.ingredients, servings, full.baseServings);
      scaled.forEach((ing) => {
        const k = key(ing.name, ing.unit);
        const cur = agg.get(k);
        if (cur) {
          cur.quantity += ing.quantity;
        } else {
          agg.set(k, { name: ing.name, unit: ing.unit, quantity: ing.quantity });
        }
      });
    });
  });

  return agg;
}

/** 구매처별로 그룹 (재료 마스터에 products.supplier 사용, 없으면 '미정') */
function groupBySupplier(
  aggregated: Map<string, { name: string; unit: string; quantity: number }>,
  firebaseIngredients: Ingredient[]
): Map<string, GroceryItem[]> {
  const bySupplier = new Map<string, GroceryItem[]>();
  const ingByKey = new Map<string, Ingredient>();
  firebaseIngredients.forEach((ing) => {
    ingByKey.set(`${ing.name}|${ing.unit}`, ing);
  });

  aggregated.forEach((v, k) => {
    const ing = ingByKey.get(k);
    let supplier = '미정';
    if (ing?.products?.length) {
      const main = ing.products.find((p) => p.isMain) || ing.products[0];
      supplier = main.supplier || '미정';
    }
    const itemKey = `${supplier}|${v.name}|${v.unit}`;
    const item: GroceryItem = { ...v, key: itemKey };
    const list = bySupplier.get(supplier) || [];
    list.push(item);
    bySupplier.set(supplier, list);
  });

  return bySupplier;
}

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

// 재료는 g 기준 통일
function formatQuantity(qty: number, _unit: string): string {
  return `${formatNumber(qty, 1)}g`;
}

export default function GroceryView() {
  const recipes = useAppStore((state) => state.recipes);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);

  const [firebaseIngredients, setFirebaseIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  // 주말이면 다음 주 월요일 기준이 디폴트 (다음 주 장보기)
  const [weekRefDate, setWeekRefDate] = useState(() => {
    const today = new Date();
    const d = getDay(today);
    if (d === 0 || d === 6) {
      const monOffset = d === 0 ? 1 : 2;
      return addDays(today, monOffset);
    }
    return today;
  });
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set());

  const weekDays = useMemo(() => getWeekDays(weekRefDate), [weekRefDate]);
  const weekStorageKey = useMemo(() => getWeekStorageKey(weekRefDate), [weekRefDate]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getIngredients()
      .then((list) => {
        if (mounted) setFirebaseIngredients(list);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(weekStorageKey);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        setCheckedKeys(new Set(arr));
      } else {
        setCheckedKeys(new Set());
      }
    } catch {
      setCheckedKeys(new Set());
    }
  }, [weekStorageKey]);

  const recipesById = useMemo(() => {
    const m = new Map<string, Recipe>();
    recipes.forEach((r) => m.set(r.id, r));
    return m;
  }, [recipes]);

  const aggregated = useMemo(() => {
    const historyAsMenus = new Map<string, { recipes: Recipe[]; servings: number }>();
    dailyMenuHistory.forEach((menu, dateKey) => {
      historyAsMenus.set(dateKey, {
        recipes: menu.recipes,
        servings: menu.servings,
      });
    });
    return aggregateWeeklyIngredients(historyAsMenus, weekDays, recipesById);
  }, [dailyMenuHistory, weekDays, recipesById]);

  const bySupplier = useMemo(
    () => groupBySupplier(aggregated, firebaseIngredients),
    [aggregated, firebaseIngredients]
  );

  const supplierList = useMemo(() => Array.from(bySupplier.keys()).sort(), [bySupplier]);

  const toggleChecked = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(weekStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const pendingSuppliers = useMemo(() => {
    return supplierList.filter((supplier) => {
      const items = bySupplier.get(supplier) || [];
      const allChecked = items.every((it) => checkedKeys.has(it.key));
      return !allChecked;
    });
  }, [supplierList, bySupplier, checkedKeys]);

  const doneSuppliers = useMemo(() => {
    return supplierList.filter((supplier) => {
      const items = bySupplier.get(supplier) || [];
      return items.length > 0 && items.every((it) => checkedKeys.has(it.key));
    });
  }, [supplierList, bySupplier, checkedKeys]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">재료 목록 불러오는 중...</p>
      </div>
    );
  }

  const weekLabel = `${format(weekDays[0], 'M/d', { locale: ko })} ~ ${format(weekDays[4], 'M/d', { locale: ko })}`;

  const goPrevWeek = () => {
    const monday = getWeekDays(weekRefDate)[0];
    setWeekRefDate(addDays(monday, -7));
  };
  const goNextWeek = () => {
    const monday = getWeekDays(weekRefDate)[0];
    setWeekRefDate(addDays(monday, 7));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 pb-24">
      <h1 className="text-lg font-semibold text-gray-900 mb-2">장보기</h1>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={goPrevWeek}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="이전 주"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm text-gray-600 flex-1 text-center">
          {weekLabel} (월~금)
        </p>
        <button
          type="button"
          onClick={goNextWeek}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          aria-label="다음 주"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {supplierList.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center text-gray-500">
          이번 주 식단표에 등록된 메뉴가 없거나, 재료/구매처 정보가 없습니다.
        </div>
      ) : (
        <>
          {/* 미완료 구매처: V 누르면 아래에 장보기 체크리스트 */}
          {pendingSuppliers.map((supplier) => {
            const items = bySupplier.get(supplier) || [];
            const isExpanded = expandedSupplier === supplier;
            return (
              <div
                key={supplier}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3 shadow-sm"
              >
                <button
                  type="button"
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedSupplier(isExpanded ? null : supplier)}
                >
                  <span className="font-medium text-gray-900">{supplier}</span>
                  <span className="text-gray-500 text-sm">
                    {items.filter((it) => checkedKeys.has(it.key)).length}/{items.length}
                  </span>
                  <span
                    className={`inline-flex transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-4 pt-2">
                    <p className="text-xs text-gray-500 mb-2">장보기 체크리스트</p>
                    <ul className="space-y-2">
                      {items.map((it) => (
                        <li key={it.key} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={it.key}
                            checked={checkedKeys.has(it.key)}
                            onChange={() => toggleChecked(it.key)}
                            className="rounded border-gray-300 text-[#4D99CC] focus:ring-[#4D99CC]"
                          />
                          <label htmlFor={it.key} className="flex-1 text-sm text-gray-800 cursor-pointer">
                            {it.name} {formatQuantity(it.quantity, it.unit)}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* 완료된 구매처: 아래로 내려가고 "다 됐어요" 표시 */}
          {doneSuppliers.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">완료</p>
              {doneSuppliers.map((supplier) => (
                <div
                  key={supplier}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between mb-2"
                >
                  <span className="font-medium text-green-800">{supplier}</span>
                  <span className="text-green-600 text-sm">다 됐어요 ✓</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
