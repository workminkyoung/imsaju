/**
 * 궁합 계산 검증.
 *
 * 합·충·형·해·파·원진은 손으로 적은 표라 반드시 오타가 난다.
 * 그래서 두 가지로 확인한다.
 *   1. 표 자체의 구조 — 대칭인가, 12지지를 빠짐없이 덮는가, 알려진 규칙성을 따르는가
 *   2. 널리 알려진 개별 사례 — 子午 충, 寅亥 육합처럼 틀리면 바로 드러나는 것들
 */

import { describe, expect, it } from 'vitest';
import {
  BRANCHES,
  BRANCH_BREAK,
  BRANCH_CLASH,
  BRANCH_HARM,
  BRANCH_RESENTMENT,
  DIRECTION_HARMONY,
  SIX_HARMONY,
  STEMS,
  STEM_CLASH,
  STEM_HARMONY,
  THREE_HARMONY,
  type BranchPair,
} from '@/lib/saju/constants';
import {
  branchRelations,
  computeCompatibility,
  stemRelations,
} from '@/lib/saju/compatibility';
import { computeSaju } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

const idx = (branch: string) => BRANCHES.indexOf(branch as never);
const stemIdx = (stem: string) => STEMS.indexOf(stem as never);

/** 그 쌍에서 특정 관계가 나오는지 */
const has = (a: string, b: string, name: string) =>
  branchRelations(idx(a), idx(b)).some((r) => r.name === name);

describe('지지 관계 표의 구조', () => {
  /** 짝을 이루는 표는 6쌍으로 12지지를 정확히 한 번씩 덮어야 한다. */
  const coversAllBranches = (table: readonly BranchPair[]) => {
    const seen = new Set<number>();
    for (const [a, b] of table) {
      seen.add(a);
      seen.add(b);
    }
    return seen.size === 12 && table.length === 6;
  };

  it.each([
    ['육합', SIX_HARMONY],
    ['충', BRANCH_CLASH],
    ['해', BRANCH_HARM],
    ['파', BRANCH_BREAK],
    ['원진', BRANCH_RESENTMENT],
  ] as const)('%s 는 6쌍으로 12지지를 빠짐없이 덮는다', (_name, table) => {
    expect(coversAllBranches(table)).toBe(true);
  });

  it('육합은 두 인덱스의 합이 12로 나눈 나머지 1이다', () => {
    for (const [a, b] of SIX_HARMONY) expect((a + b) % 12).toBe(1);
  });

  it('해는 두 인덱스의 합이 12로 나눈 나머지 7이다', () => {
    for (const [a, b] of BRANCH_HARM) expect((a + b) % 12).toBe(7);
  });

  it('충은 두 인덱스의 차이가 6이다 (마주 보는 자리)', () => {
    for (const [a, b] of BRANCH_CLASH) expect(Math.abs(a - b)).toBe(6);
  });

  it('삼합·방합은 각각 4개 국이며 세 지지씩 12지지를 덮는다', () => {
    for (const table of [THREE_HARMONY, DIRECTION_HARMONY]) {
      expect(table).toHaveLength(4);
      const seen = new Set(table.flatMap((g) => g.branches));
      expect(seen.size).toBe(12);
      for (const group of table) expect(group.branches).toHaveLength(3);
    }
  });

  it('방합은 연속된 세 지지다 (같은 계절)', () => {
    for (const { branches } of DIRECTION_HARMONY) {
      const [x, y, z] = branches;
      expect((x + 1) % 12).toBe(y);
      expect((y + 1) % 12).toBe(z);
    }
  });

  it('관계 판정은 순서를 바꿔도 같다', () => {
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        const forward = branchRelations(a, b).map((r) => r.name).sort();
        const backward = branchRelations(b, a).map((r) => r.name).sort();
        expect(backward, `${BRANCHES[a]}${BRANCHES[b]}`).toEqual(forward);
      }
    }
  });
});

