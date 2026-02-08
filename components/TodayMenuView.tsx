'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { DailyMenu } from '@/types/daily-menu';
import { getRecipeCategoryColor } from '@/types/recipe';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodayMenuViewProps {
  dailyMenu: DailyMenu;
  currentDate: Date;
  onStartCooking: () => void;
  onEdit?: () => void;
  onAddMenu?: () => void;
  onServingsChange?: (servings: number) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}

export default function TodayMenuView({
  dailyMenu,
  currentDate,
  onStartCooking,
  onEdit,
  onAddMenu,
  onServingsChange,
  onPrevDay,
  onNextDay,
}: TodayMenuViewProps) {
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);
  const [localServings, setLocalServings] = useState(dailyMenu.servings);
  const [isEditingServings, setIsEditingServings] = useState(false);
  const [editServingsValue, setEditServingsValue] = useState(dailyMenu.servings.toString());

  // dailyMenu.servings가 변경되면 localServings도 업데이트
  useEffect(() => {
    setLocalServings(dailyMenu.servings);
    setEditServingsValue(dailyMenu.servings.toString());
  }, [dailyMenu.servings]);

  // 현재 날짜 기준 주간 월~금 날짜 목록 (5일만, 주말 제외)
  const weekDays = useMemo(() => {
    try {
      const date = new Date(dailyMenu.date);
      date.setHours(0, 0, 0, 0);
      const thisWeekStart = startOfWeek(date, { weekStartsOn: 1 }); // 해당 주 월요일
      
      // 월~금 (5일)만 직접 생성 - 주말 완전 제외
      const weekdays = [];
      for (let i = 0; i < 5; i++) { // 0=월, 1=화, 2=수, 3=목, 4=금
        const day = new Date(thisWeekStart.getTime() + i * 24 * 60 * 60 * 1000);
        weekdays.push(day);
      }
      
      return weekdays;
    } catch (error) {
      console.error('Error calculating weekDays:', error);
      return [];
    }
  }, [dailyMenu.date]);
  
  // 1월 19일~22일 사이인지 확인
  const isTodayMenu = useMemo(() => {
    const date = new Date(dailyMenu.date);
    const month = date.getMonth() + 1; // 1월 = 1
    const day = date.getDate();
    return month === 1 && day >= 19 && day <= 22;
  }, [dailyMenu.date]);

  const handleServingsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setLocalServings(numValue);
    if (onServingsChange) {
      onServingsChange(numValue);
    }
  };

  const handleEditServingsClick = () => {
    // 메뉴 등록 모달 열기 (전체 수정 가능)
    if (onEdit) {
      onEdit();
    }
  };

  const handleSaveServings = () => {
    const numValue = parseInt(editServingsValue) || 0;
    if (numValue > 0) {
      setLocalServings(numValue);
      if (onServingsChange) {
        onServingsChange(numValue);
      }
    }
    setIsEditingServings(false);
  };

  // 주간 식단표 렌더링 함수 (공통)
  const renderWeeklyMenuTable = () => (
    <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-xl font-bold mb-6" style={{ color: '#1A1A1A' }}>
        주간 식단표
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {weekDays && weekDays.length > 0 ? weekDays.map((date) => {
                try {
                  const month = format(date, 'M', { locale: ko });
                  const day = format(date, 'd', { locale: ko });
                  const dayName = format(date, 'EEEEE', { locale: ko }); // 한 글자 요일
                  return (
                    <th
                      key={format(date, 'yyyy-MM-dd')}
                      className="bg-blue-100 border border-gray-300 py-3 px-4 text-center font-semibold text-sm text-gray-800"
                    >
                      {month}/{day} ({dayName})
                    </th>
                  );
                } catch (error) {
                  console.error('Error formatting date:', error);
                  return null;
                }
              }) : (
                <th colSpan={5} className="bg-blue-100 border border-gray-300 py-3 px-4 text-center font-semibold text-sm text-gray-800">
                  주간 식단표 데이터 없음
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekDays && weekDays.length > 0 ? weekDays.map((date) => {
                try {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const menu = dailyMenuHistory?.get(dateKey);
                  const isCurrentDate = isSameDay(date, new Date(dailyMenu.date));
                  
                  return (
                    <td
                      key={dateKey}
                      className={`border border-gray-300 py-4 px-4 text-center ${
                        isCurrentDate ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex flex-col items-center h-full">
                        <div className="flex-1 w-full">
                          {menu && menu.recipes && menu.recipes.length > 0 ? (
                            <div className="space-y-1">
                              {menu.recipes.map((recipe) => (
                                <div
                                  key={recipe.id}
                                  className="text-xs text-gray-800 px-1 py-0.5 rounded bg-gray-50"
                                >
                                  {recipe.name}
                                </div>
                              ))}
                              {menu.servings && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {menu.servings}개
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">없음</div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                } catch (error) {
                  console.error('Error rendering date cell:', error);
                  return null;
                }
              }) : (
                <td colSpan={5} className="border border-gray-300 py-4 px-4 text-center text-gray-400">
                  주간 식단표 데이터 없음
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  if (dailyMenu.recipes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {onPrevDay && (
            <button
              onClick={onPrevDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div className="text-center">
            <h2 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>
              {format(currentDate, 'yyyy년 MM월 dd일')} ({format(currentDate, 'EEEEE', { locale: ko })})
            </h2>
          </div>
          {onNextDay && (
            <button
              onClick={onNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 5L12.5 10L7.5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-xl font-bold whitespace-nowrap" style={{ color: '#1A1A1A' }}>
                오늘의 도시락
              </h2>
              {isEditingServings ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editServingsValue}
                    onChange={(e) => setEditServingsValue(e.target.value)}
                    className="w-20 px-2 py-1 text-center text-lg font-semibold border-b-2 border-gray-300 focus:outline-none focus:border-[#4D99CC]"
                    min="1"
                    autoFocus
                  />
                  <span className="text-sm text-gray-500">개</span>
                  <button
                    onClick={handleSaveServings}
                    className="p-1 text-gray-600 hover:text-[#4D99CC] transition-colors"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-lg font-semibold">{localServings}개</span>
                  <button
                    onClick={handleEditServingsClick}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {(onAddMenu || onEdit) && (
                <button
                  onClick={onAddMenu || onEdit}
                  className="px-6 py-2 bg-[#4D99CC] text-white rounded-lg hover:bg-[#3d89bc] transition-colors text-sm font-medium flex items-center gap-2"
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
                  메뉴 등록
                </button>
              )}
            </div>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              메뉴를 등록하시려면 <span className="text-[#4D99CC] font-semibold">+ 메뉴 등록</span>을 눌러주세요
            </p>
          </div>
        </div>

        {/* 주간 식단표 */}
        {renderWeeklyMenuTable()}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {onPrevDay && (
          <button
            onClick={onPrevDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>
            {format(currentDate, 'yyyy년 MM월 dd일')} ({format(currentDate, 'EEEEE', { locale: ko })})
          </h2>
        </div>
        {onNextDay && (
          <button
            onClick={onNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 className="text-xl font-bold whitespace-nowrap" style={{ color: '#1A1A1A' }}>
              오늘의 도시락
            </h2>
            {isEditingServings ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editServingsValue}
                  onChange={(e) => setEditServingsValue(e.target.value)}
                  className="w-20 px-2 py-1 text-center text-lg font-semibold border-b-2 border-gray-300 focus:outline-none focus:border-[#4D99CC]"
                  min="1"
                  autoFocus
                />
                <span className="text-sm text-gray-500">개</span>
                <button
                  onClick={handleSaveServings}
                  className="p-1 text-gray-600 hover:text-[#4D99CC] transition-colors"
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-lg font-semibold">{localServings}개</span>
                <button
                  onClick={handleEditServingsClick}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
              </div>
            )}
          </div>
            <div className="flex items-center gap-3">
              {(onAddMenu || onEdit) && (
                <button
                  onClick={onAddMenu || onEdit}
                  className="px-6 py-2 bg-[#4D99CC] text-white rounded-lg hover:bg-[#3d89bc] transition-colors text-sm font-medium flex items-center gap-2"
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
                  메뉴 등록
                </button>
              )}
            </div>
        </div>

        <div className="space-y-3 mb-24">
          {dailyMenu.recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="px-6 py-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3"
            >
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getRecipeCategoryColor(recipe.category)}`}>
                {recipe.category}
              </span>
              <p className="text-lg font-semibold flex-1 min-w-0" style={{ color: '#1A1A1A' }}>
                {recipe.name}
              </p>
              {recipe.color && (
                <span
                  className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: recipe.color }}
                  title="요리 색"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 플로팅 요리 시작 버튼 - 네비게이션 바로 위 */}
      {dailyMenu.recipes.length > 0 && (
        <div 
          className="fixed left-0 right-0 z-50 px-4"
          style={{
            bottom: `calc(70px + 5px + env(safe-area-inset-bottom, 0px))`
          }}
        >
          <div className="max-w-4xl mx-auto">
            <button
              onClick={onStartCooking}
              className="w-full bg-[#4D99CC] text-white rounded-xl font-semibold text-lg hover:bg-[#3d89bc] transition-colors shadow-lg"
              style={{ paddingTop: '1.75rem', paddingBottom: '1.75rem' }}
            >
              요리 시작
            </button>
          </div>
        </div>
      )}

      {/* 주간 식단표 */}
      {renderWeeklyMenuTable()}
    </div>
  );
}
