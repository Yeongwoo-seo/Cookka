# Cookka - 팀 협업형 도시락 비즈니스 관리 웹앱

## 프로젝트 개요

Cookka는 레시피 공유, 실시간 재고 관리, 수익성 분석을 한 화면에서 팀원 전체가 공유하고 협업할 수 있는 웹 애플리케이션입니다.

### 핵심 가치
**"따로 또 같이"** - 정보의 투명한 공유를 통한 운영 효율화

## 주요 기능

### 1. 실시간 동기화 레시피 보드
- **가변 인분 계산기**: 목표 인분 수정 시 모든 재료 필요량이 실시간 자동 재계산
- **버전 관리**: 레시피 수정 이력 추적 (누가, 언제, 무엇을 변경했는지)
- **멀티미디어 가이드**: 사진, 영상, 주의사항을 결합한 조리 가이드

### 2. 통합 재고 & 발주 엔진
- **공동 입력 창고**: 팀원 누구나 재고 현황 업데이트 가능
- **자동 차감 시스템**: 조리 완료 시 레시피 재료가 재고에서 자동 차감
- **발주 알림**: 적정 재고 이하 시 팀 전체에 알림
- **유통기한 관리**: 유통기한 임박/만료 재고 자동 감지 및 알림

### 3. 비즈니스 인텔리전스 대시보드
- **수익 실시간 추적**: 매입가와 판매가 연동으로 실시간 순이익 표시
- **메뉴별 효율 분석**: 조리 시간과 수익률 데이터화
- **시각화 차트**: 메뉴별 수익률 및 성과를 한눈에 확인

### 4. 팀 협업 기능
- **유연한 권한 관리**: 모든 팀원이 관리자와 실무자 역할을 자유롭게 수행
- **팀원 초대**: 이메일 기반 팀원 초대 시스템
- **활동 로그**: 팀 활동 추적

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **상태 관리**: Zustand
- **스타일링**: Tailwind CSS
- **날짜 처리**: date-fns

## 프로젝트 구조

```
├── app/                      # Next.js App Router
│   ├── layout.tsx           # 루트 레이아웃
│   ├── page.tsx             # 홈 페이지
│   └── globals.css          # 전역 스타일
├── components/              # React 컴포넌트
│   ├── MainTabView.tsx      # 메인 탭 네비게이션
│   ├── DashboardView.tsx    # 대시보드
│   ├── RecipeBoardView.tsx  # 레시피 보드
│   ├── InventoryView.tsx    # 재고 관리
│   ├── MenuAnalysisView.tsx # 메뉴 분석
│   └── TeamSettingsView.tsx # 팀 설정
├── types/                   # TypeScript 타입 정의
│   ├── recipe.ts
│   ├── inventory.ts
│   ├── business-metrics.ts
│   └── team.ts
├── store/                   # 상태 관리
│   └── app-store.ts         # Zustand 스토어
└── package.json
```

## 설치 및 실행

### 필수 요구사항
- Node.js 18.0 이상
- npm 또는 yarn

### 설치 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **개발 서버 실행**
   ```bash
   npm run dev
   ```

3. **브라우저에서 확인**
   ```
   http://localhost:3000
   ```

### 빌드

프로덕션 빌드를 생성하려면:

```bash
npm run build
npm start
```

## 다음 단계

1. **백엔드 연동**: REST API 또는 GraphQL 연동
2. **실시간 동기화**: WebSocket 또는 Server-Sent Events
3. **인증 시스템**: 사용자 로그인 및 권한 관리
4. **데이터 영속성**: 데이터베이스 연동
5. **푸시 알림**: 재고 부족, 유통기한 임박 알림
6. **바코드 스캔**: 재고 입고 시 바코드 스캔 기능 (웹캠 활용)
7. **테스트**: Unit Test 및 E2E Test 작성

## 개발 환경

- Node.js 18.0 이상
- Next.js 14.2
- TypeScript 5.3
- Tailwind CSS 3.4

## 라이선스

Copyright © 2024 Cookka. All rights reserved.
