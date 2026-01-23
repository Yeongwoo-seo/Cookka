'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { Recipe, RecipeCategory, Ingredient, RecipeStep, IngredientCategory, getRecipeCategoryColor } from '@/types/recipe';
import { useAppStore } from '@/store/app-store';
import { InventoryItem } from '@/types/inventory';

interface AddRecipeModalProps {
  onClose: () => void;
  onAdd: (recipe: Recipe) => void;
  initialRecipe?: Recipe; // 수정 모드용
}

const categories: RecipeCategory[] = ['메인 요리', '사이드 요리', '기본 반찬', '국'];

// YouTube URL에서 video ID 추출
function extractVideoId(url: string): string | null {
  // Shorts 링크: youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/);
  if (shortsMatch) {
    return shortsMatch[1];
  }
  
  // 일반 링크: youtube.com/watch?v=VIDEO_ID 또는 youtu.be/VIDEO_ID
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (videoIdMatch) {
    return videoIdMatch[1];
  }
  
  return null;
}

// YouTube 정보 가져오기 함수 (제목, 설명, 고정 댓글)
async function fetchYouTubeInfo(videoId: string): Promise<{
  title: string | null;
  description: string | null;
  pinnedComment: string | null;
}> {
  try {
    console.log('YouTube API 호출 시작, videoId:', videoId);
    const response = await fetch(`/api/youtube?videoId=${videoId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API 응답 실패:', response.status, errorText);
      throw new Error(`Failed to fetch YouTube info: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('YouTube API 응답 데이터:', {
      hasTitle: !!data.title,
      hasDescription: !!data.description,
      hasPinnedComment: !!data.pinnedComment,
      descriptionLength: data.description?.length || 0,
      pinnedCommentLength: data.pinnedComment?.length || 0,
      descriptionPreview: data.description?.substring(0, 100) || '없음',
      pinnedCommentPreview: data.pinnedComment?.substring(0, 100) || '없음'
    });
    
    return {
      title: data.title || null,
      description: data.description || null,
      pinnedComment: data.pinnedComment || null,
    };
  } catch (error) {
    console.error('YouTube 정보 가져오기 실패:', error);
    console.error('에러 상세:', error instanceof Error ? error.stack : error);
    return {
      title: null,
      description: null,
      pinnedComment: null,
    };
  }
}

// Gemini API를 사용하여 텍스트 정제 및 이름 추출
async function cleanRecipeTextWithGemini(text: string): Promise<{ cleanedText: string; name: string | null }> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Gemini API 호출 실패');
    }

    const data = await response.json();
    console.log('Gemini API 응답 데이터:', {
      hasName: !!data.name,
      hasRecipe: !!data.recipe,
      hasMethod: !!data.method,
      hasCleanedText: !!data.cleanedText,
      name: data.name,
      recipePreview: data.recipe?.substring(0, 100),
      methodPreview: data.method?.substring(0, 100),
      cleanedTextPreview: data.cleanedText?.substring(0, 100)
    });
    
    // recipe와 method를 합쳐서 cleanedText 생성
    const recipePart = data.recipe || '';
    const methodPart = data.method || '';
    const cleanedText = [recipePart, methodPart].filter(Boolean).join('\n\n');
    
    console.log('생성된 cleanedText:', {
      recipeLength: recipePart.length,
      methodLength: methodPart.length,
      cleanedTextLength: cleanedText.length,
      cleanedTextPreview: cleanedText.substring(0, 300)
    });
    
    return {
      cleanedText: cleanedText || text,
      name: data.name || null,
    };
  } catch (error) {
    console.error('Gemini API 오류:', error);
    // 실패 시 기본 정제 함수 사용
    return {
      cleanedText: cleanRecipeText(text),
      name: null,
    };
  }
}

