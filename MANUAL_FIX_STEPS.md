# 서버 연결 오류 수동 해결 방법

## 문제
서버에 연결할 수 없음 - `Error: spawn EPERM` 오류

## 즉시 시도할 수 있는 해결 방법

### 방법 1: cmd에서 직접 실행 (가장 확실)

1. **명령 프롬프트(cmd) 열기**
   - `Win + R` 누르기
   - `cmd` 입력 후 Enter

2. **프로젝트 폴더로 이동**
   ```cmd
   cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
   ```

3. **.next 폴더 삭제** (있는 경우)
   ```cmd
   rmdir /s /q .next
   ```

4. **서버 시작**
   ```cmd
   npm run dev
   ```

5. **브라우저에서 확인**
   - `http://localhost:3000` 접속

### 방법 2: OneDrive 동기화 일시 중지

1. **시스템 트레이에서 OneDrive 아이콘 클릭**
2. **설정** → **일시 중지** → **2시간 일시 중지**
3. VS Code에서 `npm.cmd run dev` 다시 실행

### 방법 3: 프로젝트를 OneDrive 외부로 이동 (권장)

OneDrive가 파일을 잠그는 것을 방지하기 위해:

1. **새 폴더 생성**
   ```
   C:\Projects\Cookka
   ```

2. **프로젝트 복사** (이동 아님, 복사)
   - `C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka`의 모든 파일
   - → `C:\Projects\Cookka`로 복사

3. **VS Code에서 새 폴더 열기**
   - `File` → `Open Folder`
   - `C:\Projects\Cookka` 선택

4. **서버 시작**
   ```cmd
   npm run dev
   ```

## 현재 상태

서버가 백그라운드에서 시작 중입니다. 잠시 후 확인해 주세요.

## 확인 방법

터미널에서 다음 메시지가 보이면 성공:
```
✓ Ready in X seconds
○ Local: http://localhost:3000
```

## 참고

OneDrive 동기화 문제가 계속되면, 프로젝트를 OneDrive 외부로 이동하는 것이 가장 확실한 해결책입니다.
