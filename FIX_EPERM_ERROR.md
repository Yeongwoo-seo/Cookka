# EPERM 오류 해결 방법

## 문제
서버 시작 시 `Error: spawn EPERM` 오류 발생

## 원인
1. 포트 8080이 이미 사용 중
2. 권한 문제
3. OneDrive 동기화 문제 (파일 잠금)

## 해결 방법

### 방법 1: 포트 8080 사용 중인 프로세스 종료

1. **포트 사용 확인**:
   ```powershell
   netstat -ano | findstr :8080
   ```

2. **프로세스 종료**:
   - 위 명령어로 나온 PID 확인
   - 작업 관리자에서 해당 PID 프로세스 종료
   - 또는 명령어로 종료:
   ```powershell
   taskkill /PID [PID번호] /F
   ```

### 방법 2: 다른 포트 사용

`package.json`에서 포트를 변경:

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "start": "next start -p 3000"
  }
}
```

그 다음:
```powershell
npm.cmd run dev
```

브라우저에서 `http://localhost:3000` 접속

### 방법 3: OneDrive 동기화 문제 해결

OneDrive가 파일을 동기화하는 중일 수 있습니다:

1. **OneDrive 일시 중지**
2. **프로젝트 폴더를 OneDrive 외부로 이동** (권장)
3. **또는 `.next` 폴더 삭제 후 재시도**:
   ```powershell
   Remove-Item -Recurse -Force .next
   npm.cmd run dev
   ```

### 방법 4: 관리자 권한으로 실행

VS Code를 관리자 권한으로 실행:
1. VS Code 종료
2. VS Code 아이콘 우클릭
3. "관리자 권한으로 실행" 선택
4. 프로젝트 열기
5. `npm.cmd run dev` 실행

## 권장 해결책

**방법 2 (다른 포트 사용)**가 가장 간단하고 안전합니다.

포트를 3000으로 변경하고 다시 시도해 보세요.
