# Cookka 프로젝트 설정 가이드

## Xcode 프로젝트 생성 방법

1. **Xcode 실행** 후 "Create a new Xcode project" 선택
2. **템플릿 선택**: iOS > App
3. **프로젝트 정보 입력**:
   - Product Name: `Cookka`
   - Interface: `SwiftUI`
   - Language: `Swift`
   - Storage: `None` (또는 필요시 Core Data)
4. **저장 위치**: 현재 프로젝트 폴더 선택

## 파일 추가 방법

생성된 프로젝트에 다음 파일들을 추가하세요:

### 1. Models 폴더 생성 및 파일 추가
- `Cookka/Models/AppState.swift`
- `Cookka/Models/Recipe.swift`
- `Cookka/Models/Inventory.swift`
- `Cookka/Models/BusinessMetrics.swift`
- `Cookka/Models/Team.swift`

### 2. Views 폴더 생성 및 파일 추가
- `Cookka/Views/MainTabView.swift`
- `Cookka/Views/DashboardView.swift`
- `Cookka/Views/RecipeBoardView.swift`
- `Cookka/Views/InventoryView.swift`
- `Cookka/Views/TeamSettingsView.swift`

### 3. Services 폴더 생성 및 파일 추가
- `Cookka/Services/SyncService.swift`

### 4. Utilities 폴더 생성 및 파일 추가
- `Cookka/Utilities/ColorExtension.swift`

### 5. App 파일 교체
- `CookkaApp.swift` 파일을 생성된 프로젝트의 기본 App 파일과 교체

## 빌드 설정

1. **최소 배포 타겟**: iOS 16.0 이상
2. **Swift 버전**: 5.9 이상
3. **개발 팀**: Apple Developer 계정 설정

## 다음 단계

프로젝트가 정상적으로 빌드되면:
1. Firebase 또는 백엔드 연동
2. 실시간 동기화 구현
3. 푸시 알림 설정
4. 테스트 작성

## 문제 해결

### 빌드 에러 발생 시
- 모든 파일이 프로젝트에 제대로 추가되었는지 확인
- 파일이 올바른 타겟에 포함되어 있는지 확인
- Clean Build Folder (Cmd+Shift+K) 후 다시 빌드