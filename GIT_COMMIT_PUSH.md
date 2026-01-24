# Git 커밋 및 푸시 방법

## 문제
Git 작업 시 권한 오류 및 lock 파일 문제 발생

## 해결 방법: cmd에서 직접 실행

### 1단계: Git lock 파일 삭제

명령 프롬프트(cmd)에서 실행:
```cmd
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
del /f /q .git\index.lock
del /f /q .git\config.lock
```

### 2단계: 변경사항 추가

```cmd
git add .
```

### 3단계: 커밋

```cmd
git commit -m "Fix: 플로팅 버튼 위치 조정 및 서버 사이드 Firebase 오류 수정"
```

### 4단계: 푸시

```cmd
git push
```

## 전체 명령어 (한 번에 실행)

**PowerShell에서:**
```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\index.lock"
Remove-Item -Force -ErrorAction SilentlyContinue ".git\config.lock"
git add .
git commit -m "Fix: 플로팅 버튼 위치 조정 및 서버 사이드 Firebase 오류 수정"
git push
```

**cmd에서:**
```cmd
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
del /f /q .git\index.lock 2>nul
del /f /q .git\config.lock 2>nul
git add .
git commit -m "Fix: 플로팅 버튼 위치 조정 및 서버 사이드 Firebase 오류 수정"
git push
```

## 변경된 파일

### 수정된 파일:
- `.vscode/launch.json` - 포트 3000으로 변경
- `package.json` - 포트 3000으로 변경
- `lib/firebase.ts` - 서버 사이드 체크 추가
- `lib/firestore.ts` - 서버 사이드 체크 추가
- `store/app-store.ts` - Firebase 함수 동적 import
- `components/CookingView.tsx` - 플로팅 버튼 위치 조정
- `components/InventoryView.tsx` - 플로팅 버튼 위치 조정
- `components/RecipeBoardView.tsx` - 플로팅 버튼 위치 조정
- `components/TodayMenuView.tsx` - 플로팅 버튼 위치 조정
- `components/MainTabView.tsx` - 네비게이션 위치 조정
- `components/RecipeMainView.tsx` - 네비게이션 위치 조정
- `app/layout.tsx` - viewport 설정
- `app/globals.css` - iPhone UI 조정

### 새로 추가된 파일 (문서):
- `CHECK_SERVER_ERRORS.md`
- `FIX_500_ERROR.md`
- `FIX_500_ERROR_DYNAMIC_IMPORT.md`
- `FIX_EPERM_ERROR.md`
- `FIX_IPHONE_NAVIGATION.md`
- `FIX_POWERSHELL_EXECUTION_POLICY.md`
- `FIX_SERVER_COMPONENT_ERROR.md`
- `FIX_SERVER_CONNECTION.md`
- `HOW_TO_CHECK_SERVER_LOGS.md`
- `MANUAL_FIX_STEPS.md`
- `QUICK_FIX.md`
- `RUN_DEV_SERVER.txt`
- `START_SERVER_NOW.md`

## 참고

- OneDrive 동기화 문제로 인해 Git 파일이 잠길 수 있습니다
- cmd에서 직접 실행하면 문제를 피할 수 있습니다
- 네트워크 문제가 있으면 나중에 다시 시도하세요
