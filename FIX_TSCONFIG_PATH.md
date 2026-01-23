# tsconfig.json 경로 해석 문제 해결

## 문제
Vercel 빌드에서 `@/lib/firestore`를 찾지 못하는 이유는 `tsconfig.json`에 `baseUrl`이 없어서 경로 해석이 제대로 되지 않을 수 있습니다.

## 해결 완료
`tsconfig.json`에 `baseUrl: "."`을 추가했습니다.

## 다음 단계

PowerShell에서 다음 명령어를 실행하세요:

```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# 잠금 파일 삭제
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue

# 변경사항 추가
git add tsconfig.json

# 커밋
git commit -m "Fix: Add baseUrl to tsconfig.json for path resolution"

# 푸시
git push origin master
```

## 확인사항

푸시 후:
1. Vercel이 자동으로 재배포를 시작합니다
2. 빌드 로그에서 `@/lib/firestore` 경로를 올바르게 해석하는지 확인
3. 빌드가 성공하는지 확인

## 예상 결과

성공 시:
- ✅ `@/lib/firestore` 경로가 올바르게 해석됨
- ✅ `lib/firestore.ts` 파일을 찾음
- ✅ 빌드 성공
