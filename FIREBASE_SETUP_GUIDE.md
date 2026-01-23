# Firebase 초기 설정 가이드

Firebase 프로젝트를 처음 설정하는 경우 다음 단계를 따라주세요.

## 1. Firestore Database 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택 (cookka-4cb78)
3. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
4. **"데이터베이스 만들기"** 버튼 클릭
5. **"프로덕션 모드에서 시작"** 선택 (나중에 규칙 수정 가능)
6. 위치 선택: **"asia-northeast3 (서울)"** 권장
7. **"사용 설정"** 클릭

## 2. Firestore 보안 규칙 설정

1. Firestore Database 페이지에서 **"규칙"** 탭 클릭
2. 다음 규칙을 복사하여 붙여넣기:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 레시피 컬렉션
    match /recipes/{recipeId} {
      allow read, write: if true; // 개발 중
    }
    
    // 재고 컬렉션
    match /inventory/{itemId} {
      allow read, write: if true;
    }
    
    // 일일 메뉴 컬렉션
    match /dailyMenus/{menuId} {
      allow read, write: if true;
    }
    
    // 비즈니스 메트릭스
    match /businessMetrics/{document=**} {
      allow read, write: if true;
    }
    
    // 재료 가격
    match /ingredientPrices/{document=**} {
      allow read, write: if true;
    }
    
    // 팀 설정
    match /teams/{teamId} {
      allow read, write: if true;
    }
  }
}
```

3. **"게시"** 버튼 클릭

## 3. 초기 데이터 업로드

Firebase에 샘플 데이터를 업로드하는 방법:

### 방법 1: 브라우저 콘솔 사용 (간단)

1. 개발 서버 실행: `npm run dev`
2. 브라우저에서 애플리케이션 열기
3. 브라우저 개발자 도구 콘솔 열기 (F12)
4. 다음 코드를 실행:

```javascript
// Firebase 초기화 확인
import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// 샘플 레시피 업로드 예시
const sampleRecipe = {
  id: '1',
  name: '흰쌀밥',
  category: '밥',
  ingredients: [],
  steps: [],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const recipeRef = doc(db, 'recipes', '1');
await setDoc(recipeRef, sampleRecipe);
console.log('레시피 업로드 완료!');
```

### 방법 2: 스크립트 사용 (권장)

1. 필요한 패키지 설치:
```bash
npm install -D tsx
```

2. 스크립트 실행:
```bash
npx tsx scripts/init-firebase.ts
```

또는 `package.json`에 스크립트 추가 후:
```bash
npm run init-firebase
```

### 방법 3: Firebase Console에서 수동 추가

1. Firebase Console > Firestore Database > 데이터 탭
2. 컬렉션 시작 클릭
3. 컬렉션 ID 입력 (예: `recipes`)
4. 문서 추가하여 데이터 입력

## 4. 데이터 확인

1. Firebase Console > Firestore Database > 데이터 탭
2. 다음 컬렉션들이 생성되어 있는지 확인:
   - `recipes` - 레시피 데이터
   - `inventory` - 재고 데이터
   - `dailyMenus` - 일일 메뉴 데이터
   - `businessMetrics` - 비즈니스 메트릭스
   - `ingredientPrices` - 재료 가격 (선택적)
   - `teams` - 팀 설정 (선택적)

## 5. 애플리케이션 테스트

1. 개발 서버 재시작:
```bash
npm run dev
```

2. 애플리케이션에서 데이터가 정상적으로 로드되는지 확인
3. 레시피 추가/수정 시 Firebase에 자동 저장되는지 확인

## 문제 해결

### "Permission denied" 오류
- Firestore 보안 규칙이 올바르게 설정되었는지 확인
- 규칙이 "게시"되었는지 확인

### 데이터가 보이지 않음
- Firebase Console에서 데이터 탭 확인
- 브라우저 콘솔에서 오류 메시지 확인
- 환경 변수가 올바르게 설정되었는지 확인 (`.env.local`)

### 초기 데이터 업로드 실패
- Firebase 프로젝트 ID가 올바른지 확인
- Firestore Database가 생성되었는지 확인
- 네트워크 연결 확인

## 다음 단계

데이터가 정상적으로 업로드되면:
1. ✅ 실시간 동기화 테스트 (다른 브라우저/기기에서 동시 접속)
2. ✅ 데이터 추가/수정/삭제 테스트
3. ✅ Firebase Console에서 데이터 확인
