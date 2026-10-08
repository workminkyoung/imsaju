/**
 * 사람 카드 저장소와 본인 확인 검증.
 *
 * 여기 담긴 건 **타인의 생년월일**이다. 그래서 두 가지를 집중적으로 본다.
 *   - 목록에 생년월일이 섞여 나가지 않는가
 *   - 생년월일로 거는 잠금이 무차별 대입에 버티는가 (약한 비밀이라 횟수 제한이 전부다)
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ATTEMPT_LIMIT,
  birthKeyOf,
  normalizeBirthKey,
  verifyProfileOwner,
} from '@/lib/profileAuth';
import {
  PROFILE_TTL_DAYS,
  getProfileStore,
  setProfileStore,
  toPublic,
  type StoredProfile,
} from '@/lib/profileStore';
import { toPublicChart } from '@/lib/compatibilityRequest';
import { computeSaju } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

const INPUT: SajuInput = {
  name: '민경', calendar: 'solar', year: 1997, month: 3, day: 4,
  hour: 13, minute: 20, gender: 'female', city: '서울',
};

function makeProfile(over: Partial<StoredProfile> = {}): StoredProfile {
  const now = Date.now();
  return {
    id: 'p1', label: '민경', memo: '같은 팀',
    input: INPUT, createdAt: now, updatedAt: now, ...over,
  };
}

const dirs: string[] = [];
afterEach(() => {
  setProfileStore(null);
  delete process.env.PROFILE_STORE;
  delete process.env.PROFILE_DATA_DIR;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function useFileStore() {
  const dir = mkdtempSync(join(tmpdir(), 'imsaju-profiles-'));
  dirs.push(dir);
  process.env.PROFILE_STORE = 'file';
  process.env.PROFILE_DATA_DIR = dir;
  setProfileStore(null);
  return getProfileStore();
}

describe('목록에 생년월일이 새지 않는다', () => {
  it('공개용으로 바꾸면 input 이 통째로 빠진다', () => {
    const published = toPublic(makeProfile()) as unknown as Record<string, unknown>;
    expect(published.label).toBe('민경');
    expect(published.memo).toBe('같은 팀');
    expect(published.input).toBeUndefined();
    // 직렬화했을 때도 생년월일 흔적이 없어야 한다
    const json = JSON.stringify(published);
    expect(json).not.toContain('1997');
    expect(json).not.toContain('970304');
  });

  it('앞면 요약은 함께 나가되 날짜는 담지 않는다', () => {
    const published = toPublic(makeProfile());
    expect(published.face?.identity).toMatch(/띠 · .+일주$/);
    const json = JSON.stringify(published.face);
    expect(json).not.toContain('1997');
  });

  it('궁합 응답용 차트에서 입력 원문과 계산 근거가 빠진다', () => {
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
});

describe('생년월일 입력 해석', () => {
  it('여섯 자리를 그대로 받는다', () => {
    expect(normalizeBirthKey('970304')).toBe('970304');
  });

  it('구분자와 공백을 무시한다', () => {
    expect(normalizeBirthKey('97-03-04')).toBe('970304');
    expect(normalizeBirthKey('97 03 04')).toBe('970304');
    expect(normalizeBirthKey('97.03.04')).toBe('970304');
  });

  it('여덟 자리로 적으면 뒤 여섯 자리를 쓴다', () => {
    expect(normalizeBirthKey('19970304')).toBe('970304');
  });

  it('자릿수가 안 맞으면 거부한다', () => {
    expect(normalizeBirthKey('97034')).toBeNull(); // 다섯 자리
    expect(normalizeBirthKey('9703')).toBeNull();
    expect(normalizeBirthKey('')).toBeNull();
    expect(normalizeBirthKey(null)).toBeNull();
  });

  it('카드에서 뽑은 키와 형식이 같다', () => {
    expect(birthKeyOf(makeProfile())).toBe('970304');
    // 2000년대도 두 자리로 접힌다
    expect(birthKeyOf(makeProfile({ input: { ...INPUT, year: 2003, month: 11, day: 9 } }))).toBe('031109');
  });
});

describe('본인 확인', () => {
  it('맞으면 전체 카드를 준다', async () => {
    const store = useFileStore();
    await store.put(makeProfile());

    const result = await verifyProfileOwner('p1', '970304');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.input.year).toBe(1997);
  });

  it('틀리면 거부한다', async () => {
    const store = useFileStore();
    await store.put(makeProfile());

    const result = await verifyProfileOwner('p1', '970305');
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('형식이 틀리면 저장소를 건드리지도 않는다', async () => {
    useFileStore();
    expect(await verifyProfileOwner('p1', 'abc')).toEqual({ ok: false, reason: 'bad-format' });
  });

  it('없는 카드는 not-found', async () => {
    useFileStore();
    expect(await verifyProfileOwner('없음', '970304')).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('무차별 대입 방어', () => {
  it('정해진 횟수를 넘기면 막는다', async () => {
    const store = useFileStore();
    await store.put(makeProfile());

    const reasons: string[] = [];
    for (let i = 0; i < ATTEMPT_LIMIT + 3; i++) {
      const r = await verifyProfileOwner('p1', '000000');
      reasons.push(r.ok ? 'ok' : r.reason);
    }
    expect(reasons.slice(0, ATTEMPT_LIMIT)).toEqual(Array(ATTEMPT_LIMIT).fill('mismatch'));
    expect(reasons.slice(ATTEMPT_LIMIT)).toEqual(['throttled', 'throttled', 'throttled']);
  });

  it('막힌 뒤에는 맞는 값을 넣어도 통과시키지 않는다', async () => {
    const store = useFileStore();
    await store.put(makeProfile());
    for (let i = 0; i < ATTEMPT_LIMIT; i++) await verifyProfileOwner('p1', '000000');

    const result = await verifyProfileOwner('p1', '970304');
    expect(result).toEqual({ ok: false, reason: 'throttled' });
  });

  it('없는 id 로도 제한을 피해 갈 수 없다', async () => {
    // 카드 존재 여부를 세기 전에 확인하면, 없는 id 를 섞어 제한을 우회할 수 있다.
    useFileStore();
    const reasons: string[] = [];
    for (let i = 0; i < ATTEMPT_LIMIT + 2; i++) {
      const r = await verifyProfileOwner('유령', '000000');
      reasons.push(r.ok ? 'ok' : r.reason);
    }
    expect(reasons).toContain('throttled');
  });

  it('카드마다 따로 센다', async () => {
    const store = useFileStore();
    await store.put(makeProfile());
    await store.put(makeProfile({ id: 'p2', label: '다른 사람' }));

    for (let i = 0; i < ATTEMPT_LIMIT + 1; i++) await verifyProfileOwner('p1', '000000');

    // p1 이 막혔다고 p2 까지 막히면 안 된다
    expect(await verifyProfileOwner('p2', '970304')).toMatchObject({ ok: true });
  });
});

describe('저장소', () => {
  it('넣고 읽고 지운다', async () => {
    const store = useFileStore();
    await store.put(makeProfile());
    expect((await store.list()).map((p) => p.id)).toEqual(['p1']);
    expect((await store.get('p1'))?.label).toBe('민경');

    await store.remove('p1');
    expect(await store.list()).toEqual([]);
    expect(await store.get('p1')).toBeNull();
  });

  it('오래된 카드는 목록에서 빠진다', async () => {
    const store = useFileStore();
    const stale = Date.now() - (PROFILE_TTL_DAYS + 1) * 24 * 60 * 60 * 1000;
    await store.put(makeProfile({ id: 'old', updatedAt: stale }));
    await store.put(makeProfile({ id: 'fresh' }));

    expect((await store.list()).map((p) => p.id)).toEqual(['fresh']);
  });

  it('메모리 저장소는 durable 이 아니라고 밝힌다', () => {
    process.env.PROFILE_STORE = 'memory';
    setProfileStore(null);
    expect(getProfileStore().durable).toBe(false);
  });
});

describe('궁합 응답에 평문 생년이 남지 않는다', () => {
  it('sajuYear 를 빼서 출생 연도가 숫자로 나가지 않는다', () => {
    const chart = computeSaju(INPUT);
    const raw = JSON.stringify(toPublicChart(chart));

    expect(raw).not.toContain('1997');
    expect(raw).not.toContain('sajuYear');
    // 띠는 남긴다 — 연지 간지에 이미 담겨 있어 숨겨도 의미가 없다.
    expect(raw).toContain('zodiac');
  });
});
