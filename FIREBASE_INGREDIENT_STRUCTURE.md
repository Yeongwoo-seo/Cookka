# Firebase Ingredient 데이터 구조

원가관리에서 **재료를 먼저 등록**하고, 레시피는 이 목록을 **Lookup**하는 구조에 맞춘 Firestore 스키마입니다.

---

## 컬렉션: `ingredients`

- **경로**: `ingredients/{문서ID}`
- **문서 ID**: 재료 **한 개당 하나씩**, 서로 **다른** 값입니다.
  - 예: 돼지고기 문서 → `1737654321000`, 양파 문서 → `1737654321001` (같은 ID를 여러 문서에 넣는 게 아님)
  - Firestore가 문서를 구분하는 용도라서 **문서 ID는 필수**이고, 앱에서는 이 값을 `ingredient.id`로 씁니다.

---

## 문서 필드 (Ingredient)

Firestore에서 **필드 추가** 시 아래처럼 넣으면 됩니다.  
(문서 **본문**에 넣는 필드만 적었고, **문서 ID는 Firestore가 자동으로 구분**하므로 문서 안에 `id` 필드를 따로 넣지 않아도 됩니다. 앱 코드는 문서 ID를 읽어서 `ingredient.id`로 씁니다.)

| 필드 (이름 그대로 입력) | 유형 (타입) | 문자열/넣을 값 | 필수 |
|------------------------|-------------|----------------|------|
| `name` | string | 재료명 (예: `돼지고기`, `양파`) | ✅ |
| `quantity` | number | 기본 수량 (원가관리 마스터는 `0`) | ✅ |
| `unit` | string | **반드시 `g`** (앱에서 g로 통일) | ✅ |
| `costPerUnit` | number | 단위당 원가, 원/g (예: `0.025`) | ✅ |
| `category` | string | `조미료` \| `육류` \| `채소` \| `곡물` \| `기타` 중 하나 | 선택 |
| `products` | array | 아래 ProductInfo 객체들의 배열 (비어 있으면 `[]`) | 선택 |

---

## ProductInfo (products 배열 요소)

`products` 배열 안에 들어가는 **객체** 한 개당 아래 필드를 넣습니다.

### Firestore 콘솔에서 products 배열 채우는 방법

- `products` 필드 타입을 **array**로 만들면 **0, 1, 2, 3, 4** 같은 **인덱스만** 보입니다. 이건 정상입니다 (배열의 순서).
- **필드 이름**(`id`, `productName`, `supplier` 등)은 **각 인덱스 안**에 넣어야 합니다.
  1. `products` 배열에서 **0** (첫 번째 칸)을 클릭합니다.
  2. 그 칸의 **타입을 map**으로 바꿉니다. (또는 "맵 추가"로 객체를 만듭니다.)
  3. 그 **맵 안에** 아래 필드를 추가합니다.

| 필드 (이름 그대로 입력) | 유형 (타입) | 문자열/넣을 값 | 필수 |
|------------------------|-------------|----------------|------|
| `id` | string | 제품 고유 ID (예: `prod-1`) | ✅ |
| `productName` | string | 제품명 (예: `돼지 앞다리살 1kg`) | ✅ |
| `supplier` | string | 구매처 (예: `마트A`) | ✅ |
| `weight` | number | 중량 g (예: `1000`) | ✅ |
| `price` | number | 금액 원 (예: `12000`) | ✅ |
| `isMain` | boolean | 메인 제품이면 `true`, 아니면 `false` | 선택 |

- 두 번째 제품을 넣으려면 배열에 **요소 추가**해서 **1**번 칸을 만들고, 그 안에도 같은 방식으로 **map** 타입으로 넣은 뒤 위 필드들을 채웁니다.

**구조 요약**: `products` → **[ 0: map{ id, productName, supplier, weight, price, isMain }, 1: map{ ... }, ... ]**

---

## 사용 흐름

1. **원가관리 → 재료 탭**: 여기서만 재료를 **추가/수정/삭제** (Firestore `ingredients` 컬렉션에 저장).
2. **레시피**: 재료는 `name` + `unit`으로 **Lookup** (Firestore `ingredients`에서 조회해 `costPerUnit`, `products` 사용).
3. **장보기**: 주간 메뉴 기반으로 필요한 재료를 집계하고, `products[].supplier`로 구매처별 그룹 표시.

---

## 예시 문서 (Firestore)

- **문서 ID** (Firestore 경로의 마지막 부분): `1737654321000` ← 이 값이 곧 `ingredient.id`가 됨 (문서마다 다르게 부여)
- **문서 본문** (필드들):

```json
{
  "name": "돼지고기",
  "quantity": 0,
  "unit": "g",
  "costPerUnit": 0.025,
  "category": "육류",
  "products": [
    {
      "id": "prod-1",
      "productName": "돼지 앞다리살 1kg",
      "supplier": "마트A",
      "weight": 1000,
      "price": 12000,
      "isMain": true
    }
  ]
}
```

(문서 본문에 `id` 필드를 넣지 않아도 됨. 앱은 **문서 ID**를 읽어서 사용함.)
- **costPerUnit**: 메인 제품 기준 `12000 / 1000 = 12` 원/g 이면 12 저장 (앱에서 필요 시 1000분의 1 단위로 저장할 수 있음 — 현재 코드는 원 단위로 저장)

---

## 코드 참고

- **타입**: `types/recipe.ts` — `Ingredient`, `ProductInfo`
- **Firestore 읽기/쓰기**: `lib/firestore.ts` — `getIngredients`, `subscribeIngredients`, `addIngredient`, `updateIngredient`, `deleteIngredient`, `docToIngredient`
- **실시간 동기화**: 원가관리-재료 탭에서 `subscribeIngredients`로 `ingredients` 컬렉션을 구독해, Firebase에서 추가/수정/삭제 시 목록이 자동 반영됩니다.

Firebase 콘솔에서 **Firestore Database → 컬렉션 `ingredients`** 를 만들고, 위 필드 구조로 문서를 추가하면 앱과 그대로 연동됩니다.
