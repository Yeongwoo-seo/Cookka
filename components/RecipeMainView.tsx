'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { format, addDays, subDays } from 'date-fns';
import { DailyMenu } from '@/types/daily-menu';
import TodayMenuView from './TodayMenuView';
import CookingSidePanel from './CookingSidePanel';
import DashboardView from './DashboardView';
import InventoryView from './InventoryView';
import MenuAnalysisView from './MenuAnalysisView';
import TeamSettingsView from './TeamSettingsView';
import RecipeSelectModal from './RecipeSelectModal';
import RecipeBoardView from './RecipeBoardView';

type ViewState = 'menu' | 'prep' | 'cooking' | 'complete';
type Tab = 'recipes' | 'dashboard' | 'inventory' | 'analysis' | 'team';

export default function RecipeMainView() {
  const recipes = useAppStore((state) => state.recipes);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);
  const saveDailyMenu = useAppStore((state) => state.saveDailyMenu);
  
  // 오늘 날짜로 초기화 (시간 제거)
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };
  
  const [currentDate, setCurrentDate] = useState(() => getToday());
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [viewState, setViewState] = useState<ViewState>('menu');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  
  // 초기 메뉴 설정 (빈 메뉴로 시작)
  const [dailyMenu, setDailyMenu] = useState<DailyMenu>(() => ({
    date: getToday(),
    recipes: [],
    servings: 50,
  }));
  const [preparedIngredients, setPreparedIngredients] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // currentDate나 recipes가 로드되면 메뉴 업데이트
  useEffect(() => {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const savedMenu = dailyMenuHistory.get(dateKey);
    if (savedMenu) {
      setDailyMenu(savedMenu);
    } else {
      // 저장된 메뉴가 없으면 빈 메뉴로 설정
      setDailyMenu({
        date: currentDate,
        recipes: [],
        servings: 50,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, recipes.length]); // recipes.length로 데이터 로드 감지
  
  // 날짜가 변경될 때 메뉴 업데이트
  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    // 날짜가 변경되면 상태 리셋
    if (viewState !== 'menu') {
      setViewState('menu');
      setPreparedIngredients(new Set());
      setCompletedSteps(new Set());
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'recipes', label: '오늘의 도시락', icon: '📝' },
    { id: 'dashboard', label: '대시보드', icon: '📊' },
    { id: 'inventory', label: '재고', icon: '📦' },
    { id: 'analysis', label: '분석', icon: '📈' },
    { id: 'team', label: '레시피', icon: '📋' },
  ];

  const handlePrevDay = () => {
    const prevDate = subDays(currentDate, 1);
    handleDateChange(prevDate);
  };

  const handleNextDay = () => {
    const nextDate = addDays(currentDate, 1);
    handleDateChange(nextDate);
  };

  const handleStartCooking = () => {
    setViewState('prep');
    setIsSidePanelOpen(true);
  };

  const handlePrepComplete = () => {
    setViewState('cooking');
  };

  const handleCookingComplete = () => {
    setViewState('complete');
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    // 사이드 패널을 닫을 때 상태 리셋
    if (viewState !== 'complete') {
      setViewState('menu');
      setPreparedIngredients(new Set());
      setCompletedSteps(new Set());
    }
  };

  // 모든 탭을 통합된 레이아웃으로 처리

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#FAFAFB' }}>
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'recipes' && viewState === 'menu' && (
          <TodayMenuView
            dailyMenu={dailyMenu}
            currentDate={currentDate}
            onStartCooking={handleStartCooking}
            onEdit={() => setIsRecipeModalOpen(true)}
            onAddMenu={() => setIsRecipeModalOpen(true)}
            onServingsChange={(servings) => {
              const updatedMenu = { ...dailyMenu, servings };
              setDailyMenu(updatedMenu);
              saveDailyMenu(updatedMenu);
              // 저장 후 currentDate가 변경되지 않았으므로 useEffect가 다시 실행되지 않음
            }}
            onPrevDay={viewState === 'menu' ? handlePrevDay : undefined}
            onNextDay={viewState === 'menu' ? handleNextDay : undefined}
          />
        )}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'analysis' && <MenuAnalysisView />}
        {activeTab === 'team' && <RecipeBoardView />}
      </main>

      {/* Cooking Side Panel */}
      <CookingSidePanel
        isOpen={isSidePanelOpen}
        onClose={handleCloseSidePanel}
        dailyMenu={dailyMenu}
        viewState={viewState === 'prep' ? 'prep' : viewState === 'cooking' ? 'cooking' : 'complete'}
        preparedIngredients={preparedIngredients}
        setPreparedIngredients={setPreparedIngredients}
        completedSteps={completedSteps}
        setCompletedSteps={setCompletedSteps}
        onPrepComplete={handlePrepComplete}
        onCookingComplete={handleCookingComplete}
      />

      {/* Recipe Select Modal */}
      <RecipeSelectModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onSelect={(recipeIds) => {
          const selectedRecipes = recipes.filter((r) => recipeIds.includes(r.id));
          const updatedMenu = {
            ...dailyMenu,
            recipes: selectedRecipes,
          };
          setDailyMenu(updatedMenu);
          // 메뉴 저장
          saveDailyMenu(updatedMenu);
        }}
        currentRecipeIds={dailyMenu.recipes.map((r) => r.id)}
      />

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around relative">
            {/* 슬라이드 인디케이터 */}
            <div
              className="absolute top-0 h-0.5 bg-[#4D99CC] transition-all duration-300 ease-in-out"
              style={{
                width: `calc(100% / ${tabs.length})`,
                left: `calc(${(tabs.findIndex(t => t.id === activeTab) / tabs.length) * 100}%)`,
              }}
            />
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // 레시피 탭으로 돌아올 때는 menu 상태로 리셋
                  if (tab.id === 'recipes') {
                    setViewState('menu');
                  }
                }}
                className={`flex flex-col items-center py-3 px-4 transition-colors relative flex-1 ${
                  activeTab === tab.id
                    ? 'text-[#4D99CC]'
                    : 'text-gray-500 hover:text-[#1A1A1A]'
                }`}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
