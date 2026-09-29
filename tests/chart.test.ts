/**
 * computeSaju 전체 파이프라인 검증.
 *
 * 교차검증(crosscheck)이 간지 산출을 보증하므로, 여기서는 한국 조건에서만 생기는
 * 경계 — 표준시 변경, 서머타임, 진태양시로 시진이 넘어가는 경우, 음력·윤달 —
 * 을 집중적으로 본다.
 */

import { describe, expect, it } from 'vitest';
import { computeSaju } from '@/lib/saju';
import { lunarToSolar, solarToLunar } from '@/lib/lunar';

const base = {
  name: '테스트',
  calendar: 'solar' as const,
  gender: 'male' as const,
  city: '서울',
};

describe('기본 동작', () => {
  const chart = computeSaju({ ...base, year: 1990, month: 3, day: 15, hour: 13, minute: 20 });

  it('네 기둥을 모두 낸다', () => {
    expect(chart.pillars.year.ganji).toBe('庚午');
    expect(chart.pillars.month.ganji).toBe('己卯');
    expect(chart.pillars.day.ganji).toBe('己卯');
    expect(chart.pillars.hour!.ganji).toBe('庚午');
  });

  it('일간과 파생 정보를 채운다', () => {
    expect(chart.dayMaster.stem).toBe('己');
    expect(chart.dayMaster.element).toBe('토');
    expect(chart.dayMaster.yinYang).toBe('음');
    expect(chart.zodiac).toBe('말');
    // 己卯일은 갑술순 → 공망은 申酉
    expect(chart.voidBranches).toEqual(['申', '酉']);
  });

  it('오행 백분율의 합이 100이다', () => {
    const sum = Object.values(chart.analysis.elements.percentages).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('없는 오행을 찾아낸다', () => {
    expect(chart.analysis.elements.missing).toContain('수');
  });

  it('대운은 월주에서 이어지고 10년 간격이다', () => {
    // 庚午(양간)년 남자 → 순행. 월주 己卯 다음은 庚辰.
    expect(chart.daeun.forward).toBe(true);
    expect(chart.daeun.list[0].pillar.ganji).toBe('庚辰');
    expect(chart.daeun.list[1].pillar.ganji).toBe('辛巳');
    expect(chart.daeun.list[1].startAge - chart.daeun.list[0].startAge).toBe(10);
  });

  it('계산 근거에 경도 보정을 남긴다', () => {
    expect(chart.basis.longitudeCorrectionMinutes).toBeCloseTo(-32.1, 1);
    expect(chart.basis.correctedLocalTime).toBe('1990-03-15 12:47');
    expect(chart.basis.offsetLabel).toBe('UTC+09:00');
  });
});

describe('대운 순행·역행', () => {
  const at = (gender: 'male' | 'female', year: number) =>
    computeSaju({ ...base, gender, year, month: 6, day: 15, hour: 12, minute: 0 }).daeun.forward;

  it('양년 남자와 음년 여자는 순행', () => {
    expect(at('male', 1990)).toBe(true); //   庚午년 = 양
    expect(at('female', 1991)).toBe(true); // 辛未년 = 음
  });

  it('음년 남자와 양년 여자는 역행', () => {
    expect(at('male', 1991)).toBe(false);
    expect(at('female', 1990)).toBe(false);
  });
});

describe('한국 표준시 이력이 결과에 반영된다', () => {
  it('1988년 서머타임 구간을 근거에 표시한다', () => {
    const chart = computeSaju({ ...base, year: 1988, month: 6, day: 15, hour: 9, minute: 0 });
    expect(chart.basis.offsetLabel).toBe('UTC+10:00');
    expect(chart.basis.isDaylightSaving).toBe(true);
  });

  it('1955년은 표준시 +8:30이지만 서머타임은 아니다', () => {
    const chart = computeSaju({ ...base, year: 1955, month: 1, day: 15, hour: 9, minute: 0 });
    expect(chart.basis.offsetLabel).toBe('UTC+08:30');
    expect(chart.basis.isDaylightSaving).toBe(false);
  });

  it('서머타임을 무시하면 시주가 달라진다', () => {
    // 1988-06-15 09:00 은 서머타임이라 실제 태양시로는 07:xx 대다.
    // 서머타임을 반영하지 않았다면 08:xx 가 되어 시지가 辰에서 바뀌지 않지만,
    // 경계 시각에서는 이 차이가 시주를 통째로 바꾼다.
    const withDst = computeSaju({ ...base, year: 1988, month: 6, day: 15, hour: 8, minute: 0 });
    expect(withDst.basis.offsetLabel).toBe('UTC+10:00');
    // 08:00 KDT = 22:00Z 전날 → 경도보정 후 06:27 → 卯시
    expect(withDst.pillars.hour!.branch).toBe('卯');
  });
});

describe('진태양시 보정이 시주를 바꾸는 경계', () => {
  it('보정하면 시진이 하나 앞으로 넘어가는 경우를 잡아낸다', () => {
    // 서울 13:00 은 보정하면 12:28 → 午시로 같지만,
    // 13:10 은 보정하면 12:38 로 여전히 午. 13:40 은 13:08 → 未시.
    const at1300 = computeSaju({ ...base, year: 2000, month: 5, day: 10, hour: 13, minute: 0 });
    const at1340 = computeSaju({ ...base, year: 2000, month: 5, day: 10, hour: 13, minute: 40 });
    expect(at1300.pillars.hour!.branch).toBe('午');
    expect(at1340.pillars.hour!.branch).toBe('未');
  });

  it("보정 없음('none')과 경도 보정이 다른 결과를 낼 수 있다", () => {
    const corrected = computeSaju({
      ...base, year: 2000, month: 5, day: 10, hour: 13, minute: 10,
    });
    const raw = computeSaju({
      ...base, year: 2000, month: 5, day: 10, hour: 13, minute: 10, solarTimeMode: 'none',
    });
    expect(corrected.pillars.hour!.branch).toBe('午'); // 12:38
    expect(raw.pillars.hour!.branch).toBe('未'); //       13:10
  });
});

describe('야자시 관법', () => {
  const at23 = (lateZiHour: boolean) =>
    computeSaju({ ...base, year: 2000, month: 5, day: 10, hour: 23, minute: 40, lateZiHour });

  it('기본(야자시 미적용)은 일주를 다음 날로 넘긴다', () => {
    const chart = at23(false);
    expect(chart.basis.dayRolledOver).toBe(true);
  });

  it('야자시를 적용하면 일주를 넘기지 않는다', () => {
    const chart = at23(true);
    expect(chart.basis.dayRolledOver).toBe(false);
  });

  it('두 관법의 일주가 하루 차이난다', () => {
    const rolled = at23(false).pillars.day.index;
    const kept = at23(true).pillars.day.index;
    expect((kept + 1) % 60).toBe(rolled);
  });
});

describe('시각을 모르는 경우', () => {
  const chart = computeSaju({ ...base, year: 1990, month: 3, day: 15, timeUnknown: true });

  it('시주를 만들지 않는다', () => {
    expect(chart.pillars.hour).toBeNull();
  });

  it('나머지 세 기둥은 시각 입력과 동일하다', () => {
    const withTime = computeSaju({ ...base, year: 1990, month: 3, day: 15, hour: 12, minute: 0 });
    expect(chart.pillars.year.ganji).toBe(withTime.pillars.year.ganji);
    expect(chart.pillars.month.ganji).toBe(withTime.pillars.month.ganji);
    expect(chart.pillars.day.ganji).toBe(withTime.pillars.day.ganji);
  });

  it('오행 분포는 여섯 글자만 센다', () => {
    const counts = Object.values(chart.analysis.elements.counts).reduce((a, b) => a + b, 0);
    expect(counts).toBe(6);
  });
});

describe('음력 입력', () => {
  it('음력을 양력으로 바꿔 계산한다', () => {
    const lunarChart = computeSaju({
      ...base, calendar: 'lunar', year: 1990, month: 2, day: 19, hour: 13, minute: 20,
    });
    const solarChart = computeSaju({
      ...base, year: 1990, month: 3, day: 15, hour: 13, minute: 20,
    });
    expect(lunarChart.basis.convertedSolarDate).toBe('1990-03-15');
    expect(lunarChart.pillars.day.ganji).toBe(solarChart.pillars.day.ganji);
  });

  it('양력↔음력 변환이 왕복한다', () => {
    const lunar = solarToLunar(1990, 3, 15);
    expect(lunar).not.toBeNull();
    const back = lunarToSolar(lunar!.year, lunar!.month, lunar!.day, lunar!.isLeapMonth);
    expect(back).toEqual({ year: 1990, month: 3, day: 15 });
  });

  it('존재하지 않는 윤달은 거부한다', () => {
    // 1990년 음력 2월에는 윤달이 없다.
    expect(() => lunarToSolar(1990, 2, 19, true)).toThrow(/윤달|존재하지/);
  });

  it('실제 윤달을 변환한다', () => {
    // 2020년은 윤4월이 있었다.
    const solar = lunarToSolar(2020, 4, 1, true);
    expect(solar.year).toBe(2020);
    expect(solar.month).toBe(5);
  });
});

describe('입춘 경계', () => {
  it('입춘 직전 출생은 전년도 연주를 쓴다', () => {
    // 2000년 입춘은 2000-02-04 20:40 KST 부근
    const before = computeSaju({ ...base, year: 2000, month: 2, day: 4, hour: 19, minute: 0 });
    const after = computeSaju({ ...base, year: 2000, month: 2, day: 5, hour: 12, minute: 0 });
    expect(before.sajuYear).toBe(1999);
    expect(after.sajuYear).toBe(2000);
    expect(before.pillars.year.ganji).toBe('己卯');
    expect(after.pillars.year.ganji).toBe('庚辰');
  });
});
