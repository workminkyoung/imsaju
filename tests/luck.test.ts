/**
 * 대운 검증.
 *
 * 대운은 유파 차이가 큰 영역이라, 이견이 없는 부분(순행/역행, 간지 배열)과
 * 독립 구현과 맞출 수 있는 부분(대운이 시작되는 달력 연도)을 나눠서 본다.
 */

import { describe, expect, it } from 'vitest';
import pkg from 'lunar-javascript';
import { computeSaju } from '@/lib/saju';
import type { SajuInput } from '@/lib/saju/types';

const { Solar } = pkg;

/**
 * lunar-javascript 로 같은 조건의 1대운 시작 연도를 구한다.
 * 입력을 베이징 벽시계로 주고, 우리도 경도 120도 조건으로 맞춘다.
 */
function theirFirstDaeunYear(
  y: number, m: number, d: number, h: number, mi: number, gender: 'male' | 'female',
): number {
  const yun = Solar.fromYmdHms(y, m, d, h, mi, 0)
    .getLunar()
    .getEightChar()
    .getYun(gender === 'male' ? 1 : 0, 2);
  return yun.getDaYun(2)[1].getStartYear();
}

function ourChart(
  y: number, m: number, d: number, h: number, mi: number, gender: 'male' | 'female',
) {
  const input: SajuInput = {
    name: '', calendar: 'solar', year: y, month: m, day: d, hour: h, minute: mi, gender,
    // 베이징 표준시 조건으로 맞춘다 (경도 120도 · 균시차 없음)
    longitude: 120, timeZone: 'Asia/Shanghai', solarTimeMode: 'longitude',
  };
  return computeSaju(input);
}

describe('대운 방향', () => {
  const dir = (y: number, gender: 'male' | 'female') =>
    ourChart(y, 6, 15, 12, 0, gender).daeun.forward;

  it('양년 남자 · 음년 여자는 순행', () => {
    expect(dir(1990, 'male')).toBe(true); //   庚午 = 양
    expect(dir(1991, 'female')).toBe(true); // 辛未 = 음
  });

  it('음년 남자 · 양년 여자는 역행', () => {
    expect(dir(1991, 'male')).toBe(false);
    expect(dir(1990, 'female')).toBe(false);
  });
});

describe('대운 간지 배열', () => {
  it('순행은 월주 다음 간지부터 하나씩 나아간다', () => {
    const chart = ourChart(1990, 3, 15, 12, 20, 'male');
    expect(chart.pillars.month.ganji).toBe('己卯');
    expect(chart.daeun.list.map((d) => d.pillar.ganji).slice(0, 4))
      .toEqual(['庚辰', '辛巳', '壬午', '癸未']);
  });

  it('역행은 월주 이전 간지로 거슬러 간다', () => {
    const chart = ourChart(1990, 3, 15, 12, 20, 'female');
    expect(chart.daeun.list.map((d) => d.pillar.ganji).slice(0, 4))
      .toEqual(['戊寅', '丁丑', '丙子', '乙亥']);
  });

  it('10주기를 낸다', () => {
    expect(ourChart(1990, 3, 15, 12, 20, 'male').daeun.list).toHaveLength(10);
  });
});

describe('대운 시작 연도가 독립 구현과 일치한다', () => {
  const cases: Array<[number, number, number, number, number, 'male' | 'female']> = [
    [1990, 3, 15, 12, 20, 'male'],
    [1990, 3, 15, 12, 20, 'female'],
    [1985, 7, 20, 6, 0, 'male'],
    [2000, 11, 3, 21, 45, 'female'],
    [1975, 1, 8, 3, 30, 'male'],
    [2005, 9, 30, 17, 10, 'female'],
    [1968, 12, 25, 23, 50, 'male'],
    [2015, 4, 1, 9, 0, 'female'],
  ];

  it.each(cases)('%i-%i-%i %i:%i %s', (y, m, d, h, mi, gender) => {
    const ours = ourChart(y, m, d, h, mi, gender).daeun.list[0].startYear;
    expect(ours).toBe(theirFirstDaeunYear(y, m, d, h, mi, gender));
  });
});

describe('대운수와 나이 표기', () => {
  it('개월·일수까지 반영해 실제 시작 연도에서 나이를 역산한다', () => {
    const chart = ourChart(1990, 3, 15, 12, 20, 'male');
    // 청명까지 6년 11개월 남짓 → 7년째에 시작한다. 6이 아니다.
    expect(chart.daeun.startAfter.years).toBe(6);
    expect(chart.daeun.startAge).toBe(7);
    expect(chart.daeun.list[0].startYear).toBe(1997);
  });

  it('대운 나이는 10년 간격이다', () => {
    const list = ourChart(1990, 3, 15, 12, 20, 'male').daeun.list;
    for (let i = 1; i < list.length; i++) {
      expect(list[i].startAge - list[i - 1].startAge).toBe(10);
      expect(list[i].startYear - list[i - 1].startYear).toBe(10);
    }
  });

  it('세운 나이도 대운과 같은 기준(만 나이)을 쓴다', () => {
    const chart = ourChart(1990, 3, 15, 12, 20, 'male');
    const first = chart.seun[0];
    expect(first.age).toBe(first.year - 1990);
  });
});