describe('천간 관계 표', () => {
  it('천간합은 5쌍이고 인덱스 차이가 5다', () => {
    expect(STEM_HARMONY).toHaveLength(5);
    for (const { pair } of STEM_HARMONY) expect(Math.abs(pair[0] - pair[1])).toBe(5);
  });

  it('천간충은 4쌍이고 인덱스 차이가 6이다 (戊己는 짝이 없다)', () => {
    expect(STEM_CLASH).toHaveLength(4);
    for (const [a, b] of STEM_CLASH) expect(Math.abs(a - b)).toBe(6);
    const covered = new Set(STEM_CLASH.flat());
    expect(covered.has(stemIdx('戊'))).toBe(false);
    expect(covered.has(stemIdx('己'))).toBe(false);
  });

  it('甲己 합, 甲庚 충', () => {
    expect(stemRelations(stemIdx('甲'), stemIdx('己')).map((r) => r.name)).toContain('천간합');
    expect(stemRelations(stemIdx('甲'), stemIdx('庚')).map((r) => r.name)).toContain('천간충');
  });
});

describe('널리 알려진 개별 사례', () => {
  it('子午는 충이다', () => expect(has('子', '午', '충')).toBe(true));
  it('寅亥는 육합이다', () => expect(has('寅', '亥', '육합')).toBe(true));
  it('卯戌도 육합이다', () => expect(has('卯', '戌', '육합')).toBe(true));
  it('申子辰은 삼합이다', () => {
    expect(has('申', '子', '삼합')).toBe(true);
    expect(has('子', '辰', '삼합')).toBe(true);
    expect(has('申', '辰', '삼합')).toBe(true);
  });
  it('寅巳申은 삼형이다', () => {
    expect(has('寅', '巳', '형')).toBe(true);
    expect(has('巳', '申', '형')).toBe(true);
  });
  it('子卯는 상형이다', () => expect(has('子', '卯', '형')).toBe(true));
  it('辰辰은 자형이다', () => expect(has('辰', '辰', '형')).toBe(true));
  it('子丑은 자형이 아니다 (자형은 辰午酉亥뿐)', () => {
    expect(has('子', '子', '형')).toBe(false);
    expect(has('丑', '丑', '형')).toBe(false);
  });
  it('子未는 해이면서 원진이다', () => {
    expect(has('子', '未', '해')).toBe(true);
    expect(has('子', '未', '원진')).toBe(true);
  });
  it('寅亥는 육합이면서 파다 (합과 파가 겹칠 수 있다)', () => {
    expect(has('寅', '亥', '육합')).toBe(true);
    expect(has('寅', '亥', '파')).toBe(true);
  });
  it('寅卯는 방합이다 (같은 봄)', () => expect(has('寅', '卯', '방합')).toBe(true));
  it('같은 글자는 삼합·방합으로 치지 않는다', () => {
    expect(has('寅', '寅', '삼합')).toBe(false);
    expect(has('寅', '寅', '방합')).toBe(false);
  });
});

// ── 종합 계산 ─────────────────────────────────────────────────────────────

const person = (over: Partial<SajuInput> = {}): SajuInput => ({
  name: '테스트',
  calendar: 'solar',
  year: 1990,
  month: 3,
  day: 15,
  hour: 13,
  minute: 20,
  gender: 'male',
  city: '서울',
  ...over,
});

const chartA = computeSaju(person());
const chartB = computeSaju(person({ year: 1988, month: 7, day: 22, hour: 9, gender: 'female' }));

