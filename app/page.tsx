'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import RecipeMainView from '@/components/RecipeMainView';

export default function Home() {
  const loadSampleData = useAppStore((state) => state.loadSampleData);
  const loadFromFirebase = useAppStore((state) => state.loadFromFirebase);
  const syncWithFirebase = useAppStore((state) => state.syncWithFirebase);
  const recipes = useAppStore((state) => state.recipes);
  const isFirebaseEnabled = useAppStore((state) => state.isFirebaseEnabled);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Firebase 환경 변수가 설정되어 있는지 확인
    const hasFirebaseConfig = 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!isInitialized) {
      if (hasFirebaseConfig) {
        // Firebase에서 데이터 로드 및 실시간 동기화 설정
        loadFromFirebase().then(() => {
          syncWithFirebase();
          setIsInitialized(true);
        });
      } else {
        // Firebase 설정이 없으면 샘플 데이터 사용
        if (recipes.length === 0) {
          loadSampleData();
        }
        setIsInitialized(true);
      }
    }
  }, [recipes.length, loadSampleData, loadFromFirebase, syncWithFirebase, isInitialized]);

  return <RecipeMainView />;
}
