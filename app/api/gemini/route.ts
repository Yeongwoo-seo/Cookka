import { NextRequest, NextResponse } from 'next/server';

// Gemini API를 사용하여 레시피 텍스트를 구조화된 형식으로 변환
export async function POST(request: NextRequest) {
  let text = '';
  try {
    const body = await request.json();
    text = body.text || '';

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    console.log('=== 📥 Gemini API로 전달되는 원본 텍스트 ===');
    console.log('텍스트 길이:', text.length, '자');
    console.log('텍스트 전체 내용:');
    console.log(text);
    console.log('=== 원본 텍스트 끝 ===\n');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY가 환경 변수에 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'Gemini API key is not configured', details: 'GEMINI_API_KEY 환경 변수를 확인해주세요.' },
        { status: 500 }
      );
    }

    console.log('🔑 Gemini API 키 확인됨:', {
      length: apiKey.length,
      prefix: apiKey.substring(0, 10) + '...',
      suffix: '...' + apiKey.substring(apiKey.length - 5)
    });

    // Gemini API 호출 - 안정적인 모델부터 시도
    // 표준 모델 이름 사용
    const models = [
      'gemini-1.5-flash',  // 가장 빠르고 안정적
      'gemini-1.5-pro',    // 더 정확한 결과
    ];

    let response: Response | null = null;
    let lastError: string = '';
    let usedModel = '';

    for (const model of models) {
      try {
        console.log(`🔄 ${model} 모델 시도 중...`);
        usedModel = model;
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `제공되는 [Input Text]는 유튜브 설명란에서 가져온 원본 데이터로, HTML 태그, 영어 번역, 이모지, 해시태그 등이 섞여 있습니다.

이 텍스트를 분석하여 다음 [Output Format]에 맞춰 한국어로 깔끔하게 정리해 주세요.

[Input Text]
${text}

[요구사항]
1. 불필요한 HTML 태그(<br> 등), 영어 번역문, 해시태그(#shorts 등), 인사말은 모두 제거하십시오.
2. '[재료]' 섹션에는 고기, 채소, 양념 등 모든 식재료와 분량을 쉼표(,)로 구분하여 나열하십시오.
3. '[레시피]' 섹션에는 조리 과정을 논리적인 순서대로 1, 2, 3... 번호를 매겨 서술형으로 작성하십시오.
4. 문체는 "~합니다", "~하세요"와 같은 정중하고 명확한 요리책 스타일을 유지하십시오.
5. 재료인지 판단: 실제 요리에 사용되는 식재료만 포함하세요. 조리 방법 설명이나 동작은 재료가 아닙니다.
   - 재료가 아닌 것의 예시: "고기 재우는 동안", "버무려서", "넣고", "시켜요", "하는 동안 같이 숙성을 시켜요" 등
   - 재료인 것의 예시: "돼지고기 300g", "양파 1개", "고추장 2큰술", "마늘 1스푼" 등

[Output Format]
반드시 다음 JSON 형식으로만 반환하세요 (추가 설명이나 텍스트 없이 JSON만):
{
  "name": "요리이름",
  "color": "#hex6자리",
  "recipe": "(재료명) (분량), (재료명) (분량), ...",
  "method": "1. (첫 번째 조리 과정)\\n2. (두 번째 조리 과정)\\n..."
}

중요 사항:
- name 필드: 텍스트의 제목, 설명, 댓글을 모두 분석하여 가장 적절한 한국 요리 이름을 추출하세요. 예시: "제육볶음", "된장찌개", "김치찌개" 등
- color 필드: 이 요리를 대표하는 색의 hex 코드 하나 (예: 카레=#F59E0B, 김치찌개=#DC2626, 밥=#FBBF24). 반드시 #으로 시작하는 6자리 hex만.
- recipe 필드: 재료를 쉼표(,)로 구분하여 나열하세요. 예시: "돼지고기 300g, 양파 1개, 고추장 2큰술, 마늘 1스푼"
- method 필드: 조리 과정을 번호를 매겨서 서술형으로 작성하세요. 예시: "1. 고기를 준비합니다.\\n2. 양파를 썹니다.\\n3. 양념장을 만듭니다."
- 결과는 반드시 JSON 형식만 반환하고, 추가 설명이나 텍스트는 포함하지 마세요.`
                }]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
              }
            }),
          }
        );

        if (response.ok) {
          console.log(`✅ ${model} 모델 성공!`);
          break; // 성공하면 루프 종료
        } else {
          const errorText = await response.text();
          lastError = `모델 ${model}: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`;
          console.error(`❌ ${model} 모델 실패:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText.substring(0, 200)
          });
          response = null; // 다음 모델 시도를 위해 null로 설정
        }
      } catch (error) {
        lastError = `모델 ${model}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${model} 모델 예외 발생:`, error);
        response = null;
      }
    }

    if (!response || !response.ok) {
      console.warn('⚠️ 모든 Gemini 모델 시도 실패:', lastError);
      
      // 모든 에러에 대해 조용히 fallback 처리 (사용자 경험 개선)
      console.warn('⚠️ Gemini API 호출 실패 - fallback으로 처리 (원본 텍스트 반환)');
      return NextResponse.json({
        name: '',
        cleanedText: text, // 원본 텍스트 반환
        recipe: '',
        method: '',
      });
    }

    const data = await response.json();
    console.log('=== 📤 Gemini API 원본 응답 ===');
    console.log('사용된 모델:', usedModel);
    console.log('응답 데이터:', JSON.stringify(data, null, 2));
    console.log('=== Gemini API 원본 응답 끝 ===\n');
    
    // Gemini 응답에서 텍스트 추출
    // responseMimeType이 application/json이면 직접 JSON 객체가 반환될 수 있음
    let generatedText = '';
    let directJsonData = null;
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      // 일반 텍스트 응답
      generatedText = data.candidates[0].content.parts[0].text;
      console.log('Gemini 생성 텍스트 (텍스트 형식):', generatedText);
    } else if (data.candidates?.[0]?.content?.parts?.[0]) {
      // JSON 형식 응답일 수 있음
      const part = data.candidates[0].content.parts[0];
      if (part.text) {
        generatedText = part.text;
        console.log('Gemini 생성 텍스트 (JSON 텍스트):', generatedText);
      } else if (typeof part === 'object' && !part.text) {
        // 직접 JSON 객체일 수 있음
        directJsonData = part;
        console.log('Gemini 직접 JSON 응답:', directJsonData);
      }
    }
    
    // JSON 파싱 시도 (responseMimeType이 application/json이면 직접 파싱 가능)
    let recipeData;
    try {
      // 직접 JSON 객체가 있으면 사용
      if (directJsonData) {
        recipeData = directJsonData;
        console.log('✅ 직접 JSON 객체 사용');
      } else {
        // responseMimeType이 application/json이면 이미 JSON 형식으로 반환됨
        let jsonText = generatedText.trim();
        
        // JSON 코드 블록이 있으면 추출 (여러 패턴 시도)
        // 패턴 1: ```json ... ```
        const jsonBlockMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          jsonText = jsonBlockMatch[1];
          console.log('JSON 블록에서 추출');
        }
        
        // 패턴 2: ``` ... ``` (json 없이)
        if (jsonText === generatedText.trim()) {
          const codeBlockMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
            console.log('코드 블록에서 추출');
          }
        }
        
        // 패턴 3: { ... } 직접 매칭 (코드 블록이 없는 경우)
        if (jsonText === generatedText.trim() && !jsonText.startsWith('{')) {
          const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            jsonText = jsonObjectMatch[0];
            console.log('JSON 객체에서 직접 추출');
          }
        }
        
        // JSON 텍스트 정리 (앞뒤 공백 제거)
        jsonText = jsonText.trim();
        console.log('추출된 JSON (처음 200자):', jsonText.substring(0, 200));
        
        try {
          recipeData = JSON.parse(jsonText);
          console.log('✅ JSON 파싱 성공:', {
            name: recipeData.name,
            hasRecipe: !!recipeData.recipe,
            hasMethod: !!recipeData.method
          });
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError);
          recipeData = {
            name: '',
            recipe: generatedText,
            method: '',
            color: undefined,
          };
        }
      }
    } catch (error) {
      console.error('JSON 파싱 예외:', error);
      // 예외 발생 시 빈 객체로 초기화
      recipeData = {
        name: '',
        recipe: generatedText || '',
        method: '',
        color: undefined,
      };
    }

    // recipeData.recipe / method가 없을 수 있으므로 문자열로 정규화
    if (recipeData.recipe == null || typeof recipeData.recipe !== 'string') recipeData.recipe = '';
    if (recipeData.method == null || typeof recipeData.method !== 'string') recipeData.method = '';
    if (recipeData.name == null || typeof recipeData.name !== 'string') recipeData.name = '';
    
    // 이름이 없으면 텍스트에서 추출 시도
    if (!recipeData.name || !recipeData.name.trim()) {
      console.log('이름이 없어서 텍스트에서 추출 시도');
      
      // 방법 1: 원본 입력 텍스트의 첫 줄에서 추출
      const inputLines = text.split('\n').filter(line => line.trim().length > 0);
      for (const line of inputLines) {
        // 한국 요리 이름 패턴 찾기 (2-10자 한글)
        const nameMatch = line.match(/[가-힣]{2,10}/);
        if (nameMatch) {
          const candidate = nameMatch[0];
          // 일반적인 요리 이름인지 확인 (예: 제육볶음, 된장찌개 등)
          if (candidate.length >= 2 && candidate.length <= 10) {
            recipeData.name = candidate;
            console.log('원본 텍스트에서 추출한 이름:', recipeData.name);
            break;
          }
        }
      }
      
      // 방법 2: 레시피 텍스트의 첫 줄에서 추출
      if ((!recipeData.name || !recipeData.name.trim()) && recipeData.recipe && typeof recipeData.recipe === 'string') {
        const firstLine = recipeData.recipe.split('\n')[0] || '';
        const nameMatch = firstLine.match(/[가-힣]{2,10}/);
        if (nameMatch) {
          recipeData.name = nameMatch[0];
          console.log('레시피 텍스트에서 추출한 이름:', recipeData.name);
        }
      }
      
      // 방법 3: 전체 텍스트에서 요리 이름 키워드 찾기
      if (!recipeData.name || !recipeData.name.trim()) {
        const commonRecipeNames = ['제육볶음', '된장찌개', '김치찌개', '어묵볶음', '콩나물무침', '계란찜', '시금치나물', '미역국', '콩자반'];
        for (const recipeName of commonRecipeNames) {
          if (text.includes(recipeName)) {
            recipeData.name = recipeName;
            console.log('키워드에서 찾은 이름:', recipeData.name);
            break;
          }
        }
      }
    } else {
      console.log('✅ Gemini에서 추출된 레시피 이름:', recipeData.name);
    }
    
    // 최종적으로 이름이 없으면 빈 문자열이 아닌 null 반환
    if (!recipeData.name || !recipeData.name.trim()) {
      console.log('⚠️ 최종적으로 이름을 찾지 못함');
      recipeData.name = '';
    }

    // 정제된 텍스트 조합
    const cleanedText = [
      recipeData.recipe || '',
      recipeData.method || '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const finalName = recipeData.name && recipeData.name.trim() ? recipeData.name.trim() : '';
    const colorHex = recipeData.color && /^#[0-9A-Fa-f]{6}$/.test(String(recipeData.color).trim()) ? String(recipeData.color).trim() : undefined;
    
    const finalResponse = {
      name: finalName,
      color: colorHex || undefined,
      cleanedText,
      recipe: recipeData.recipe || '',
      method: recipeData.method || '',
    };
    
    console.log('=== ✅ 최종 반환 데이터 ===');
    console.log('이름:', finalName || '없음');
    console.log('재료 정보 길이:', finalResponse.recipe.length, '자');
    console.log('조리방법 길이:', finalResponse.method.length, '자');
    console.log('정제된 텍스트 길이:', finalResponse.cleanedText.length, '자');
    console.log('\n재료 정보 전체:');
    console.log(finalResponse.recipe);
    console.log('\n조리방법 전체:');
    console.log(finalResponse.method);
    console.log('=== 최종 반환 데이터 끝 ===\n');
    
    return NextResponse.json(finalResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.warn('⚠️ Gemini API 예외 발생 - fallback으로 처리:', {
      message: errorMessage,
      name: error instanceof Error ? error.name : typeof error,
      timestamp: new Date().toISOString()
    });
    
    // 모든 에러에 대해 조용히 fallback 처리 (원본 텍스트 반환)
    // 클라이언트에서 기본 텍스트 정제 함수를 사용하도록 함
    return NextResponse.json({
      name: '',
      color: undefined,
      cleanedText: text || '',
      recipe: '',
      method: '',
    });
  }
}
