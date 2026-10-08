/**
 * 사람 카드 — 이 브라우저의 localStorage 에만 둔다.
 *
 * 카드에는 **타인의 생년월일**이 들어간다. 서버에 모아 두면 보관·관리 책임이 생기므로
 * 각자의 브라우저에만 저장한다. 서버는 계산·풀이를 할 때 입력을 받아 쓰고 버린다.
 *
 * 그래서 카드는 기기·브라우저마다 따로이고, 다른 사람과 공유되지 않는다.
 * 오래 쓰지 않은 카드는 읽을 때 지운다(PROFILE_TTL_DAYS).
 */

import { computeSaju } from './saju';
import { buildCardFace, type CardFace } from './saju/cardFace';
import type { SajuInput } from './saju/types';

const STORAGE_KEY = 'imsaju.cards.v1';

/**
 * 마지막으로 쓴 뒤 이만큼 지나면 지운다. 사주를 보거나 궁합에 올리거나 고치면 "쓴" 것이다.
 * null 로 두면 지우지 않는다.
 */
export const PROFILE_TTL_DAYS: number | null = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 브라우저에 저장되는 카드 전체 */
export interface StoredProfile {
  id: string;
  label: string;
  memo?: string;
  input: SajuInput;
  createdAt: number;
  updatedAt: number;
}

/** 카드 테이블이 그리는 카드. face 는 띠·일주·오행 요약이다. */
export interface PublicProfile {
  id: string;
  label: string;
  memo?: string;
  createdAt: number;
  face?: CardFace;
}

/** localStorage 는 사생활 보호 모드 등에서 접근만 해도 던질 수 있다. */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isExpired(profile: StoredProfile, now: number): boolean {
  return PROFILE_TTL_DAYS !== null && now - profile.updatedAt > PROFILE_TTL_DAYS * DAY_MS;
}

function readAll(): StoredProfile[] {
  const store = storage();
  if (!store) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const all = (parsed as StoredProfile[]).filter(
    (p) => typeof p?.id === 'string' && typeof p.input?.year === 'number',
  );
  const now = Date.now();
  const alive = all.filter((p) => !isExpired(p, now));
  // 만료된 카드는 읽은 김에 실제로 지운다. 남겨 두면 기간이 지나도 기기에 남는다.
  if (alive.length !== all.length) writeAll(alive);
  return alive;
}

function writeAll(profiles: StoredProfile[]): void {
  const store = storage();
  if (!store) throw new Error('이 브라우저에서는 카드를 저장할 수 없습니다.');
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    throw new Error('브라우저 저장 공간에 카드를 저장하지 못했습니다.');
  }
}

/** 계산이 실패해도 목록은 보인다. 그 카드는 이름만 나온다. */
function faceOf(profile: StoredProfile): CardFace | undefined {
  try {
    return buildCardFace(computeSaju(profile.input), profile.memo);
  } catch {
    return undefined;
  }
}

export function toPublic(profile: StoredProfile): PublicProfile {
  return {
    id: profile.id,
    label: profile.label,
    memo: profile.memo,
    createdAt: profile.createdAt,
    face: faceOf(profile),
  };
}

function cleanLabel(input: SajuInput): string {
  return (input.name.trim() || '이름 없음').slice(0, 40);
}

function cleanMemo(memo: string | undefined): string | undefined {
  return memo?.trim().slice(0, 40) || undefined;
}

export function listProfiles(): StoredProfile[] {
  return readAll().sort((a, b) => a.createdAt - b.createdAt);
}

export function getProfile(id: string): StoredProfile | null {
  return readAll().find((p) => p.id === id) ?? null;
}

/** 카드를 "썼다"고 표시해 보관 기간을 다시 센다. */
export function touchProfile(id: string): void {
  const all = readAll();
  const profile = all.find((p) => p.id === id);
  if (!profile) return;
  profile.updatedAt = Date.now();
  try {
    writeAll(all);
  } catch {
    // 기간 연장에 실패해도 보던 화면은 그대로 둔다.
  }
}

export function createProfile(input: SajuInput, memo?: string): StoredProfile {
  const now = Date.now();
  const label = cleanLabel(input);
  const profile: StoredProfile = {
    id: crypto.randomUUID(),
    label,
    memo: cleanMemo(memo),
    input: { ...input, name: label },
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...readAll(), profile]);
  return profile;
}

export function updateProfile(id: string, input: SajuInput, memo?: string): StoredProfile {
  const all = readAll();
  const index = all.findIndex((p) => p.id === id);
  if (index < 0) throw new Error('카드를 찾을 수 없습니다. 이미 지워졌을 수 있습니다.');
  const label = cleanLabel(input);
  const updated: StoredProfile = {
    ...all[index]!,
    label,
    memo: cleanMemo(memo),
    input: { ...input, name: label },
    updatedAt: Date.now(),
  };
  all[index] = updated;
  writeAll(all);
  return updated;
}

export function deleteProfile(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}
