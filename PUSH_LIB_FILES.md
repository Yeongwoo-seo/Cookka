# lib 파일 푸시 가이드

## 문제
Vercel 빌드가 실패하는 이유: `lib/firestore.ts`와 `lib/firebase.ts` 파일이 GitHub에 없습니다.

## 해결 방법

PowerShell에서 다음 명령어를 **순서대로** 실행하세요:

```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# 1. 잠금 파일 삭제
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue

# 2. 현재 상태 확인
git status

# 3. lib 파일들 추가 (이미 추가되어 있을 수 있음)
git add lib/firebase.ts lib/firestore.ts .gitignore

# 4. 커밋
git commit -m "Add lib/firebase.ts and lib/firestore.ts for Vercel build"

# 5. GitHub에 푸시
git push
```

## 확인

푸시 후:
1. GitHub 저장소에서 `lib/firebase.ts`와 `lib/firestore.ts` 파일이 있는지 확인
2. Vercel이 자동으로 재배포를 시작합니다
3. 빌드가 성공하는지 확인

## 중요

- 커밋 메시지에 "Add lib/firebase.ts and lib/firestore.ts"가 포함되어야 합니다
- 푸시가 완료되면 Vercel이 자동으로 새로운 커밋을 감지하고 재배포합니다
