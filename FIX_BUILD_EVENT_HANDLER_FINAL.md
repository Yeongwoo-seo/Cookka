# Vercel 빌드 이벤트 핸들러 오류 최종 해결

## 문제
Vercel 빌드 시 정적 페이지 생성 중 이벤트 핸들러 오류:
```
Error: Event handlers cannot be passed to Client Component props.
```

## 원인 분석
Next.js가 빌드 시점에 정적 페이지 생성을 시도하는데, 클라이언트 컴포넌트라도 서버 사이드에서 한 번 렌더링을 시도합니다. 이 과정에서 이벤트 핸들러를 직렬화하려고 할 때 오류가 발생합니다.

## 해결 방법

### 완료된 수정사항
1. ✅ `app/not-found.tsx`: `'use client'` 추가
2. ✅ `app/layout.tsx`: 중복 viewport 메타 태그 제거
3. ✅ `app/page.tsx`: 이미 `'use client'`와 `export const dynamic = 'force-dynamic'` 있음

### 추가 확인 필요
빌드 로그를 보면 정적 생성이 계속 시도되고 있습니다. 이는 Next.js의 기본 동작입니다.

## 해결책

### 옵션 1: 빌드 시 정적 생성 완전 비활성화
`next.config.js`에 다음 추가:
```javascript
experimental: {
  isrMemoryCacheSize: 0,
}
```

### 옵션 2: 모든 페이지를 명시적으로 동적으로 설정
이미 완료:
- `app/page.tsx`: `export const dynamic = 'force-dynamic'`
- `app/not-found.tsx`: `export const dynamic = 'force-dynamic'`

### 옵션 3: Vercel 빌드 설정 변경
Vercel 대시보드에서:
- Build Command: `next build` (기본값 유지)
- Output Directory: `.next` (기본값 유지)

## 현재 상태

✅ 모든 클라이언트 컴포넌트에 `'use client'` 추가
✅ 동적 렌더링 강제 설정
✅ viewport 메타데이터 수정
⏳ 빌드 테스트 필요

## 다음 단계

1. 변경사항 커밋 및 푸시
2. Vercel 자동 재배포 확인
3. 빌드 로그에서 오류 해결 확인

## 참고

정적 생성이 시도되는 것은 Next.js의 기본 동작입니다. `export const dynamic = 'force-dynamic'`이 있어도 빌드 시점에 한 번은 렌더링을 시도할 수 있습니다. 하지만 실제 런타임에서는 동적으로 렌더링됩니다.
