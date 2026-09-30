/**
 * 관리자 프롬프트 편집 API.
 *
 * 개인 사주풀이와 궁합 풀이 두 종류를 다룬다. 어느 쪽인지는 `kind` 로 받는다.
 * 조회·저장·초기화·테스트 실행 전부 인증이 필요하다.
 */

import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/adminAuth';
import { GeminiNotConfiguredError, GeminiUnavailableError, generateText } from '@/lib/gemini';
import {
  PROMPT_KINDS,
  PROMPT_KIND_LABEL,
  PROMPT_VARIABLES,
  SYSTEM_INSTRUCTIONS,
  buildCompatibilityVariables,
  buildVariables,
  hasEnvOverride,
  promptStorageInfo,
  isPromptKind,
  loadDefaultPrompt,
  loadPrompt,
  renderPrompt,
  resetPrompt,
  savePrompt,
  type PromptKind,
} from '@/lib/prompt';
import { findRelationship } from '@/lib/relationship';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** 미리보기·테스트에 쓰는 표본 */
const SAMPLE_A = {
  name: '김만세', calendar: 'solar' as const, year: 1990, month: 3, day: 15,
  hour: 13, minute: 20, gender: 'male' as const, city: '서울',
};
const SAMPLE_B = {
  name: '이사주', calendar: 'solar' as const, year: 1985, month: 8, day: 2,
  hour: 7, minute: 45, gender: 'female' as const, city: '부산',
};
const SAMPLE_RELATIONSHIP = 'boss-b';

const unauthorized = () => NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

/** 쿼리스트링이나 본문에서 kind 를 읽는다. 없으면 개인 사주풀이. */
function kindOf(request: Request, body?: Record<string, unknown>): PromptKind {
  const fromBody = body?.kind;
  if (isPromptKind(fromBody)) return fromBody;
  const fromQuery = new URL(request.url).searchParams.get('kind');
  return isPromptKind(fromQuery) ? fromQuery : 'reading';
}

/** 편집 중인 템플릿에 표본 데이터를 끼워 넣는다. */
function renderSample(kind: PromptKind, template: string): string {
  if (kind === 'compatibility') {
    const chartA = computeSaju(SAMPLE_A);
    const chartB = computeSaju(SAMPLE_B);
    const relationship = findRelationship(SAMPLE_RELATIONSHIP)!;
    return renderPrompt(
      template,
      buildCompatibilityVariables(chartA, chartB, computeCompatibility(chartA, chartB), relationship),
    );
  }
  return renderPrompt(template, buildVariables(computeSaju(SAMPLE_A)));
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const kind = kindOf(request);

  return NextResponse.json({
    kind,
    kinds: PROMPT_KINDS.map((k) => ({ id: k, label: PROMPT_KIND_LABEL[k] })),
    template: await loadPrompt(kind),
    defaultTemplate: loadDefaultPrompt(kind),
    systemInstruction: SYSTEM_INSTRUCTIONS[kind],
    variables: PROMPT_VARIABLES[kind],
    envOverride: hasEnvOverride(kind),
    // 저장이 오래 남는 환경인지 화면에서 알려 줘야 한다.
    storage: promptStorageInfo(),
  });
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = (await request.json()) as Record<string, unknown>;
  const kind = kindOf(request, body);

  if (typeof body.template !== 'string' || body.template.trim().length === 0) {
    return NextResponse.json({ error: '프롬프트가 비어 있습니다.' }, { status: 400 });
  }
  if (body.template.length > 50_000) {
    return NextResponse.json({ error: '프롬프트가 너무 깁니다 (5만 자 제한).' }, { status: 400 });
  }

  return NextResponse.json(await savePrompt(kind, body.template));
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const kind = kindOf(request);
  await resetPrompt(kind);
  return NextResponse.json({ ok: true, template: loadDefaultPrompt(kind) });
}

/**
 * 미리보기(변수 치환 결과)와 테스트 실행(실제 Gemini 호출).
 * 편집 중인 템플릿을 그대로 받아 저장 전에도 확인할 수 있게 한다.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = (await request.json()) as Record<string, unknown>;
  const kind = kindOf(request, body);
  const template = typeof body.template === 'string' ? body.template : await loadPrompt(kind);

  const rendered = renderSample(kind, template);

  // 치환되지 않은 변수는 오타일 가능성이 높으니 짚어 준다.
  const unknownVariables = [...rendered.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);

  if (body.run !== true) {
    return NextResponse.json({ rendered, unknownVariables });
  }

  try {
    const { model, text, finishReason } = await generateText(rendered, {
      systemInstruction: SYSTEM_INSTRUCTIONS[kind],
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
