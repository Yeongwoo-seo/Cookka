# Firebase getDb() 오류 최종 수정

## 문제
런타임 오류: `FirebaseError: Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore`

## 원인
1. `getDb()`가 호출될 때 환경 변수가 없으면 오류를 던짐
2. 모든 함수에서 환경 변수 확인 없이 `getDb()`를 호출

## 해결 방법

### 1. `lib/firebase.ts` 수정
- 내부 함수 이름 충돌 해결:
  - `getAuthInstance()` → `getAuthInstanceInternal()`
  - `getStorageInstance()` → `getStorageInstanceInternal()`
- Export 함수:
  - `getDb()`: Firestore 인스턴스 반환
  - `getAuthInstance()`: Auth 인스턴스 반환
  - `getStorageInstance()`: Storage 인스턴스 반환

### 2. `lib/firestore.ts` 수정
- 모든 함수에 `isFirebaseConfigured()` 확인 추가
- 환경 변수가 없으면:
  - Get 함수: 빈 배열/Map/null 반환
  - Save/Delete 함수: 오류 던지기
  - Subscribe 함수: 빈 unsubscribe 함수 반환
- 모든 `getDb()` 호출 전에 `const db = getDb()`로 변수에 할당

## 변경된 함수들

### Get 함수들 (환경 변수 없으면 빈 값 반환)
- `getRecipes()` → `[]`
- `getInventory()` → `[]`
- `getDailyMenus()` → `new Map()`
- `getBusinessMetrics()` → `null`
- `getIngredientPrices()` → `new Map()`
- `getTeam()` → `null`

### Save/Delete 함수들 (환경 변수 없으면 오류)
- `saveRecipe()`, `deleteRecipe()`
- `saveInventoryItem()`, `deleteInventoryItem()`
- `saveDailyMenu()`
- `saveBusinessMetrics()`
- `saveIngredientPrice()`
- `saveTeam()`

### Subscribe 함수들 (환경 변수 없으면 빈 함수 반환)
- `subscribeRecipes()` → `() => {}`
- `subscribeInventory()` → `() => {}`
- `subscribeDailyMenus()` → `() => {}`

## 확인사항

✅ 코드 수정 완료
⏳ 빌드 테스트 필요
⏳ Vercel 배포 후 테스트 필요

## 다음 단계

1. 변경사항 커밋 및 푸시
2. Vercel에서 자동 재배포 확인
3. 브라우저에서 Firebase 오류가 해결되었는지 확인
