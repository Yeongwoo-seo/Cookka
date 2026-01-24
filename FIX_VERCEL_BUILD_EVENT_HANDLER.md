# Vercel 빌드 이벤트 핸들러 오류 해결

## 문제
Vercel 빌드 시 정적 페이지 생성 중 이벤트 핸들러 오류 발생:
```
Error: Event handlers cannot be passed to Client Component props.
```

## 원인
Next.js가 빌드 시점에 정적 페이지 생성을 시도하는데, 이 과정에서 서버 사이드 렌더링 중 클라이언트 컴포넌트에 이벤트 핸들러를 전달하려고 할 때 발생합니다.

## 해결 방법

### 1. `app/layout.tsx` 수정
- 중복된 `<meta name="viewport">` 태그 제거
- `viewport` export를 사용하므로 불필요

### 2. `app/page.tsx` 확인
- 이미 `'use client'`와 `export const dynamic = 'force-dynamic'` 있음
- 정적 생성이 시도되지 않아야 함

### 3. `app/not-found.tsx` 확인
- 이미 `'use client'`와 `export const dynamic = 'force-dynamic'` 있음

## 변경된 파일

- `app/layout.tsx`: 중복 viewport 메타 태그 제거

## 추가 확인 필요

빌드 로그를 보면 정적 생성이 계속 시도되고 있습니다. 이는 Next.js의 기본 동작일 수 있습니다.

## 해결책

1. **모든 페이지를 명시적으로 동적으로 설정** (완료)
2. **정적 생성 완전 비활성화** (시도 중)

## 참고

- `app/page.tsx`: `'use client'` + `export const dynamic = 'force-dynamic'`
- `app/not-found.tsx`: `'use client'` + `export const dynamic = 'force-dynamic'`
- 모든 컴포넌트가 클라이언트 컴포넌트로 표시되어 있음
