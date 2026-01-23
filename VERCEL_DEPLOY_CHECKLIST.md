# Vercel 배포 체크리스트

## ✅ 완료된 작업

1. ✅ Vercel 프로젝트 생성
2. ✅ 환경 변수 설정 완료
3. ✅ GitHub 저장소 연결 완료

## ⚠️ 현재 문제

빌드가 실패했습니다. 다음을 확인하세요:

### 1. 빌드 로그 확인
Vercel 대시보드에서 "Build Logs"를 클릭하여 정확한 오류 메시지를 확인하세요.

### 2. 변경사항 푸시 확인
타입 오류 수정 사항이 GitHub에 푸시되었는지 확인:

```bash
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# 현재 상태 확인
git status

# 변경사항이 있다면 커밋 및 푸시
git add .
git commit -m "Fix TypeScript build errors"
git push
```

## 🔍 일반적인 빌드 오류 해결 방법

### 오류 1: TypeScript 타입 오류
**해결**: 이미 수정했으므로 푸시만 하면 됩니다.

### 오류 2: 환경 변수 누락
**확인**: Vercel 프로젝트 설정에서 모든 환경 변수가 설정되었는지 확인
- Production, Preview, Development 모두에 설정되어 있는지 확인

### 오류 3: 의존성 문제
**해결**: `package.json`의 의존성이 올바른지 확인

## 📝 다음 단계

1. **빌드 로그 확인**
   - Vercel 대시보드 > 프로젝트 > Deployments > 실패한 배포 클릭
   - "Build Logs" 탭에서 오류 메시지 확인

2. **변경사항 푸시**
   - 로컬에서 변경사항이 있다면 커밋 및 푸시
   - Vercel은 자동으로 재배포를 시도합니다

3. **재배포**
   - 푸시 후 자동 재배포되거나
   - 수동으로 "Redeploy" 클릭

## 🎯 예상되는 오류

이전에 발견한 타입 오류들:
- `app/api/youtube/route.ts` - `pinnedComment` null 체크
- `components/CookingView.tsx` - `RecipeStep` 타입 import

이 오류들은 이미 수정했으므로, 변경사항을 푸시하면 해결될 것입니다.
