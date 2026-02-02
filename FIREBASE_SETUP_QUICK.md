# Firebase 프로젝트 빠른 설정 가이드

## 1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속
2. **프로젝트 추가** 클릭
3. 프로젝트 이름: `cookka` (또는 원하는 이름)
4. Google Analytics 설정: **나중에** 선택 (선택사항)

## 2. Firestore Database 설정
1. 좌측 메뉴 → **Firestore Database**
2. **데이터베이스 만들기** 클릭
3. 보안 규칙: **테스트 모드에서 시작** 선택
4. 위치: **asia-northeast3** (서울) 선택

## 3. 웹 앱 등록
1. 프로젝트 개요 → **웹 앱 추가** 버튼 (</> 아이콘)
2. 앱 닉네임: `cookka-web`
3. Firebase Hosting 설정: **체크 해제**
4. **앱 등록** 클릭

## 4. 설정 정보 복사
Firebase SDK snippet에서 다음 정보를 `.env.local`에 업데이트:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 5. Firestore 보안 규칙 (개발용)
Firestore Database → Rules 탭:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 6. 개발 서버 재시작
```bash
npm run dev
```