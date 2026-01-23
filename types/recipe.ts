export type IngredientCategory = '조미료' | '육류' | '채소' | '곡물' | '기타';

export interface ProductInfo {
  id: string;
  productName: string;
  supplier: string; // 구매처
  weight: number; // 중량
  price: number; // 금액
  isMain?: boolean; // 메인 제품 여부
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  category?: IngredientCategory;
  products?: ProductInfo[]; // 제품 정보 목록 (선택적)
}

export interface RecipeStep {
  id: string;
  order: number;
  description: string;
  duration?: number; // seconds
  image?: string;
  video?: string;
}

export interface RecipeHistory {
  id: string;
  action: string;
  user: string;
  timestamp: Date;
}

export type RecipeCategory = '밥' | '메인 요리' | '사이드 요리' | '기본 반찬' | '국';

// 레시피 카테고리 색상 통합 함수
export function getRecipeCategoryColor(cat: RecipeCategory): string {
  switch (cat) {
    case '밥':
      return 'bg-yellow-100 text-yellow-800';
    case '메인 요리':
      return 'bg-red-100 text-red-800';
    case '사이드 요리':
      return 'bg-green-100 text-green-800';
    case '기본 반찬':
      return 'bg-purple-100 text-purple-800';
    case '국':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  targetServings: number;
  baseServings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  images: string[];
  videos: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  history: RecipeHistory[];
}

export function scaledIngredients(
  ingredients: Ingredient[],
  servings: number,
  baseServings: number
): Ingredient[] {
  const scale = servings / baseServings;
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity * scale,
  }));
}

