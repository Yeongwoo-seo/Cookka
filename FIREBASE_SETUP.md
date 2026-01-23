# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: "Cookka")
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. 웹 앱 등록

1. Firebase 프로젝트 대시보드에서 "웹" 아이콘 클릭 (`</>`)
2. 앱 닉네임 입력 (예: "Cookka Web")
3. "이 앱도 Firebase Hosting에 설정" 체크 해제 (선택사항)
4. "앱 등록" 클릭
5. Firebase 설정 정보 복사

## 3. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 4. Firestore 데이터베이스 설정

1. Firebase Console에서 "Firestore Database" 메뉴 클릭
2. "데이터베이스 만들기" 클릭
3. "프로덕션 모드에서 시작" 선택 (나중에 규칙 수정 가능)
4. 위치 선택 (예: asia-northeast3 - 서울)
5. "사용 설정" 클릭

## 5. Firestore 보안 규칙 설정

Firestore Console > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 레시피 컬렉션
    match /recipes/{recipeId} {
      allow read, write: if true; // 개발 중에는 모든 접근 허용, 프로덕션에서는 인증 필요
    }
    
    // 재고 컬렉션
    match /inventory/{itemId} {
      allow read, write: if true;
    }
    
    // 일일 메뉴 컬렉션
    match /dailyMenus/{menuId} {
      allow read, write: if true;
    }
    
    // 팀 설정 컬렉션
    match /teamSettings/{teamId} {
      allow read, write: if true;
    }
  }
}
```

**주의**: 프로덕션 환경에서는 인증 기반 규칙으로 변경해야 합니다.

## 6. Storage 설정 (이미지 업로드용)

1. Firebase Console에서 "Storage" 메뉴 클릭
2. "시작하기" 클릭
3. 보안 규칙 확인 (개발 중에는 모든 접근 허용 가능)
4. 위치 선택 (Firestore와 동일한 위치 권장)

## 7. 사용 방법

프로젝트에서 Firebase를 사용하려면:

```typescript
import { getRecipes, saveRecipe } from '@/lib/firestore';

// 레시피 가져오기
const recipes = await getRecipes();

// 레시피 저장
await saveRecipe(recipe);
```

## 8. 주의사항

- `NEXT_PUBLIC_` 접두사가 붙은 환경 변수만 클라이언트에서 접근 가능합니다
- 서버를 재시작해야 환경 변수 변경사항이 적용됩니다
- Firebase 설정 정보는 절대 공개 저장소에 커밋하지 마세요
