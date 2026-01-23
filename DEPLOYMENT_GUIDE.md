# 배포 가이드

Cookka 애플리케이션을 배포하여 다른 사람들이 사용할 수 있도록 설정하는 방법입니다.

## 배포 옵션

### 옵션 1: Vercel (권장 - 가장 간단)

Vercel은 Next.js를 만든 회사에서 제공하는 플랫폼으로, Next.js 애플리케이션 배포에 최적화되어 있습니다.

#### 배포 단계

1. **Vercel 계정 생성**
   - [Vercel](https://vercel.com)에 접속하여 GitHub 계정으로 로그인

2. **프로젝트 연결**
   - "Add New Project" 클릭
   - GitHub 저장소 선택: https://github.com/Yeongwoo-seo/Cookka
   - 프로젝트 이름: `cookka` (또는 원하는 이름)

3. **환경 변수 설정**
   - 프로젝트 설정 > Environment Variables에서 다음 변수 추가:
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
     NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
     GEMINI_API_KEY=your-gemini-api-key
     YOUTUBE_API_KEY=your-youtube-api-key
     ```

4. **빌드 설정**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (기본값)
   - Output Directory: `.next` (기본값)

5. **배포**
   - "Deploy" 버튼 클릭
   - 배포 완료 후 제공되는 URL로 접속 가능 (예: `https://cookka.vercel.app`)

#### 커스텀 도메인 설정 (선택사항)
- 프로젝트 설정 > Domains에서 도메인 추가 가능

---

### 옵션 2: Firebase Hosting

Firebase를 이미 사용하고 있으므로 Firebase Hosting을 사용할 수도 있습니다.

#### 배포 단계

1. **Firebase CLI 설치**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase 로그인**
   ```bash
   firebase login
   ```

3. **프로젝트 초기화**
   ```bash
   firebase init hosting
   ```
   - 기존 프로젝트 선택: `cookka-4cb78`
   - Public directory: `.next` (또는 `out` - static export 사용 시)
   - Single-page app: No
   - GitHub Actions: 선택사항

4. **Next.js 빌드 설정**
   - `next.config.js`에 output 설정 추가 (필요시):
   ```javascript
   module.exports = {
     output: 'standalone', // 또는 'export' (정적 사이트)
   }
   ```

5. **빌드 및 배포**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

6. **환경 변수 설정**
   - Firebase Console > Functions > 환경 변수에서 설정
   - 또는 `.env.production` 파일 사용

---

### 옵션 3: Netlify

#### 배포 단계

1. **Netlify 계정 생성**
   - [Netlify](https://www.netlify.com)에 접속하여 GitHub 계정으로 로그인

2. **프로젝트 연결**
   - "Add new site" > "Import an existing project"
   - GitHub 저장소 선택: https://github.com/Yeongwoo-seo/Cookka

3. **빌드 설정**
   - Build command: `npm run build`
   - Publish directory: `.next` (또는 `out`)

4. **환경 변수 설정**
   - Site settings > Environment variables에서 추가

5. **배포**
   - 자동으로 배포 시작
   - 배포 완료 후 제공되는 URL로 접속 가능

---

## 배포 전 체크리스트

### 1. 환경 변수 확인
- [ ] Firebase 설정 변수 모두 설정
- [ ] Gemini API Key 설정
- [ ] YouTube API Key 설정 (선택사항)

### 2. Firebase 설정 확인
- [ ] Firestore Database 생성 완료
- [ ] Firestore 보안 규칙 설정
- [ ] Storage 설정 (이미지 업로드용)

### 3. 보안 규칙 점검
현재 개발용 규칙(`allow read, write: if true`)을 프로덕션용으로 변경:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 접근 가능
    match /recipes/{recipeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /inventory/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /dailyMenus/{menuId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /businessMetrics/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /ingredientPrices/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. 빌드 테스트
```bash
npm run build
```
- 빌드 오류가 없는지 확인

### 5. 프로덕션 모드 테스트
```bash
npm run build
npm start
```
- 로컬에서 프로덕션 빌드가 정상 작동하는지 확인

---

## 배포 후 확인사항

1. **Firebase 연결 확인**
   - 배포된 사이트에서 Firebase 데이터가 정상적으로 로드되는지 확인

2. **기능 테스트**
   - 레시피 추가/수정/삭제
   - 재고 추가/수정/삭제
   - 메뉴 저장
   - 실시간 동기화

3. **성능 확인**
   - 페이지 로딩 속도
   - 이미지 최적화

---

## 권장 사항

### Vercel 사용 시
- ✅ Next.js에 최적화
- ✅ 자동 HTTPS
- ✅ 글로벌 CDN
- ✅ 자동 배포 (Git push 시)
- ✅ 무료 플랜 제공

### Firebase Hosting 사용 시
- ✅ Firebase 프로젝트와 통합
- ✅ Firebase 인증과 쉽게 연동 가능
- ✅ 무료 플랜 제공

---

## 문제 해결

### 빌드 오류
- 환경 변수가 제대로 설정되었는지 확인
- `npm run build` 로컬에서 먼저 테스트

### Firebase 연결 오류
- 환경 변수 `NEXT_PUBLIC_` 접두사 확인
- Firebase 프로젝트 ID 확인
- Firestore 보안 규칙 확인

### CORS 오류
- Firebase 보안 규칙 확인
- API 라우트 설정 확인

---

## 다음 단계

배포가 완료되면:
1. 사용자에게 배포된 URL 공유
2. Firebase 인증 추가 (선택사항)
3. 사용자 피드백 수집 및 개선
