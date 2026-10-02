/**
 * 궁합 풀이 생성 API (Gemini 스트리밍).
 *
 * 구조는 /api/reading 과 같다. 폴백 체인·쿨다운·중단 표시를 그대로 쓴다.
 */

import { INTERRUPT_MARKER } from '@/lib/streamMarker';
import { loadAndCompute } from '@/lib/compatibilityRequest';
import {
  GeminiNotConfiguredError,
  GeminiUnavailableError,
  streamText,
} from '@/lib/gemini';
import {
  SYSTEM_INSTRUCTIONS,
  buildCompatibilityVariables,
  loadPrompt,
  renderPrompt,
} from '@/lib/prompt';
import { ValidationError } from '@/lib/validate';

export const runtime = 'nodejs';
export const maxDuration = 120;

function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  let prompt: string;

  try {
    const { chartA, chartB, compatibility, relationship } = await loadAndCompute(await request.json());
    prompt = renderPrompt(
      await loadPrompt('compatibility'),
      buildCompatibilityVariables(chartA, chartB, compatibility, relationship),
    );
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    const message = error instanceof Error ? error.message : '궁합을 계산하지 못했습니다.';
    return errorResponse(message, 400);
  }

  try {
    const { model, stream, completion } = await streamText(prompt, {
      systemInstruction: SYSTEM_INSTRUCTIONS.compatibility,
      temperature: 0.9,
      signal: request.signal,
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let interrupted: string | null = null;
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
          if (completion.finishReason && completion.finishReason !== 'STOP') {
            interrupted =
              completion.finishReason === 'MAX_TOKENS'
                ? '길이 제한에 걸려 중간에 끊겼습니다.'
                : `생성이 중단되었습니다 (${completion.finishReason}).`;
          }
        } catch {
          interrupted = '생성 도중 연결이 끊겼습니다. 무료 티어가 혼잡할 때 생깁니다.';
        }

        if (interrupted) {
          controller.enqueue(encoder.encode(`${INTERRUPT_MARKER}${interrupted}`));
        }
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-gemini-model': model,
      },
    });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      return errorResponse(
        'Gemini API 키가 설정되지 않았습니다. 서버의 .env.local 에 GEMINI_API_KEY 를 넣어 주세요.',
        503,
      );
    }
    if (error instanceof GeminiUnavailableError) {
      return errorResponse(
        '지금은 Gemini 무료 티어가 혼잡해 궁합 풀이를 생성할 수 없습니다. 궁합 계산 결과는 정상이니 잠시 후 풀이만 다시 시도해 주세요.',
        503,
        { attempts: error.attempts },
      );
    }
    const message = error instanceof Error ? error.message : '궁합 풀이 생성에 실패했습니다.';
    return errorResponse(message, 502);
  }
}
