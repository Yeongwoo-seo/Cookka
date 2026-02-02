'use client';

import { useState } from 'react';
import DashboardView from './DashboardView';
import InventoryView from './InventoryView';
import TeamSettingsView from './TeamSettingsView';
import MenuAnalysisView from './MenuAnalysisView';
import CustomerView from './CustomerView';
import VersionInfo from './VersionInfo';

type Tab = 'dashboard' | 'inventory' | 'analysis' | 'team' | 'customers';

export default function MainTabView() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: '대시보드', icon: '📊' },
    { id: 'inventory', label: '재고', icon: '📦' },
    { id: 'analysis', label: '원가관리', icon: '📈' },
    { id: 'customers', label: '고객관리', icon: '👥' },
    { id: 'team', label: '팀', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col relative safari-full-height" style={{ backgroundColor: '#FAFAFB' }}>
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
      <main className="flex-1 overflow-auto" style={{ paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))' }}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'analysis' && <MenuAnalysisView />}
        {activeTab === 'customers' && <CustomerView />}
        {activeTab === 'team' && <TeamSettingsView />}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed left-0 right-0 z-50"
        style={{ 
          bottom: '0px',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div 
          className="backdrop-blur-xl bg-white/90 border-t border-gray-200"
          style={{
            paddingTop: '0.25rem',
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex justify-around">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center py-2 px-2 sm:py-3 sm:px-4 transition-colors relative flex-1 h-16 ${
                    activeTab === tab.id
                      ? 'text-[#4D99CC]'
                      : 'text-gray-500 hover:text-[#1A1A1A]'
                  }`}
                >
                  <span className="text-lg sm:text-xl mb-0.5 sm:mb-1">{tab.icon}</span>
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-[#4D99CC] rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
