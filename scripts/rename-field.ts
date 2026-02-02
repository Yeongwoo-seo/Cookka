/**
 * Firestore 필드명 변경 스크립트
 * 
 * 사용법:
 * npm run rename-field -- --collection=<컬렉션명> --old-field=<기존필드명> --new-field=<새필드명> [--dry-run]
 * 
 * 예시:
 * npm run rename-field -- --collection=ingredients --old-field=costPerUnit --new-field=baseCostPerUnit --dry-run
 * npm run rename-field -- --collection=ingredients --old-field=costPerUnit --new-field=baseCostPerUnit
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, updateDoc, deleteField } from 'firebase/firestore';

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

async function renameField() {
  const args = process.argv.slice(2);
  const collectionArg = args.find(arg => arg.startsWith('--collection='));
  const oldFieldArg = args.find(arg => arg.startsWith('--old-field='));
  const newFieldArg = args.find(arg => arg.startsWith('--new-field='));
  const dryRun = args.includes('--dry-run');

  if (!collectionArg || !oldFieldArg || !newFieldArg) {
    console.log(`
🔄 Firestore 필드명 변경 스크립트

사용법:
  npm run rename-field -- --collection=<컬렉션명> --old-field=<기존필드명> --new-field=<새필드명> [--dry-run]

옵션:
  --collection: 컬렉션 이름 (예: ingredients, inventory, recipes)
  --old-field: 변경할 기존 필드명
  --new-field: 새 필드명
  --dry-run: 실제 변경하지 않고 미리보기만

예시:
  npm run rename-field -- --collection=ingredients --old-field=costPerUnit --new-field=baseCostPerUnit --dry-run
  npm run rename-field -- --collection=ingredients --old-field=costPerUnit --new-field=baseCostPerUnit
    `);
    process.exit(1);
  }

  const collectionName = collectionArg.split('=')[1];
  const oldField = oldFieldArg.split('=')[1];
  const newField = newFieldArg.split('=')[1];

  if (oldField === newField) {
    console.error('❌ 기존 필드명과 새 필드명이 같습니다.');
    process.exit(1);
  }

  console.log(`\n🔍 컬렉션 '${collectionName}'에서 필드명 변경 검색 중...\n`);
  console.log(`   기존 필드: ${oldField}`);
  console.log(`   새 필드: ${newField}\n`);

  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const documentsToUpdate: { id: string; data: any }[] = [];
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data[oldField] !== undefined) {
        documentsToUpdate.push({
          id: doc.id,
          data: data,
        });
      }
    });

    if (documentsToUpdate.length === 0) {
      console.log('✅ 변경할 문서가 없습니다.');
      process.exit(0);
    }

    console.log(`📋 변경 대상: ${documentsToUpdate.length}개 문서\n`);
    documentsToUpdate.forEach((doc, index) => {
      const oldValue = doc.data[oldField];
      console.log(`${index + 1}. 문서 ID: ${doc.id}`);
      console.log(`   ${oldField}: ${oldValue}`);
      console.log(`   → ${newField}: ${oldValue}\n`);
    });

    if (dryRun) {
      console.log('⚠️  --dry-run 모드: 실제로 변경하지 않았습니다.');
      process.exit(0);
    }

    console.log('🔄 필드명 변경 시작...\n');
    let updatedCount = 0;
    let errorCount = 0;

    for (const docData of documentsToUpdate) {
      try {
        const docRef = doc(db, collectionName, docData.id);
        const oldValue = docData.data[oldField];
        
        // 새 필드로 값 복사하고 기존 필드 삭제
        await updateDoc(docRef, {
          [newField]: oldValue,
          [oldField]: deleteField(),
        });
        
        console.log(`✅ 변경 완료: ${docData.id}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ 변경 실패 (${docData.id}):`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ 총 ${updatedCount}개 문서 필드명 변경 완료!`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount}개 문서 변경 실패`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

renameField();
