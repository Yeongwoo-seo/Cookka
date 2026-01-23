import { NextRequest, NextResponse } from 'next/server';

// Gemini API를 사용하여 레시피 텍스트를 구조화된 형식으로 변환
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    // Gemini API 호출 - 최신 모델 사용 (gemini-1.5-flash는 2025년 9월 종료됨)
    // gemini-2.5-flash (안정 버전) 또는 gemini-3-flash-preview 사용
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `다음 텍스트를 분석하여 요리 이름을 추출하고, 레시피 형식으로 변환해주세요. 반드시 JSON 형식으로만 반환해주세요.

입력 텍스트:
${text}

다음 JSON 형식으로 반환해주세요 (추가 설명이나 텍스트 없이 JSON만):
{
  "name": "요리이름",
  "recipe": "[레시피]\\n재료1 수량단위\\n재료2 수량단위\\n...",
  "method": "[조리방법]\\n1. 첫 번째 단계\\n2. 두 번째 단계\\n..."
}

중요 사항:
1. 요리 이름(name)은 반드시 추출해야 합니다. 텍스트의 제목, 설명, 댓글을 모두 분석하여 가장 적절한 한국 요리 이름을 추출해주세요.
2. 예시: "제육볶음", "된장찌개", "김치찌개", "어묵볶음", "콩나물무침", "계란찜", "시금치나물", "미역국", "콩자반" 등
3. name 필드는 반드시 채워야 하며, 빈 문자열이면 안 됩니다.
4. 재료는 "재료명 수량단위" 형식으로 정리하고, 조리방법은 번호를 매겨서 정리해주세요.
5. 결과는 반드시 JSON 형식만 반환하고, 추가 설명이나 텍스트는 포함하지 마세요.`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        }),
      }
    );

    // gemini-2.5-flash 실패 시 gemini-3-flash-preview 시도
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error (gemini-2.5-flash):', errorData);
      
      if (response.status === 404) {
        console.log('gemini-2.5-flash 실패, gemini-3-flash-preview 시도');
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `다음 텍스트를 분석하여 요리 이름을 추출하고, 레시피 형식으로 변환해주세요. 반드시 JSON 형식으로만 반환해주세요.

입력 텍스트:
${text}

다음 JSON 형식으로 반환해주세요 (추가 설명이나 텍스트 없이 JSON만):
{
  "name": "요리이름",
  "recipe": "[레시피]\\n재료1 수량단위\\n재료2 수량단위\\n...",
  "method": "[조리방법]\\n1. 첫 번째 단계\\n2. 두 번째 단계\\n..."
}

중요 사항:
1. 요리 이름(name)은 반드시 추출해야 합니다. 텍스트의 제목, 설명, 댓글을 모두 분석하여 가장 적절한 한국 요리 이름을 추출해주세요.
2. 예시: "제육볶음", "된장찌개", "김치찌개", "어묵볶음", "콩나물무침", "계란찜", "시금치나물", "미역국", "콩자반" 등
3. name 필드는 반드시 채워야 하며, 빈 문자열이면 안 됩니다.
4. 재료는 "재료명 수량단위" 형식으로 정리하고, 조리방법은 번호를 매겨서 정리해주세요.
5. 결과는 반드시 JSON 형식만 반환하고, 추가 설명이나 텍스트는 포함하지 마세요.`
                }]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
              }
            }),
          }
        );
        
        if (!response.ok) {
          const fallbackError = await response.text();
          console.error('Gemini API error (gemini-3-flash-preview):', fallbackError);
          
          // 마지막 시도: gemini-2.5-pro (안정 버전)
          if (response.status === 404) {
            console.log('gemini-3-flash-preview도 실패, gemini-2.5-pro 시도');
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: `다음 텍스트를 분석하여 요리 이름을 추출하고, 레시피 형식으로 변환해주세요. 반드시 JSON 형식으로만 반환해주세요.

입력 텍스트:
${text}

다음 JSON 형식으로 반환해주세요 (추가 설명이나 텍스트 없이 JSON만):
{
  "name": "요리이름",
  "recipe": "[레시피]\\n재료1 수량단위\\n재료2 수량단위\\n...",
  "method": "[조리방법]\\n1. 첫 번째 단계\\n2. 두 번째 단계\\n..."
}

중요 사항:
1. 요리 이름(name)은 반드시 추출해야 합니다. 텍스트의 제목, 설명, 댓글을 모두 분석하여 가장 적절한 한국 요리 이름을 추출해주세요.
2. 예시: "제육볶음", "된장찌개", "김치찌개", "어묵볶음", "콩나물무침", "계란찜", "시금치나물", "미역국", "콩자반" 등
3. name 필드는 반드시 채워야 하며, 빈 문자열이면 안 됩니다.
4. 재료는 "재료명 수량단위" 형식으로 정리하고, 조리방법은 번호를 매겨서 정리해주세요.
5. 결과는 반드시 JSON 형식만 반환하고, 추가 설명이나 텍스트는 포함하지 마세요.`
                    }]
                  }],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                  }
                }),
              }
            );
            
            if (!response.ok) {
              const finalError = await response.text();
              console.error('Gemini API error (v1 gemini-pro):', finalError);
              throw new Error(`모든 Gemini 모델 시도 실패. API 키를 확인하거나 Google AI Studio에서 모델 접근 권한을 확인해주세요. 참고: gemini-1.5-flash와 gemini-1.5-pro는 2025년 9월에 종료되었습니다.`);
            }
          } else {
            throw new Error(`Gemini API error: ${response.status}`);
          }
        }
      } else {
        throw new Error(`Gemini API error: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Gemini API 원본 응답:', JSON.stringify(data, null, 2));
    
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
          // 파싱 실패 시 빈 객체로 초기화
          recipeData = {
            name: '',
            recipe: generatedText,
            method: '',
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
      };
    }
    
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
      if (!recipeData.name || !recipeData.name.trim()) {
        const firstLine = recipeData.recipe.split('\n')[0];
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
    console.log('최종 반환할 이름:', finalName || '없음');
    
    return NextResponse.json({
      name: finalName,
      cleanedText,
      recipe: recipeData.recipe || '',
      method: recipeData.method || '',
    });
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    console.error('에러 상세:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to process with Gemini API', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
