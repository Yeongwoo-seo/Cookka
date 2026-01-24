# Firebase 빌드 오류 수정

## 문제
Vercel 빌드 시점에 `FirebaseError: Firebase: Error (auth/invalid-api-key)` 오류 발생

## 원인
1. `lib/firebase.ts`가 모듈 레벨에서 즉시 Firebase를 초기화
2. 빌드 시점에 환경 변수가 없거나 잘못 설정됨
3. Next.js가 정적 페이지 생성을 시도하면서 Firebase 초기화 오류 발생

## 해결 방법

### 1. 코드 수정 (완료)

#### `lib/firebase.ts`
- Firebase 초기화를 lazy initialization으로 변경
- 환경 변수가 없을 때 초기화를 건너뛰도록 수정
- Proxy를 사용하여 기존 API 유지

#### `app/page.tsx`
- `export const dynamic = 'force-dynamic'` 추가
- 빌드 시점 정적 페이지 생성을 방지

### 2. Vercel 환경 변수 설정 (필수)

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

1. **Settings** → **Environment Variables**
2. 다음 변수 추가:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. **Production**, **Preview**, **Development** 모두 체크

4. **Redeploy** (캐시 초기화 권장)

## 변경된 파일

- `lib/firebase.ts`: Lazy initialization 및 조건부 초기화
- `app/page.tsx`: `export const dynamic = 'force-dynamic'` 추가
- `lib/firestore.ts`: `isFirebaseConfigured` import 추가

## 확인사항

✅ 로컬 빌드 성공
⏳ Vercel 환경 변수 설정 필요
⏳ Vercel 재배포 필요

## 다음 단계

1. 변경사항 커밋 및 푸시
2. Vercel에서 환경 변수 설정
3. Vercel 재배포
4. 빌드 로그 확인
