'use client';

import { useEffect, useState } from 'react';

export default function VersionInfo() {
  const [commitInfo, setCommitInfo] = useState<{ hash: string; date: string; time: string } | null>(null);

  useEffect(() => {
    // 클라이언트에서만 커밋 정보 가져오기
    if (typeof window !== 'undefined') {
      // 빌드 시점에 주입된 커밋 정보가 있으면 사용
      const buildCommitHash = process.env.NEXT_PUBLIC_COMMIT_HASH;
      const buildCommitDate = process.env.NEXT_PUBLIC_COMMIT_DATE;
      
      if (buildCommitHash && buildCommitDate) {
        const [date, time] = buildCommitDate.split(' ');
        setCommitInfo({
          hash: buildCommitHash.substring(0, 7),
          date: date,
          time: time || '',
        });
      } else {
        // 환경 변수가 없으면 현재 시간 표시
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setCommitInfo({
          hash: 'dev',
          date: dateStr,
          time: timeStr,
        });
      }
    }
  }, []);

  if (!commitInfo) return null;

  return (
    <div 
      className="fixed top-2 right-2 z-50 pointer-events-none"
      style={{ 
        top: 'calc(var(--safe-area-inset-top, 0px) + 0.5rem)',
        right: '0.5rem'
      }}
    >
      <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm">
        <div className="text-gray-500">{commitInfo.hash}</div>
        <div className="text-gray-400">{commitInfo.date} {commitInfo.time}</div>
      </div>
    </div>
  );
}
