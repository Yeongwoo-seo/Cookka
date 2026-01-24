# Vercel Firebase 환경 변수 설정 가이드

## 문제
빌드 시점에 `FirebaseError: Firebase: Error (auth/invalid-api-key)` 오류가 발생합니다.

## 원인
Vercel에 Firebase 환경 변수가 설정되지 않았거나, 빌드 시점에 환경 변수를 읽을 수 없습니다.

## 해결 방법

### 1. Vercel 대시보드에서 환경 변수 설정

1. Vercel 대시보드 접속: https://vercel.com/dashboard
2. 프로젝트 선택: `cookka` 또는 `Yeongwoo-seo/Cookka`
3. **Settings** → **Environment Variables** 클릭
4. 다음 환경 변수들을 추가:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 2. 환경 변수 값 확인

`.env.local` 파일에서 값을 확인하세요:

```powershell
# PowerShell에서 확인
Get-Content .env.local
```

### 3. 환경 변수 적용 범위

각 환경 변수에 대해 다음을 선택:
- **Production**: ✅ 체크
- **Preview**: ✅ 체크 (선택사항)
- **Development**: ✅ 체크 (선택사항)

### 4. 재배포

환경 변수를 추가한 후:
1. **Deployments** 탭으로 이동
2. 최신 배포 옆의 **⋯** 메뉴 클릭
3. **Redeploy** 선택
4. **Use existing Build Cache** 체크 해제 (선택사항, 캐시 초기화)
5. **Redeploy** 클릭

## 확인사항

배포 후 빌드 로그에서:
- ✅ `✓ Compiled successfully` 확인
- ✅ `✓ Generating static pages` 성공 확인
- ❌ `FirebaseError: Firebase: Error (auth/invalid-api-key)` 오류가 없어야 함

## 대안: Firebase 없이 빌드하기

만약 Firebase를 사용하지 않으려면:
- 환경 변수를 설정하지 않으면 샘플 데이터를 사용합니다
- 하지만 빌드 시점 오류를 방지하기 위해 `app/page.tsx`에 `export const dynamic = 'force-dynamic'`이 추가되었습니다

## 추가 수정 사항

다음 파일들이 수정되었습니다:
- `app/page.tsx`: `export const dynamic = 'force-dynamic'` 추가 (빌드 시점 정적 생성 방지)
- `lib/firebase.ts`: 조건부 초기화로 변경 (환경 변수 없을 때 오류 방지)
