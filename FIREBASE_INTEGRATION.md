# Firebase 연동 완료

Firebase 연동이 완료되었습니다. 이제 모든 데이터가 Firebase Firestore에 자동으로 저장되고 실시간으로 동기화됩니다.

## 설정 방법

### 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 추가하세요:

```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 2. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택
3. 웹 앱 등록 후 설정 정보 복사
4. Firestore Database 생성 (위치: asia-northeast3 - 서울 권장)

### 3. Firestore 보안 규칙

Firestore Console > 규칙 탭에서 다음 규칙을 설정:

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

**주의**: 프로덕션 환경에서는 인증 기반 규칙으로 변경해야 합니다.

## 자동 동기화

다음 작업들이 자동으로 Firebase에 저장됩니다:

- ✅ 레시피 추가/수정
- ✅ 재고 추가/수정
- ✅ 재료 가격 업데이트
- ✅ 일일 메뉴 저장
- ✅ 실시간 동기화 (다른 사용자의 변경사항도 자동 반영)

## Firebase 미설정 시

환경 변수가 설정되지 않은 경우, 자동으로 샘플 데이터를 사용합니다. Firebase를 사용하려면 위의 환경 변수를 설정하세요.

## 데이터 구조

### recipes 컬렉션
- 문서 ID: 레시피 ID
- 필드: Recipe 인터페이스와 동일

### inventory 컬렉션
- 문서 ID: 재고 항목 ID
- 필드: InventoryItem 인터페이스와 동일

### dailyMenus 컬렉션
- 문서 ID: 날짜 (YYYY-MM-DD 형식)
- 필드: DailyMenu 인터페이스와 동일

### businessMetrics 컬렉션
- 문서 ID: 'current'
- 필드: BusinessMetrics 인터페이스와 동일

### ingredientPrices 컬렉션
- 문서 ID: "name_unit" 형식 (예: "쌀_kg")
- 필드: { name, unit, costPerUnit }

### teams 컬렉션
- 문서 ID: 팀 ID
- 필드: Team 인터페이스와 동일

## Firestore 인덱스

현재 코드는 모든 데이터를 클라이언트에서 처리하므로 **인덱스가 필요하지 않습니다**.

하지만 데이터가 많아지면 성능 최적화를 위해 서버 측 쿼리를 사용해야 하며, 이때 인덱스가 필요합니다.

자세한 내용은 `FIRESTORE_INDEXES.md` 파일을 참고하세요.
