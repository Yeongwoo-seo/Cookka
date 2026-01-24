# PowerShell 실행 정책 문제 해결

## 문제
`npm run dev` 실행 시 오류:
```
File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## 원인
PowerShell의 실행 정책(Execution Policy)이 스크립트 실행을 차단하고 있습니다.

## 해결 방법

### 방법 1: 현재 세션에서만 실행 정책 변경 (권장)

PowerShell을 **관리자 권한으로 실행**한 후:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

그 다음 개발 서버 실행:
```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
npm run dev
```

### 방법 2: 현재 사용자에 대해 영구적으로 변경

PowerShell을 **관리자 권한으로 실행**한 후:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 방법 3: cmd 사용 (가장 간단)

PowerShell 대신 **명령 프롬프트(cmd)**를 사용:

1. `Win + R` 누르기
2. `cmd` 입력 후 Enter
3. 다음 명령어 실행:

```cmd
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
npm run dev
```

### 방법 4: VS Code 터미널에서 cmd 사용

VS Code에서:
1. 터미널 열기 (`Ctrl + ``)
2. 터미널 드롭다운에서 "Select Default Profile" 클릭
3. "Command Prompt" 선택
4. 새 터미널 열기

## 권장 방법

**방법 3 (cmd 사용)**이 가장 간단하고 안전합니다.

## 확인사항

실행 정책 확인:
```powershell
Get-ExecutionPolicy
```

현재 정책이 `Restricted`이면 스크립트 실행이 차단됩니다.
