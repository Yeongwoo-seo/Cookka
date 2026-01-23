'use client';

import { useState } from 'react';
import DashboardView from './DashboardView';
import RecipeBoardView from './RecipeBoardView';
import InventoryView from './InventoryView';
import TeamSettingsView from './TeamSettingsView';
import MenuAnalysisView from './MenuAnalysisView';

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
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#FAFAFB' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <img 
            src="/cookka_logo.png" 
            alt="Cookka" 
            className="h-8 object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'recipes' && <RecipeBoardView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'analysis' && <MenuAnalysisView />}
        {activeTab === 'team' && <TeamSettingsView />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-3 px-4 transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#4D99CC] border-t-2 border-[#4D99CC]'
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
