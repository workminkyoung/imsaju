/**
 * 24절기 계산 검증.
 *
 * 두 방향으로 확인한다.
 *   1. 외부 권위 — 분점·지점(춘분/하지/추분/동지)은 공표된 시각이 있다.
 *      황경 0/90/180/270도가 맞으면 나머지 황경도 같은 기계장치이므로 함께 검증된다.
 *   2. 독립 구현 — lunar-javascript 의 절기표와 24절기 전부를 대조한다.
 */

import { describe, expect, it } from 'vitest';
import pkg from 'lunar-javascript';
import { findMonthPeriod, ipchunOf, sajuYear, solarTermsForYear } from '@/lib/saju/solarTerms';

const { Solar } = pkg as {
  Solar: { fromYmd(y: number, m: number, d: number): { getLunar(): LunarLike } };
};
interface LunarLike {
  getJieQiTable(): Record<string, { toYmdHms(): string }>;
}

const term = (year: number, name: string) => {
  const t = solarTermsForYear(year).find((x) => x.name === name);
  if (!t) throw new Error(`${name} 없음`);
  return t.date;
};

/** 두 시각의 차이를 분 단위로 */
const diffMinutes = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 60_000;

describe('절기 — 공표된 분점·지점과 대조', () => {
  // 천문 역서에 공표된 UTC 시각. 우리 계산이 여기서 벗어나면 근본부터 틀린 것이다.
  const KNOWN: Array<[number, string, string]> = [
    [2024, '춘분', '2024-03-20T03:06:00Z'],
    [2024, '추분', '2024-09-22T12:44:00Z'],
    [2025, '춘분', '2025-03-20T09:01:00Z'],
    [2025, '하지', '2025-06-21T02:42:00Z'],
    [2025, '추분', '2025-09-22T18:19:00Z'],
    [2025, '동지', '2025-12-21T15:03:00Z'],
    [2026, '춘분', '2026-03-20T14:46:00Z'],
  ];

  it.each(KNOWN)('%i년 %s 이 공표 시각과 1분 이내로 일치한다', (year, name, iso) => {
    expect(diffMinutes(term(year, name), new Date(iso))).toBeLessThanOrEqual(1);
  });
});

describe('절기 — lunar-javascript 독립 구현과 대조', () => {
  const CN: Record<string, string> = {
    입춘: '立春', 우수: '雨水', 경칩: '惊蛰', 춘분: '春分', 청명: '清明', 곡우: '谷雨',
    입하: '立夏', 소만: '小满', 망종: '芒种', 하지: '夏至', 소서: '小暑', 대서: '大暑',
    입추: '立秋', 처서: '处暑', 백로: '白露', 추분: '秋分', 한로: '寒露', 상강: '霜降',
    입동: '立冬', 소설: '小雪', 대설: '大雪', 동지: '冬至', 소한: '小寒', 대한: '大寒',
  };

  it('1950~2050년 전 절기가 2분 이내로 일치한다', () => {
    let worstMinutes = 0;
    let worstLabel = '';
    let compared = 0;

    for (let year = 1950; year <= 2050; year += 5) {
      const table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();

      for (const t of solarTermsForYear(year)) {
        const ref = table[CN[t.name]];
        if (!ref) continue;

        // lunar-javascript 는 베이징 시각 문자열을 준다. 절대 시각으로 되돌려 비교한다.
        const theirs = new Date(ref.toYmdHms().replace(' ', 'T') + '+08:00');

        // 표는 전년 동지부터 시작하므로 1년 어긋난 항목은 건너뛴다.
        if (diffMinutes(t.date, theirs) > 60 * 24 * 300) continue;

        compared++;
        const d = diffMinutes(t.date, theirs);
        if (d > worstMinutes) {
          worstMinutes = d;
          worstLabel = `${year}년 ${t.name}`;
        }
      }
    }

    expect(compared).toBeGreaterThan(400);
    expect(worstMinutes, `최대 오차: ${worstLabel} ${worstMinutes.toFixed(2)}분`).toBeLessThan(2);
  });
});

describe('사주에서의 연도 경계 (입춘)', () => {
  it('입춘 직전은 전년도, 직후는 당해년도로 친다', () => {
    const ipchun2000 = ipchunOf(2000); // 2000-02-04 20:40 KST 부근
    expect(sajuYear(new Date(ipchun2000.getTime() - 60_000))).toBe(1999);
    expect(sajuYear(new Date(ipchun2000.getTime() + 60_000))).toBe(2000);
  });

  it('1월 1일생은 아직 전년도 간지를 쓴다', () => {
    expect(sajuYear(new Date('2000-01-01T00:00:00Z'))).toBe(1999);
  });
});

describe('월주 경계', () => {
  it('직전 절(節)과 다음 절을 올바르게 찾는다', () => {
    // 1988-05-20 은 입하(5/5)와 망종(6/5) 사이 → 巳월
    const { current, next } = findMonthPeriod(new Date('1988-05-19T21:30:00Z'));
    expect(current.name).toBe('입하');
    expect(current.branchIndex).toBe(5); // 巳
    expect(next.name).toBe('망종');
  });

  it('연말을 걸쳐도 이어진다', () => {
    // 1월 초는 전년 12월의 대설(子월) 구간이거나 소한(丑월) 구간
    const { current } = findMonthPeriod(new Date('2000-01-01T00:00:00Z'));
    expect(current.name).toBe('대설');
    expect(current.branchIndex).toBe(0); // 子
  });

  it('12절만 월 경계가 된다', () => {
    const boundaries = solarTermsForYear(2000).filter((t) => t.isMonthBoundary);
    expect(boundaries).toHaveLength(12);
    // 중기(기)는 경계가 아니다
    expect(boundaries.find((t) => t.name === '춘분')).toBeUndefined();
  });
});
