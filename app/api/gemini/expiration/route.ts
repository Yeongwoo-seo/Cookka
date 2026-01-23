import { NextRequest, NextResponse } from 'next/server';

// Gemini API를 사용하여 재고명에 따른 일반적인 유통기한 계산
export async function POST(request: NextRequest) {
  try {
    const { itemName } = await request.json();

    if (!itemName || typeof itemName !== 'string') {
      return NextResponse.json({ error: 'itemName is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    // Gemini API 호출 - 유통기한 계산
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `다음 재고 항목의 일반적인 유통기한을 일(day) 단위로 계산해주세요. 숫자만 반환해주세요.

재고명: ${itemName}

예시:
- 밥/쌀: 365일
- 김치: 30일
- 양파: 14일
- 고기: 3일
- 우유: 7일

숫자만 반환해주세요 (예: 30).`
            }],
          }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 응답 실패:', response.status, errorText);
      return NextResponse.json(
        { error: '유통기한 계산 실패' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // 숫자만 추출
    const daysMatch = text.match(/(\d+)/);
    const expirationDays = daysMatch ? parseInt(daysMatch[1], 10) : null;

    if (!expirationDays || expirationDays <= 0) {
      return NextResponse.json(
        { error: '유효한 유통기한을 계산할 수 없습니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ expirationDays });
  } catch (error) {
    console.error('유통기한 계산 오류:', error);
    return NextResponse.json(
      { error: '유통기한 계산 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
