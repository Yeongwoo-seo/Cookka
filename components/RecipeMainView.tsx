'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { format, addDays, subDays, getDay } from 'date-fns';
import { DailyMenu } from '@/types/daily-menu';
import TodayMenuView from './TodayMenuView';
import CookingSidePanel from './CookingSidePanel';
import DashboardView from './DashboardView';
import InventoryView from './InventoryView';
import MenuAnalysisView from './MenuAnalysisView';
import TeamSettingsView from './TeamSettingsView';
import RecipeSelectModal from './RecipeSelectModal';
import RecipeBoardView from './RecipeBoardView';
import VersionInfo from './VersionInfo';

type ViewState = 'menu' | 'prep' | 'cooking' | 'complete';
type Tab = 'recipes' | 'dashboard' | 'inventory' | 'analysis' | 'team';

export default function RecipeMainView() {
  const recipes = useAppStore((state) => state.recipes);
  const dailyMenuHistory = useAppStore((state) => state.dailyMenuHistory);
  const saveDailyMenu = useAppStore((state) => state.saveDailyMenu);
  const loadSampleData = useAppStore((state) => state.loadSampleData);
  
  // 오늘 날짜로 초기화 (시간 제거, 주말이면 다음 월요일)
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayOfWeek = getDay(today); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    
    // 주말이면 다음 월요일로 설정
    if (dayOfWeek === 0) { // 일요일 → 다음 월요일 (+1일)
      return addDays(today, 1);
    } else if (dayOfWeek === 6) { // 토요일 → 다음 월요일 (+2일)
      return addDays(today, 2);
    }
    
    return today; // 평일이면 그대로
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
      
      // recipes가 없고 현재 날짜에 메뉴가 없으면 샘플 데이터 로드
      if (recipes.length === 0) {
        loadSampleData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, recipes.length]); // recipes.length로 데이터 로드 감지, loadSampleData는 store 함수이므로 의존성에서 제외
  
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
    const currentDayOfWeek = getDay(currentDate); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    let daysToSubtract = 1;

    if (currentDayOfWeek === 1) { // 월요일 → 금요일 (3일 전)
      daysToSubtract = 3;
    } else if (currentDayOfWeek === 0) { // 일요일 → 금요일 (2일 전)
      daysToSubtract = 2;
    } else if (currentDayOfWeek === 6) { // 토요일 → 금요일 (1일 전)
      daysToSubtract = 1;
    }

    const prevDate = subDays(currentDate, daysToSubtract);
    handleDateChange(prevDate);
  };

  const handleNextDay = () => {
    const currentDayOfWeek = getDay(currentDate); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    let daysToAdd = 1;

    if (currentDayOfWeek === 5) { // 금요일 → 월요일 (3일 후)
      daysToAdd = 3;
    } else if (currentDayOfWeek === 6) { // 토요일 → 월요일 (2일 후)
      daysToAdd = 2;
    } else if (currentDayOfWeek === 0) { // 일요일 → 월요일 (1일 후)
      daysToAdd = 1;
    }

    const nextDate = addDays(currentDate, daysToAdd);
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
    <div className="flex flex-col h-screen relative" style={{ backgroundColor: '#FAFAFB' }}>
      {/* Version Info */}
      <VersionInfo />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ paddingBottom: 'calc(70px + var(--safari-address-bar-height, 44px) + var(--safe-area-inset-bottom))' }}>
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
      <nav 
        className="bg-white border-t border-gray-200 fixed left-0 right-0 z-50"
        style={{ 
          bottom: 'var(--safari-address-bar-height, 44px)',
          paddingBottom: 'calc(0.5rem + var(--safe-area-inset-bottom))'
        }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
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
                className={`flex flex-col items-center py-2 px-2 sm:py-3 sm:px-4 transition-colors relative flex-1 ${
                  activeTab === tab.id
                    ? 'text-[#4D99CC]'
                    : 'text-gray-500 hover:text-[#1A1A1A]'
                }`}
              >
                <span className="text-lg sm:text-xl mb-0.5 sm:mb-1">{tab.icon}</span>
                <span className="text-[10px] sm:text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
