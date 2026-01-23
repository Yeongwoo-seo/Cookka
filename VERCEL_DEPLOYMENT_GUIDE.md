# Vercel 배포 가이드

Cookka 프로젝트를 Vercel에 배포하는 상세 가이드입니다.

## 📋 사전 준비사항

- ✅ GitHub 저장소에 코드가 푸시되어 있어야 합니다
- ✅ GitHub 계정이 있어야 합니다
- ✅ 환경 변수 값들을 준비해야 합니다

## 🚀 배포 단계

### 1단계: Vercel 계정 생성 및 로그인

1. [Vercel](https://vercel.com)에 접속
2. "Sign Up" 또는 "Log In" 클릭
3. **"Continue with GitHub"** 선택하여 GitHub 계정으로 로그인
4. Vercel이 GitHub 저장소에 접근할 수 있도록 권한 승인

### 2단계: 새 프로젝트 추가

1. Vercel 대시보드에서 **"Add New Project"** 클릭
2. GitHub 저장소 목록에서 **"Yeongwoo-seo/Cookka"** 선택
3. **"Import"** 클릭

### 3단계: 프로젝트 설정

#### 기본 설정
- **Project Name**: `cookka` (또는 원하는 이름)
- **Framework Preset**: `Next.js` (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Install Command**: `npm install` (기본값)

#### 환경 변수 설정 (중요!)

**"Environment Variables"** 섹션에서 다음 변수들을 추가하세요:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDkhJdOWAD75wgtmWl1jTIg_iNV34Vr3ow
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cookka-4cb78.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cookka-4cb78
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cookka-4cb78.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=588408206024
NEXT_PUBLIC_FIREBASE_APP_ID=1:588408206024:web:6bcaa13a677f2198eaabfd
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-97KQ59EHV4
GEMINI_API_KEY=AIzaSyCylKVykHheuZEc2sGRYxPtlaQMS5kLb4Y
YOUTUBE_API_KEY=AIzaSyAU9H6iVLhpYzdDR9mx6Dmlixo4L_gtDj4
```

**환경 변수 추가 방법:**
1. "Environment Variables" 섹션에서 **"Add"** 클릭
2. **Key**에 변수 이름 입력 (예: `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. **Value**에 변수 값 입력 (예: `AIzaSyDkhJdOWAD75wgtmWl1jTIg_iNV34Vr3ow`)
4. **Environment**는 **Production, Preview, Development** 모두 선택
5. **"Save"** 클릭
6. 모든 변수를 반복하여 추가

### 4단계: 배포 시작

1. 모든 설정이 완료되면 **"Deploy"** 버튼 클릭
2. 배포 진행 상황을 실시간으로 확인할 수 있습니다
3. 약 2-5분 정도 소요됩니다

### 5단계: 배포 완료 확인

1. 배포가 완료되면 **"Visit"** 버튼이 나타납니다
2. 클릭하면 배포된 사이트로 이동합니다
3. URL 형식: `https://cookka-xxxxx.vercel.app` (또는 커스텀 도메인)

## 🔄 자동 배포 설정

Vercel은 기본적으로 GitHub에 푸시할 때마다 자동으로 배포합니다:

1. **Production 배포**: `main` 또는 `master` 브랜치에 푸시 시
2. **Preview 배포**: 다른 브랜치에 푸시 시 (PR 생성 시)

자동 배포를 비활성화하려면:
- 프로젝트 설정 > Git > "Automatic deployments" 토글 끄기

## 🌐 커스텀 도메인 설정 (선택사항)

1. 프로젝트 설정 > **"Domains"** 클릭
2. 원하는 도메인 입력 (예: `cookka.com`)
3. DNS 설정 안내에 따라 도메인 제공업체에서 설정
4. Vercel이 자동으로 SSL 인증서 발급

## ⚙️ 배포 후 설정

### 환경 변수 추가/수정

1. 프로젝트 설정 > **"Environment Variables"** 클릭
2. 변수 추가/수정/삭제
3. 변경 후 **"Redeploy"** 필요

### 재배포

- **자동**: Git에 푸시하면 자동 재배포
- **수동**: 프로젝트 페이지에서 **"Redeploy"** 클릭

## 🔍 배포 로그 확인

1. 프로젝트 페이지에서 **"Deployments"** 탭 클릭
2. 각 배포의 로그 확인 가능
3. 빌드 오류가 있으면 여기서 확인

## 🐛 문제 해결

### 빌드 오류

**증상**: 배포가 실패하거나 빌드 오류 발생

**해결 방법:**
1. 배포 로그 확인
2. 환경 변수가 모두 설정되었는지 확인
3. 로컬에서 `npm run build` 테스트
4. `package.json`의 의존성 확인

### Firebase 연결 오류

**증상**: 배포된 사이트에서 Firebase 데이터를 불러오지 못함

**해결 방법:**
1. 환경 변수 `NEXT_PUBLIC_` 접두사 확인
2. Firebase Console에서 프로젝트 ID 확인
3. Firestore 보안 규칙 확인 (현재 개발용 규칙 사용 중)

### 환경 변수 누락

**증상**: 특정 기능이 작동하지 않음

**해결 방법:**
1. 프로젝트 설정 > Environment Variables 확인
2. 모든 변수가 Production, Preview, Development에 설정되었는지 확인
3. 변수 이름의 오타 확인

## 📊 배포 상태 확인

- ✅ **Ready**: 배포 완료, 정상 작동
- ⏳ **Building**: 빌드 중
- ❌ **Error**: 배포 실패 (로그 확인 필요)
- 🔄 **Queued**: 배포 대기 중

## 🎯 다음 단계

배포가 완료되면:

1. ✅ 배포된 사이트에서 모든 기능 테스트
2. ✅ Firebase 데이터 연결 확인
3. ✅ 레시피 추가/수정/삭제 테스트
4. ✅ 재고 관리 기능 테스트
5. ✅ 메뉴 저장 기능 테스트

## 📝 참고사항

- Vercel 무료 플랜은 충분히 사용 가능합니다
- 자동 HTTPS가 기본 제공됩니다
- 글로벌 CDN이 자동으로 설정됩니다
- GitHub에 푸시할 때마다 자동 배포됩니다

## 🎉 완료!

배포가 완료되면 다른 사람들과 URL을 공유하여 사용할 수 있습니다!

**배포 URL 예시:**
```
https://cookka.vercel.app
또는
https://cookka-xxxxx.vercel.app
```
