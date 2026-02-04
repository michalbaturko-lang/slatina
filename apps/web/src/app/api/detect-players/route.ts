import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface DetectionResult {
  numbers: number[];
  confidence: 'high' | 'medium' | 'low';
  raw_response?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { images } = body as { images: string[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided. Expected array of base64 images.' },
        { status: 400 }
      );
    }

    // Limit to max 10 images to control costs
    const limitedImages = images.slice(0, 10);

    // Build messages with images for OpenAI Vision
    const imageContents = limitedImages.map((img) => ({
      type: 'image_url' as const,
      image_url: {
        url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`,
        detail: 'high' as const, // Use high detail for better number recognition
      },
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at reading jersey numbers from football/soccer match images.
Your task is to identify jersey numbers on WHITE jerseys of SK Slatina players.
- SK Slatina players wear WHITE jerseys with black numbers
- IGNORE players in colored jerseys (orange, red, blue, etc.) - those are opponents
- Only report numbers you can clearly see
- Numbers are typically 1-15
- Report each unique number only once, even if seen in multiple frames`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Look at these frames from a youth football match. Find all jersey numbers on players wearing WHITE jerseys (SK Slatina team).

Return ONLY a JSON object in this exact format, nothing else:
{"numbers": [1, 2, 3], "confidence": "high"}

Where:
- "numbers" is an array of jersey numbers you found on WHITE jerseys
- "confidence" is "high" if numbers are clearly visible, "medium" if some are unclear, "low" if very hard to read

Remember: ONLY white jerseys, ignore all other colored jerseys.`
              },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 150,
        temperature: 0.1, // Low temperature for more consistent results
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the response
    let result: DetectionResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          numbers: Array.isArray(parsed.numbers) ? parsed.numbers.filter((n: unknown) => typeof n === 'number') : [],
          confidence: parsed.confidence || 'medium',
          raw_response: content,
        };
      } else {
        // Fallback: try to extract numbers manually
        const numberMatches = content.match(/\d+/g);
        result = {
          numbers: numberMatches ? numberMatches.map(Number).filter((n: number) => n >= 1 && n <= 99) : [],
          confidence: 'low',
          raw_response: content,
        };
      }
    } catch {
      result = {
        numbers: [],
        confidence: 'low',
        raw_response: content,
      };
    }

    // Filter to reasonable jersey numbers (1-99)
    result.numbers = [...new Set(result.numbers.filter((n: number) => n >= 1 && n <= 99))].sort((a, b) => a - b);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Detection failed' },
      { status: 500 }
    );
  }
}
