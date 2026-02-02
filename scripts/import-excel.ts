/**
 * 엑셀 파일을 Firebase에 업로드하는 스크립트
 * 
 * 사용법:
 * 1. 엑셀 파일을 프로젝트 루트의 'data' 폴더에 넣기
 * 2. npm run import-excel -- --type=inventory --file=data/inventory.xlsx
 *    또는
 *    npm run import-excel -- --type=recipe --file=data/recipes.xlsx
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, Timestamp } from 'firebase/firestore';
import { InventoryItem } from '../types/inventory';
import { Recipe, RecipeCategory, Ingredient, IngredientCategory, RecipeStep, ProductInfo } from '../types/recipe';

// 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Firebase 설정 (환경 변수에서 읽기)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 엑셀 파일 읽기
function readExcelFile(filePath: string): any[] {
  const fullPath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${fullPath}`);
  }

  const workbook = XLSX.readFile(fullPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ 엑셀 파일 읽기 완료: ${data.length}개 행`);
  return data;
}

// 재료 데이터 파싱 및 업로드 (기존 ingredients 컬렉션에 통합)
async function importIngredients(data: any[]): Promise<void> {
  console.log('\n🥬 재료 데이터 업로드 시작...\n');
  console.log('📥 기존 재료 데이터 불러오는 중...\n');

  // 기존 Firebase의 재료 데이터 불러오기
  const existingIngredientsRef = collection(db, 'ingredients');
  const existingSnapshot = await getDocs(existingIngredientsRef);
  const existingIngredientsMap = new Map<string, Ingredient>();
  
  existingSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const ingredient: Ingredient = {
      id: doc.id,
      name: data.name,
      quantity: data.quantity || 0,
      unit: data.unit || 'g',
      costPerUnit: data.costPerUnit || 0,
      category: data.category || '기타',
      products: data.products || [],
    };
    existingIngredientsMap.set(ingredient.name.toLowerCase(), ingredient);
  });

  console.log(`✅ 기존 재료 ${existingIngredientsMap.size}개 발견\n`);

  // 재료명으로 그룹화 (같은 재료의 여러 제품 정보 통합)
  const ingredientMap = new Map<string, {
    ingredient: Partial<Ingredient>;
    products: ProductInfo[];
  }>();

  data.forEach((row: any, index: number) => {
    const name = String(row.name || row.ingredient || row.재료명 || row.이름 || '').trim();
    
    if (!name) {
      throw new Error(`행 ${index + 2}: 재료명이 없습니다.`);
    }

    const nameKey = name.toLowerCase();
    const existingIngredient = existingIngredientsMap.get(nameKey);

    // 재료 정보 (기존 재료가 있으면 사용, 없으면 새로 생성)
    if (!ingredientMap.has(name)) {
      const category = (row.category || row.카테고리 || existingIngredient?.category || '기타') as Ingredient['category'];
      const validCategories: Ingredient['category'][] = ['조미료', '육류', '채소', '곡물', '기타'];
      const validCategory = validCategories.includes(category) ? category : '기타';

      if (existingIngredient) {
        // 기존 재료 사용
        ingredientMap.set(name, {
          ingredient: {
            id: existingIngredient.id,
            name: existingIngredient.name,
            quantity: existingIngredient.quantity,
            unit: existingIngredient.unit,
            costPerUnit: existingIngredient.costPerUnit,
            category: existingIngredient.category,
            products: [],
          },
          products: [...(existingIngredient.products || [])],
        });
        console.log(`🔄 기존 재료 발견: ${name} (ID: ${existingIngredient.id})`);
      } else {
        // 새 재료 생성
        ingredientMap.set(name, {
          ingredient: {
            id: row.id || `ingredient_${Date.now()}_${index}`,
            name: name,
            quantity: parseFloat(row.quantity || row.수량 || 0) || 0,
            unit: String(row.unit || row.단위 || 'g').trim(),
            costPerUnit: parseFloat(row.costPerUnit || row.원가 || row.단가 || 0) || 0,
            category: validCategory,
            products: [],
          },
          products: [],
        });
        console.log(`➕ 새 재료 생성: ${name}`);
      }
    }

    const entry = ingredientMap.get(name)!;

    // 재료 레벨 원가 (제품 정보가 없는 행에서만 사용)
    const ingredientCostPerUnit = parseFloat(row.costPerUnit || row.원가 || row.단가 || row.재료원가 || 0) || 0;
    
    // 제품 정보가 있으면 products 배열에 추가
    const hasSupplier = !!(row.supplier || row.공급처);
    const hasProductName = !!(row.productName || row.제품명);
    const hasWeight = !!(row.weight || row.중량);
    const hasPrice = !!(row.price || row.금액);
    
    if (hasSupplier || hasProductName || hasWeight || hasPrice) {
      const productName = String(row.productName || row.제품명 || name || '').trim();
      const supplier = String(row.supplier || row.공급처 || '').trim();
      const weight = parseFloat(row.weight || row.중량 || 0) || 0;
      const price = parseFloat(row.price || row.금액 || 0) || 0;
      // 제품 레벨 원가 (별도 컬럼 또는 원가 컬럼 사용)
      const productCostPerUnit = parseFloat(
        row.productCostPerUnit || row.제품원가 || row.제품단가 || 
        row.costPerUnit || row.원가 || row.단가 || 0
      ) || 0;

      // 디버깅: 제품 정보 파싱 상태 출력
      console.log(`  🔍 제품 정보 파싱 [${name}]:`, {
        productName: productName || '(없음)',
        supplier: supplier || '(없음)',
        weight: weight || '(없음)',
        price: price || '(없음)',
        원본데이터: {
          productName: row.productName || row.제품명,
          supplier: row.supplier || row.공급처,
          weight: row.weight || row.중량,
          price: row.price || row.금액,
        }
      });

      // 제품명과 공급처가 있으면 제품으로 추가 (weight나 price가 없어도 가능)
      if (productName && supplier) {
        // 중복 제품 체크 (같은 제품명과 공급처)
        const isDuplicate = entry.products.some(
          p => p.productName === productName && p.supplier === supplier
        );

        if (!isDuplicate) {
          const product: ProductInfo = {
            id: `product_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            productName: productName,
            supplier: supplier,
            weight: weight || 0,
            price: price || 0,
            isMain: row.isMain || row.메인제품 === true || row.메인제품 === 'Y' || row.메인제품 === '예' || row.메인제품 === 'y',
            costPerUnit: productCostPerUnit > 0 ? productCostPerUnit : (weight > 0 && price > 0 ? price / weight : 0),
          };
          entry.products.push(product);
          console.log(`  ✅ 제품 추가 완료: ${productName} (${supplier}, ${weight}g, $${price}, 원가: $${product.costPerUnit}/kg)`);
        } else {
          console.log(`  ⚠️  중복 제품 건너뜀: ${productName} (${supplier})`);
        }
      } else {
        console.log(`  ⚠️  제품 정보 불완전 - 제품명: ${productName || '없음'}, 공급처: ${supplier || '없음'}`);
      }
    } else {
      // 제품 정보가 없는 행에서만 재료 레벨 원가 업데이트
      const currentCostPerUnit = entry.ingredient.costPerUnit ?? 0;
      if (ingredientCostPerUnit > 0 && (currentCostPerUnit === 0 || ingredientCostPerUnit < currentCostPerUnit)) {
        entry.ingredient.costPerUnit = ingredientCostPerUnit;
        console.log(`  💰 재료 원가 업데이트: $${ingredientCostPerUnit}/kg`);
      }
    }
  });

  // Ingredient 배열로 변환 (가장 싼 제품을 메인으로 설정)
  const ingredients: Ingredient[] = Array.from(ingredientMap.values()).map((entry) => {
    // 제품이 있으면 가장 싼 제품을 메인으로 설정
    if (entry.products.length > 0) {
      const sortedProducts = [...entry.products]
        .map((p) => ({ p, cost: p.costPerUnit || (p.weight > 0 && p.price > 0 ? p.price / p.weight : Infinity) }))
        .filter((x) => x.cost > 0 && x.cost !== Infinity)
        .sort((a, b) => a.cost - b.cost);
      
      if (sortedProducts.length > 0) {
        // 가장 싼 제품만 메인으로 설정
        entry.products.forEach((p) => {
          p.isMain = p.id === sortedProducts[0].p.id;
        });
        console.log(`  💰 가장 싼 제품을 메인으로 설정: ${sortedProducts[0].p.productName} ($${sortedProducts[0].cost}/kg)`);
      }
    }
    
    return {
      id: entry.ingredient.id!,
      name: entry.ingredient.name!,
      quantity: entry.ingredient.quantity || 0,
      unit: entry.ingredient.unit || 'g',
      costPerUnit: entry.ingredient.costPerUnit || 0,
      category: entry.ingredient.category || '기타',
      products: entry.products,
    };
  });

  console.log(`\n💾 Firebase에 통합 업로드 중...\n`);

  // Firebase에 업로드 (merge: true로 기존 데이터 보존)
  for (const ingredient of ingredients) {
    try {
      const ingredientRef = doc(db, 'ingredients', ingredient.id);
      // undefined 값을 null로 변환하거나 제거
      const ingredientData: any = {
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        costPerUnit: ingredient.costPerUnit,
        category: ingredient.category || null,
        products: ingredient.products || [],
      };
      // undefined 값 제거
      Object.keys(ingredientData).forEach(key => {
        if (ingredientData[key] === undefined) {
          delete ingredientData[key];
        }
      });
      await setDoc(ingredientRef, ingredientData, { merge: true });
      const productCount = ingredient.products?.length || 0;
      const existingCount = existingIngredientsMap.has(ingredient.name.toLowerCase()) ? '기존' : '신규';
      console.log(`✅ 통합 완료: ${ingredient.name} [${existingCount}] (${ingredient.category}, $${ingredient.costPerUnit}/kg, 제품 ${productCount}개)`);
    } catch (error) {
      console.error(`❌ 업로드 실패 (${ingredient.name}):`, error);
    }
  }

  console.log(`\n✅ 총 ${ingredients.length}개 재료 항목 통합 완료!`);
}

// 재고 데이터 파싱 및 업로드
async function importInventory(data: any[]): Promise<void> {
  console.log('\n📦 재고 데이터 업로드 시작...\n');

  const inventoryItems: InventoryItem[] = data.map((row: any, index: number) => {
    const item: InventoryItem = {
      id: row.id || `inventory_${Date.now()}_${index}`,
      name: String(row.name || row.재고명 || row.이름 || '').trim(),
      currentStock: parseFloat(row.currentStock || row.재고량 || row.수량 || 0) || 0,
      unit: String(row.unit || row.단위 || 'g').trim(),
      costPerUnit: parseFloat(row.costPerUnit || row.원가 || row.단가 || 0) || 0,
      minimumStock: parseFloat(row.minimumStock || row.적정재고 || row.최소재고 || 0) || 0,
      lastUpdated: new Date(),
      location: row.location || row.위치 || row.창고위치 || undefined,
      expirationDate: row.expirationDate 
        ? new Date(row.expirationDate) 
        : row.유통기한 
        ? new Date(row.유통기한) 
        : undefined,
    };

    if (!item.name) {
      throw new Error(`행 ${index + 2}: 재고명이 없습니다.`);
    }

    return item;
  });

  // Firebase에 업로드
  for (const item of inventoryItems) {
    try {
      const itemRef = doc(db, 'inventory', item.id);
      // undefined 값을 null로 변환하거나 제거
      const itemData: any = {
        id: item.id,
        name: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        minimumStock: item.minimumStock,
        lastUpdated: Timestamp.fromDate(item.lastUpdated),
        expirationDate: item.expirationDate ? Timestamp.fromDate(item.expirationDate) : null,
        location: item.location || null,
      };
      // undefined 값 제거
      Object.keys(itemData).forEach(key => {
        if (itemData[key] === undefined) {
          delete itemData[key];
        }
      });
      await setDoc(itemRef, itemData, { merge: true });
      console.log(`✅ 업로드 완료: ${item.name}`);
    } catch (error) {
      console.error(`❌ 업로드 실패 (${item.name}):`, error);
    }
  }

  console.log(`\n✅ 총 ${inventoryItems.length}개 재고 항목 업로드 완료!`);
}

// 레시피 데이터 파싱 및 업로드
async function importRecipes(data: any[]): Promise<void> {
  console.log('\n🍳 레시피 데이터 업로드 시작...\n');

  const recipes: Recipe[] = [];
  let currentRecipe: Partial<Recipe> | null = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // 새 레시피 시작 (레시피명이 있으면)
    if (row.레시피명 || row.name || row.recipeName) {
      // 이전 레시피 저장
      if (currentRecipe && currentRecipe.name) {
        recipes.push(currentRecipe as Recipe);
      }

      // 새 레시피 생성
      const recipeName = String(row.레시피명 || row.name || row.recipeName).trim();
      const category = (row.카테고리 || row.category || '기타') as RecipeCategory;
      
      currentRecipe = {
        id: row.id || `recipe_${Date.now()}_${i}`,
        name: recipeName,
        description: row.설명 || row.description || '',
        category: ['밥', '메인 요리', '사이드 요리', '기본 반찬', '국'].includes(category) 
          ? category 
          : '기타',
        color: row.색상 || row.color || undefined,
        targetServings: parseInt(row.목표인분 || row.targetServings || 1) || 1,
        baseServings: parseInt(row.기준인분 || row.baseServings || 1) || 1,
        ingredients: [],
        steps: [],
        images: [],
        videos: [],
        notes: row.노트 || row.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [],
      };
    }

    // 재료 추가
    if (currentRecipe && (row.재료명 || row.ingredientName || row.ingredient)) {
      const ingredient: Ingredient = {
        id: `ing_${Date.now()}_${i}`,
        name: String(row.재료명 || row.ingredientName || row.ingredient).trim(),
        quantity: parseFloat(row.재료량 || row.quantity || 0) || 0,
        unit: String(row.재료단위 || row.unit || 'g').trim(),
        costPerUnit: parseFloat(row.재료원가 || row.costPerUnit || 0) || 0,
        category: row.재료카테고리 || row.category || undefined,
      };
      
      if (ingredient.name) {
        currentRecipe.ingredients!.push(ingredient);
      }
    }

    // 조리 단계 추가
    if (currentRecipe && (row.단계 || row.step || row.조리단계)) {
      const step: RecipeStep = {
        id: `step_${Date.now()}_${i}`,
        order: parseInt(row.단계순서 || row.stepOrder || row.order || currentRecipe.steps!.length + 1) || currentRecipe.steps!.length + 1,
        description: String(row.단계 || row.step || row.조리단계 || row.description).trim(),
        duration: row.소요시간 || row.duration ? parseInt(row.소요시간 || row.duration) : undefined,
      };
      
      if (step.description) {
        currentRecipe.steps!.push(step);
      }
    }
  }

  // 마지막 레시피 저장
  if (currentRecipe && currentRecipe.name) {
    recipes.push(currentRecipe as Recipe);
  }

  // Firebase에 업로드
  for (const recipe of recipes) {
    try {
      const recipeRef = doc(db, 'recipes', recipe.id);
      // undefined 값을 제거
      const recipeData: any = {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        category: recipe.category,
        color: recipe.color || null,
        targetServings: recipe.targetServings,
        baseServings: recipe.baseServings,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        images: recipe.images || [],
        videos: recipe.videos || [],
        notes: recipe.notes || '',
        createdAt: Timestamp.fromDate(recipe.createdAt),
        updatedAt: Timestamp.fromDate(recipe.updatedAt),
        history: recipe.history || [],
      };
      // undefined 값 제거
      Object.keys(recipeData).forEach(key => {
        if (recipeData[key] === undefined) {
          delete recipeData[key];
        }
      });
      await setDoc(recipeRef, recipeData, { merge: true });
      console.log(`✅ 업로드 완료: ${recipe.name} (재료 ${recipe.ingredients.length}개, 단계 ${recipe.steps.length}개)`);
    } catch (error) {
      console.error(`❌ 업로드 실패 (${recipe.name}):`, error);
    }
  }

  console.log(`\n✅ 총 ${recipes.length}개 레시피 업로드 완료!`);
}

// 메인 함수
async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const fileArg = args.find(arg => arg.startsWith('--file='));

  if (!typeArg || !fileArg) {
    console.log(`
📋 엑셀 파일 Firebase 업로드 스크립트

사용법:
  npm run import-excel -- --type=<타입> --file=<파일경로>

타입:
  - inventory: 재고 데이터
  - ingredient: 재료 데이터
  - recipe: 레시피 데이터

예시:
  npm run import-excel -- --type=inventory --file=data/inventory.xlsx
  npm run import-excel -- --type=ingredient --file=data/ingredients.xlsx
  npm run import-excel -- --type=recipe --file=data/recipes.xlsx

엑셀 파일 형식:

[재료 데이터]
- 재료명 (name)
- 수량 (quantity, 기본값: 0)
- 단위 (unit, 기본값: g)
- 원가 (costPerUnit)
- 카테고리 (category: 조미료, 육류, 채소, 곡물, 기타)

[재고 데이터]
- 재고명 (name)
- 재고량 (currentStock)
- 단위 (unit)
- 원가 (costPerUnit)
- 적정재고 (minimumStock)
- 위치 (location, 선택)
- 유통기한 (expirationDate, 선택)

[레시피 데이터]
- 레시피명 (name)
- 카테고리 (category)
- 기준인분 (baseServings)
- 재료명 (ingredient)
- 재료량 (quantity)
- 재료단위 (unit)
- 단계 (step)
- 단계순서 (stepOrder)
    `);
    process.exit(1);
  }

  const type = typeArg.split('=')[1];
  const filePath = fileArg.split('=')[1];

  if (type !== 'inventory' && type !== 'recipe' && type !== 'ingredient') {
    console.error('❌ 타입은 "inventory", "recipe", 또는 "ingredient"여야 합니다.');
    process.exit(1);
  }

  try {
    const data = readExcelFile(filePath);
    
    if (type === 'inventory') {
      await importInventory(data);
    } else if (type === 'recipe') {
      await importRecipes(data);
    } else if (type === 'ingredient') {
      await importIngredients(data);
    }

    console.log('\n🎉 모든 작업 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
