# 500 Internal Server Error 해결 - 동적 Import 적용

## 문제
`localhost:8080`에서 500 Internal Server Error 발생

## 원인
`store/app-store.ts`가 모듈 레벨에서 `lib/firestore.ts`를 import하고 있어서, 서버 사이드에서 Firebase 모듈이 실행되려고 할 때 문제가 발생했습니다.

## 해결 방법

### `store/app-store.ts` 수정
- Firebase 함수를 모듈 레벨 import에서 동적 import로 변경
- 모든 Firebase 함수 호출을 `await import('../lib/firestore')`로 변경
- 서버 사이드 체크 추가

### 변경된 함수들
- `updateRecipe`: 동적 import 사용
- `addRecipe`: 동적 import 사용
- `deleteRecipe`: 동적 import 사용
- `updateInventoryItem`: 동적 import 사용
- `addInventoryItem`: 동적 import 사용
- `deleteInventoryItem`: 동적 import 사용
- `updateIngredientPrice`: 동적 import 사용
- `saveDailyMenu`: 동적 import 사용
- `loadFromFirebase`: 동적 import 사용
- `syncWithFirebase`: 동적 import 사용

## 변경된 파일

- `store/app-store.ts`: 모든 Firebase 함수를 동적 import로 변경

## 확인사항

✅ 코드 수정 완료
⏳ 개발 서버 재시작 필요
⏳ 테스트 필요

## 다음 단계

1. 개발 서버 재시작:
   ```powershell
   npm.cmd run dev
   ```

2. 브라우저에서 테스트:
   - `http://localhost:8080` 접속
   - 오류가 해결되었는지 확인

## 참고

동적 import를 사용하면 Firebase 모듈이 서버 사이드에서 실행되지 않고, 클라이언트 사이드에서만 실행됩니다. 이렇게 하면 500 Internal Server Error가 해결됩니다.
