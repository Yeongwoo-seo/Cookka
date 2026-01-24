'use client';

import { useState } from 'react';
import DashboardView from './DashboardView';
import RecipeBoardView from './RecipeBoardView';
import InventoryView from './InventoryView';
import TeamSettingsView from './TeamSettingsView';
import MenuAnalysisView from './MenuAnalysisView';
import VersionInfo from './VersionInfo';

type Tab = 'dashboard' | 'recipes' | 'inventory' | 'analysis' | 'team';

export default function MainTabView() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: '대시보드', icon: '📊' },
    { id: 'recipes', label: '레시피', icon: '📝' },
    { id: 'inventory', label: '재고', icon: '📦' },
    { id: 'analysis', label: '분석', icon: '📈' },
    { id: 'team', label: '팀', icon: '👥' },
  ];

  return (
    <div className="flex flex-col h-screen relative" style={{ backgroundColor: '#FAFAFB' }}>
      {/* Version Info */}
      <VersionInfo />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <img 
            src="/cookka_logo.png" 
            alt="Cookka" 
            className="h-8 object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ paddingBottom: 'calc(70px + var(--safari-address-bar-height, 44px) + var(--safe-area-inset-bottom))' }}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'recipes' && <RecipeBoardView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'analysis' && <MenuAnalysisView />}
        {activeTab === 'team' && <TeamSettingsView />}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="bg-white border-t border-gray-200 fixed left-0 right-0 z-50"
        style={{ 
          bottom: 'var(--safari-address-bar-height, 44px)',
          paddingBottom: 'calc(0.5rem + var(--safe-area-inset-bottom))'
        }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 px-2 sm:py-3 sm:px-4 transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#4D99CC] border-t-2 border-[#4D99CC]'
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
