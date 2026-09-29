/**
 * 만세력 계산 API.
 *
 * LLM을 쓰지 않는다. 순수 계산이므로 Gemini 키가 없어도, 무료 티어가 혼잡해도 동작한다.
 */

import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { ValidationError, parseSajuInput } from '@/lib/validate';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const input = parseSajuInput(await request.json());
    return NextResponse.json({ chart: computeSaju(input) });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // 음력 변환 실패처럼 사용자가 고칠 수 있는 오류는 메시지를 그대로 전한다.
    const message = error instanceof Error ? error.message : '만세력을 계산하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
