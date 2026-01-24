# Event Handler 오류 해결

## 문제
```
Error: Event handlers cannot be passed to Client Component props.
```

## 원인
Next.js App Router에서 서버 컴포넌트가 클라이언트 컴포넌트에 이벤트 핸들러를 전달하려고 할 때 발생합니다.

## 해결 방법

### `app/not-found.tsx` 수정
- `'use client'` 지시어 추가
- 이벤트 핸들러를 사용하는 컴포넌트는 클라이언트 컴포넌트여야 함

## 변경된 파일

- `app/not-found.tsx`: `'use client'` 추가

## 확인사항

✅ 코드 수정 완료
⏳ 빌드 테스트 필요

## 참고

- `app/error.tsx`와 `app/global-error.tsx`는 이미 `'use client'`가 있음
- `app/page.tsx`도 이미 `'use client'`가 있음
- 모든 이벤트 핸들러를 사용하는 컴포넌트는 클라이언트 컴포넌트여야 함
