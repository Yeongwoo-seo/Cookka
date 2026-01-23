# Vercel 빌드 오류 수정

## 문제
빌드 오류: `Module not found: Can't resolve '@/lib/firestore'`

## 원인
`.gitignore` 파일에 `lib/`가 포함되어 있어서 `lib/firestore.ts`와 `lib/firebase.ts` 파일이 GitHub에 푸시되지 않았습니다.

## 해결 방법

PowerShell에서 다음 명령어를 실행하세요:

```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# 잠금 파일 삭제
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue

# .gitignore 수정 확인 (이미 수정됨)
# lib/ 폴더 전체를 무시하지 않도록 변경

# lib 폴더의 파일들 추가
git add lib/firebase.ts lib/firestore.ts .gitignore

# 변경사항 커밋
git commit -m "Add lib/firebase.ts and lib/firestore.ts files for Vercel build"

# GitHub에 푸시
git push
```

## 확인사항

푸시 후 Vercel에서:
1. 자동으로 재배포가 시작됩니다
2. 빌드가 성공하는지 확인하세요
3. `lib/firestore.ts`와 `lib/firebase.ts` 파일이 포함되었는지 확인
