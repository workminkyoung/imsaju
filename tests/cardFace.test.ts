/**
 * 카드 앞면 요약 — 날짜 없이 띠·일주·오행만 내는지, 규칙이 안정적인지.
 */

import { describe, expect, it } from 'vitest';
import { computeSaju, ELEMENTS } from '@/lib/saju';
import { buildCardFace } from '@/lib/saju/cardFace';

const chart = computeSaju({
  name: '테스트',
  calendar: 'solar',
  gender: 'male',
  city: '서울',
  year: 1990,
  month: 3,
  day: 15,
  hour: 13,
  minute: 20,
});

describe('buildCardFace', () => {
  const face = buildCardFace(chart);

  it('띠와 연주·일주로 정체성 줄을 만든다', () => {
    // 庚午년(말띠), 己卯일 — chart.test.ts 와 같은 입력
    expect(face.identity).toBe('경오년 말띠 · 기묘일주');
  });

  it('오행 비율은 정수이고 합이 100 언저리다', () => {
    const values = ELEMENTS.map((e) => face.elements[e]);
    for (const v of values) expect(Number.isInteger(v)).toBe(true);
    const sum = values.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });

  it('키워드는 1~4개이고 겹치지 않는다', () => {
    expect(face.keywords.length).toBeGreaterThan(0);
    expect(face.keywords.length).toBeLessThanOrEqual(4);
    const texts = face.keywords.map((k) => k.text);
    expect(new Set(texts).size).toBe(texts.length);
    // 첫 키워드는 일간 오행(己 = 토)
    expect(face.keywords[0]).toEqual({ text: '신뢰', element: '토' });
  });

  it('메모가 있으면 한 줄 소개로 쓰고, 없으면 일간으로 만든다', () => {
    expect(buildCardFace(chart, '같은 팀').tagline).toBe('같은 팀');
    expect(face.tagline).toContain('토(己)형');
  });

  it('날짜·시각이 들어 있지 않다', () => {
    const json = JSON.stringify(face);
    expect(json).not.toContain('1990');
    expect(json).not.toContain('13:20');
  });
});
