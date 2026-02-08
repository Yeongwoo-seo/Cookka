'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { Recipe, RecipeCategory, Ingredient, RecipeStep, IngredientCategory, getRecipeCategoryColor } from '@/types/recipe';
import { useAppStore } from '@/store/app-store';
import { InventoryItem } from '@/types/inventory';
import GeminiChatModal from './GeminiChatModal';

interface AddRecipeModalProps {
  isOpen: boolean;
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

// 재료는 모두 g 기준 통일
const DEFAULT_UNIT = 'g';

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
async function cleanRecipeTextWithGemini(text: string): Promise<{ cleanedText: string; name: string | null; color?: string; recipe: string; method: string }> {
  try {
    console.log('=== 📤 Gemini API 요청 ===');
    console.log('요청할 텍스트 길이:', text.length, '자');
    console.log('요청할 텍스트 (처음 500자):', text.substring(0, 500));
    console.log('요청할 텍스트 전체:', text);
    console.log('=== 요청 정보 끝 ===\n');
    
    const requestBody = { text };
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('=== 📡 HTTP 응답 수신 ===');
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response OK:', response.ok);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('=== HTTP 응답 수신 끝 ===\n');

    console.log('=== 📡 HTTP 응답 상태 ===');
    console.log('Status:', response.status, response.statusText);
    console.log('OK:', response.ok);
    console.log('=== HTTP 응답 상태 끝 ===\n');
    
    if (!response.ok) {
      // 에러 응답에서 상세 정보 추출
      let errorMessage = `Gemini API 호출 실패 (${response.status})`;
      let errorData = null;
      try {
        const errorText = await response.text();
        console.log('=== ❌ 에러 응답 본문 ===');
        console.log('에러 응답 텍스트:', errorText);
        console.log('=== 에러 응답 끝 ===\n');
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // JSON 파싱 실패
        }
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
        if (errorData?.details) {
          errorMessage += `: ${errorData.details}`;
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 메시지 사용
        console.error('에러 응답 파싱 실패:', e);
      }
      
      console.warn('=== ⚠️ Gemini API 호출 실패 ===');
      console.warn('Status:', response.status, response.statusText);
      console.warn('Error Message:', errorMessage);
      console.warn('=== 실패 정보 끝 ===\n');
      
      // 에러를 throw하지 않고 fallback으로 처리
      return {
        cleanedText: cleanRecipeText(text),
        name: null,
        color: undefined,
        recipe: '',
        method: '',
      };
    }

    const data = await response.json();
    console.log('=== 📥 Gemini API 응답 데이터 (전체) ===');
    console.log('응답 데이터 전체:', JSON.stringify(data, null, 2));
    console.log('응답 데이터 타입:', typeof data);
    console.log('응답 데이터 키:', Object.keys(data || {}));
    console.log('\n응답 데이터 상세:');
    console.log('- name:', data.name, '(타입:', typeof data.name, ', 길이:', data.name?.length || 0, ')');
    console.log('- recipe:', data.recipe ? `[${data.recipe.length}자] ${data.recipe.substring(0, 200)}...` : '없음');
    console.log('- method:', data.method ? `[${data.method.length}자] ${data.method.substring(0, 200)}...` : '없음');
    console.log('- cleanedText:', data.cleanedText ? `[${data.cleanedText.length}자] ${data.cleanedText.substring(0, 200)}...` : '없음');
    console.log('=== 응답 데이터 끝 ===\n');
    
    // recipe와 method 추출
    let recipePart = data.recipe || '';
    let methodPart = data.method || '';
    
    // recipe와 method가 없으면 cleanedText에서 파싱 시도
    if (!recipePart && !methodPart && data.cleanedText) {
      console.log('=== ⚠️ recipe/method가 없어서 cleanedText에서 파싱 시도 ===');
      console.log('cleanedText 내용:', data.cleanedText.substring(0, 500));
      
      // cleanedText에서 [레시피]와 [조리방법] 섹션 찾기
      const recipeMatch = data.cleanedText.match(/\[레시피\][\s\S]*?(?=\[조리방법\]|$)/i);
      const methodMatch = data.cleanedText.match(/\[조리방법\][\s\S]*/i);
      
      if (recipeMatch) {
        recipePart = recipeMatch[0].replace(/\[레시피\]/i, '').trim();
        console.log('cleanedText에서 추출한 recipe:', recipePart.substring(0, 200));
      }
      
      if (methodMatch) {
        methodPart = methodMatch[0].replace(/\[조리방법\]/i, '').trim();
        console.log('cleanedText에서 추출한 method:', methodPart.substring(0, 200));
      }
      
      // [레시피]나 [조리방법] 헤더가 없으면 전체를 recipe로 간주
      if (!recipePart && !methodPart) {
        recipePart = data.cleanedText.trim();
        console.log('헤더가 없어서 전체를 recipe로 사용');
      }
      
      console.log('=== 파싱 완료 ===\n');
    }
    
    // recipePart 정제: <br> 태그 제거 (Gemini API가 이미 쉼표로 구분된 형식으로 반환)
    if (recipePart) {
      console.log('=== 🧹 재료 텍스트 정제 시작 ===');
      console.log('정제 전:', recipePart.substring(0, 200));
      
      // <br>, <br/>, <br /> 태그만 제거 (이미 쉼표로 구분된 형식이므로 그대로 유지)
      recipePart = recipePart
        .replace(/<br\s*\/?>/gi, ' ')  // <br> 태그를 공백으로
        .replace(/\s+/g, ' ')          // 연속된 공백을 하나로
        .trim();
      
      console.log('정제 후:', recipePart.substring(0, 200));
      console.log('=== 재료 텍스트 정제 완료 ===\n');
    }
    
    // 최종 cleanedText 생성
    const cleanedText = [recipePart, methodPart].filter(Boolean).join('\n\n');
    
    console.log('=== 📝 최종 결과 ===');
    console.log('recipe 길이:', recipePart.length, '자');
    console.log('method 길이:', methodPart.length, '자');
    console.log('cleanedText 길이:', cleanedText.length, '자');
    if (recipePart) {
      console.log('recipe 전체:', recipePart);
    }
    if (methodPart) {
      console.log('method 전체:', methodPart);
    }
    console.log('=== 최종 결과 끝 ===\n');
    
    const colorHex = data.color && /^#[0-9A-Fa-f]{6}$/.test(String(data.color).trim()) ? String(data.color).trim() : undefined;
    return {
      cleanedText: cleanedText || data.cleanedText || text,
      name: data.name || null,
      color: colorHex,
      recipe: recipePart,
      method: methodPart,
    };
  } catch (error) {
    console.warn('Gemini API 오류 (fallback 사용):', {
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : typeof error
    });
    return {
      cleanedText: cleanRecipeText(text),
      name: null,
      color: undefined,
      recipe: '',
      method: '',
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
    // "[레시피]" 헤더가 없으면 재료로 파싱하지 않음
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
    
    // 재료 파싱 - "[레시피]" 헤더가 있어야만 재료로 파싱
    if (currentSection === 'ingredients') {
      // 불필요한 표현 필터링: "약간", "조금", "적당히" 등이 포함된 재료는 제외
      const excludeKeywords = ['약간', '조금', '적당히', '적당', '소량', '조금씩', '약간씩'];
      const hasExcludeKeyword = excludeKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasExcludeKeyword) {
        continue; // 이 라인은 건너뛰기
      }
      
      // 쉼표로 구분된 재료들을 각각 파싱
      // 예: "돼지 앞다리살 500g, 양파 2개, 고추장 2큰술"
      const ingredientItems = line.split(',').map(item => item.trim()).filter(item => item.length > 0);
      
      // 패턴: "재료명 수량단위" 또는 "재료명: 수량단위" 또는 "재료명 수량 단위" 또는 "수량단위 재료명"
      // 더 유연한 패턴으로 수정
      const unitPattern = '(g|kg|ml|l|개|컵|큰술|작은술|스푼|티스푼|줌|장|마리|쪽|줄기|뿌리|송이|포기|대|T|tbsp|tsp|숟가락)';
      const numberPattern = '(\\d+(?:\\.\\d+)?)';
      
      // 각 재료 항목을 파싱
      for (const ingredientItem of ingredientItems) {
        
        // 패턴 1: "재료명 수량단위" 또는 "재료명 수량 단위"
        let ingredientMatch = ingredientItem.match(new RegExp(`(.+?)\\s+${numberPattern}\\s*${unitPattern}`, 'i'));
        
        // 패턴 2: "재료명: 수량단위" 또는 "재료명: 수량 단위"
        if (!ingredientMatch) {
          ingredientMatch = ingredientItem.match(new RegExp(`(.+?)[:\\-•·]\\s*${numberPattern}\\s*${unitPattern}`, 'i'));
        }
        
        // 패턴 3: "수량단위 재료명"
        if (!ingredientMatch) {
          const reverseMatch = ingredientItem.match(new RegExp(`${numberPattern}\\s*${unitPattern}\\s+(.+)`, 'i'));
          if (reverseMatch) {
            ingredientMatch = [reverseMatch[0], reverseMatch[3], reverseMatch[1], reverseMatch[2]];
          }
        }
        
        // 패턴 4: "재료명 수량" (단위 없음, 기본 단위 사용)
        if (!ingredientMatch) {
          const noUnitMatch = ingredientItem.match(new RegExp(`(.+?)\\s+${numberPattern}(?!\\s*${unitPattern})`, 'i'));
          if (noUnitMatch) {
            const name = noUnitMatch[1].trim().replace(/[:\-•·]/g, '').trim();
            const quantity = parseFloat(noUnitMatch[2]);
            ingredientMatch = [noUnitMatch[0], name, noUnitMatch[2], DEFAULT_UNIT];
          }
        }
        
        if (ingredientMatch) {
        let name = ingredientMatch[1].trim().replace(/[:\-•·]/g, '').trim();
        
        // 해시태그 제거 (#shorts, #shortvideo 등)
        name = name.replace(/#\w+/g, '').trim();
        
        // URL 제거
        name = name.replace(/https?:\/\/[^\s]+/g, '').trim();
        
        // 이모지 제거
        name = name.replace(/[🔗📌⭐👍❤️💬]/g, '').trim();
        
        // 불필요한 표현이 포함되어 있는지 확인
        const nameLower = name.toLowerCase();
        if (excludeKeywords.some(keyword => nameLower.includes(keyword))) {
          continue; // 재료명에 불필요한 표현이 포함되어 있으면 제외
        }
        
        // 해시태그만 있는 경우 제외
        if (!name || name.length === 0 || name.match(/^[#\s]+$/)) {
          continue;
        }
        
        const quantity = parseFloat(ingredientMatch[2]);
        let unit = ingredientMatch[3];
        
        // 스푼 → 큰술, 티스푼 → 작은술로 정규화
        if (unit === '스푼' || unit.toLowerCase() === 'tbsp' || unit.toLowerCase() === 't') {
          unit = '큰술';
        } else if (unit === '티스푼' || unit.toLowerCase() === 'tsp') {
          unit = '작은술';
        }
        
        // 모든 재료 g 기준 통일: kg/L/ml → g로 변환
        let qtyG = quantity;
        const u = (unit || '').toLowerCase();
        if (u === 'kg') qtyG = quantity * 1000;
        else if (u === 'l') qtyG = quantity * 1000;
        else if (u === 'ml') qtyG = quantity;
        else if (u === 'g') qtyG = quantity;
        // 개/큰술 등은 수치만 유지, 단위 g
        ingredients.push({
          id: `ingredient-${ingredients.length + 1}`,
          name,
          quantity: qtyG,
          unit: DEFAULT_UNIT,
          costPerUnit: 0,
        });
        } else {
          // 단위 없이 재료명만 있는 경우도 처리 (숫자가 포함된 경우)
          const hasNumber = /\d/.test(ingredientItem);
          
          // 해시태그나 URL이 포함된 항목은 제외
          if (ingredientItem.match(/#\w+/) || ingredientItem.match(/https?:\/\//)) {
            continue;
          }
          
          if (hasNumber && ingredientItem.length < 100 && ingredientItem.length > 2 && !ingredientItem.match(/^\d+$/)) {
            // 숫자와 함께 있는 경우 재료로 간주
            let simpleName = ingredientItem.replace(/[:\-•·]/g, '').trim();
            
            // 해시태그, URL, 이모지 제거
            simpleName = simpleName.replace(/#\w+/g, '').replace(/https?:\/\/[^\s]+/g, '').replace(/[🔗📌⭐👍❤️💬]/g, '').trim();
            
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
          } else if (!hasNumber && ingredientItem.length < 50 && ingredientItem.length > 2 && !ingredientItem.match(/^\d+$/)) {
            // 숫자 없이 짧은 항목도 재료로 간주
            let simpleName = ingredientItem.replace(/[:\-•·]/g, '').trim();
            
            // 해시태그, URL, 이모지 제거
            simpleName = simpleName.replace(/#\w+/g, '').replace(/https?:\/\/[^\s]+/g, '').replace(/[🔗📌⭐👍❤️💬]/g, '').trim();
            
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

export default function AddRecipeModal({ isOpen, onClose, onAdd, initialRecipe }: AddRecipeModalProps) {
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [color, setColor] = useState<string | undefined>(initialRecipe?.color || undefined);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  
  // 모달이 열릴 때 initialRecipe의 색상으로 초기화
  useEffect(() => {
    if (isOpen && initialRecipe) {
      setColor(initialRecipe.color || undefined);
    } else if (isOpen && !initialRecipe) {
      setColor(undefined);
    }
  }, [isOpen, initialRecipe]);
  
  // 재고 정보 가져오기
  const inventory = useAppStore((state) => state.inventory);
  
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
        
        const rawContent = [
          `제목: ${info.title || '없음'}`,
          `설명: ${info.description || '없음'}`,
          `고정댓글: ${info.pinnedComment || '없음'}`
        ].join('\n\n');
        setYoutubeRawContent(rawContent);
        if (info.title) setDescription(info.title);
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

  // 레시피 텍스트가 바뀌면(유튜브 로드 또는 직접 입력) 디바운스 후 자동 추출
  useEffect(() => {
    const raw = youtubeRawContent.trim();
    if (raw.length < 30) return;

    const timer = setTimeout(async () => {
      setIsLoadingRecipe(true);
      try {
        const result = await cleanRecipeTextWithGemini(raw);
        if (result.name && result.name.trim()) {
          setName(result.name.trim());
          nameExtractedRef.current = true;
        }
        if (result.color) setColor(result.color);

        let ingredients: Ingredient[] = [];
        let steps: RecipeStep[] = [];
        if (result.recipe && result.recipe.trim()) {
          const recipeParseResult = parseRecipeFromText(`[레시피]\n${result.recipe}`);
          ingredients = recipeParseResult.ingredients;
        }
        if (result.method && result.method.trim()) {
          const methodParseResult = parseRecipeFromText(`[조리방법]\n${result.method}`);
          steps = methodParseResult.steps;
        }
        if (ingredients.length === 0 && steps.length === 0 && result.cleanedText?.trim()) {
          const fallback = parseRecipeFromText(result.cleanedText);
          ingredients = fallback.ingredients;
          steps = fallback.steps;
        }
        if (ingredients.length > 0 || steps.length > 0) {
          const withCategory = ingredients.map((ing) => ({
            ...ing,
            category: ing.category || getIngredientCategory(ing.name),
          }));
          setExtractedIngredients(withCategory);
          setExtractedSteps(steps);
        }
      } catch (err) {
        console.error('레시피 텍스트 자동 추출 오류:', err);
      } finally {
        setIsLoadingRecipe(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [youtubeRawContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 인분 기준 입력값과 관계없이 항상 1인분 기준으로 저장
    const newRecipe: Recipe = {
      id: isEditMode ? initialRecipe!.id : Date.now().toString(),
      name,
      description: '', // 설명칸 제거로 항상 빈 문자열
      category,
      color: color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : undefined,
      targetServings: 1,
      baseServings: typeof baseServings === 'number' ? baseServings : 1,
      ingredients: extractedIngredients.map(ing => ({
        ...ing,
        quantity: (ing.quantity ?? 0) as number
      })),
      steps: extractedSteps,
      images: initialRecipe?.images || [],
      videos: youtubeUrl ? [youtubeUrl] : [],
      notes: initialRecipe?.notes || '',
      createdAt: isEditMode ? initialRecipe!.createdAt : new Date(),
      updatedAt: new Date(),
      history: initialRecipe?.history || [],
    };

    onAdd(newRecipe);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
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
              {/* 요리 색 (메뉴/도시락 색조합 표시용) */}
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-gray-600 whitespace-nowrap">요리 색</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: '빨강', hex: '#FFB3BA' }, // 고추장, 고춧가루
                    { name: '주황', hex: '#FFDFBA' }, // 당근, 호박
                    { name: '노랑', hex: '#FFFFBA' }, // 계란, 옥수수
                    { name: '초록', hex: '#BAFFC9' }, // 시금치, 쑥
                    { name: '갈색', hex: '#D4A574' }, // 된장, 간장
                    { name: '보라', hex: '#E6CCFF' }, // 가지
                    { name: '흰색', hex: '#FFFFFF' }, // 밥, 두부
                    { name: '검정', hex: '#D3D3D3' }, // 검은깨
                  ].map((colorOption) => (
                    <button
                      key={colorOption.hex}
                      type="button"
                      onClick={() => setColor(color === colorOption.hex ? undefined : colorOption.hex)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        color === colorOption.hex
                          ? 'ring-2 ring-[#4D99CC] ring-offset-1 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: colorOption.hex,
                        border: colorOption.hex === '#FFFFFF' ? '1px solid #E5E7EB' : 'none'
                      }}
                      title={colorOption.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 레시피 정보 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  레시피 정보
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">이 요리를</span>
                  <input
                    type="number"
                    value={baseServings}
                    onChange={(e) => setBaseServings(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    min={1}
                    className="w-12 px-2 py-1 text-center border-2 border-[#4D99CC] bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC] text-sm appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder=""
                  />
                  <span className="text-sm text-gray-700">인분으로 설정합니다.</span>
                </div>
              </div>
              {/* 재료 목록 */}
              {extractedIngredients.length > 0 && (
                <div className="flex flex-col gap-3 mb-3">
                  {extractedIngredients.map((ing) => {
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
                        className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 min-w-0"
                      >
                        {/* 카테고리 뱃지 (재료 탭과 동일한 스타일) - 클릭 가능, 고정 크기 */}
                        <div className="relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              try {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingCategoryId(editingCategoryId === ing.id ? null : ing.id);
                              } catch (error) {
                                console.error('카테고리 편집 시작 오류:', error);
                              }
                            }}
                            className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${getCategoryColor(category)}`}
                          >
                            {category}
                          </button>
                          {editingCategoryId === ing.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[80px]">
                              {(['육류', '채소', '조미료', '곡물', '기타'] as IngredientCategory[]).map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={(e) => {
                                    try {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const updatedIngredients = extractedIngredients.map((i) =>
                                        i.id === ing.id
                                          ? { ...i, category: cat }
                                          : i
                                      );
                                      setExtractedIngredients(updatedIngredients);
                                      setEditingCategoryId(null);
                                    } catch (error) {
                                      console.error('카테고리 변경 오류:', error);
                                      setEditingCategoryId(null);
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                                    category === cat ? 'bg-blue-50 text-[#4D99CC]' : 'text-gray-700'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* 재료명 입력 - 반응형, 최소 너비 설정 */}
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updatedIngredients = extractedIngredients.map((i) => {
                              if (i.id === ing.id) {
                                // 재료명이 변경되면 자동으로 적절한 단위 설정
                                return { ...i, name: newName, unit: DEFAULT_UNIT };
                              }
                              return i;
                            });
                            setExtractedIngredients(updatedIngredients);
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC]"
                          placeholder="재료명"
                        />
                        {/* 수량 입력 - 반응형, 최소/최대 너비 설정, 스피너 제거 */}
                        <input
                          type="number"
                          value={ing.quantity ?? ''}
                          onChange={(e) => {
                            const updatedIngredients: typeof extractedIngredients = extractedIngredients.map((i) =>
                              i.id === ing.id
                                ? { ...i, quantity: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) }
                                : i
                            );
                            setExtractedIngredients(updatedIngredients);
                          }}
                          className="w-16 sm:w-20 px-2 py-1.5 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#4D99CC] text-sm flex-shrink-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          min="0"
                          step="0.1"
                        />
                        <span className="text-sm text-gray-600 flex-shrink-0 w-6">g</span>
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
              )}
              {/* 재료 추가 버튼 - 항상 표시 (수정 모드에서도 명확하게 보이도록) */}
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

            {/* 유튜브 링크 */}
            <div className="mb-4">
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

            {/* 레시피 텍스트 - 입력하면 위 항목 자동 채움 */}
            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <label className="block text-sm font-bold text-gray-800 mb-2">
                레시피 텍스트
              </label>
              <div className="bg-white p-3 rounded border border-blue-200">
                <textarea
                  value={youtubeRawContent}
                  onChange={(e) => setYoutubeRawContent(e.target.value)}
                  rows={11}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white font-mono text-xs"
                  placeholder="유튜브 링크 입력 시 자동 채워지거나, 여기에 레시피 원문을 붙여넣으면 이름·재료·조리방법이 자동으로 채워집니다."
                />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-600">
                <span>내용 길이: {youtubeRawContent.length}자</span>
                <span>상태: {youtubeRawContent ? '✅ 데이터 있음' : '❌ 데이터 없음'}</span>
              </div>
            </div>

          </form>
        </div>
        
        {/* 제미나이 플로팅 버튼 */}
        <button
          type="button"
          onClick={() => setIsGeminiChatOpen(true)}
          className="absolute right-6 w-14 h-14 bg-white rounded-full hover:scale-110 transition-all flex items-center justify-center z-10"
          style={{ 
            bottom: '69px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
          title="제미나이와 대화하기"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* AI 챗봇 아이콘 - 말풍선 형태 */}
            <path 
              d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" 
              fill="#4285F4"
            />
            <circle cx="9" cy="9" r="1" fill="#FFFFFF"/>
            <circle cx="12" cy="9" r="1" fill="#FFFFFF"/>
            <circle cx="15" cy="9" r="1" fill="#FFFFFF"/>
          </svg>
        </button>

        {/* 제미나이 채팅 모달 */}
        <GeminiChatModal
          isOpen={isGeminiChatOpen}
          onClose={() => setIsGeminiChatOpen(false)}
        />
        
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
