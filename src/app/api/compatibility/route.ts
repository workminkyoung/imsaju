/**
 * 궁합 계산 API.
 *
 * 개인 만세력과 마찬가지로 LLM을 쓰지 않는다.
 * 응답에서는 생년월일 원문을 빼고 간지와 분석만 내보낸다.
 */

import { NextResponse } from 'next/server';
import { loadAndCompute, toPublicChart } from '@/lib/compatibilityRequest';
import { ValidationError } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { a, b, chartA, chartB, compatibility, relationship } = await loadAndCompute(
      await request.json(),
    );
    return NextResponse.json({
      chartA: toPublicChart(chartA),
      chartB: toPublicChart(chartB),
      names: { a: a.label, b: b.label },
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
