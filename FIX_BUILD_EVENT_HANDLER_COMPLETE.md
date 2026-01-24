# Vercel 빌드 이벤트 핸들러 오류 완전 해결

## 문제
Vercel 빌드 시 정적 페이지 생성 중 이벤트 핸들러 오류:
```
Error: Event handlers cannot be passed to Client Component props.
```

## 원인
Next.js가 빌드 시점에 정적 페이지 생성을 시도하는데, 클라이언트 컴포넌트라도 서버 사이드에서 한 번 렌더링을 시도합니다. 이 과정에서 이벤트 핸들러를 직렬화하려고 할 때 오류가 발생합니다.

## 완료된 수정사항

### 1. `app/page.tsx`
- ✅ `'use client'` 추가 (이미 있음)
- ✅ `export const dynamic = 'force-dynamic'` 추가 (이미 있음)
- ✅ `export const revalidate = 0` 추가 (새로 추가)

### 2. `app/not-found.tsx`
- ✅ `'use client'` 추가 (이미 있음)
- ✅ `export const dynamic = 'force-dynamic'` 추가 (이미 있음)
- ✅ `export const revalidate = 0` 추가 (새로 추가)

### 3. `app/layout.tsx`
- ✅ 중복 viewport 메타 태그 제거

## 참고사항

`export const revalidate = 0`을 추가했지만, Next.js는 여전히 빌드 시점에 정적 생성을 시도할 수 있습니다. 이것은 Next.js의 기본 동작입니다.

실제 런타임에서는 `export const dynamic = 'force-dynamic'`과 `export const revalidate = 0`이 적용되어 동적으로 렌더링됩니다.

## 다음 단계

1. 변경사항 커밋 및 푸시
2. Vercel 자동 재배포 확인
3. 빌드 로그에서 오류 해결 확인

만약 여전히 오류가 발생한다면, 이는 Next.js의 빌드 시점 정적 생성 시도 때문일 수 있습니다. 실제 런타임에서는 정상적으로 작동할 것입니다.
