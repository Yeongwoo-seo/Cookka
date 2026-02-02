/**
 * 최근 업로드한 재료 데이터 삭제 스크립트
 * 
 * 사용법:
 * npm run delete-recent-ingredients -- --since=<분> --dry-run
 * 
 * 예시:
 * npm run delete-recent-ingredients -- --since=10 (최근 10분 내 업로드된 재료 삭제)
 * npm run delete-recent-ingredients -- --since=10 --dry-run (삭제 전 미리보기)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { Ingredient } from '../types/recipe';

// 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteRecentIngredients() {
  const args = process.argv.slice(2);
  const sinceArg = args.find(arg => arg.startsWith('--since='));
  const todayOnly = args.includes('--today');
  const ingredientPrefix = args.includes('--ingredient-prefix');
  const dryRun = args.includes('--dry-run');

  let cutoffTime: Date | null = null;

  if (ingredientPrefix) {
    // ingredient_로 시작하는 문서만 삭제
    console.log(`\n🔍 'ingredient_'로 시작하는 문서 검색 중...\n`);
  } else if (todayOnly) {
    // 오늘 00:00:00부터
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cutoffTime = today;
    console.log(`\n🔍 오늘 업로드된 재료 검색 중... (기준 시간: ${cutoffTime.toLocaleString()} 이후)\n`);
  } else if (sinceArg) {
    const minutes = parseInt(sinceArg.split('=')[1]);
    if (isNaN(minutes) || minutes <= 0) {
      console.error('❌ --since 값은 양수여야 합니다.');
      process.exit(1);
    }
    cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    console.log(`\n🔍 최근 ${minutes}분 내 업로드된 재료 검색 중... (기준 시간: ${cutoffTime.toLocaleString()})\n`);
  } else {
    console.log(`
🗑️  최근 업로드한 재료 데이터 삭제 스크립트

사용법:
  npm run delete-recent-ingredients -- --ingredient-prefix [--dry-run]
  npm run delete-recent-ingredients -- --today [--dry-run]
  npm run delete-recent-ingredients -- --since=<분> [--dry-run]

옵션:
  --ingredient-prefix: 'ingredient_'로 시작하는 문서 ID만 삭제
  --today: 오늘 업로드된 재료만 삭제
  --since=<분>: 최근 몇 분 내 업로드된 재료를 삭제할지 지정
  --dry-run: 실제 삭제하지 않고 미리보기만

예시:
  npm run delete-recent-ingredients -- --ingredient-prefix
  npm run delete-recent-ingredients -- --ingredient-prefix --dry-run
  npm run delete-recent-ingredients -- --today
  npm run delete-recent-ingredients -- --since=10
    `);
    process.exit(1);
  }

  try {
    const ingredientsRef = collection(db, 'ingredients');
    const snapshot = await getDocs(ingredientsRef);
    
    const ingredientsToDelete: { id: string; name: string; timestamp: Date }[] = [];
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      if (ingredientPrefix) {
        // ingredient_로 시작하는 문서 ID만 삭제
        if (doc.id.startsWith('ingredient_')) {
          const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
          const docTime = updatedAt || createdAt || new Date();
          ingredientsToDelete.push({
            id: doc.id,
            name: data.name || '이름 없음',
            timestamp: docTime,
          });
        }
      } else {
        // 시간 기준으로 삭제
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        
        // updatedAt 또는 createdAt이 기준 시간 이후면 삭제 대상
        const docTime = updatedAt || createdAt;
        if (docTime && cutoffTime && docTime >= cutoffTime) {
          ingredientsToDelete.push({
            id: doc.id,
            name: data.name || '이름 없음',
            timestamp: docTime,
          });
        }
      }
    });

    if (ingredientsToDelete.length === 0) {
      console.log('✅ 삭제할 재료가 없습니다.');
      process.exit(0);
    }

    console.log(`📋 삭제 대상: ${ingredientsToDelete.length}개 재료\n`);
    ingredientsToDelete.forEach((ing, index) => {
      console.log(`${index + 1}. ${ing.name} (ID: ${ing.id}, 시간: ${ing.timestamp.toLocaleString()})`);
    });

    if (dryRun) {
      console.log('\n⚠️  --dry-run 모드: 실제로 삭제하지 않았습니다.');
      process.exit(0);
    }

    console.log('\n🗑️  삭제 시작...\n');
    let deletedCount = 0;
    let errorCount = 0;

    for (const ing of ingredientsToDelete) {
      try {
        const ingredientRef = doc(db, 'ingredients', ing.id);
        await deleteDoc(ingredientRef);
        console.log(`✅ 삭제 완료: ${ing.name}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ 삭제 실패 (${ing.name}):`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ 총 ${deletedCount}개 재료 삭제 완료!`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount}개 재료 삭제 실패`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

deleteRecentIngredients();