export const sampleRecipes: Recipe[] = [
  {
    id: '1',
    name: '흰쌀밥',
    description: '기본 백미밥',
    category: '밥',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'rice-1', name: '쌀', quantity: 2.5, unit: 'kg', costPerUnit: 4000 },
      { id: 'water-1', name: '물', quantity: 3, unit: 'L', costPerUnit: 0 },
    ],
    steps: [
      { id: 'step-1-1', order: 1, description: '쌀을 깨끗이 씻는다 (3회 정도)', duration: 300 },
      { id: 'step-1-2', order: 2, description: '쌀에 물을 적절히 넣고 30분 불린다', duration: 1800 },
      { id: 'step-1-3', order: 3, description: '밥솥에 쌀과 물을 넣고 취사 버튼을 누른다', duration: 1800 },
      { id: 'step-1-4', order: 4, description: '밥이 다 되면 주걱으로 섞어준다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '물의 양은 쌀의 1.2배 정도가 적당합니다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '2',
    name: '제육볶음',
    description: '매콤달콤한 제육볶음',
    category: '메인 요리',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'pork-2', name: '앞다리살', quantity: 1.2, unit: 'kg', costPerUnit: 8000 },
      { id: 'onion-2', name: '양파', quantity: 5, unit: '개', costPerUnit: 500 },
      { id: 'scallion-2', name: '대파', quantity: 3, unit: '단', costPerUnit: 2000 },
      { 
        id: 'soy-2', 
        name: '간장', 
        quantity: 0.2, 
        unit: 'L', 
        costPerUnit: 5000,
        products: [
          { id: 'soy-product-1', productName: '진간장 500ml', supplier: '농협마트', weight: 0.5, price: 3500 },
          { id: 'soy-product-2', productName: '양조간장 1L', supplier: '이마트', weight: 1.0, price: 4800 },
          { id: 'soy-product-3', productName: '국간장 500ml', supplier: '롯데마트', weight: 0.5, price: 3200 },
        ]
      },
      { id: 'gochujang-2', name: '고추장', quantity: 0.15, unit: 'kg', costPerUnit: 6000 },
      { id: 'sugar-2', name: '설탕', quantity: 0.1, unit: 'kg', costPerUnit: 3000 },
      { id: 'garlic-2', name: '마늘', quantity: 0.05, unit: 'kg', costPerUnit: 8000 },
      { id: 'oil-2', name: '식용유', quantity: 0.1, unit: 'L', costPerUnit: 3000 },
    ],
    steps: [
      { id: 'step-2-1', order: 1, description: '앞다리살을 한입 크기로 썬다', duration: 600 },
      { id: 'step-2-2', order: 2, description: '양파는 채썰고, 대파는 어슷썬다', duration: 300 },
      { id: 'step-2-3', order: 3, description: '고추장, 간장, 설탕, 다진 마늘로 양념장을 만든다', duration: 180 },
      { id: 'step-2-4', order: 4, description: '팬에 식용유를 두르고 고기를 볶는다', duration: 600 },
      { id: 'step-2-5', order: 5, description: '고기가 익으면 양념장을 넣고 볶는다', duration: 600 },
      { id: 'step-2-6', order: 6, description: '양파와 대파를 넣고 볶는다', duration: 300 },
      { id: 'step-2-7', order: 7, description: '불을 끄고 마무리한다', duration: 60 },
    ],
    images: [],
    videos: [],
    notes: '불을 중불로 유지하고, 고기가 딱딱해지지 않도록 주의',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '3',
    name: '어묵볶음',
    description: '달콤한 어묵볶음',
    category: '기본 반찬',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'fishcake-3', name: '어묵', quantity: 1, unit: 'kg', costPerUnit: 5000 },
      { id: 'onion-3', name: '양파', quantity: 3, unit: '개', costPerUnit: 500 },
      { id: 'carrot-3', name: '당근', quantity: 2, unit: '개', costPerUnit: 1000 },
      { id: 'soy-3', name: '간장', quantity: 0.1, unit: 'L', costPerUnit: 5000 },
      { id: 'sugar-3', name: '설탕', quantity: 0.05, unit: 'kg', costPerUnit: 3000 },
      { id: 'oil-3', name: '식용유', quantity: 0.05, unit: 'L', costPerUnit: 3000 },
    ],
    steps: [
      { id: 'step-3-1', order: 1, description: '어묵을 먹기 좋은 크기로 썬다', duration: 300 },
      { id: 'step-3-2', order: 2, description: '양파와 당근을 채썬다', duration: 300 },
      { id: 'step-3-3', order: 3, description: '팬에 식용유를 두르고 어묵을 볶는다', duration: 600 },
      { id: 'step-3-4', order: 4, description: '간장과 설탕을 넣고 볶는다', duration: 300 },
      { id: 'step-3-5', order: 5, description: '양파와 당근을 넣고 볶는다', duration: 300 },
      { id: 'step-3-6', order: 6, description: '양념이 고루 묻도록 볶는다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '어묵이 딱딱해지지 않도록 주의',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '4',
    name: '콩자반',
    description: '고소한 콩자반',
    category: '기본 반찬',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'bean-4', name: '검은콩', quantity: 0.5, unit: 'kg', costPerUnit: 4000 },
      { id: 'soy-4', name: '간장', quantity: 0.1, unit: 'L', costPerUnit: 5000 },
      { id: 'sugar-4', name: '설탕', quantity: 0.05, unit: 'kg', costPerUnit: 3000 },
      { id: 'water-4', name: '물', quantity: 0.5, unit: 'L', costPerUnit: 0 },
    ],
    steps: [
      { id: 'step-4-1', order: 1, description: '검은콩을 깨끗이 씻는다', duration: 300 },
      { id: 'step-4-2', order: 2, description: '콩을 물에 충분히 불린다 (최소 4시간)', duration: 14400 },
      { id: 'step-4-3', order: 3, description: '불린 콩을 삶는다 (부드러워질 때까지)', duration: 1800 },
      { id: 'step-4-4', order: 4, description: '간장, 설탕, 물을 넣고 조린다', duration: 1200 },
      { id: 'step-4-5', order: 5, description: '양념이 고루 배도록 조린다', duration: 600 },
    ],
    images: [],
    videos: [],
    notes: '콩이 터지지 않도록 약한 불로 조린다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '5',
    name: '콩나물무침',
    description: '아삭한 콩나물무침',
    category: '기본 반찬',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'sprout-5', name: '콩나물', quantity: 1, unit: 'kg', costPerUnit: 2000 },
      { id: 'scallion-5', name: '대파', quantity: 2, unit: '단', costPerUnit: 2000 },
      { id: 'garlic-5', name: '마늘', quantity: 0.05, unit: 'kg', costPerUnit: 8000 },
      { id: 'soy-5', name: '간장', quantity: 0.1, unit: 'L', costPerUnit: 5000 },
      { id: 'sesame-5', name: '참기름', quantity: 0.05, unit: 'L', costPerUnit: 10000 },
      { id: 'pepper-5', name: '고춧가루', quantity: 0.02, unit: 'kg', costPerUnit: 5000 },
    ],
    steps: [
      { id: 'step-5-1', order: 1, description: '콩나물을 깨끗이 씻고 꼬리를 제거한다', duration: 600 },
      { id: 'step-5-2', order: 2, description: '대파를 어슷썬다', duration: 180 },
      { id: 'step-5-3', order: 3, description: '콩나물을 끓는 물에 데친다 (1-2분)', duration: 120 },
      { id: 'step-5-4', order: 4, description: '데친 콩나물을 찬물에 헹군다', duration: 60 },
      { id: 'step-5-5', order: 5, description: '간장, 다진 마늘, 참기름, 고춧가루로 양념을 만든다', duration: 180 },
      { id: 'step-5-6', order: 6, description: '콩나물과 대파에 양념을 넣고 무친다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '너무 오래 데치면 아삭함이 사라진다. 데친 후 바로 찬물에 헹궈야 한다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '6',
    name: '된장찌개',
    description: '구수한 된장찌개',
    category: '국',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'doenjang-6', name: '된장', quantity: 0.2, unit: 'kg', costPerUnit: 5000 },
      { id: 'tofu-6', name: '두부', quantity: 3, unit: '모', costPerUnit: 2000 },
      { id: 'onion-6', name: '양파', quantity: 3, unit: '개', costPerUnit: 500 },
      { id: 'zucchini-6', name: '애호박', quantity: 2, unit: '개', costPerUnit: 1500 },
      { id: 'scallion-6', name: '대파', quantity: 2, unit: '단', costPerUnit: 2000 },
      { id: 'garlic-6', name: '마늘', quantity: 0.05, unit: 'kg', costPerUnit: 8000 },
      { id: 'water-6', name: '물', quantity: 2, unit: 'L', costPerUnit: 0 },
    ],
    steps: [
      { id: 'step-6-1', order: 1, description: '두부는 깍둑썰고, 양파와 애호박은 한입 크기로 썬다', duration: 300 },
      { id: 'step-6-2', order: 2, description: '대파는 어슷썬다', duration: 180 },
      { id: 'step-6-3', order: 3, description: '냄비에 물을 넣고 된장을 풀어 끓인다', duration: 600 },
      { id: 'step-6-4', order: 4, description: '두부와 양파를 넣고 끓인다', duration: 600 },
      { id: 'step-6-5', order: 5, description: '애호박을 넣고 끓인다', duration: 300 },
      { id: 'step-6-6', order: 6, description: '대파와 다진 마늘을 넣고 한 번 더 끓인다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '된장은 체에 걸러서 넣으면 더 부드럽다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '7',
    name: '김치찌개',
    description: '얼큰한 김치찌개',
    category: '국',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'kimchi-7', name: '김치', quantity: 1.5, unit: 'kg', costPerUnit: 4000 },
      { id: 'pork-7', name: '돼지고기', quantity: 0.8, unit: 'kg', costPerUnit: 8000 },
      { id: 'tofu-7', name: '두부', quantity: 2, unit: '모', costPerUnit: 2000 },
      { id: 'onion-7', name: '양파', quantity: 2, unit: '개', costPerUnit: 500 },
      { id: 'scallion-7', name: '대파', quantity: 2, unit: '단', costPerUnit: 2000 },
      { id: 'garlic-7', name: '마늘', quantity: 0.05, unit: 'kg', costPerUnit: 8000 },
      { id: 'gochugaru-7', name: '고춧가루', quantity: 0.03, unit: 'kg', costPerUnit: 5000 },
      { id: 'water-7', name: '물', quantity: 1.5, unit: 'L', costPerUnit: 0 },
    ],
    steps: [
      { id: 'step-7-1', order: 1, description: '김치를 적당한 크기로 썬다', duration: 300 },
      { id: 'step-7-2', order: 2, description: '돼지고기를 한입 크기로 썬다', duration: 300 },
      { id: 'step-7-3', order: 3, description: '냄비에 돼지고기를 볶는다', duration: 600 },
      { id: 'step-7-4', order: 4, description: '김치를 넣고 볶는다', duration: 300 },
      { id: 'step-7-5', order: 5, description: '물을 넣고 끓인다', duration: 600 },
      { id: 'step-7-6', order: 6, description: '두부와 양파를 넣고 끓인다', duration: 300 },
      { id: 'step-7-7', order: 7, description: '대파와 고춧가루를 넣고 마무리한다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '신김치보다는 익은 김치가 더 맛있다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '8',
    name: '계란찜',
    description: '부드러운 계란찜',
    category: '기본 반찬',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'egg-8', name: '계란', quantity: 30, unit: '개', costPerUnit: 200 },
      { id: 'scallion-8', name: '대파', quantity: 2, unit: '단', costPerUnit: 2000 },
      { id: 'water-8', name: '물', quantity: 0.3, unit: 'L', costPerUnit: 0 },
      { id: 'salt-8', name: '소금', quantity: 0.01, unit: 'kg', costPerUnit: 1000 },
    ],
    steps: [
      { id: 'step-8-1', order: 1, description: '계란을 깨서 그릇에 넣는다', duration: 300 },
      { id: 'step-8-2', order: 2, description: '대파를 잘게 썬다', duration: 180 },
      { id: 'step-8-3', order: 3, description: '계란에 물과 소금을 넣고 풀어준다', duration: 180 },
      { id: 'step-8-4', order: 4, description: '대파를 넣고 섞는다', duration: 60 },
      { id: 'step-8-5', order: 5, description: '팬에 기름을 두르고 계란물을 붓는다', duration: 300 },
      { id: 'step-8-6', order: 6, description: '약한 불에서 젓가락으로 저어가며 익힌다', duration: 600 },
    ],
    images: [],
    videos: [],
    notes: '너무 센 불에서 익히면 딱딱해진다. 약한 불로 천천히 익혀야 부드럽다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '9',
    name: '시금치나물',
    description: '고소한 시금치나물',
    category: '기본 반찬',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'spinach-9', name: '시금치', quantity: 1.5, unit: 'kg', costPerUnit: 3000 },
      { id: 'garlic-9', name: '마늘', quantity: 0.05, unit: 'kg', costPerUnit: 8000 },
      { id: 'sesame-9', name: '참기름', quantity: 0.05, unit: 'L', costPerUnit: 10000 },
      { id: 'soy-9', name: '간장', quantity: 0.05, unit: 'L', costPerUnit: 5000 },
    ],
    steps: [
      { id: 'step-9-1', order: 1, description: '시금치를 깨끗이 씻는다', duration: 300 },
      { id: 'step-9-2', order: 2, description: '끓는 물에 시금치를 데친다 (30초)', duration: 30 },
      { id: 'step-9-3', order: 3, description: '데친 시금치를 찬물에 헹군다', duration: 60 },
      { id: 'step-9-4', order: 4, description: '시금치의 물기를 꽉 짠다', duration: 120 },
      { id: 'step-9-5', order: 5, description: '간장, 다진 마늘, 참기름으로 양념을 만든다', duration: 180 },
      { id: 'step-9-6', order: 6, description: '시금치에 양념을 넣고 무친다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '너무 오래 데치면 색이 변하고 식감이 나빠진다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
  {
    id: '10',
    name: '미역국',
    description: '깔끔한 미역국',
    category: '국',
    targetServings: 50,
    baseServings: 10,
    ingredients: [
      { id: 'seaweed-10', name: '마른 미역', quantity: 0.1, unit: 'kg', costPerUnit: 15000 },
      { id: 'beef-10', name: '소고기', quantity: 0.3, unit: 'kg', costPerUnit: 15000 },
      { id: 'garlic-10', name: '마늘', quantity: 0.03, unit: 'kg', costPerUnit: 8000 },
      { id: 'sesame-10', name: '참기름', quantity: 0.03, unit: 'L', costPerUnit: 10000 },
      { id: 'soy-10', name: '간장', quantity: 0.05, unit: 'L', costPerUnit: 5000 },
      { id: 'water-10', name: '물', quantity: 2, unit: 'L', costPerUnit: 0 },
    ],
    steps: [
      { id: 'step-10-1', order: 1, description: '미역을 물에 불린다 (10분)', duration: 600 },
      { id: 'step-10-2', order: 2, description: '불린 미역을 적당한 크기로 자른다', duration: 300 },
      { id: 'step-10-3', order: 3, description: '소고기를 잘게 썬다', duration: 300 },
      { id: 'step-10-4', order: 4, description: '팬에 참기름을 두르고 소고기를 볶는다', duration: 300 },
      { id: 'step-10-5', order: 5, description: '미역을 넣고 볶는다', duration: 300 },
      { id: 'step-10-6', order: 6, description: '물을 넣고 끓인다', duration: 600 },
      { id: 'step-10-7', order: 7, description: '간장과 다진 마늘을 넣고 끓인다', duration: 180 },
    ],
    images: [],
    videos: [],
    notes: '미역은 너무 오래 끓이면 질겨진다',
    createdAt: new Date(),
    updatedAt: new Date(),
    history: [],
  },
];

