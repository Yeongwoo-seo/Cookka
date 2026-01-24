'use client';

import { useEffect, useState } from 'react';

// 정적 빌드 정보 (hydration 오류 방지)
const STATIC_BUILD_INFO = {
  version: '1.0.1',
  buildDate: '2026-01-24',
  buildTime: '17:20',
};

export default function VersionInfo() {
  const [buildInfo, setBuildInfo] = useState(STATIC_BUILD_INFO);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // 클라이언트에서만 동적 빌드 정보 업데이트
    const now = new Date();
    setBuildInfo({
      version: '1.0.1',
      buildDate: now.toISOString().split('T')[0],
      buildTime: now.toTimeString().slice(0, 5),
    });

    // 현재 시간 업데이트
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replace(/\./g, '-').replace(/\s/g, '');
      const timeStr = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setCurrentTime(`${dateStr} ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed top-2 left-2 z-50 pointer-events-none"
      style={{ 
        top: 'calc(var(--safe-area-inset-top, 0px) + 0.5rem)',
        left: '0.5rem'
      }}
    >
      <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm">
        <div className="text-gray-500">v{buildInfo.version}</div>
        <div className="text-gray-400">{buildInfo.buildDate} {buildInfo.buildTime}</div>
      </div>
    </div>
  );
}
