# 빠른 해결 방법

## 문제
1. 서버가 시작되지 않음 (`EPERM` 오류)
2. `http://localhost:8080`에 접속하려고 함 (포트가 3000으로 변경됨)

## 즉시 해결 방법

### 1단계: cmd에서 서버 시작

1. **명령 프롬프트(cmd) 열기**
   - `Win + R` → `cmd` 입력 → Enter

2. **다음 명령어 실행**:
   ```cmd
   cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
   rmdir /s /q .next
   npm run dev
   ```

3. **서버가 시작되면** 터미널에 다음 메시지가 표시됩니다:
   ```
   ✓ Ready in X seconds
   ○ Local: http://localhost:3000
   ```

### 2단계: 브라우저에서 접속

**중요**: 포트가 **3000**으로 변경되었습니다!

- ❌ `http://localhost:8080` (작동하지 않음)
- ✅ `http://localhost:3000` (올바른 주소)

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 참고

- `.vscode/launch.json`의 URL도 3000으로 업데이트했습니다.
- 서버가 정상적으로 시작되면 `http://localhost:3000`에서 접속할 수 있습니다.
