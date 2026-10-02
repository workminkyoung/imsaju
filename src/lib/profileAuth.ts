/**
 * 카드 수정 인증.
 *
 * 카드 주인만 아는 값이 생년월일이라 그걸 열쇠로 쓴다. 다만 이건 **약한 비밀**이다.
 * 100년 범위라도 유효한 날짜는 36,500개 남짓이라 스크립트로 전부 시도하면 뚫린다.
 * 그래서 시도 횟수를 반드시 제한한다. 제한이 없으면 사실상 잠그지 않은 것과 같다.
 */

import { timingSafeEqual } from 'node:crypto';
import { getProfileStore, type StoredProfile } from './profileStore';

/** 한 카드에 대해 이 시간 동안 이만큼만 시도할 수 있다. */
export const ATTEMPT_LIMIT = 8;
export const ATTEMPT_WINDOW_SECONDS = 10 * 60;

/** 입력에서 숫자만 남긴다. 970304 · 97-03-04 · 97 03 04 를 모두 받는다. */
export function normalizeBirthKey(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 6) return digits;
  // 8자리로 적었으면 뒤 6자리가 YYMMDD 와 같다.
  if (digits.length === 8) return digits.slice(2);
  return null;
}

/** 카드에 저장된 생년월일을 YYMMDD 로. 사용자가 입력한 달력(양/음력) 그대로 비교한다. */
export function birthKeyOf(profile: StoredProfile): string {
  const { year, month, day } = profile.input;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(year % 100)}${pad(month)}${pad(day)}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type VerifyResult =
  | { ok: true; profile: StoredProfile }
  | { ok: false; reason: 'not-found' | 'bad-format' | 'mismatch' | 'throttled' };

/**
 * 생년월일로 카드 주인임을 확인한다.
 *
 * 시도 제한은 카드 단위로 건다. 한 사람이 여러 카드를 노려도 각각 따로 막힌다.
 */
export async function verifyProfileOwner(id: string, birthDate: unknown): Promise<VerifyResult> {
  const key = normalizeBirthKey(birthDate);
  if (!key) return { ok: false, reason: 'bad-format' };

  const store = getProfileStore();

  // 카드가 있는지 확인하기 **전에** 횟수를 센다. 그러지 않으면 존재하지 않는 id 로
  // 제한을 피해 가며 카드 목록을 훑을 수 있다.
  const allowed = await store.allowAttempt(`verify:${id}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW_SECONDS);
  if (!allowed) return { ok: false, reason: 'throttled' };

  const profile = await store.get(id);
  if (!profile) return { ok: false, reason: 'not-found' };

  if (!safeEqual(key, birthKeyOf(profile))) return { ok: false, reason: 'mismatch' };
  return { ok: true, profile };
}

export function verifyErrorMessage(reason: Exclude<VerifyResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'bad-format':
      return '생년월일을 여섯 자리로 입력해 주세요. 예: 970304';
    case 'throttled':
      return '시도가 너무 잦습니다. 10분 뒤에 다시 해 주세요.';
    case 'not-found':
      return '카드를 찾을 수 없습니다. 이미 지워졌을 수 있습니다.';
    default:
      return '생년월일이 카드와 맞지 않습니다.';
  }
}
