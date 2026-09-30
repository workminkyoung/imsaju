/**
 * 프롬프트 종류.
 *
 * `prompt.ts` 와 `promptStore.ts` 가 서로를 참조하면 순환이 되므로 타입만 여기 둔다.
 */

export const PROMPT_KINDS = ['reading', 'compatibility'] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

export const PROMPT_KIND_LABEL: Record<PromptKind, string> = {
  reading: '개인 사주풀이',
  compatibility: '궁합 풀이',
};

export function isPromptKind(value: unknown): value is PromptKind {
  return typeof value === 'string' && (PROMPT_KINDS as readonly string[]).includes(value);
}
