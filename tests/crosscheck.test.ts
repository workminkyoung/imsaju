/**
 * 교차검증: 우리 엔진 vs lunar-javascript (6tail).
 *
 * 이게 이 프로젝트에서 가장 중요한 테스트다. 우리 계산은 독자 구현이지만,
 * 널리 쓰이는 성숙한 독립 구현과 수천 건을 대조해 전부 일치하면
 * "신빙성 있다"고 말할 근거가 생긴다.
 *
 * 비교를 성립시키는 요령:
 *   lunar-javascript 는 입력을 베이징 벽시계 시각으로 본다.
 *   우리 엔진에 경도 120도(베이징 표준자오선) + 균시차 OFF 를 주면
 *   지방 태양시가 정확히 베이징 표준시가 되므로 두 엔진의 조건이 같아진다.
 */

import { describe, expect, it } from 'vitest';
import pkg from 'lunar-javascript';
import { computeFourPillars } from '@/lib/saju/pillars';

const { Solar } = pkg as {
  Solar: {
    fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): LunarSolar;
  };
};

interface LunarSolar {
  getLunar(): { getEightChar(): EightChar };
}
interface EightChar {
  setSect(sect: number): void;
  getYear(): string;
  getMonth(): string;
  getDay(): string;
  getTime(): string;
}

/** 베이징 벽시계 시각을 절대 시각으로. 중국은 1991년 이후 서머타임이 없고 늘 UTC+8. */
function beijingToUtc(y: number, m: number, d: number, h: number, mi: number): Date {
  return new Date(Date.UTC(y, m - 1, d, h, mi) - 8 * 3_600_000);
}

/** 우리 엔진을 "베이징 표준시" 조건으로 돌린다. */
function ourPillars(y: number, m: number, d: number, h: number, mi: number, lateZiHour: boolean) {
  const utc = beijingToUtc(y, m, d, h, mi);
  // 경도 120도 → 지방 평균태양시 = UTC+8 = 베이징 표준시
  const localSolar = new Date(utc.getTime() + (120 / 15) * 3_600_000);
  const p = computeFourPillars({ utc, localSolar, lateZiHour, timeKnown: true });
  return { year: p.year.ganji, month: p.month.ganji, day: p.day.ganji, hour: p.hour!.ganji };
}

/** lunar-javascript 결과. sect 1 = 야자시에 일주를 넘김, sect 2 = 안 넘김. */
function theirPillars(y: number, m: number, d: number, h: number, mi: number, lateZiHour: boolean) {
  const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
  ec.setSect(lateZiHour ? 2 : 1);
  return { year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), hour: ec.getTime() };
}

/** 재현 가능한 의사난수 (테스트가 매번 같은 케이스를 돌도록) */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('lunar-javascript 교차검증', () => {
  it('1900~2050년 무작위 2000건의 4주가 전부 일치한다', () => {
    const random = makeRandom(20260929);
    const mismatches: string[] = [];

    for (let i = 0; i < 2000; i++) {
      const y = 1900 + Math.floor(random() * 151);
      const m = 1 + Math.floor(random() * 12);
      const d = 1 + Math.floor(random() * 28);
      const h = Math.floor(random() * 24);
      const mi = Math.floor(random() * 60);
      const lateZiHour = random() < 0.5;

      const ours = ourPillars(y, m, d, h, mi, lateZiHour);
      const theirs = theirPillars(y, m, d, h, mi, lateZiHour);

      if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
        mismatches.push(
          `${y}-${m}-${d} ${h}:${mi} (야자시=${lateZiHour})\n` +
            `      우리: ${JSON.stringify(ours)}\n` +
            `      저쪽: ${JSON.stringify(theirs)}`,
        );
      }
    }

    expect(mismatches.slice(0, 10).join('\n')).toBe('');
    expect(mismatches).toHaveLength(0);
  });

  it('절입 경계 전후 1분에서도 일치한다', () => {
    // 입춘·경칩 등 절입 순간 근처는 월주가 바뀌는 지점이라 오차가 바로 드러난다.
    const cases: Array<[number, number, number, number, number]> = [
      [1990, 2, 4, 8, 14], [1990, 2, 4, 8, 16],
      [2000, 2, 4, 20, 40], [2000, 2, 4, 20, 42],
      [2024, 2, 4, 16, 26], [2024, 2, 4, 16, 28],
      [2026, 2, 4, 4, 1], [2026, 2, 4, 4, 3],
    ];
    for (const [y, m, d, h, mi] of cases) {
      expect(ourPillars(y, m, d, h, mi, false), `${y}-${m}-${d} ${h}:${mi}`)
        .toEqual(theirPillars(y, m, d, h, mi, false));
    }
  });

  it('자시 경계(22:59 / 23:01 / 00:01)에서 두 관법 모두 일치한다', () => {
    for (const lateZiHour of [false, true]) {
      for (const [h, mi] of [[22, 59], [23, 1], [23, 59], [0, 1]] as const) {
        expect(ourPillars(1995, 7, 15, h, mi, lateZiHour), `${h}:${mi} 야자시=${lateZiHour}`)
          .toEqual(theirPillars(1995, 7, 15, h, mi, lateZiHour));
      }
    }
  });
});