// 텍스트 정제 함수 - 레시피 형식으로 변환 (기본 방법)
function cleanRecipeText(text: string): string {
  // 불필요한 URL, 이모지, 특수 문자 제거
  let cleaned = text
    .replace(/https?:\/\/[^\s]+/g, '') // URL 제거
    .replace(/[🔗📌⭐👍❤️💬]/g, '') // 이모지 제거
    .replace(/[^\w\s가-힣\d\.,\s()\[\]{}:]/g, ' ') // 특수 문자 제거 (한글, 숫자, 기본 구두점 제외)
    .replace(/\s+/g, ' ') // 연속된 공백 제거
    .trim();

  const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let result: string[] = [];
  let currentSection = '';
  let inRecipeSection = false;
  
  // 섹션 키워드
  const ingredientKeywords = ['재료', '필요한', '준비물', '레시피', 'ingredient', 'material'];
  const stepKeywords = ['조리', '만들기', '방법', '순서', 'step', 'method', 'recipe'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // 섹션 헤더 감지
    if (ingredientKeywords.some(keyword => lowerLine.includes(keyword)) && 
        (lowerLine.length < 30 || lowerLine.match(/^\[?재료|레시피|필요한/))) {
      if (!inRecipeSection) {
        result.push('[레시피]');
        inRecipeSection = true;
      }
      currentSection = 'ingredients';
      continue;
    }
    
    if (stepKeywords.some(keyword => lowerLine.includes(keyword)) && 
        (lowerLine.length < 30 || lowerLine.match(/^\[?조리|방법|만들기|순서/))) {
      if (currentSection === 'ingredients' && result.length > 0) {
        result.push(''); // 빈 줄 추가
      }
      result.push('[조리방법]');
      currentSection = 'steps';
      continue;
    }
    
    // 재료 섹션 처리
    if (currentSection === 'ingredients') {
      // 재료 라인 감지 (숫자와 단위가 포함된 경우)
      const ingredientPattern = /(.+?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|개|컵|큰술|작은술|스푼|줌|장|마리|쪽|줄기|뿌리|송이|포기|대|T|tbsp|tsp|스푼)/i;
      const match = line.match(ingredientPattern);
      
      if (match) {
        const name = match[1].trim().replace(/[:\-]/g, '').trim();
        const quantity = match[2];
        const unit = match[3];
        result.push(`${name} ${quantity}${unit}`);
      } else if (line.length < 50 && !line.match(/^\d+$/)) {
        // 짧은 라인은 재료로 간주 (단, 숫자만 있는 라인 제외)
        const simpleIngredient = line.replace(/[:\-•·]/g, '').trim();
        if (simpleIngredient.length > 0 && simpleIngredient.length < 50) {
          // 숫자가 포함되어 있으면 재료로 간주
          if (/\d/.test(simpleIngredient)) {
            result.push(simpleIngredient);
          }
        }
      }
    }
    
    // 조리 단계 섹션 처리
    if (currentSection === 'steps') {
      // 번호가 있는 단계 (1. 2. 3. 또는 1) 2) 3))
      const numberedStep = line.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (numberedStep) {
        result.push(`${numberedStep[1]}. ${numberedStep[2].trim()}`);
      } else if (line.length > 15 && !line.match(/^\d+$/)) {
        // 번호 없이 긴 문장인 경우 자동 번호 매기기
        const stepNumber = result.filter(l => l.match(/^\d+\./)).length + 1;
        result.push(`${stepNumber}. ${line}`);
      }
    }
  }
  
  // 결과가 비어있으면 원본 텍스트 반환
  if (result.length === 0) {
    return text;
  }
  
  return result.join('\n');
}

// 레시피 텍스트에서 재료와 조리 단계 파싱
function parseRecipeFromText(text: string): { ingredients: Ingredient[]; steps: RecipeStep[] } {
  console.log('parseRecipeFromText 시작, 입력 텍스트:', text.substring(0, 500));
  
  const ingredients: Ingredient[] = [];
  const steps: RecipeStep[] = [];
  
  // 텍스트를 줄 단위로 분리 (공백 줄 제거)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('분리된 라인 수:', lines.length);
  console.log('처음 10개 라인:', lines.slice(0, 10));
  
  let currentSection = '';
  let stepOrder = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // 섹션 헤더 감지 ([레시피] 또는 [조리방법])
    if (lowerLine.includes('[레시피]') || lowerLine === '레시피' || (lowerLine.includes('레시피') && line.length < 20 && !lowerLine.includes('조리'))) {
      currentSection = 'ingredients';
      console.log('재료 섹션 감지:', line);
      continue;
    }
    if (lowerLine.includes('[조리방법]') || lowerLine === '조리방법' || (lowerLine.includes('조리방법') && line.length < 20) || lowerLine.includes('[조리법]') || lowerLine === '조리법') {
      currentSection = 'steps';
      console.log('조리방법 섹션 감지:', line);
      continue;
    }
    
    // 재료 파싱
    if (currentSection === 'ingredients') {
      // 불필요한 표현 필터링: "약간", "조금", "적당히" 등이 포함된 재료는 제외
      const excludeKeywords = ['약간', '조금', '적당히', '적당', '소량', '조금씩', '약간씩'];
      const hasExcludeKeyword = excludeKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasExcludeKeyword) {
        continue; // 이 라인은 건너뛰기
      }
      
      // 패턴: "재료명 수량단위" 또는 "재료명: 수량단위" 또는 "재료명 수량 단위"
      // 더 유연한 패턴으로 수정
      const ingredientMatch = line.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*(g|kg|ml|l|개|컵|큰술|작은술|스푼|티스푼|줌|장|마리|쪽|줄기|뿌리|송이|포기|대|T|tbsp|tsp|숟가락)/i);
      if (ingredientMatch) {
        const name = ingredientMatch[1].trim().replace(/[:\-•·]/g, '').trim();
        
        // 재료명에도 불필요한 표현이 포함되어 있는지 다시 확인
        const nameLower = name.toLowerCase();
        if (excludeKeywords.some(keyword => nameLower.includes(keyword))) {
          continue; // 재료명에 불필요한 표현이 포함되어 있으면 제외
        }
        
        const quantity = parseFloat(ingredientMatch[2]);
        let unit = ingredientMatch[3];
        
        // 스푼 → 큰술, 티스푼 → 작은술로 정규화
        if (unit === '스푼' || unit.toLowerCase() === 'tbsp' || unit.toLowerCase() === 't') {
          unit = '큰술';
        } else if (unit === '티스푼' || unit.toLowerCase() === 'tsp') {
          unit = '작은술';
        }
        
        ingredients.push({
          id: `ingredient-${ingredients.length + 1}`,
          name,
          quantity,
          unit,
          costPerUnit: 0,
        });
      } else {
        // 단위 없이 재료명만 있는 경우도 처리 (숫자가 포함된 경우)
        const hasNumber = /\d/.test(line);
        if (hasNumber && line.length < 100 && line.length > 2 && !line.match(/^\d+$/)) {
          // 숫자와 함께 있는 경우 재료로 간주
          const simpleName = line.replace(/[:\-•·]/g, '').trim();
          if (simpleName.length > 0) {
            // 재료명에 불필요한 표현이 포함되어 있는지 확인
            const nameLower = simpleName.toLowerCase();
            if (excludeKeywords.some(keyword => nameLower.includes(keyword))) {
              continue; // 불필요한 표현이 포함되어 있으면 제외
            }
            
            // 숫자 추출 시도
            const numMatch = simpleName.match(/(.+?)\s+(\d+(?:\.\d+)?)/);
            if (numMatch) {
              ingredients.push({
                id: `ingredient-${ingredients.length + 1}`,
                name: numMatch[1].trim(),
                quantity: parseFloat(numMatch[2]),
                unit: '개',
                costPerUnit: 0,
              });
            } else {
              ingredients.push({
                id: `ingredient-${ingredients.length + 1}`,
                name: simpleName,
                quantity: 1,
                unit: '개',
                costPerUnit: 0,
              });
            }
          }
        } else if (!hasNumber && line.length < 50 && line.length > 2 && !line.match(/^\d+$/)) {
          // 숫자 없이 짧은 라인도 재료로 간주
          const simpleName = line.replace(/[:\-•·]/g, '').trim();
          if (simpleName.length > 0) {
            // 재료명에 불필요한 표현이 포함되어 있는지 확인
            const nameLower = simpleName.toLowerCase();
            if (excludeKeywords.some(keyword => nameLower.includes(keyword))) {
              continue; // 불필요한 표현이 포함되어 있으면 제외
            }
            
            ingredients.push({
              id: `ingredient-${ingredients.length + 1}`,
              name: simpleName,
              quantity: 1,
              unit: '개',
              costPerUnit: 0,
            });
          }
        }
      }
    }
    
    // 조리 단계 파싱
    if (currentSection === 'steps') {
      // 번호가 있는 단계: "1. 설명" 또는 "1) 설명" 또는 "1 설명"
      const stepMatch = line.match(/^(\d+)[\.\)\s]+\s*(.+)$/);
      if (stepMatch) {
        steps.push({
          id: `step-${stepOrder}`,
          order: stepOrder++,
          description: stepMatch[2].trim(),
        });
      } else if (line.length > 10 && !line.match(/^\d+$/) && !line.includes('[레시피]') && !line.includes('[조리방법]')) {
        // 번호 없이 긴 문장인 경우
        steps.push({
          id: `step-${stepOrder}`,
          order: stepOrder++,
          description: line.trim(),
        });
      }
    }
  }
  
  console.log('parseRecipeFromText 완료:', {
    ingredientsCount: ingredients.length,
    stepsCount: steps.length,
    ingredients: ingredients.map(ing => `${ing.name} ${ing.quantity}${ing.unit}`),
    steps: steps.map(step => `${step.order}. ${step.description}`)
  });
  
  return { ingredients, steps };
}

