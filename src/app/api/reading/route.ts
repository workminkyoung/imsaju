/**
 * 사주풀이 생성 API (Gemini 스트리밍).
 *
 * 클라이언트가 보낸 만세력을 믿지 않고 입력값으로 서버에서 다시 계산한다.
 * 프롬프트에 들어가는 데이터가 조작되지 않게 하기 위해서다.
 */

import { INTERRUPT_MARKER } from '@/lib/streamMarker';
import {
  GeminiNotConfiguredError,
  GeminiUnavailableError,
  streamText,
} from '@/lib/gemini';
import { SYSTEM_INSTRUCTION, buildVariables, loadPrompt, renderPrompt } from '@/lib/prompt';
import { computeSaju } from '@/lib/saju';
import { ValidationError, parseSajuInput } from '@/lib/validate';

export const runtime = 'nodejs';
// 상위 모델은 첫 글자까지 수 초가 걸린다. 스트리밍이라 여유를 둔다.
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
    const input = parseSajuInput(await request.json());
    const chart = computeSaju(input);
    prompt = renderPrompt(loadPrompt(), buildVariables(chart));
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    const message = error instanceof Error ? error.message : '만세력을 계산하지 못했습니다.';
    return errorResponse(message, 400);
  }

  try {
    const { model, stream, completion } = await streamText(prompt, {
      systemInstruction: SYSTEM_INSTRUCTION,
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
          // STOP 이 아니면 모델이 스스로 끝낸 게 아니다.
          if (completion.finishReason && completion.finishReason !== 'STOP') {
            interrupted =
              completion.finishReason === 'MAX_TOKENS'
                ? '길이 제한에 걸려 중간에 끊겼습니다.'
                : `생성이 중단되었습니다 (${completion.finishReason}).`;
          }
        } catch {
          // 스트리밍 도중의 오류는 대개 무료 티어 혼잡(503)이다.
          // 조용히 닫으면 잘린 글이 완성된 것처럼 보이므로 반드시 알린다.
          interrupted = '생성 도중 연결이 끊겼습니다. 무료 티어가 혼잡할 때 생깁니다.';
        }

        if (interrupted) {
          // 본문 끝에 표시를 남겨 클라이언트가 중단을 알아채게 한다.
          controller.enqueue(encoder.encode(`${INTERRUPT_MARKER}${interrupted}`));
        }
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        // 어떤 모델이 실제로 답했는지 화면에 표시한다.
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
        '지금은 Gemini 무료 티어가 혼잡해 사주풀이를 생성할 수 없습니다. 만세력은 정상 계산되었으니 잠시 후 풀이만 다시 시도해 주세요.',
        503,
        { attempts: error.attempts },
      );
    }
    const message = error instanceof Error ? error.message : '사주풀이 생성에 실패했습니다.';
    return errorResponse(message, 502);
  }
}
