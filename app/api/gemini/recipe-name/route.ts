import { NextRequest, NextResponse } from 'next/server';

// Gemini API를 사용하여 레시피 이름 생성
export async function POST(request: NextRequest) {
  try {
    const { title, description, pinnedComment } = await request.json();

    if (!title && !description && !pinnedComment) {
      return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    // YouTube 정보를 조합
    const context = [
      title ? `제목: ${title}` : '',
      description ? `설명: ${description}` : '',
      pinnedComment ? `고정 댓글: ${pinnedComment}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Gemini API 호출 - 최신 모델 사용 (gemini-1.5-flash는 2025년 9월 종료됨)
    // gemini-2.5-flash (안정 버전) 사용
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
              text: `다음 YouTube 비디오 정보를 바탕으로 전체 컨텍스트를 분석하여 가장 적절한 한국 요리 레시피 이름을 추천해주세요.

${context}

위 정보의 제목, 설명, 고정 댓글을 모두 종합적으로 분석하여:
1. 실제로 어떤 요리인지 파악
2. 한국 요리 이름으로 간단하고 명확하게 표현
3. 예: "제육볶음", "된장찌개", "김치찌개", "콩나물무침", "어묵볶음" 등

반드시 요리 이름 하나만 반환해주세요. 설명이나 추가 텍스트 없이 요리 이름만 답변해주세요.`
            }]
          }],
          generationConfig: {
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
                  text: `다음 YouTube 비디오 정보를 바탕으로 전체 컨텍스트를 분석하여 가장 적절한 한국 요리 레시피 이름을 추천해주세요.

${context}

위 정보의 제목, 설명, 고정 댓글을 모두 종합적으로 분석하여:
1. 실제로 어떤 요리인지 파악
2. 한국 요리 이름으로 간단하고 명확하게 표현
3. 예: "제육볶음", "된장찌개", "김치찌개", "콩나물무침", "어묵볶음" 등

반드시 요리 이름 하나만 반환해주세요. 설명이나 추가 텍스트 없이 요리 이름만 답변해주세요.`
                }]
              }],
              generationConfig: {
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
                      text: `다음 YouTube 비디오 정보를 바탕으로 전체 컨텍스트를 분석하여 가장 적절한 한국 요리 레시피 이름을 추천해주세요.

${context}

위 정보의 제목, 설명, 고정 댓글을 모두 종합적으로 분석하여:
1. 실제로 어떤 요리인지 파악
2. 한국 요리 이름으로 간단하고 명확하게 표현
3. 예: "제육볶음", "된장찌개", "김치찌개", "콩나물무침", "어묵볶음" 등

반드시 요리 이름 하나만 반환해주세요. 설명이나 추가 텍스트 없이 요리 이름만 답변해주세요.`
                    }]
                  }],
                  generationConfig: {
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
    
    // Gemini 응답에서 텍스트 추출
    const generatedName = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // 불필요한 공백이나 설명 제거
    let cleanedName = generatedName
      .trim()
      .replace(/^레시피\s*이름[:\s]*/i, '')
      .replace(/^추천[:\s]*/i, '')
      .replace(/^요리\s*이름[:\s]*/i, '')
      .replace(/^이름[:\s]*/i, '')
      .replace(/^답변[:\s]*/i, '')
      .replace(/^결과[:\s]*/i, '')
      .split('\n')[0] // 첫 줄만 사용
      .split('.')[0] // 첫 문장만 사용
      .split(',')[0] // 첫 항목만 사용
      .replace(/["'`]/g, '') // 따옴표 제거
      .trim();
    
    // 한글 요리 이름 패턴 확인 (2-10자 한글)
    const koreanRecipeNameMatch = cleanedName.match(/[가-힣]{2,10}/);
    if (koreanRecipeNameMatch) {
      cleanedName = koreanRecipeNameMatch[0];
    }

    return NextResponse.json({
      name: cleanedName || title || '레시피',
    });
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate recipe name', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
