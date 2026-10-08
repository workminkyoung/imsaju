/**
 * 사람 카드 — 브라우저 쪽 접근 코드.
 *
 * 카드는 이제 서버에 있다. 브라우저가 받는 것은 **이름과 메모뿐**이고
 * 생년월일은 수정할 때 본인 확인을 통과해야만 내려온다.
 *
 * 예전에 localStorage 에 쌓인 카드는 처음 한 번 서버로 올리고 지운다.
 */

import type { CardFace } from './saju/cardFace';
import type { SajuInput } from './saju/types';

const LEGACY_KEY = 'imsaju.profiles.v1';
const MIGRATED_KEY = 'imsaju.profiles.migrated';

/** 목록에 보이는 카드. 생년월일이 없다. face 는 띠·일주·오행 요약뿐이다. */
export interface PublicProfile {
  id: string;
  label: string;
  memo?: string;
  createdAt: number;
  face?: CardFace;
}

/** 본인 확인을 통과했을 때만 받는 전체 카드 */
export interface FullProfile {
  id: string;
  label: string;
  memo?: string;
  input: SajuInput;
}

export interface StorageInfo {
  name: string;
  durable: boolean;
  ttlDays: number;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

export async function fetchProfiles(): Promise<{ profiles: PublicProfile[]; storage: StorageInfo }> {
  const response = await fetch('/api/profiles', { cache: 'no-store' });
  if (!response.ok) throw new Error(await readError(response, '카드를 불러오지 못했습니다.'));
  return (await response.json()) as { profiles: PublicProfile[]; storage: StorageInfo };
}

export async function createProfile(
  input: SajuInput,
  memo?: string,
): Promise<PublicProfile> {
  const response = await fetch('/api/profiles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input, label: input.name, memo }),
  });
  if (!response.ok) throw new Error(await readError(response, '카드를 저장하지 못했습니다.'));
  const data = (await response.json()) as { profile: PublicProfile };
  return data.profile;
}

/** 생년월일(YYMMDD)로 본인 확인. 통과하면 수정 화면을 채울 전체 카드를 준다. */
export async function verifyProfile(id: string, birthDate: string): Promise<FullProfile> {
  const response = await fetch('/api/profiles/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, birthDate }),
  });
  if (!response.ok) throw new Error(await readError(response, '확인에 실패했습니다.'));
  const data = (await response.json()) as { profile: FullProfile };
  return data.profile;
}

export async function updateProfile(
  id: string,
  birthDate: string,
  input: SajuInput,
  memo?: string,
): Promise<PublicProfile> {
  const response = await fetch(`/api/profiles/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ birthDate, input, label: input.name, memo }),
  });
  if (!response.ok) throw new Error(await readError(response, '카드를 수정하지 못했습니다.'));
  const data = (await response.json()) as { profile: PublicProfile };
  return data.profile;
}

export async function deleteProfile(id: string, birthDate: string): Promise<void> {
  const response = await fetch(`/api/profiles/${id}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ birthDate }),
  });
  if (!response.ok) throw new Error(await readError(response, '카드를 삭제하지 못했습니다.'));
}

// ── 예전 localStorage 카드 이전 ───────────────────────────────────────────

interface LegacyProfile {
  label?: string;
  memo?: string;
  input?: SajuInput;
}

/**
 * 브라우저에 남아 있던 카드를 서버로 올린다. 한 번만 한다.
 *
 * 올린 뒤 로컬을 비우는 이유는, 남겨 두면 같은 카드가 기기마다 다시 올라가
 * 중복이 쌓이기 때문이다.
 *
 * @returns 올린 카드 수
 */
export async function migrateLegacyProfiles(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  let legacy: LegacyProfile[];
  try {
    if (window.localStorage.getItem(MIGRATED_KEY)) return 0;
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) {
      window.localStorage.setItem(MIGRATED_KEY, '1');
      return 0;
    }
    const parsed: unknown = JSON.parse(raw);
    legacy = Array.isArray(parsed) ? (parsed as LegacyProfile[]) : [];
  } catch {
    // 저장소를 못 읽으면 이전할 것도 없다.
    return 0;
  }

  let moved = 0;
  for (const item of legacy) {
    if (!item?.input || typeof item.input.year !== 'number') continue;
    try {
      await createProfile({ ...item.input, name: item.label ?? item.input.name }, item.memo);
      moved += 1;
    } catch {
      // 한 장이 실패해도 나머지는 올린다.
    }
  }

  try {
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.setItem(MIGRATED_KEY, '1');
  } catch {
    // 지우지 못해도 표시는 남기려 했으니 그걸로 둔다.
  }
  return moved;
}
