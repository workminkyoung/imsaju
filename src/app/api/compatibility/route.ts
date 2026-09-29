/**
 * 궁합 계산 API.
 *
 * 개인 만세력과 마찬가지로 LLM을 쓰지 않는다. Gemini 키가 없어도, 무료 티어가 혼잡해도 동작한다.
 */

import { NextResponse } from 'next/server';
import { parseAndCompute } from '@/lib/compatibilityRequest';
import { ValidationError } from '@/lib/validate';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { chartA, chartB, compatibility, relationship } = parseAndCompute(await request.json());
    return NextResponse.json({
      chartA,
      chartB,
      compatibility,
      relationship: relationship.id,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '궁합을 계산하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
