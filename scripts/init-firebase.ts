/**
 * Firebase 초기 데이터 설정 스크립트
 * 
 * 사용 방법:
 * 1. 터미널에서 실행: npx tsx scripts/init-firebase.ts
 * 2. 또는 Node.js 환경에서 직접 실행
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { sampleRecipes } from '../types/recipe';
import { sampleInventory } from '../types/inventory';
import { sampleBusinessMetrics } from '../types/business-metrics';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Date를 Timestamp로 변환
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

async function initFirebase() {
  console.log('🚀 Firebase 초기 데이터 설정을 시작합니다...\n');

  try {
    // 1. 레시피 데이터 업로드
    console.log('📝 레시피 데이터 업로드 중...');
    for (const recipe of sampleRecipes) {
      const recipeRef = doc(db, 'recipes', recipe.id);
      await setDoc(recipeRef, {
        ...recipe,
        createdAt: dateToTimestamp(recipe.createdAt),
        updatedAt: dateToTimestamp(recipe.updatedAt),
      });
      console.log(`  ✓ ${recipe.name} 업로드 완료`);
    }
    console.log(`✅ 레시피 ${sampleRecipes.length}개 업로드 완료\n`);

    // 2. 재고 데이터 업로드
    console.log('📦 재고 데이터 업로드 중...');
    for (const item of sampleInventory) {
      const itemRef = doc(db, 'inventory', item.id);
      await setDoc(itemRef, {
        ...item,
        lastUpdated: dateToTimestamp(item.lastUpdated),
        expirationDate: item.expirationDate ? dateToTimestamp(item.expirationDate) : null,
        purchaseHistory: (item.purchaseHistory || []).map((ph) => ({
          ...ph,
          purchaseDate: dateToTimestamp(ph.purchaseDate),
        })),
      });
      console.log(`  ✓ ${item.name} 업로드 완료`);
    }
    console.log(`✅ 재고 ${sampleInventory.length}개 업로드 완료\n`);

    // 3. 비즈니스 메트릭스 업로드
    console.log('📊 비즈니스 메트릭스 업로드 중...');
    const metricsRef = doc(db, 'businessMetrics', 'current');
    await setDoc(metricsRef, {
      ...sampleBusinessMetrics,
      lastUpdated: dateToTimestamp(sampleBusinessMetrics.lastUpdated),
    });
    console.log('✅ 비즈니스 메트릭스 업로드 완료\n');

    // 4. 샘플 일일 메뉴 생성 및 업로드
    console.log('📅 일일 메뉴 데이터 생성 중...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = format(today, 'yyyy-MM-dd');
    
    // 오늘의 메뉴
    const todayRecipes = sampleRecipes.filter(r => 
      ['1', '2', '3', '4', '5'].includes(r.id)
    );
    const todayMenuRef = doc(db, 'dailyMenus', todayKey);
    await setDoc(todayMenuRef, {
      date: dateToTimestamp(today),
      recipes: todayRecipes,
      servings: 50,
    });
    console.log(`  ✓ ${todayKey} 메뉴 업로드 완료`);

    // 과거 7일 메뉴 (선택적)
    for (let i = 1; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      const menuCount = Math.floor(Math.random() * 6);
      if (menuCount > 0) {
        const menuRef = doc(db, 'dailyMenus', dateKey);
        await setDoc(menuRef, {
          date: dateToTimestamp(date),
          recipes: sampleRecipes.slice(0, menuCount),
          servings: 50,
        });
        console.log(`  ✓ ${dateKey} 메뉴 업로드 완료`);
      }
    }
    console.log('✅ 일일 메뉴 업로드 완료\n');

    console.log('🎉 Firebase 초기 데이터 설정이 완료되었습니다!');
    console.log('\n다음 단계:');
    console.log('1. Firebase Console에서 데이터 확인');
    console.log('2. 애플리케이션을 재시작하여 Firebase 데이터 로드 확인');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
initFirebase().then(() => {
  console.log('\n✨ 모든 작업이 완료되었습니다!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ 스크립트 실행 실패:', error);
  process.exit(1);
});

export { initFirebase };
