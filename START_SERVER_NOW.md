# 서버 시작 방법 (즉시 실행)

## 문제
서버에 연결할 수 없음 - 서버가 실행되지 않음

## 해결 방법: cmd에서 직접 실행

### 단계별 안내

1. **명령 프롬프트(cmd) 열기**
   - `Win + R` 키 누르기
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

5. **서버가 시작되면** 터미널에 다음 메시지가 표시됩니다:
   ```
   ✓ Ready in X seconds
   ○ Local: http://localhost:3000
   ```

6. **브라우저에서 접속**
   - `http://localhost:3000` 열기
   - ⚠️ **포트가 3000입니다!** (8080 아님)

## 중요 사항

- **포트 번호**: `http://localhost:3000` (8080 아님)
- **서버가 실행 중이어야 함**: cmd 창을 닫지 마세요
- **서버 중지**: cmd 창에서 `Ctrl + C` 누르기

## 문제가 계속되면

1. **다른 터미널/프로세스 확인**
   - 작업 관리자에서 Node.js 프로세스 종료
   - 포트 3000 사용 중인 프로세스 확인

2. **OneDrive 동기화 일시 중지**
   - 시스템 트레이 → OneDrive 아이콘
   - 설정 → 일시 중지 → 2시간

3. **프로젝트를 OneDrive 외부로 이동**
   - `C:\Projects\Cookka` 같은 위치로 복사

## 확인

서버가 정상적으로 시작되면:
- cmd 창에 "Ready" 메시지 표시
- `http://localhost:3000` 접속 가능