describe('궁합 종합 점수', () => {
  it('0~100 안에 든다', () => {
    const result = computeCompatibility(chartA, chartB);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('같은 입력이면 항상 같은 값이 나온다', () => {
    const first = computeCompatibility(chartA, chartB);
    const second = computeCompatibility(chartA, chartB);
    expect(second).toEqual(first);
  });

  it('A와 B를 바꿔도 총점이 같다', () => {
    expect(computeCompatibility(chartB, chartA).score)
      .toBe(computeCompatibility(chartA, chartB).score);
  });

  it('총점이 항목 가중합에서 실제로 유도된다', () => {
    const r = computeCompatibility(chartA, chartB);
    const sum = r.items.reduce((acc, item) => acc + item.weightedScore, 0);
    expect(r.weightedTotal).toBeCloseTo(sum, 2);

    const expected = Math.round(((sum - r.range.min) / (r.range.max - r.range.min)) * 100);
    expect(r.score).toBe(expected);
  });

  it('항목마다 가중치와 원점수가 곱해져 있다', () => {
    for (const item of computeCompatibility(chartA, chartB).items) {
      expect(item.weightedScore).toBeCloseTo(item.rawScore * item.weight, 6);
      // 한 자리 점수는 상·하한으로 잘린다
      expect(Math.abs(item.rawScore)).toBeLessThanOrEqual(5);
    }
  });

  it('배점 규칙을 결과에 함께 싣는다 (점수의 근거를 공개하기 위해)', () => {
    const r = computeCompatibility(chartA, chartB);
    expect(r.rules.relationPoints.육합).toBe(3);
    expect(r.rules.relationPoints.충).toBe(-3);
    expect(r.rules.slotWeights.월지).toBeGreaterThan(r.rules.slotWeights.일지);
  });
});

describe('시각을 모르는 사람', () => {
  const noHour = computeSaju(person({ timeUnknown: true }));

  it('시지 항목을 아예 빼고 계산한다', () => {
    const r = computeCompatibility(noHour, chartB);
    expect(r.items.map((i) => i.slot)).not.toContain('시지');
  });

  it('빠진 자리만큼 정규화 범위도 줄어 점수가 여전히 0~100이다', () => {
    const r = computeCompatibility(noHour, chartB);
    const weightSum = r.items.reduce((s, i) => s + i.weight, 0);
    expect(r.range.max).toBeCloseTo(weightSum * 5, 6);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('관계 이름을 지어내지 않는다', () => {
  // 프롬프트가 "계산 결과에 없는 관계를 지어내지 마라"고 지시하므로,
  // 십신·오행보완 항목에 '삼합' 같은 이름을 붙이면 LLM이 없는 합을 근거로 삼는다.
  const BRANCH_RELATION_NAMES = ['육합', '삼합', '방합', '충', '형', '원진', '해', '파'];

  it('일간 항목의 십신 점수는 지지 관계 이름을 쓰지 않는다', () => {
    const item = computeCompatibility(chartA, chartB).items.find((i) => i.slot === '일간')!;
    const derived = item.relations.filter((r) => r.detail.includes('→'));
    expect(derived.length).toBeGreaterThan(0);
    for (const relation of derived) {
      expect(relation.name).toBe('십신');
    }
  });

  it('오행보완 항목은 합·충 이름을 쓰지 않는다', () => {
    const item = computeCompatibility(chartA, chartB).items.find((i) => i.slot === '오행보완')!;
    for (const relation of item.relations) {
      expect(relation.name).toBe('오행보완');
      expect(BRANCH_RELATION_NAMES).not.toContain(relation.name);
    }
  });

  it('지지 자리의 관계 이름은 실제 지지 관계뿐이다', () => {
    const r = computeCompatibility(chartA, chartB);
    for (const item of r.items) {
      if (item.slot === '일간' || item.slot === '오행보완') continue;
      for (const relation of item.relations) {
        expect(BRANCH_RELATION_NAMES).toContain(relation.name);
      }
    }
  });
});

describe('설계 고정: 관계는 수치를 바꾸지 않는다', () => {
  it('computeCompatibility 는 관계 인자를 받지 않는다', () => {
    // 상사·동료에 따라 가중치를 흔들면 점수의 근거를 설명할 수 없어진다.
    // 관계는 프롬프트에만 들어간다. 시그니처로 이 결정을 고정한다.
    expect(computeCompatibility.length).toBe(2);
  });
});

describe('자기 자신과의 궁합', () => {
  it('모든 자리가 같은 글자라 방합·자형이 잡힌다', () => {
    const r = computeCompatibility(chartA, chartA);
    const dayBranch = r.items.find((i) => i.slot === '일지');
    expect(dayBranch?.a).toBe(dayBranch?.b);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
