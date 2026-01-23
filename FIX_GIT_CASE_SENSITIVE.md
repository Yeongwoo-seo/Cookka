# Git 대소문자 문제 해결

## 문제
Git이 파일명의 대소문자 변경을 제대로 감지하지 못해서 Vercel 빌드가 실패할 수 있습니다.

## 해결 방법

### 방법 1: Git 캐시 초기화 (가장 확실)

PowerShell에서 다음 명령어를 **순서대로** 실행하세요:

```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# 1. Git 캐시에서 모든 파일 제거
git rm -r --cached .

# 2. 모든 파일 다시 추가 (대소문자 포함)
git add .

# 3. 커밋
git commit -m "Fix: Force update file case for Vercel build"

# 4. 푸시
git push origin master
```

### 방법 2: 특정 파일만 강제 업데이트

```powershell
cd "C:\Users\kjaso\OneDrive\Desktop\Projects\3. Cookka"

# lib 폴더의 파일들만 강제 업데이트
git rm --cached lib/firebase.ts lib/firestore.ts
git add lib/firebase.ts lib/firestore.ts

# 커밋 및 푸시
git commit -m "Fix: Update lib files case sensitivity"
git push origin master
```

### 방법 3: import 경로를 상대 경로로 변경 (대안)

만약 위 방법이 작동하지 않으면, `store/app-store.ts`에서 import 경로를 상대 경로로 변경:

```typescript
// 변경 전
import { ... } from '@/lib/firestore';

// 변경 후
import { ... } from '../lib/firestore';
```

## 확인사항

푸시 후:
1. GitHub에서 파일명이 정확한지 확인
2. Vercel이 자동으로 재배포 시작
3. 빌드 로그에서 `lib/firestore.ts` 파일을 찾는지 확인

## 예상 결과

성공 시:
- ✅ Git이 파일명 대소문자를 정확히 인식
- ✅ Vercel 빌드 성공
- ✅ 배포 완료
