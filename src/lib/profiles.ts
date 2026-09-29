/**
 * 사람 카드 저장소.
 *
 * 타인의 생년월일을 다루므로 **서버에 보내지 않는다.** 이 브라우저의 localStorage 에만 남고,
 * 만세력을 계산할 때만 요청으로 나갔다가 응답과 함께 사라진다.
 *
 * 시크릿 모드나 저장이 차단된 환경에서도 페이지가 죽으면 안 되므로 읽기·쓰기를 전부 감싼다.
 */

import type { SajuInput } from './saju/types';

const STORAGE_KEY = 'imsaju.profiles.v1';

export interface Profile {
  id: string;
  /** 카드에 보이는 이름 */
  label: string;
  /** "우리 팀장" 같은 메모 */
  memo?: string;
  /** 만세력 계산에 필요한 전부 */
  input: SajuInput;
  createdAt: number;
}

/**
 * 처음 들어온 사람에게 보여 줄 예시 카드.
 * 라벨에 (예시)를 붙여 지워도 되는 것임을 분명히 한다.
 */
function sampleProfiles(): Profile[] {
  const now = Date.now();
  const make = (
    label: string,
    memo: string,
    input: Omit<SajuInput, 'name'>,
    offset: number,
  ): Profile => ({
    id: `sample-${offset}`,
    label,
    memo,
    input: { ...input, name: label } as SajuInput,
    createdAt: now + offset,
  });

  const common = {
    calendar: 'solar' as const,
    city: '서울',
    solarTimeMode: 'longitude' as const,
    lateZiHour: false,
  };

  return [
    make('나 (예시)', '내 카드로 바꿔 쓰세요', {
      ...common, year: 1992, month: 6, day: 11, hour: 8, minute: 40, gender: 'female',
    }, 0),
    make('김팀장 (예시)', '직속 상사', {
      ...common, year: 1978, month: 11, day: 3, hour: 14, minute: 20, gender: 'male',
    }, 1),
    make('이주임 (예시)', '같은 팀 후임', {
      ...common, year: 1997, month: 2, day: 27, hour: 22, minute: 5, gender: 'male',
    }, 2),
  ];
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** 저장된 카드를 읽는다. 처음이면 예시 카드를 넣어 돌려준다. */
export function loadProfiles(): Profile[] {
  if (!canUseStorage()) return sampleProfiles();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = sampleProfiles();
      saveProfiles(seeded);
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return sampleProfiles();

    // 저장 형식이 바뀌었거나 손상된 항목은 조용히 버린다.
    return parsed.filter(isProfile);
  } catch {
    // 저장소를 못 읽어도 화면은 떠야 한다.
    return sampleProfiles();
  }
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<Profile>;
  return (
    typeof p.id === 'string' &&
    typeof p.label === 'string' &&
    typeof p.input === 'object' &&
    p.input !== null &&
    typeof (p.input as SajuInput).year === 'number'
  );
}

/** 저장에 실패하면 false. 화면에서 "이 브라우저에 저장하지 못했습니다"를 알릴 수 있다. */
export function saveProfiles(profiles: Profile[]): boolean {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return true;
  } catch {
    return false;
  }
}

export function newProfileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 카드 요약 한 줄 (예: "1992-06-11 08:40 · 여자 · 서울") */
export function describeProfile(profile: Profile): string {
  const { input } = profile;
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${input.year}-${pad(input.month)}-${pad(input.day)}`;
  const time = input.timeUnknown
    ? '시각 모름'
    : `${pad(input.hour ?? 0)}:${pad(input.minute ?? 0)}`;
  const calendar = input.calendar === 'lunar' ? (input.isLeapMonth ? '음력 윤달' : '음력') : '양력';
  const gender = input.gender === 'male' ? '남자' : '여자';
  return `${date} ${time} · ${calendar} · ${gender} · ${input.city ?? '서울'}`;
}
