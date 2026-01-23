# 🚀 Cookka 빠른 시작 가이드

## Flutter 설치 및 실행 (Windows)

### 방법 1: 자동 설치 스크립트 (권장)

1. **PowerShell을 관리자 권한으로 실행**

2. **스크립트 실행 권한 설정** (최초 1회만)
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **프로젝트 폴더에서 스크립트 실행**
   ```powershell
   cd "c:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
   .\install_flutter.ps1
   ```

4. **새 터미널 열기** (환경 변수 적용)

5. **Flutter 확인**
   ```bash
   flutter doctor
   ```

### 방법 2: 수동 설치

1. **Git 설치** (아직 없다면)
   - https://git-scm.com/download/win
   - 또는: `winget install --id Git.Git -e --source winget`

2. **Flutter SDK 다운로드**
   - https://flutter.dev/docs/get-started/install/windows
   - 또는 직접: https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip

3. **압축 해제**
   - 예: `C:\Users\사용자명\flutter`

4. **환경 변수 설정**
   - Windows 검색 → "환경 변수" 검색
   - 사용자 변수 → Path → 편집 → 새로 만들기
   - `C:\Users\사용자명\flutter\bin` 추가

5. **새 터미널 열기**

### 앱 실행하기

1. **프로젝트 폴더로 이동**
   ```bash
   cd "c:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
   ```

2. **의존성 설치**
   ```bash
   flutter pub get
   ```

3. **실행 가능한 디바이스 확인**
   ```bash
   flutter devices
   ```

4. **앱 실행**

   **Chrome에서 실행 (가장 쉬움):**
   ```bash
   flutter run -d chrome
   ```

   **Android 에뮬레이터:**
   ```bash
   flutter run
   ```

## VS Code에서 실행

1. **VS Code 설치** (없다면)
   - https://code.visualstudio.com/

2. **Flutter 확장 설치**
   - VS Code 열기
   - 확장(Ctrl+Shift+X) → "Flutter" 검색 → 설치

3. **프로젝트 열기**
   - 파일 → 폴더 열기 → 프로젝트 폴더 선택

4. **실행**
   - F5 키 누르기
   - 또는 하단 상태바에서 디바이스 선택 후 실행

## Android Studio에서 실행

1. **Android Studio 설치**
   - https://developer.android.com/studio

2. **Flutter 플러그인 설치**
   - File → Settings → Plugins → "Flutter" 검색 → 설치

3. **프로젝트 열기**
   - File → Open → 프로젝트 폴더 선택

4. **실행**
   - 상단 Run 버튼 클릭
   - 또는 Shift+F10

## 문제 해결

### Flutter가 인식되지 않을 때
- 새 터미널 창 열기
- `flutter doctor` 실행하여 문제 확인

### 의존성 오류
```bash
flutter clean
flutter pub get
```

### 빌드 오류
```bash
flutter doctor -v
```

### Chrome이 실행되지 않을 때
- Chrome 브라우저가 설치되어 있는지 확인
- 또는 Android 에뮬레이터 사용

## 다음 단계

앱이 실행되면:
- 대시보드에서 샘플 데이터 확인
- 레시피 추가/수정 테스트
- 재고 관리 기능 테스트
- 팀 설정 확인

## 도움이 필요하신가요?

- Flutter 공식 문서: https://flutter.dev/docs
- 한국어 커뮤니티: https://flutter-kr.io
