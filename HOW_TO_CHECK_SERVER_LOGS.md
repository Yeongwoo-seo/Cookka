# 서버 로그 확인 방법

## 방법 1: VS Code 터미널 패널에서 확인 (가장 간단)

1. **VS Code 하단의 터미널 패널 열기**
   - `Ctrl + `` (백틱) 누르기
   - 또는 메뉴: `View` → `Terminal`

2. **터미널 탭 확인**
   - 여러 터미널이 실행 중일 수 있음
   - `npm.cmd run dev`가 실행 중인 터미널 탭 찾기

3. **오류 메시지 확인**
   - 빨간색으로 표시된 오류 메시지 찾기
   - 오류가 발생한 파일 이름과 라인 번호 확인

## 방법 2: 터미널 출력 파일 확인

백그라운드에서 실행 중인 서버의 로그는 다음 파일에 저장됩니다:
- `C:\Users\kjaso\.cursor\projects\c-Users-kjaso-OneDrive-Desktop-Projects-3-Cookka/terminals/111205.txt`

이 파일을 VS Code에서 열어서 확인할 수 있습니다.

## 방법 3: 새 터미널에서 직접 실행

1. **VS Code에서 새 터미널 열기**
   - `Ctrl + Shift + `` (백틱)
   - 또는 메뉴: `Terminal` → `New Terminal`

2. **개발 서버 실행**
   ```powershell
   cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"
   npm.cmd run dev
   ```

3. **오류 메시지 확인**
   - 터미널에 직접 출력되는 오류 메시지 확인
   - 오류가 발생하면 빨간색으로 표시됨

## 확인해야 할 정보

서버 로그에서 다음 정보를 확인하세요:

1. **오류 메시지**: 정확한 오류 텍스트
2. **오류 위치**: 
   - 파일 경로 (예: `lib/firebase.ts`)
   - 라인 번호 (예: `at line 24`)
3. **스택 트레이스**: 오류가 발생한 함수 호출 경로
4. **오류 타입**: 
   - `Error`
   - `TypeError`
   - `ReferenceError`
   - 등

## 예시

일반적인 오류 메시지 형태:
```
Error: Firebase can only be used on the client side
    at getDb (lib/firebase.ts:167:15)
    at getRecipes (lib/firestore.ts:45:12)
    ...
```

이런 형태의 오류 메시지를 복사해서 공유해 주시면 정확한 해결책을 제시할 수 있습니다.