// Gemini로 레시피 이름 생성
async function generateRecipeName(title: string | null, description: string | null, pinnedComment: string | null): Promise<string | null> {
  try {
    const response = await fetch('/api/gemini/recipe-name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, description, pinnedComment }),
    });

    if (!response.ok) {
      throw new Error('레시피 이름 생성 실패');
    }

    const data = await response.json();
    return data.name || null;
  } catch (error) {
    console.error('레시피 이름 생성 오류:', error);
    return null;
  }
}

export default function AddRecipeModal({ onClose, onAdd, initialRecipe }: AddRecipeModalProps) {
  const isEditMode = !!initialRecipe;
  const [name, setName] = useState(initialRecipe?.name || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [category, setCategory] = useState<RecipeCategory>(initialRecipe?.category || '메인 요리');
  const [youtubeUrl, setYoutubeUrl] = useState(initialRecipe?.videos?.[0] || '');
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [baseServings, setBaseServings] = useState<number | ''>(initialRecipe?.baseServings || '');
  const [extractedIngredients, setExtractedIngredients] = useState<Ingredient[]>(initialRecipe?.ingredients || []);
  const [extractedSteps, setExtractedSteps] = useState<RecipeStep[]>(initialRecipe?.steps || []);
  const [isExtractingName, setIsExtractingName] = useState(false);
  const nameExtractedRef = useRef(false);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [youtubeRawContent, setYoutubeRawContent] = useState<string>('');
  
  // 재고 정보 가져오기
  const inventory = useAppStore((state) => state.inventory);
  const ingredientPrices = useAppStore((state) => state.ingredientPrices);
  const updateIngredientPrice = useAppStore((state) => state.updateIngredientPrice);
  
  // 재료 이름을 기반으로 카테고리 자동 분류
  const getIngredientCategory = (name: string): IngredientCategory => {
    const lowerName = name.toLowerCase();
    
    // 조미료
    if (['간장', '고추장', '된장', '설탕', '소금', '고춧가루', '참기름', '식용유', '마늘', '생강'].some(ing => lowerName.includes(ing))) {
      return '조미료';
    }
    
    // 육류
    if (['고기', '돼지', '소고기', '닭', '앞다리살', '삼겹살', '목살'].some(ing => lowerName.includes(ing))) {
      return '육류';
    }
    
    // 채소
    if (['양파', '대파', '당근', '애호박', '시금치', '콩나물', '두부', '김치'].some(ing => lowerName.includes(ing))) {
      return '채소';
    }
    
    // 곡물
    if (['쌀', '밥', '콩', '검은콩'].some(ing => lowerName.includes(ing))) {
      return '곡물';
    }
    
    return '기타';
  };
  
  // 카테고리별 색상 (재료 탭과 동일한 스타일)
  const getCategoryColor = (category: IngredientCategory): string => {
    switch (category) {
      case '육류':
        return 'bg-red-100 text-red-800';
      case '곡물':
        return 'bg-yellow-100 text-yellow-800';
      case '채소':
        return 'bg-green-100 text-green-800';
      case '조미료':
        return 'bg-blue-100 text-blue-800';
      case '기타':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  
  // 단위 목록 (통용되는 단위만)
  const unitOptions = [
    'g', 'kg',
    'ml', 'L',
    '큰술', '작은술', '컵',
    '개', '장', '마리', '모', '단'
  ];
  
  // 단위를 ml 기준으로 변환 (부피 단위)
  const convertToML = (quantity: number, fromUnit: string): number => {
    const unit = fromUnit.toLowerCase();
    switch (unit) {
      case 'ml': return quantity;
      case 'l': return quantity * 1000;
      case '큰술':
      case '스푼': return quantity * 15; // 1큰술 = 15ml, 스푼 = 큰술
      case '작은술':
      case '티스푼': return quantity * 5; // 1작은술 = 5ml, 티스푼 = 작은술
      case '컵': return quantity * 240; // 1컵 = 240ml
      default: return quantity; // 변환 불가능한 단위는 그대로
    }
  };
  
  // ml를 다른 단위로 변환
  const convertFromML = (ml: number, toUnit: string): number => {
    const unit = toUnit.toLowerCase();
    switch (unit) {
      case 'ml': return ml;
      case 'l': return ml / 1000;
      case '큰술':
      case '스푼': return ml / 15;
      case '작은술':
      case '티스푼': return ml / 5;
      case '컵': return ml / 240;
      default: return ml; // 변환 불가능한 단위는 그대로
    }
  };
  
  // 단위를 g 기준으로 변환 (무게 단위)
  const convertToG = (quantity: number, fromUnit: string): number => {
    const unit = fromUnit.toLowerCase();
    switch (unit) {
      case 'g': return quantity;
      case 'kg': return quantity * 1000;
      default: return quantity; // 변환 불가능한 단위는 그대로
    }
  };
  
  // g를 다른 단위로 변환
  const convertFromG = (g: number, toUnit: string): number => {
    const unit = toUnit.toLowerCase();
    switch (unit) {
      case 'g': return g;
      case 'kg': return g / 1000;
      default: return g; // 변환 불가능한 단위는 그대로
    }
  };
  
  // 단위 변환 함수 (부피↔부피, 무게↔무게만 변환 가능)
  const convertUnit = (quantity: number, fromUnit: string, toUnit: string): number => {
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();
    
    // 같은 단위면 그대로
    if (from === to) return quantity;
    
    // 부피 단위들 (스푼=큰술, 티스푼=작은술 포함)
    const volumeUnits = ['ml', 'l', '큰술', '스푼', '작은술', '티스푼', '컵'];
    const isFromVolume = volumeUnits.includes(from);
    const isToVolume = volumeUnits.includes(to);
    
    // 스푼 → 큰술, 티스푼 → 작은술로 정규화
    const normalizedFrom = from === '스푼' ? '큰술' : from === '티스푼' ? '작은술' : from;
    const normalizedTo = to === '스푼' ? '큰술' : to === '티스푼' ? '작은술' : to;
    
    // 무게 단위들
    const weightUnits = ['g', 'kg'];
    const isFromWeight = weightUnits.includes(from);
    const isToWeight = weightUnits.includes(to);
    
    // 부피 → 부피 변환
    if (isFromVolume && isToVolume) {
      const ml = convertToML(quantity, normalizedFrom);
      return convertFromML(ml, normalizedTo);
    }
    
    // 무게 → 무게 변환
    if (isFromWeight && isToWeight) {
      const g = convertToG(quantity, fromUnit);
      return convertFromG(g, toUnit);
    }
    
    // 변환 불가능한 경우 (부피↔무게, 개수 단위 등)는 그대로 반환
    return quantity;
  };
  
  // Weighted Average 방식으로 원가 계산
  const calculateWeightedAverageCost = (item: InventoryItem): number => {
    if (!item.purchaseHistory || item.purchaseHistory.length === 0) {
      return item.costPerUnit;
    }

    let totalQuantity = 0;
    let totalCost = 0;

    for (const purchase of item.purchaseHistory) {
      totalQuantity += purchase.quantity;
      totalCost += purchase.quantity * purchase.costPerUnit;
    }

    // 구매 이력의 총량이 현재 재고보다 적으면 나머지는 현재 costPerUnit 사용
    if (totalQuantity < item.currentStock) {
      const remainingQuantity = item.currentStock - totalQuantity;
      totalQuantity += remainingQuantity;
      totalCost += remainingQuantity * item.costPerUnit;
    }

    return totalQuantity > 0 ? totalCost / totalQuantity : item.costPerUnit;
  };
  
  // 레시피 총 원가 계산
  const totalCost = useMemo(() => {
    let total = 0;
    
    for (const ingredient of extractedIngredients) {
      // 재고에서 재료명과 단위로 매칭
      const inventoryItem = inventory.find(
        (item) => item.name === ingredient.name && item.unit === ingredient.unit
      );
      
      if (inventoryItem) {
        // Weighted Average 방식으로 원가 계산
        const costPerUnit = calculateWeightedAverageCost(inventoryItem);
        total += ingredient.quantity * costPerUnit;
      } else {
        // 재고에 없으면 ingredient의 costPerUnit 사용 (0일 수 있음)
        total += ingredient.quantity * (ingredient.costPerUnit || 0);
      }
    }
    
    return total;
  }, [extractedIngredients, inventory]);


  // YouTube URL이 변경되면 정보 가져오기
  useEffect(() => {
    const loadYouTubeInfo = async () => {
      if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
        return;
      }

      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) return;

      setIsLoadingTitle(true);
      setIsLoadingRecipe(true);
      try {
        // 1단계: 제목/댓글/내용 따오기
        console.log('=== 1단계: 유튜브 정보 가져오기 시작 ===');
        console.log('videoId:', videoId);
        const info = await fetchYouTubeInfo(videoId);
        console.log('가져온 유튜브 정보 (전체):', {
          title: info.title,
          titleLength: info.title?.length || 0,
          description: info.description,
          descriptionLength: info.description?.length || 0,
          pinnedComment: info.pinnedComment,
          pinnedCommentLength: info.pinnedComment?.length || 0,
        });
        
        // 테스트용: 유튜브 원본 내용 저장
        const rawContent = [
          `제목: ${info.title || '없음'}`,
          `설명: ${info.description || '없음'}`,
          `고정댓글: ${info.pinnedComment || '없음'}`
        ].join('\n\n');
        setYoutubeRawContent(rawContent);
        console.log('테스트용 원본 내용 저장 완료, 길이:', rawContent.length);
        
        // 2단계: AI로 레시피 이름 추출하기
        console.log('=== 2단계: AI로 레시피 이름 추출 시작 ===');
        let extractedRecipeName = '';
        
        // 제목, 설명, 고정 댓글을 순서대로 합치기 (제목/댓글/내용)
        const allContent = [
          info.title,
          info.pinnedComment,
          info.description
        ].filter(Boolean).join('\n\n');
        
        console.log('이름 추출을 위한 전체 내용 길이:', allContent.length);
        console.log('이름 추출을 위한 전체 내용 (처음 200자):', allContent.substring(0, 200));
        
        if (allContent.trim()) {
          // Gemini API를 사용하여 이름 추출 (제목, 댓글, 내용 모두 포함)
          const result = await cleanRecipeTextWithGemini(allContent);
          
          console.log('Gemini API 응답:', {
            name: result.name,
            cleanedTextLength: result.cleanedText.length
          });
          
          if (result.name && result.name.trim()) {
            extractedRecipeName = result.name.trim();
            console.log('추출된 레시피 이름:', extractedRecipeName);
          } else {
            console.log('⚠️ 레시피 이름 추출 실패 - 빈 값');
          }
        } else {
          console.log('⚠️ 이름 추출을 위한 내용이 없음');
        }
        
        // 3단계: 레시피 이름 란에 기입하기
        console.log('=== 3단계: 레시피 이름 란에 기입 ===');
        if (extractedRecipeName) {
          setName(extractedRecipeName);
          nameExtractedRef.current = true;
          console.log('✅ 레시피 이름 설정 완료:', extractedRecipeName);
        } else {
          console.log('⚠️ 레시피 이름이 없어서 설정하지 않음');
        }
        
        // 4단계: 레시피 정보와 조리방법 자동 추출
        console.log('=== 4단계: 레시피 정보와 조리방법 추출 시작 ===');
        console.log('info 객체:', {
          hasTitle: !!info.title,
          hasDescription: !!info.description,
          hasPinnedComment: !!info.pinnedComment,
          titleValue: info.title,
          descriptionValue: info.description?.substring(0, 100),
          pinnedCommentValue: info.pinnedComment?.substring(0, 100),
        });
        
        const allContentForRecipe = [
          info.title,
          info.pinnedComment,
          info.description
        ].filter(Boolean).join('\n\n');
        
        console.log('재료/조리방법 추출을 위한 전체 내용:');
        console.log('- 필터링 전 배열:', [info.title, info.pinnedComment, info.description]);
        console.log('- 필터링 후 배열:', [info.title, info.pinnedComment, info.description].filter(Boolean));
        console.log('- 전체 내용 길이:', allContentForRecipe.length);
        console.log('- 전체 내용 (처음 500자):', allContentForRecipe.substring(0, 500));
        console.log('- 전체 내용 (전체):', allContentForRecipe);
        
        if (allContentForRecipe.trim()) {
          try {
            // Gemini API로 정제하여 재료와 단계 추출
            console.log('Gemini API 호출 시작 (재료/조리방법 추출용)...');
            const recipeResult = await cleanRecipeTextWithGemini(allContentForRecipe);
            
            console.log('Gemini API 응답 (재료/조리방법):', {
              hasCleanedText: !!recipeResult.cleanedText,
              cleanedTextLength: recipeResult.cleanedText?.length || 0,
              cleanedTextPreview: recipeResult.cleanedText?.substring(0, 500) || '없음',
              fullCleanedText: recipeResult.cleanedText || '없음'
            });
            
            // 정제된 텍스트로 재료와 단계 추출
            if (recipeResult.cleanedText && recipeResult.cleanedText.trim()) {
              console.log('정제된 텍스트 파싱 시작...');
              console.log('파싱할 전체 텍스트:', recipeResult.cleanedText);
              const { ingredients, steps } = parseRecipeFromText(recipeResult.cleanedText);
              
              console.log('파싱 결과:', {
                ingredientsCount: ingredients.length,
                stepsCount: steps.length,
                ingredients: ingredients.map(ing => `${ing.name} ${ing.quantity}${ing.unit}`),
                steps: steps.map(step => `${step.order}. ${step.description}`)
              });
              
              // 재료에 카테고리 자동 설정
              const ingredientsWithCategory = ingredients.map(ing => ({
                ...ing,
                category: ing.category || getIngredientCategory(ing.name)
              }));
              
              console.log('상태 업데이트 전:', {
                currentIngredients: extractedIngredients.length,
                currentSteps: extractedSteps.length
              });
              
              setExtractedIngredients(ingredientsWithCategory);
              setExtractedSteps(steps);
              
              console.log('✅ 레시피 정보 추출 완료 및 상태 업데이트:', {
                ingredients: ingredientsWithCategory.length,
                steps: steps.length
              });
              
              // 상태 업데이트 확인을 위한 추가 로그
              setTimeout(() => {
                console.log('상태 업데이트 확인 (1초 후):', {
                  ingredients: extractedIngredients.length,
                  steps: extractedSteps.length
                });
              }, 1000);
            } else {
              console.warn('⚠️ 정제된 텍스트가 비어있음');
              console.warn('원본 텍스트:', allContentForRecipe.substring(0, 500));
            }
          } catch (error) {
            console.error('❌ 재료/조리방법 추출 중 오류:', error);
            console.error('에러 상세:', error instanceof Error ? error.stack : error);
          }
        } else {
          console.warn('⚠️ 재료/조리방법 추출을 위한 내용이 없음');
        }
        
        // 유튜브 영상 제목을 설명에 설정
        if (info.title) {
          setDescription(info.title);
          console.log('✅ 설명 설정:', info.title);
        }
      } catch (error) {
        console.error('정보 가져오기 실패:', error);
      } finally {
        setIsLoadingTitle(false);
        setIsLoadingRecipe(false);
      }
    };

    // 디바운스: 1초 후에 실행
    const timer = setTimeout(loadYouTubeInfo, 1000);
    return () => clearTimeout(timer);
  }, [youtubeUrl]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 인분 기준 입력값과 관계없이 항상 1인분 기준으로 저장
    const newRecipe: Recipe = {
      id: isEditMode ? initialRecipe!.id : Date.now().toString(),
      name,
      description,
      category,
      targetServings: 1,
      baseServings: typeof baseServings === 'number' ? baseServings : 1,
      ingredients: extractedIngredients,
      steps: extractedSteps,
      images: initialRecipe?.images || [],
      videos: youtubeUrl ? [youtubeUrl] : [],
      notes: initialRecipe?.notes || '',
      createdAt: isEditMode ? initialRecipe!.createdAt : new Date(),
      updatedAt: new Date(),
      history: initialRecipe?.history || [],
    };

    // 재료 가격에 없는 재료 자동 추가
    for (const ingredient of extractedIngredients) {
      const key = `${ingredient.name}_${ingredient.unit}`;
      if (!ingredientPrices.has(key)) {
        // 재료 가격에 없는 경우 기본값(0)으로 추가
        await updateIngredientPrice(ingredient.name, ingredient.unit, ingredient.costPerUnit || 0);
      }
    }

    onAdd(newRecipe);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{isEditMode ? '레시피 수정' : '레시피 추가'}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 레시피 이름과 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                레시피 이름 * / 카테고리 *
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    nameExtractedRef.current = false; // 수동 입력 시 플래그 리셋
                  }}
                  required
                  className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC] h-[42px]"
                  placeholder={isExtractingName ? "레시피 이름 추출 중..." : "예: 된장찌개"}
                />
                <div className="flex gap-2 flex-shrink-0">
                  {categories.map((cat) => {
                    // 카테고리 표시 이름 매핑 (UI에만 간단하게 표시)
                    const displayName = cat === '메인 요리' ? '메인' :
                                      cat === '사이드 요리' ? '사이드' :
                                      cat === '기본 반찬' ? '반찬' : cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap h-[42px] flex items-center justify-center ${
                          category === cat
                            ? 'bg-[#4D99CC] text-white'
                            : `${getRecipeCategoryColor(cat)} hover:opacity-80`
                        }`}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 유튜브 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                유튜브 링크
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {isLoadingTitle && (
                <p className="text-xs text-gray-500 mt-1">
                  {isLoadingRecipe ? '레시피 정보 가져오는 중...' : '제목 가져오는 중...'}
                </p>
              )}
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                placeholder="레시피 설명을 한 줄로 입력하세요"
              />
            </div>

            {/* 레시피 정보 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  레시피 정보
                </label>
                <div className="flex items-center gap-4">
                  {extractedIngredients.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">총 원가:</span>
                      <span className="text-lg font-bold text-[#4D99CC]">
                        ${(totalCost / 1000).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 font-normal">
                        /1인분
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={baseServings}
                      onChange={(e) => setBaseServings(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                      min={1}
                      className="w-12 px-2 py-1 text-center border-2 border-[#4D99CC] bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC] text-sm"
                      placeholder=""
                    />
                    <span className="text-sm text-gray-700">인분 기준</span>
                  </div>
                </div>
              </div>
              {extractedIngredients.length > 0 ? (
                <>
                  <div className="flex flex-col gap-3 mb-3">
                    {extractedIngredients
                      .slice()
                      .sort((a, b) => {
                        // 카테고리별 정렬 순서: 육류 -> 채소 -> 조미료 -> 기타
                        const categoryOrder: Record<IngredientCategory, number> = {
                          '육류': 1,
                          '채소': 2,
                          '조미료': 3,
                          '곡물': 4,
                          '기타': 5
                        };
                        
                        const categoryA = a.category || getIngredientCategory(a.name);
                        const categoryB = b.category || getIngredientCategory(b.name);
                        
                        const orderA = categoryOrder[categoryA] || 5;
                        const orderB = categoryOrder[categoryB] || 5;
                        
                        if (orderA !== orderB) {
                          return orderA - orderB;
                        }
                        
                        // 같은 카테고리 내에서는 이름순 정렬
                        return a.name.localeCompare(b.name, 'ko');
                      })
                      .map((ing) => {
                      // 재고에서 재료명과 단위로 매칭하여 원가 가져오기
                      const inventoryItem = inventory.find(
                        (item) => item.name === ing.name && item.unit === ing.unit
                      );
                      const costPerUnit = inventoryItem 
                        ? calculateWeightedAverageCost(inventoryItem)
                        : (ing.costPerUnit || 0);
                      const ingredientCost = ing.quantity * costPerUnit;
                      
                      // 카테고리 자동 설정 (없으면 자동 분류)
                      const category = ing.category || getIngredientCategory(ing.name);
                      
                      return (
                        <div
                          key={ing.id}
                          className="bg-gray-100 rounded-lg p-3 flex items-center gap-2"
                        >
                          {/* 카테고리 뱃지 (재료 탭과 동일한 스타일) */}
                          <span 
                            className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${getCategoryColor(category)}`}
                          >
                            {category}
                          </span>
                          <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => {
                              const updatedIngredients = extractedIngredients.map((i) =>
                                i.id === ing.id
                                  ? { ...i, name: e.target.value }
                                  : i
                              );
                              setExtractedIngredients(updatedIngredients);
                            }}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                            placeholder="재료명"
                          />
                          <input
                            type="number"
                            value={ing.quantity}
                            onChange={(e) => {
                              const updatedIngredients = extractedIngredients.map((i) =>
                                i.id === ing.id
                                  ? { ...i, quantity: parseFloat(e.target.value) || 0 }
                                  : i
                              );
                              setExtractedIngredients(updatedIngredients);
                            }}
                            className="w-20 px-2 py-1.5 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC] text-sm flex-shrink-0"
                            min="0"
                            step="0.1"
                          />
                          <select
                            value={ing.unit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              // 단위 변경 시 자동 변환
                              const convertedQuantity = convertUnit(ing.quantity, ing.unit, newUnit);
                              const updatedIngredients = extractedIngredients.map((i) =>
                                i.id === ing.id
                                  ? { ...i, unit: newUnit, quantity: convertedQuantity }
                                  : i
                              );
                              setExtractedIngredients(updatedIngredients);
                            }}
                            className="text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#4D99CC] bg-white w-16 flex-shrink-0"
                          >
                            {unitOptions.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedIngredients = extractedIngredients.filter((i) => i.id !== ing.id);
                              setExtractedIngredients(updatedIngredients);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0 ml-auto"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newIngredient: Ingredient = {
                        id: `ingredient-${Date.now()}`,
                        name: '',
                        quantity: 1,
                        unit: 'g',
                        costPerUnit: 0,
                        category: '기타',
                      };
                      setExtractedIngredients([...extractedIngredients, newIngredient]);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-[#4D99CC] border border-[#4D99CC] rounded-lg hover:bg-[#4D99CC] hover:text-white transition-colors w-full justify-center"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    재료 추가
                  </button>
                </>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">유튜브 링크를 입력하면 자동으로 재료가 추출됩니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const newIngredient: Ingredient = {
                        id: `ingredient-${Date.now()}`,
                        name: '',
                        quantity: 1,
                        unit: 'g',
                        costPerUnit: 0,
                        category: '기타',
                      };
                      setExtractedIngredients([newIngredient]);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-[#4D99CC] border border-[#4D99CC] rounded-lg hover:bg-[#4D99CC] hover:text-white transition-colors w-full justify-center"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    재료 추가
                  </button>
                </div>
              )}
            </div>

            {/* 조리방법 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                조리방법
              </label>
              <div className="space-y-3">
                {extractedSteps.map((step, index) => (
                  <Fragment key={step.id}>
                    {/* 드롭 위치 표시선 */}
                    {draggedStepIndex !== null && draggedStepIndex !== index && dragOverIndex === index && (
                      <div className="h-1 bg-[#4D99CC] rounded-full my-2 mx-4"></div>
                    )}
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDraggedStepIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (draggedStepIndex !== null && draggedStepIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverIndex(null);
                        if (draggedStepIndex === null || draggedStepIndex === index) return;
                        
                        const newSteps = [...extractedSteps];
                        const draggedStep = newSteps[draggedStepIndex];
                        newSteps.splice(draggedStepIndex, 1);
                        newSteps.splice(index, 0, draggedStep);
                        
                        // order 재정렬
                        const reorderedSteps = newSteps.map((s, idx) => ({
                          ...s,
                          order: idx + 1
                        }));
                        
                        setExtractedSteps(reorderedSteps);
                        setDraggedStepIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedStepIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        draggedStepIndex === index
                          ? 'bg-blue-50 border-2 border-[#4D99CC] opacity-50'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                    {/* 드래그 핸들 */}
                    <div className="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 12h16M4 16h16"
                        />
                      </svg>
                    </div>
                    <span className="flex-shrink-0 w-8 h-8 bg-[#4D99CC] text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {step.order}
                    </span>
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => {
                        const updatedSteps = extractedSteps.map((s) =>
                          s.id === step.id ? { ...s, description: e.target.value } : s
                        );
                        setExtractedSteps(updatedSteps);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                      placeholder={`${step.order}단계를 입력하세요`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedSteps = extractedSteps
                          .filter((s) => s.id !== step.id)
                          .map((s, idx) => ({ ...s, order: idx + 1 }));
                        setExtractedSteps(updatedSteps);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  </Fragment>
                ))}
                {/* 마지막 위치 드롭 표시선 */}
                {draggedStepIndex !== null && dragOverIndex === extractedSteps.length && (
                  <div className="h-1 bg-[#4D99CC] rounded-full my-2 mx-4"></div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newStep: RecipeStep = {
                      id: `step-${extractedSteps.length + 1}`,
                      order: extractedSteps.length + 1,
                      description: '',
                    };
                    setExtractedSteps([...extractedSteps, newStep]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-[#4D99CC] border border-[#4D99CC] rounded-lg hover:bg-[#4D99CC] hover:text-white transition-colors w-full justify-center"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  조리 단계 추가
                </button>
              </div>
            </div>

            {/* 유튜브 원본 내용 */}
            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <label className="block text-sm font-bold text-gray-800 mb-2">
                📺 유튜브 원본 내용
              </label>
              <div className="bg-white p-3 rounded border border-blue-200">
                <textarea
                  value={youtubeRawContent || '유튜브 링크를 입력하면 여기에 원본 내용이 표시됩니다...'}
                  readOnly
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white font-mono text-xs"
                  placeholder="유튜브 링크를 입력하면 여기에 원본 내용이 표시됩니다..."
                />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-600">
                <span>내용 길이: {youtubeRawContent.length}자</span>
                <span>상태: {youtubeRawContent ? '✅ 데이터 있음' : '❌ 데이터 없음'}</span>
              </div>
            </div>

          </form>
        </div>
        
        {/* 등록 버튼 - 모달 하단에 고정 */}
        <div className="bg-white border-t border-gray-200 p-3 rounded-b-2xl flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            className="w-full px-4 py-2.5 bg-[#4D99CC] text-white rounded-lg shadow-lg hover:bg-[#3d89bc] transition-colors flex items-center justify-center gap-2 font-semibold text-base"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {isEditMode ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
