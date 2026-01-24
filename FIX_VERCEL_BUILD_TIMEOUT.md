# Vercel 빌드 타임아웃 오류 해결

## 문제
Vercel 빌드 시 다음 오류 발생:
1. `/_not-found` 페이지 정적 생성 타임아웃
2. `viewport` 메타데이터가 `metadata` export에 있음 (Next.js 14에서는 별도 export 필요)

## 해결 방법

### 1. `app/layout.tsx` 수정
- `viewport`를 `metadata`에서 분리하여 별도 `viewport` export로 이동
- Next.js 14의 새로운 API 사용

### 2. `app/not-found.tsx` 수정
- `export const dynamic = 'force-dynamic'` 추가
- 정적 생성 대신 동적 렌더링 사용

### 3. `next.config.js` 수정
- `staticPageGenerationTimeout: 120` 추가
- 정적 생성 타임아웃을 120초로 증가

## 변경된 파일

- `app/layout.tsx`: viewport를 별도 export로 분리
- `app/not-found.tsx`: 동적 렌더링 강제
- `next.config.js`: 타임아웃 설정 추가

## 확인사항

✅ 코드 수정 완료
⏳ Vercel 재배포 필요

## 다음 단계

1. 변경사항 커밋 및 푸시
2. Vercel 자동 재배포 확인
3. 빌드 로그에서 오류 해결 확인
