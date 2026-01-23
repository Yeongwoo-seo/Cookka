# Cookka Flutter 프로젝트 설정 가이드

## 1. Flutter 설치

### Windows
1. [Flutter 공식 사이트](https://flutter.dev/docs/get-started/install/windows)에서 Flutter SDK 다운로드
2. 압축 해제 후 원하는 위치에 설치
3. 환경 변수 PATH에 Flutter bin 디렉토리 추가
4. 명령 프롬프트에서 확인:
   ```bash
   flutter doctor
   ```

### 필수 도구
- Git
- Android Studio (Android 개발용)
- VS Code 또는 Android Studio (에디터)

## 2. 프로젝트 설정

### 의존성 설치
```bash
flutter pub get
```

### 프로젝트 구조 확인
```
lib/
├── main.dart
├── models/
├── views/
├── services/
└── theme/
```

## 3. 실행 방법

### Android 에뮬레이터
1. Android Studio에서 AVD Manager 실행
2. 에뮬레이터 생성 및 시작
3. 다음 명령 실행:
   ```bash
   flutter run
   ```

### Chrome (웹)
```bash
flutter run -d chrome
```

### 실제 디바이스
- Android: USB 디버깅 활성화 후 연결
- iOS: Xcode 필요 (macOS만)

## 4. 빌드

### Android APK
```bash
flutter build apk
```

### Android App Bundle
```bash
flutter build appbundle
```

### iOS (macOS만)
```bash
flutter build ios
```

## 5. 문제 해결

### Flutter Doctor 이슈
```bash
flutter doctor -v
```
각 항목을 확인하고 필요한 도구 설치

### 의존성 문제
```bash
flutter clean
flutter pub get
```

### 빌드 캐시 정리
```bash
flutter clean
```

## 6. 개발 팁

### Hot Reload
- `r` 키: Hot Reload
- `R` 키: Hot Restart
- `q` 키: 종료

### 디버깅
- VS Code: F5로 디버깅 시작
- Android Studio: Run 버튼 클릭

### 성능 분석
```bash
flutter run --profile
```
