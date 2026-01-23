# Firestore 인덱스 설정 가이드

## 인덱스가 필요한 경우

Firestore에서 다음 경우에 인덱스가 필요합니다:
1. **복합 쿼리**: 여러 필드에 대한 `where` 조건
2. **정렬 쿼리**: `orderBy`를 사용하는 경우
3. **범위 쿼리**: `where`와 `orderBy`를 다른 필드에 사용하는 경우

## 현재 코드 상태

현재 코드는 모든 데이터를 가져와서 클라이언트 측에서 필터링/정렬하므로 **인덱스가 필요하지 않습니다**.

하지만 데이터가 많아지면 성능 최적화를 위해 서버 측 쿼리를 사용해야 하며, 이때 인덱스가 필요합니다.

## 인덱스 생성 방법

### 방법 1: 자동 생성 (권장)

1. Firebase Console에서 Firestore Database 열기
2. 쿼리를 실행하면 에러 메시지에 인덱스 생성 링크가 표시됨
3. 링크를 클릭하면 자동으로 인덱스 생성 페이지로 이동
4. "인덱스 만들기" 버튼 클릭

### 방법 2: 수동 생성

1. Firebase Console > Firestore Database > 인덱스 탭
2. "인덱스 만들기" 클릭
3. 컬렉션 ID 입력
4. 필드 추가 및 정렬 순서 설정
5. "만들기" 클릭

### 방법 3: firestore.indexes.json 사용 (프로젝트에 포함)

프로젝트 루트에 `firestore.indexes.json` 파일을 생성하여 인덱스를 정의할 수 있습니다.

## 예상되는 인덱스 (향후 최적화용)

### 1. 레시피 컬렉션

#### 카테고리별 정렬
```json
{
  "collectionGroup": "recipes",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "category",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "name",
      "order": "ASCENDING"
    }
  ]
}
```

#### 생성일 기준 정렬
```json
{
  "collectionGroup": "recipes",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

### 2. 재고 컬렉션

#### 만료일 기준 정렬
```json
{
  "collectionGroup": "inventory",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "expirationDate",
      "order": "ASCENDING"
    }
  ]
}
```

#### 재고량이 적은 항목 조회
```json
{
  "collectionGroup": "inventory",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "currentStock",
      "order": "ASCENDING"
    }
  ]
}
```

### 3. 일일 메뉴 컬렉션

#### 날짜 기준 정렬
```json
{
  "collectionGroup": "dailyMenus",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "date",
      "order": "DESCENDING"
    }
  ]
}
```

## firestore.indexes.json 파일 생성

프로젝트 루트에 다음 파일을 생성하면 Firebase CLI로 배포할 수 있습니다:

```json
{
  "indexes": [
    {
      "collectionGroup": "recipes",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "category",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "recipes",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "inventory",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "expirationDate",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "inventory",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "currentStock",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "dailyMenus",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "date",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Firebase CLI로 인덱스 배포

```bash
# Firebase CLI 설치 (없는 경우)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화 (처음만)
firebase init firestore

# 인덱스 배포
firebase deploy --only firestore:indexes
```

## 인덱스 생성 확인

1. Firebase Console > Firestore Database > 인덱스 탭
2. 생성된 인덱스 목록 확인
3. 상태가 "사용 가능"인지 확인 (생성 중일 수 있음)

## 주의사항

- 인덱스 생성은 몇 분에서 몇 시간이 걸릴 수 있습니다
- 데이터가 많을수록 인덱스 생성 시간이 길어집니다
- 인덱스는 저장 공간을 사용하므로 필요한 것만 생성하세요
- 현재는 인덱스가 필요하지 않지만, 향후 성능 최적화를 위해 미리 생성해 둘 수 있습니다

## 현재 상태

✅ **인덱스 불필요**: 현재 모든 데이터를 클라이언트에서 처리하므로 인덱스가 필요하지 않습니다.

⚠️ **향후 필요**: 데이터가 많아지면 서버 측 쿼리로 전환해야 하며, 이때 위의 인덱스들이 필요합니다.
