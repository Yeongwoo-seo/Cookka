# Internal Server Error 해결

## 문제
Internal Server Error가 발생합니다.

## 원인
Firebase가 서버 사이드에서 초기화되려고 할 때 문제가 발생할 수 있습니다. Next.js는 서버 사이드 렌더링(SSR)을 시도하는데, Firebase는 클라이언트 전용입니다.

## 해결 방법

### 1. `lib/firebase.ts` 수정
- `hasFirebaseConfig()` 함수에 서버 사이드 체크 추가
- `getDb()` 함수에 서버 사이드 체크 추가

### 2. `lib/firestore.ts` 수정
- 모든 함수에 서버 사이드 체크 추가
- 서버 사이드에서는 적절한 기본값 반환

## 변경된 파일

- `lib/firebase.ts`: 서버 사이드 체크 추가
- `lib/firestore.ts`: 서버 사이드 체크 추가 (진행 중)

## 확인사항

⏳ 모든 firestore 함수에 서버 사이드 체크 추가 필요
⏳ 테스트 필요
