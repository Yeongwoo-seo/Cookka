'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { calculateProfit, calculateProfitMargin } from '@/types/business-metrics';
import { format } from 'date-fns';
import MenuCalendarView from './MenuCalendarView';

type DashboardTab = 'menu' | 'finance';

export default function DashboardView() {
  const businessMetrics = useAppStore((state) => state.businessMetrics);
  const [activeTab, setActiveTab] = useState<DashboardTab>('menu');

  // hooks를 조건부 return 이전에 모두 호출
  const profit = businessMetrics ? calculateProfit(businessMetrics) : 0;
  const profitMargin = businessMetrics ? calculateProfitMargin(businessMetrics) : 0;

  // 샘플 데이터 생성 (실제로는 API에서 가져올 데이터)
  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: format(date, 'MM/dd'),
        revenue: Math.floor(Math.random() * 200000) + 300000,
        profit: Math.floor(Math.random() * 100000) + 100000,
      });
    }
    return days;
  }, []);

  const maxRevenue = Math.max(...weeklyData.map(d => d.revenue));

  if (!businessMetrics) {
    return (
      <div className="h-screen flex flex-col max-w-7xl mx-auto px-4 pt-4 pb-24">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-full overflow-hidden">
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-7xl mx-auto px-4 pt-4 pb-24">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-full overflow-hidden">
        {/* 탭 슬라이더 - 고정 */}
        <div className="relative flex items-center mb-6 pb-2 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 relative pb-2 text-base font-medium transition-colors duration-300 text-center z-10 ${
              activeTab === 'menu'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            월간 식단표
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex-1 relative pb-2 text-base font-medium transition-colors duration-300 text-center z-10 ${
              activeTab === 'finance'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            자금관리
          </button>
          {/* 슬라이딩 밑줄 */}
          <span 
            className={`absolute bottom-0 h-0.5 bg-gray-900 transition-all duration-300 ease-in-out ${
              activeTab === 'menu' ? 'left-0' : 'left-1/2'
            }`}
            style={{ width: '50%' }}
          ></span>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'menu' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <MenuCalendarView />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden overflow-y-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                  경영 현황 대시보드
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {format(businessMetrics.lastUpdated, 'yyyy년 MM월 dd일 HH:mm')} 업데이트
                </p>
              </div>
            </div>

        {/* 주요 KPI 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* 매출 카드 */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">+12.5%</span>
            </div>
            <p className="text-sm opacity-90 mb-1">오늘 매출</p>
            <p className="text-3xl font-bold mb-1">
              ${(businessMetrics.todayRevenue / 1000).toFixed(2)}
            </p>
            <p className="text-xs opacity-75">USD</p>
          </div>

          {/* 원가 카드 */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">+8.3%</span>
            </div>
            <p className="text-sm opacity-90 mb-1">오늘 원가</p>
            <p className="text-3xl font-bold mb-1">
              ${(businessMetrics.todayCost / 1000).toFixed(2)}
            </p>
            <p className="text-xs opacity-75">USD</p>
          </div>

          {/* 순이익 카드 */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">+18.2%</span>
            </div>
            <p className="text-sm opacity-90 mb-1">순이익</p>
            <p className="text-3xl font-bold mb-1">
              ${(profit / 1000).toFixed(2)}
            </p>
            <p className="text-xs opacity-75">USD</p>
          </div>

          {/* 수익률 카드 */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">+2.1%p</span>
            </div>
            <p className="text-sm opacity-90 mb-1">수익률</p>
            <p className="text-3xl font-bold mb-1">
              {profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs opacity-75">목표 대비 105%</p>
          </div>
        </div>

        {/* 차트 및 상세 지표 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 매출 추이 차트 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>주간 매출 추이</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-gray-100 rounded-lg text-gray-700">7일</button>
                <button className="px-3 py-1 text-xs bg-[#4D99CC] text-white rounded-lg">30일</button>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '200px' }}>
                    <div className="absolute bottom-0 w-full flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer"
                        style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                        title={`${day.date}: $${(day.revenue / 1000).toFixed(2)}`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{day.date}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-1">
                    {(day.revenue / 1000).toFixed(0)}k
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 생산 현황 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6" style={{ color: '#1A1A1A' }}>생산 현황</h3>
            <div className="text-center">
              <div className="relative inline-block">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#E5E7EB"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#4D99CC"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(businessMetrics.productionCount / 100) * 502.4} 502.4`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold" style={{ color: '#1A1A1A' }}>
                    {businessMetrics.productionCount}
                  </p>
                  <p className="text-sm text-gray-500">개 생산</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">목표 대비</span>
                  <span className="text-sm font-semibold text-green-600">
                    {((businessMetrics.productionCount / 100) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">평균 생산량</span>
                  <span className="text-sm font-semibold">85개</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메뉴별 성과 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-xl font-bold mb-6" style={{ color: '#1A1A1A' }}>메뉴별 성과 분석</h3>
          <div className="space-y-4">
            {businessMetrics.menuPerformance.map((menu) => {
              const menuProfit = menu.revenue - menu.cost;
              const menuProfitMargin = menu.revenue > 0 ? (menuProfit / menu.revenue) * 100 : 0;
              const profitPercentage = (menuProfit / profit) * 100;

              return (
                <div
                  key={menu.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#4D99CC] to-[#3d89bc] rounded-lg flex items-center justify-center text-white font-bold">
                        {menu.menuName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
                          {menu.menuName}
                        </h4>
                        <p className="text-sm text-gray-500">{menu.quantity}개 생산</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ${(menuProfit / 1000).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        수익률 {menuProfitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* 진행 바 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">매출</span>
                      <span className="font-semibold">${(menu.revenue / 1000).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(menu.revenue / businessMetrics.todayRevenue) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">원가</span>
                      <span className="font-semibold text-orange-600">${(menu.cost / 1000).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(menu.cost / businessMetrics.todayCost) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 수익 기여도 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">전체 수익 기여도</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${profitPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-green-600 w-12 text-right">
                          {profitPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800">평균 조리 시간</h4>
            </div>
            <p className="text-2xl font-bold text-indigo-700">
              {businessMetrics.menuPerformance.length > 0 && businessMetrics.menuPerformance[0].averageCookingTime
                ? Math.floor(businessMetrics.menuPerformance[0].averageCookingTime / 60)
                : 30}분
            </p>
            <p className="text-sm text-gray-600 mt-2">전일 대비 -5분</p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800">활성 메뉴</h4>
            </div>
            <p className="text-2xl font-bold text-pink-700">
              {businessMetrics.menuPerformance.length}개
            </p>
            <p className="text-sm text-gray-600 mt-2">이번 주 신규 2개</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 border border-cyan-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800">목표 달성률</h4>
            </div>
            <p className="text-2xl font-bold text-cyan-700">
              {((businessMetrics.productionCount / 100) * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">목표: 100개</p>
          </div>
        </div>
          </div>
        )}
      </div>
    </div>
  );
}
