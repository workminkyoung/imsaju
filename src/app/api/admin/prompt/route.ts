/**
 * 관리자 프롬프트 편집 API.
 *
 * 조회·저장·초기화·테스트 실행. 전부 인증이 필요하다.
 */

import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/adminAuth';
import { GeminiNotConfiguredError, GeminiUnavailableError, generateText } from '@/lib/gemini';
import {
  PROMPT_VARIABLES,
  SYSTEM_INSTRUCTION,
  buildVariables,
  loadDefaultPrompt,
  loadPrompt,
  renderPrompt,
  resetPrompt,
  savePrompt,
} from '@/lib/prompt';
import { computeSaju } from '@/lib/saju';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** 미리보기·테스트에 쓰는 표본 사주 */
const SAMPLE_INPUT = {
  name: '김만세',
  calendar: 'solar' as const,
  year: 1990,
  month: 3,
  day: 15,
  hour: 13,
  minute: 20,
  gender: 'male' as const,
  city: '서울',
};

const unauthorized = () => NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();

  return NextResponse.json({
    template: loadPrompt(),
    defaultTemplate: loadDefaultPrompt(),
    systemInstruction: SYSTEM_INSTRUCTION,
    variables: PROMPT_VARIABLES,
    envOverride: Boolean(process.env.SAJU_PROMPT),
  });
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = (await request.json()) as { template?: unknown };
  if (typeof body.template !== 'string' || body.template.trim().length === 0) {
    return NextResponse.json({ error: '프롬프트가 비어 있습니다.' }, { status: 400 });
  }
  if (body.template.length > 50_000) {
    return NextResponse.json({ error: '프롬프트가 너무 깁니다 (5만 자 제한).' }, { status: 400 });
  }

  return NextResponse.json(savePrompt(body.template));
}

export async function DELETE() {
  if (!(await isAuthenticated())) return unauthorized();
  resetPrompt();
  return NextResponse.json({ ok: true, template: loadDefaultPrompt() });
}

/**
 * 미리보기(변수 치환 결과)와 테스트 실행(실제 Gemini 호출).
 * 편집 중인 템플릿을 그대로 받아 저장 전에도 확인할 수 있게 한다.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = (await request.json()) as { template?: unknown; run?: unknown };
  const template = typeof body.template === 'string' ? body.template : loadPrompt();

  const chart = computeSaju(SAMPLE_INPUT);
  const rendered = renderPrompt(template, buildVariables(chart));

  // 치환되지 않은 변수는 오타일 가능성이 높으니 짚어 준다.
  const unknownVariables = [...rendered.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);

  if (body.run !== true) {
    return NextResponse.json({ rendered, unknownVariables, sample: SAMPLE_INPUT });
  }

  try {
    const { model, text, finishReason } = await generateText(rendered, {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.9,
    });
    return NextResponse.json({
      rendered,
      unknownVariables,
      model,
      result: text,
      // STOP 이 아니면 잘린 결과다. 프롬프트를 고칠 때 이걸 모르면 오판한다.
      interrupted: finishReason && finishReason !== 'STOP' ? finishReason : null,
    });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof GeminiUnavailableError) {
      return NextResponse.json(
        { error: error.message, attempts: error.attempts },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : '테스트 실행에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
