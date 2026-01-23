'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function MenuCalendarView() {
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 현재 월의 첫 날과 마지막 날
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // 달력에 표시할 날짜 범위 (월의 시작 주의 일요일부터 마지막 주의 토요일까지)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 선택된 날짜
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 선택된 날짜의 메뉴 가져오기
  const selectedMenu = useMemo(() => {
    if (!selectedDate) return null;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return dailyMenuHistory.get(dateKey) || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); // dailyMenuHistory는 Map이므로 의존성에서 제외

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            {/* 달력 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePrevMonth}
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
              <h3 className="text-xl font-semibold">
                {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
              </h3>
              <button
                onClick={handleNextMonth}
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
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const hasMenu = dailyMenuHistory.has(dateKey);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square p-2 rounded-lg transition-colors text-sm
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                      ${isSelected ? 'bg-[#4D99CC] text-white' : ''}
                      ${!isSelected && isCurrentMonth ? 'hover:bg-gray-100' : ''}
                      ${isToday && !isSelected ? 'ring-2 ring-[#4D99CC]' : ''}
                      ${hasMenu && !isSelected ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-medium">{format(day, 'd')}</span>
                      {hasMenu && (
                        <span className="text-xs mt-1">
                          {dailyMenuHistory.get(dateKey)?.recipes.length || 0}개
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 선택된 날짜의 메뉴 상세 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {selectedDate ? (
              <>
                <h3 className="text-lg font-semibold mb-4">
                  {format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko })}
                </h3>
                {selectedMenu ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      도시락: {selectedMenu.servings}개
                    </p>
                    <div className="space-y-2 mt-4">
                      {selectedMenu.recipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <p className="font-medium">{recipe.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {recipe.category}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    이 날짜에는 등록된 메뉴가 없습니다.
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                날짜를 선택하면 메뉴를 확인할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
