# Firebase Proxy 오류 수정

## 문제
런타임 오류: `FirebaseError: Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore`

## 원인
`lib/firebase.ts`에서 Proxy를 사용한 `db` 객체가 실제 Firestore 인스턴스가 아니어서, `collection(db, ...)` 같은 함수 호출에서 오류가 발생했습니다.

## 해결 방법

### 1. `lib/firebase.ts` 수정
- `getDb()` 함수를 export하여 실제 Firestore 인스턴스를 반환하도록 수정
- Proxy는 속성 접근용으로만 유지

### 2. `lib/firestore.ts` 수정
- 모든 `collection(db, ...)`, `doc(db, ...)` 호출을 `collection(getDb(), ...)`, `doc(getDb(), ...)`로 변경
- 총 17개 위치 수정

## 변경된 파일

### `lib/firebase.ts`
```typescript
// 실제 인스턴스를 반환하는 getter 함수 export
export const getDb = (): Firestore => {
  return getDbLazy();
};

export const getAuth = (): Auth => {
  return getAuthLazy();
};

export const getStorageInstance = (): FirebaseStorage => {
  return getStorageLazy();
};
```

### `lib/firestore.ts`
- 모든 `db` 사용을 `getDb()`로 변경
- 예: `collection(db, 'recipes')` → `collection(getDb(), 'recipes')`

## 확인사항

✅ 코드 수정 완료
⏳ 로컬 빌드 테스트 (`.next` 폴더 문제로 건너뜀)
⏳ Vercel 배포 후 테스트 필요

## 다음 단계

1. 변경사항 커밋 및 푸시
2. Vercel에서 자동 재배포 확인
3. 브라우저에서 Firebase 오류가 해결되었는지 확인

## 참고

로컬 `.next` 폴더의 `EINVAL` 오류는 OneDrive 동기화 문제로, Vercel 빌드에는 영향을 주지 않습니다.
