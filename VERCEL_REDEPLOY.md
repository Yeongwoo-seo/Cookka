# Vercel 재배포 가이드

## 문제
커밋 `aa4bce3`에 `lib/firebase.ts`와 `lib/firestore.ts` 파일이 포함되어 있지만, Vercel이 여전히 이전 커밋(`08ce020`)을 빌드하고 있습니다.

## 해결 방법

### 방법 1: Vercel에서 수동 재배포 (권장)

1. **Vercel 대시보드 접속**
   - https://vercel.com 접속
   - 프로젝트 `cookka` 선택

2. **Deployments 탭 클릭**
   - 최신 배포 확인

3. **수동 재배포**
   - 최신 배포 옆의 "..." 메뉴 클릭
   - "Redeploy" 선택
   - 또는 "Deployments" 페이지에서 "Redeploy" 버튼 클릭

4. **빌드 확인**
   - 새로운 빌드가 시작됩니다
   - 최신 커밋(`aa4bce3`)을 사용하는지 확인

### 방법 2: GitHub에서 확인 후 재배포

1. **GitHub 저장소 확인**
   - https://github.com/Yeongwoo-seo/Cookka 접속
   - `lib/firebase.ts`와 `lib/firestore.ts` 파일이 있는지 확인
   - 커밋 히스토리에서 `aa4bce3` 커밋 확인

2. **Vercel에서 재배포**
   - 위의 "방법 1" 참고

### 방법 3: 더미 커밋으로 재배포 트리거

PowerShell에서:

```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# 더미 변경사항 추가 (빈 줄 추가)
echo "" >> README.md

# 커밋 및 푸시
git add README.md
git commit -m "Trigger Vercel redeploy"
git push
```

이렇게 하면 Vercel이 자동으로 최신 커밋을 감지하고 재배포합니다.

## 확인사항

재배포 후:
1. 빌드 로그에서 최신 커밋 해시 확인
2. `lib/firestore.ts` 파일을 찾을 수 있는지 확인
3. 빌드가 성공하는지 확인

## 예상 결과

재배포 후:
- ✅ 최신 커밋(`aa4bce3`) 사용
- ✅ `lib/firebase.ts`와 `lib/firestore.ts` 파일 포함
- ✅ 빌드 성공
- ✅ 배포 완료
