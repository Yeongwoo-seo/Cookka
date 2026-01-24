# 서버 연결 오류 해결

## 문제
서버에 연결할 수 없음 - `Error: spawn EPERM` 오류 발생

## 원인
1. **OneDrive 동기화 문제**: OneDrive가 파일을 동기화하는 중일 때 파일 잠금 발생
2. **권한 문제**: Node.js 프로세스가 파일에 접근할 권한이 없음
3. **`.next` 폴더 문제**: 빌드 캐시 폴더가 손상되었을 수 있음

## 해결 방법

### 방법 1: `.next` 폴더 삭제 후 재시작 (시도 중)

`.next` 폴더를 삭제하고 서버를 다시 시작했습니다.

### 방법 2: OneDrive 동기화 일시 중지

1. **OneDrive 아이콘 클릭** (시스템 트레이)
2. **설정** → **일시 중지** → **2시간 일시 중지**
3. 서버 재시작

### 방법 3: 프로젝트를 OneDrive 외부로 이동 (권장)

OneDrive 폴더 밖으로 프로젝트를 이동:
```
C:\Users\kjaso\Desktop\Projects\3. Cookka
→
C:\Projects\Cookka
```

### 방법 4: 관리자 권한으로 VS Code 실행

1. VS Code 종료
2. VS Code 아이콘 우클릭
3. **"관리자 권한으로 실행"** 선택
4. 프로젝트 열기
5. `npm.cmd run dev` 실행

### 방법 5: cmd에서 직접 실행

PowerShell 대신 명령 프롬프트(cmd) 사용:

1. `Win + R` 누르기
2. `cmd` 입력 후 Enter
3. 다음 명령어 실행:
```cmd
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
npm run dev
```

## 현재 상태

- `.next` 폴더 삭제 완료
- 서버 재시작 시도 중

## 확인 방법

서버가 정상적으로 시작되면:
- 터미널에 `Ready` 메시지 표시
- `http://localhost:3000` 접속 가능

## 참고

OneDrive 동기화 문제가 지속되면, 프로젝트를 OneDrive 외부로 이동하는 것이 가장 확실한 해결책입니다.
