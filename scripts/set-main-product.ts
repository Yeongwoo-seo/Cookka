/**
 * 기존 재료 데이터에서 가장 싼 제품을 메인으로 설정하는 스크립트
 * 
 * 사용법:
 * npm run set-main-product [--dry-run]
 * 
 * 예시:
 * npm run set-main-product --dry-run (미리보기만)
 * npm run set-main-product (실제 업데이트)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Ingredient, ProductInfo } from '../types/recipe';

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

// 제품별 단위당 원가 계산
function getProductCostPerUnit(p: ProductInfo): number {
  if (typeof p.costPerUnit === 'number' && p.costPerUnit > 0) return p.costPerUnit;
  if (p.weight > 0 && p.price > 0) return p.price / p.weight;
  return Infinity; // 원가 정보가 없으면 무한대로 처리 (정렬에서 제외)
}

async function setMainProduct() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n🔍 재료 데이터 불러오는 중...\n');

  try {
    const ingredientsRef = collection(db, 'ingredients');
    const snapshot = await getDocs(ingredientsRef);
    
    const ingredientsToUpdate: { id: string; name: string; products: ProductInfo[]; cheapestProduct: ProductInfo | null }[] = [];
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const products: ProductInfo[] = data.products || [];
      
      if (products.length > 0) {
        // 가장 싼 제품 찾기
        const sortedProducts = [...products]
          .map((p) => ({ p, cost: getProductCostPerUnit(p) }))
          .filter((x) => x.cost > 0 && x.cost !== Infinity)
          .sort((a, b) => a.cost - b.cost);
        
        if (sortedProducts.length > 0) {
          const cheapestProduct = sortedProducts[0].p;
          const currentMainProduct = products.find(p => p.isMain);
          
          // 현재 메인 제품이 가장 싼 제품이 아니면 업데이트 필요
          if (!currentMainProduct || currentMainProduct.id !== cheapestProduct.id) {
            ingredientsToUpdate.push({
              id: doc.id,
              name: data.name || '이름 없음',
              products: products,
              cheapestProduct: cheapestProduct,
            });
          }
        }
      }
    });

    if (ingredientsToUpdate.length === 0) {
      console.log('✅ 모든 재료의 메인 제품이 이미 가장 싼 제품으로 설정되어 있습니다.');
      process.exit(0);
    }

    console.log(`📋 업데이트 대상: ${ingredientsToUpdate.length}개 재료\n`);
    ingredientsToUpdate.forEach((ing, index) => {
      const currentMain = ing.products.find(p => p.isMain);
      const cheapestCost = getProductCostPerUnit(ing.cheapestProduct!);
      console.log(`${index + 1}. ${ing.name}`);
      console.log(`   현재 메인: ${currentMain?.productName || '없음'} ($${currentMain ? getProductCostPerUnit(currentMain) : 0}/kg)`);
      console.log(`   → 새 메인: ${ing.cheapestProduct!.productName} ($${cheapestCost}/kg)\n`);
    });

    if (dryRun) {
      console.log('⚠️  --dry-run 모드: 실제로 업데이트하지 않았습니다.');
      process.exit(0);
    }

    console.log('🔄 메인 제품 업데이트 시작...\n');
    let updatedCount = 0;
    let errorCount = 0;

    for (const ing of ingredientsToUpdate) {
      try {
        // 모든 제품의 isMain을 false로 설정하고, 가장 싼 제품만 true로 설정
        const updatedProducts = ing.products.map((p) => ({
          ...p,
          isMain: p.id === ing.cheapestProduct!.id,
        }));

        const ingredientRef = doc(db, 'ingredients', ing.id);
        await updateDoc(ingredientRef, {
          products: updatedProducts,
        });
        
        console.log(`✅ 업데이트 완료: ${ing.name} → ${ing.cheapestProduct!.productName}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ 업데이트 실패 (${ing.name}):`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ 총 ${updatedCount}개 재료의 메인 제품 업데이트 완료!`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount}개 재료 업데이트 실패`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

setMainProduct();
