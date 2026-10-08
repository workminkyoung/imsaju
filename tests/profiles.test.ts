/**
 * 사람 카드 — 브라우저 저장소와 서버로 나가는 응답.
 *
 * 카드에는 **타인의 생년월일**이 들어간다. 그래서 두 가지를 본다.
 *   - 카드가 이 브라우저(localStorage)에만 쌓이고, 오래 안 쓴 카드는 실제로 지워지는가
 *   - 궁합 응답에 생년월일 원문이 섞여 나가지 않는가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROFILE_TTL_DAYS,
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  toPublic,
  touchProfile,
  updateProfile,
} from '@/lib/profiles';
import { loadAndCompute, toPublicChart } from '@/lib/compatibilityRequest';
import { computeSaju } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';
import { ValidationError } from '@/lib/validate';

const INPUT: SajuInput = {
  name: '민경', calendar: 'solar', year: 1997, month: 3, day: 4,
  hour: 13, minute: 20, gender: 'female', city: '서울',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** 테스트용 localStorage. 실제 브라우저처럼 문자열만 담는다. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, String(value)); },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('브라우저 저장소', () => {
  it('넣고 읽고 고치고 지운다', () => {
    const created = createProfile(INPUT, '같은 팀');
    expect(listProfiles().map((p) => p.id)).toEqual([created.id]);
    expect(getProfile(created.id)?.input.year).toBe(1997);

    updateProfile(created.id, { ...INPUT, name: '김민경' }, '옆 팀');
    const updated = getProfile(created.id);
    expect(updated?.label).toBe('김민경');
    expect(updated?.memo).toBe('옆 팀');
    expect(updated?.input.name).toBe('김민경');

    deleteProfile(created.id);
    expect(listProfiles()).toEqual([]);
    expect(getProfile(created.id)).toBeNull();
  });

  it('이름이 비면 "이름 없음", 빈 메모는 남기지 않는다', () => {
    const created = createProfile({ ...INPUT, name: '  ' }, '   ');
    expect(created.label).toBe('이름 없음');
    expect(created.memo).toBeUndefined();
  });

  it('처음 쓰는 브라우저에는 카드가 없다 — 초기 카드를 심지 않는다', () => {
    expect(listProfiles()).toEqual([]);
  });

  it('없는 카드는 고칠 수 없다', () => {
    expect(() => updateProfile('없음', INPUT)).toThrow('카드를 찾을 수 없습니다');
  });

  it('저장 내용이 깨져 있어도 목록은 빈 채로 열린다', () => {
    localStorage.setItem('imsaju.cards.v1', '{깨짐');
    expect(listProfiles()).toEqual([]);
  });

  it('카드 앞면 요약을 만든다', () => {
    const face = toPublic(createProfile(INPUT)).face;
    expect(face?.identity).toMatch(/띠 · .+일주$/);
  });
});

describe('보관 기간', () => {
  it.skipIf(PROFILE_TTL_DAYS === null)('오래 안 쓴 카드는 목록에서 빠지고 저장소에서도 지워진다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const old = createProfile({ ...INPUT, name: '오래됨' });

    vi.setSystemTime(Date.now() + (PROFILE_TTL_DAYS! + 1) * DAY_MS);
    const fresh = createProfile({ ...INPUT, name: '새것' });

    expect(listProfiles().map((p) => p.id)).toEqual([fresh.id]);
    // 숨기기만 하지 않고 실제로 기기에서 지운다
    expect(localStorage.getItem('imsaju.cards.v1')).not.toContain(old.id);
  });

  it.skipIf(PROFILE_TTL_DAYS === null)('쓰면 기간을 다시 센다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const card = createProfile(INPUT);

    vi.setSystemTime(Date.now() + (PROFILE_TTL_DAYS! - 1) * DAY_MS);
    touchProfile(card.id);

    vi.setSystemTime(Date.now() + (PROFILE_TTL_DAYS! - 1) * DAY_MS);
    expect(getProfile(card.id)).not.toBeNull();
  });
});

describe('궁합 요청', () => {
  it('두 사람의 입력을 받아 계산한다', async () => {
    const result = await loadAndCompute({
      relationship: 'peer',
      a: { label: '민경', input: INPUT },
      b: { label: '혜린', input: { ...INPUT, name: '혜린', year: 1998, month: 3, day: 27 } },
    });
    expect(result.a.label).toBe('민경');
    expect(result.b.label).toBe('혜린');
    expect(result.compatibility).toBeDefined();
  });

  it('한쪽이 빠지면 어느 쪽인지 알려 준다', async () => {
    await expect(
      loadAndCompute({ relationship: 'peer', a: { label: '민경', input: INPUT } }),
    ).rejects.toThrow(/B 카드/);
  });

  it('입력이 잘못되면 검증 오류로 막는다', async () => {
    await expect(
      loadAndCompute({
        relationship: 'peer',
        a: { label: '민경', input: INPUT },
        b: { label: '혜린', input: { ...INPUT, month: 13 } },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('궁합 응답에 생년월일이 새지 않는다', () => {
  it('입력 원문과 계산 근거가 빠진다', () => {
    const chart = computeSaju(INPUT);
    const published = toPublicChart(chart) as unknown as Record<string, unknown>;

    expect(published.input).toBeUndefined();
    expect(published.basis).toBeUndefined();
    // 나이로 생년을 역산할 수 있는 세운·대운도 빼 둔다
    expect(published.seun).toBeUndefined();
    expect(published.daeun).toBeUndefined();

    const json = JSON.stringify(published);
    expect(json).not.toContain('1997-03-04');
    expect(json).not.toContain('13:20');
    // 화면이 쓰는 것은 남아 있어야 한다
    expect(published.pillars).toBeDefined();
    expect(published.analysis).toBeDefined();
  });

  it('sajuYear 를 빼서 출생 연도가 숫자로 나가지 않는다', () => {
    const raw = JSON.stringify(toPublicChart(computeSaju(INPUT)));

    expect(raw).not.toContain('1997');
    expect(raw).not.toContain('sajuYear');
    // 띠는 남긴다 — 연지 간지에 이미 담겨 있어 숨겨도 의미가 없다.
    expect(raw).toContain('zodiac');
  });
});
