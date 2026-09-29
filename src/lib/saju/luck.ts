/**
 * 대운(大運)과 세운(歲運).
 *
 * 대운은 10년마다 바뀌는 큰 흐름으로, 월주에서 출발해 순행 또는 역행한다.
 * 언제 시작하느냐(대운수)는 출생 시각과 절입 시각의 거리로 정한다.
 */

import { makePillar, type Pillar } from './pillars';
import { ipchunOf, type SolarTermInstant } from './solarTerms';
import { STEM_YIN_YANG } from './constants';

export type Gender = 'male' | 'female';

export interface DaeunEntry {
  /** 1부터 시작하는 순번 */
  order: number;
  /** 이 대운이 시작되는 만 나이 */
  startAge: number;
  /** 이 대운이 시작되는 서기 연도 */
  startYear: number;
  pillar: Pillar;
}

export interface SeunEntry {
  year: number;
  age: number;
  pillar: Pillar;
}

export interface LuckCycles {
  /** true = 순행(월주 다음 간지부터), false = 역행 */
  forward: boolean;
  /** 대운수. 첫 대운이 시작되는 만 나이. */
  startAge: number;
  /** 대운 시작까지의 정확한 간격 */
  startAfter: { years: number; months: number; days: number; hours: number };
  /** 대운이 실제로 시작되는 절대 시각 */
  startDate: Date;
  /** 기준이 된 절입 (순행이면 다음 절, 역행이면 직전 절) */
  referenceTerm: SolarTermInstant;
  list: DaeunEntry[];
}

/** 1분 = 2시간, 12분 = 1일, 360분 = 1개월, 4320분(3일) = 1년 */
const MINUTES_PER_YEAR = 4320;
const MINUTES_PER_MONTH = 360;
const MINUTES_PER_DAY = 12;

/**
 * 대운을 계산한다.
 *
 * 순행/역행은 연간의 음양과 성별로 정해진다.
 *   양년 남자 · 음년 여자 → 순행 (다음 절기를 향해 나아감)
 *   음년 남자 · 양년 여자 → 역행 (지난 절기를 거슬러 감)
 *
 * 대운수는 출생 시각에서 그 방향의 절입까지 걸리는 시간을
 * "3일 = 1년" 비율로 환산해 구한다.
 */
export function computeDaeun(
  birthUtc: Date,
  /** 양력 달력상의 출생 연도. 사주년(입춘 기준)이 아니다. */
  birthYear: number,
  yearStemIndex: number,
  monthPillarIndex: { stemIndex: number; branchIndex: number },
  monthPeriod: { current: SolarTermInstant; next: SolarTermInstant },
  dayStemIndex: number,
  gender: Gender,
  count = 10,
): LuckCycles {
  const isYangYear = STEM_YIN_YANG[yearStemIndex] === '양';
  const forward = (isYangYear && gender === 'male') || (!isYangYear && gender === 'female');

  const referenceTerm = forward ? monthPeriod.next : monthPeriod.current;
  const spanMinutes = Math.abs(referenceTerm.date.getTime() - birthUtc.getTime()) / 60_000;

  let remaining = spanMinutes;
  const years = Math.floor(remaining / MINUTES_PER_YEAR);
  remaining -= years * MINUTES_PER_YEAR;
  const months = Math.floor(remaining / MINUTES_PER_MONTH);
  remaining -= months * MINUTES_PER_MONTH;
  const days = Math.floor(remaining / MINUTES_PER_DAY);
  remaining -= days * MINUTES_PER_DAY;
  const hours = Math.round(remaining * 2);

  // 대운이 실제로 시작되는 시점. 개월·일수까지 반영한다.
  const startDate = new Date(birthUtc.getTime());
  startDate.setUTCFullYear(startDate.getUTCFullYear() + years);
  startDate.setUTCMonth(startDate.getUTCMonth() + months);
  startDate.setUTCDate(startDate.getUTCDate() + days);
  startDate.setUTCHours(startDate.getUTCHours() + hours);

  // 대운수는 연수만 세면 안 된다. 6년 11개월이면 사실상 7년째에 시작하므로,
  // 개월·일수까지 더한 실제 달력 연도에서 나이를 역산한다.
  const firstStartYear = startDate.getUTCFullYear();
  const firstStartAge = firstStartYear - birthYear;

  const list: DaeunEntry[] = [];
  for (let i = 1; i <= count; i++) {
    const step = forward ? i : -i;
    list.push({
      order: i,
      startAge: firstStartAge + (i - 1) * 10,
      startYear: firstStartYear + (i - 1) * 10,
      pillar: makePillar(
        monthPillarIndex.stemIndex + step,
        monthPillarIndex.branchIndex + step,
        dayStemIndex,
      ),
    });
  }

  return {
    forward,
    startAge: firstStartAge,
    startAfter: { years, months, days, hours },
    startDate,
    referenceTerm,
    list,
  };
}

/**
 * 세운(그 해의 간지). 입춘을 기준으로 바뀐다.
 *
 * 올해부터 앞으로 count 년치를 낸다.
 */
export function computeSeun(
  fromYear: number,
  /** 양력 달력상의 출생 연도. 대운 나이와 같은 기준을 쓴다. */
  birthYear: number,
  dayStemIndex: number,
  count = 10,
): SeunEntry[] {
  const list: SeunEntry[] = [];
  for (let i = 0; i < count; i++) {
    const year = fromYear + i;
    const ganji = ((((year - 4) % 60) + 60) % 60);
    list.push({
      year,
      age: year - birthYear, // 만 나이. 대운 표기와 기준을 맞춘다.
      pillar: makePillar(ganji % 10, ganji % 12, dayStemIndex),
    });
  }
  return list;
}

/** 지금 이 순간이 사주에서 몇 년도인지 (세운 시작점 결정용) */
export function currentSajuYear(now = new Date()): number {
  const year = now.getUTCFullYear();
  return now.getTime() < ipchunOf(year).getTime() ? year - 1 : year;
}
