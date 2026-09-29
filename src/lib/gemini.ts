/**
 * Gemini 클라이언트.
 *
 * 무료 티어에서는 모델 하나를 고정할 수 없다. 실제로 확인한 결과(docs/gemini-findings.md):
 *   - Pro 계열은 429(할당량 초과)로 사실상 사용 불가
 *   - 최신 flash 계열은 503(과부하)이 상시적으로 발생
 *   - lite 계열만 안정적
 *
 * 그래서 품질 높은 순으로 시도하고 실패하면 내려가는 폴백 체인을 쓴다.
 * 방금 실패한 모델은 잠시 건너뛰어, 모든 요청이 같은 대기 비용을 반복해서 물지 않게 한다.
 */

import { GoogleGenAI } from '@google/genai';

/** SDK 청크에서 우리가 쓰는 부분만. */
interface GenerateChunk {
  text?: string;
  candidates?: Array<{ finishReason?: string }>;
}

/** 품질 높은 순. 마지막 두 칸은 가용성 보험이다. */
const DEFAULT_MODEL_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];

/** 503/429 를 낸 모델을 이 시간만큼 건너뛴다. */
const COOLDOWN_MS = 60_000;

const cooldownUntil = new Map<string, number>();

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super('GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 넣어 주세요.');
    this.name = 'GeminiNotConfiguredError';
  }
}

export class GeminiUnavailableError extends Error {
  constructor(public readonly attempts: Array<{ model: string; reason: string }>) {
    super('지금은 Gemini 무료 티어가 혼잡해 사주풀이를 생성할 수 없습니다.');
    this.name = 'GeminiUnavailableError';
  }
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiNotConfiguredError();
  return new GoogleGenAI({ apiKey });
}

/** 환경변수로 모델을 못박으면 체인 대신 그것만 쓴다. */
function modelChain(): string[] {
  const pinned = process.env.GEMINI_MODEL?.trim();
  if (pinned) return [pinned];
  return DEFAULT_MODEL_CHAIN;
}

/** 재시도해도 소용없는 오류인지 (키 무효 등) 판단한다. */
function isPermanent(error: unknown): boolean {
  const msg = String((error as Error)?.message ?? error);
  const code = Number(msg.match(/"code":\s*(\d+)/)?.[1] ?? 0);
  return code === 400 || code === 403;
}

function reasonOf(error: unknown): string {
  const msg = String((error as Error)?.message ?? error);
  const code = Number(msg.match(/"code":\s*(\d+)/)?.[1] ?? 0);
  if (code === 429) return '할당량 초과';
  if (code === 503) return '과부하';
  if (code === 404) return '사용 불가';
  if (code === 400) return '요청 오류';
  if (code === 403) return '권한 없음';
  return msg.slice(0, 80);
}

export interface StreamOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface StreamResult {
  /** 실제로 응답한 모델 */
  model: string;
  stream: AsyncGenerator<string>;
  /**
   * 스트림이 끝난 뒤에 채워진다. 'STOP' 이어야 정상 완주다.
   * 'MAX_TOKENS' 나 'SAFETY' 면 내용이 잘린 것이므로 사용자에게 알려야 한다.
   */
  completion: { finishReason: string | null };
}

/**
 * 프롬프트를 보내고 텍스트를 스트리밍으로 받는다.
 *
 * 첫 청크가 도착해야 그 모델이 실제로 동작한 것이므로, 첫 청크를 받기 전까지는
 * 다음 모델로 넘어갈 수 있다. 첫 청크 이후의 오류는 그대로 올린다.
 */
export async function streamText(prompt: string, options: StreamOptions = {}): Promise<StreamResult> {
  const ai = client();
  const attempts: Array<{ model: string; reason: string }> = [];
  const now = Date.now();

  // 쿨다운 중인 모델은 뒤로 미룬다. 전부 쿨다운이면 원래 순서대로 시도한다.
  const chain = modelChain();
  const ready = chain.filter((m) => (cooldownUntil.get(m) ?? 0) <= now);
  const candidates = ready.length > 0 ? ready : chain;

  for (const model of candidates) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          abortSignal: options.signal,
        },
      });

      // 첫 청크를 받아봐야 이 모델이 실제로 응답하는지 알 수 있다.
      const iterator = stream[Symbol.asyncIterator]();
      const first = await iterator.next();

      cooldownUntil.delete(model);

      const completion: { finishReason: string | null } = { finishReason: null };

      return {
        model,
        completion,
        stream: (async function* () {
          const take = (chunk: GenerateChunk | undefined) => {
            const reason = chunk?.candidates?.[0]?.finishReason;
            if (reason) completion.finishReason = String(reason);
            return chunk?.text;
          };

          const firstText = first.done ? undefined : take(first.value);
          if (firstText) yield firstText;

          try {
            // 여기서 던져진 오류는 삼키지 않는다. 중간에 끊긴 응답을 완성된 것처럼
            // 보여주면 사용자가 잘린 줄 모른다.
            for (;;) {
              const next = await iterator.next();
              if (next.done) break;
              const text = take(next.value);
              if (text) yield text;
            }
          } catch (error) {
            // 스트리밍 도중 끊긴 모델도 쿨다운에 넣는다. 그러지 않으면 사용자가
            // 「다시 생성」을 눌러도 같은 불안정한 모델이 다시 걸린다.
            cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
            throw error;
          }
        })(),
      };
    } catch (error) {
      if (isPermanent(error)) throw error;
      cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
      attempts.push({ model, reason: reasonOf(error) });
    }
  }

  throw new GeminiUnavailableError(attempts);
}

/** 관리자 화면의 프롬프트 테스트용. 스트리밍 없이 한 번에 받는다. */
export async function generateText(
  prompt: string,
  options: StreamOptions = {},
): Promise<{ model: string; text: string; finishReason: string | null }> {
  const { model, stream, completion } = await streamText(prompt, options);
  let text = '';
  for await (const chunk of stream) text += chunk;
  return { model, text, finishReason: completion.finishReason };
}

/** 키가 설정돼 있는지 (UI에서 안내 문구를 띄울지 판단) */
export function isConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
