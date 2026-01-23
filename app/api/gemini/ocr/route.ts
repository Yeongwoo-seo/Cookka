import { NextRequest, NextResponse } from 'next/server';

// Gemini API를 사용하여 이미지에서 텍스트 추출 (OCR)
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    // Base64 이미지에서 데이터 URL 제거 (있는 경우)
    const base64Image = image.includes(',') ? image.split(',')[1] : image;

    // Gemini API 호출 - 이미지에서 텍스트 추출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                text: `이 이미지에서 재고 정보를 추출해주세요. 다음 정보를 찾아서 텍스트로 반환해주세요:
- 재고명 (상품명)
- 수량과 단위 (예: 10kg, 5개)
- 가격 (원 단위)

이미지에 보이는 모든 텍스트를 그대로 반환해주세요.`
              },
            ],
          }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 응답 실패:', response.status, errorText);
      return NextResponse.json(
        { error: 'OCR 처리 실패' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Gemini 응답에서 텍스트 추출
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ text });
  } catch (error) {
    console.error('OCR 처리 오류:', error);
    return NextResponse.json(
      { error: 'OCR 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
