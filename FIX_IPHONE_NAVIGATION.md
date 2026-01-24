# 아이폰 네비게이션 바 및 화면 크기 조정

## 문제
1. 네비게이션 바가 Safari 주소 탭에 가려짐
2. 아이폰 화면 크기(828x1972)에 비해 폰트와 요소들이 너무 큼

## 해결 방법

### 1. 네비게이션 바 위치 조정
- 네비게이션 바를 `fixed`로 변경
- `bottom: var(--safari-address-bar-height, 44px)` 설정하여 Safari 주소 바 위에 표시
- Safari 주소 바 높이(44px)만큼 위로 올림

### 2. 모바일 화면 크기 조정
- `app/globals.css`에 모바일 미디어 쿼리 추가
- 기본 폰트 크기: `14px` (기존 16px에서 축소)
- 헤딩 크기 축소:
  - `h1`: `1.5rem` (기존 `1.875rem`)
  - `h2`: `1.25rem` (기존 `1.5rem`)
  - `h3`: `1.125rem` (기존 `1.25rem`)
- 버튼 패딩 축소
- 카드 패딩 축소

### 3. 네비게이션 바 크기 조정
- 아이콘 크기: `text-lg sm:text-xl` (모바일에서 축소)
- 텍스트 크기: `text-[10px] sm:text-xs` (모바일에서 축소)
- 패딩: `py-2 px-2 sm:py-3 sm:px-4` (모바일에서 축소)

### 4. 메인 콘텐츠 패딩 조정
- 하단 패딩 추가하여 네비게이션 바와 겹치지 않도록 조정
- `paddingBottom: calc(70px + var(--safari-address-bar-height, 44px) + var(--safe-area-inset-bottom))`

## 변경된 파일

- `app/globals.css`: 모바일 미디어 쿼리 및 Safari 주소 바 높이 변수 추가
- `components/MainTabView.tsx`: 네비게이션 바 위치 및 크기 조정
- `components/RecipeMainView.tsx`: 네비게이션 바 위치 및 크기 조정

## 확인사항

✅ 빌드 성공
⏳ 아이폰에서 테스트 필요:
  - 네비게이션 바가 Safari 주소 바 위에 표시되는지 확인
  - 폰트 크기가 적절한지 확인
  - 전체 레이아웃이 화면에 잘 맞는지 확인
