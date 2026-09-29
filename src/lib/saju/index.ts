/**
 * 만세력 계산의 진입점.
 *
 * 이 함수는 LLM을 전혀 쓰지 않는다. 같은 입력이면 항상 같은 결과가 나오고,
 * 그래서 검증할 수 있다. 사주풀이 텍스트 생성은 이 결과를 받아 별도 단계에서 한다.
 */

import { DEFAULT_CITY, findCity } from '../cities';
import { lunarToSolar, solarToLunar } from '../lunar';
import { analyzeChart } from './analyze';
import { ZODIAC_KO } from './constants';
import { computeDaeun, computeSeun, currentSajuYear } from './luck';
import { computeFourPillars } from './pillars';
import { ipchunOf } from './solarTerms';
import {
  formatInZone,
  formatPseudoUtc,
  toSolarTime,
  wallClockToUtc,
  type SolarTimeMode,
} from './time';
import type { CalculationBasis, SajuChart, SajuInput } from './types';

export * from './constants';
export * from './types';
export { analyzeChart } from './analyze';

/** 절기 시각을 사람에게 보여줄 때 쓰는 타임존 */
const DISPLAY_TZ = 'Asia/Seoul';

export function computeSaju(input: SajuInput): SajuChart {
  const {
    calendar,
    year,
    month,
    day,
    isLeapMonth = false,
    timeUnknown = false,
    gender,
    solarTimeMode = 'longitude' as SolarTimeMode,
    lateZiHour = false,
  } = input;

  // ── 출생지 ──
  const city = input.city ? findCity(input.city) : undefined;
  const longitude = input.longitude ?? city?.longitude ?? DEFAULT_CITY.longitude;
  const timeZone = input.timeZone ?? city?.timeZone ?? DEFAULT_CITY.timeZone;
  const placeName = city?.name ?? (input.longitude !== undefined ? '직접 입력' : DEFAULT_CITY.name);

  // ── 1. 음력이면 양력으로 ──
  let solarYear = year;
  let solarMonth = month;
  let solarDay = day;
  let convertedSolarDate: string | undefined;

  if (calendar === 'lunar') {
    const converted = lunarToSolar(year, month, day, isLeapMonth);
    solarYear = converted.year;
    solarMonth = converted.month;
    solarDay = converted.day;
    convertedSolarDate = `${converted.year}-${pad(converted.month)}-${pad(converted.day)}`;
  }

  // 시각을 모르면 정오로 두되, 시주는 만들지 않는다.
  const hour = timeUnknown ? 12 : (input.hour ?? 0);
  const minute = timeUnknown ? 0 : (input.minute ?? 0);

  // ── 2. 벽시계 시각 → 절대 시각 ──
  // 과거 표준시 변경과 서머타임이 여기서 자동으로 반영된다.
  const resolved = wallClockToUtc(solarYear, solarMonth, solarDay, hour, minute, timeZone);

  // ── 3. 절대 시각 → 출생지 태양시 ──
  const solar = toSolarTime(resolved.utc, longitude, solarTimeMode, resolved.offsetMs);

  // ── 4. 네 기둥 ──
  const pillars = computeFourPillars({
    utc: resolved.utc,
    localSolar: solar.local,
    lateZiHour,
    timeKnown: !timeUnknown,
  });

  // ── 5. 분석 ──
  const analysis = analyzeChart(pillars);

  // ── 6. 대운·세운 ──
  // 나이 계산의 기준은 사주년(입춘 기준)이 아니라 양력 달력상의 출생 연도다.
  const daeun = computeDaeun(
    resolved.utc,
    solarYear,
    pillars.year.stemIndex,
    { stemIndex: pillars.month.stemIndex, branchIndex: pillars.month.branchIndex },
    pillars.monthPeriod,
    pillars.dayStemIndex,
    gender,
  );
  const seun = computeSeun(currentSajuYear(), solarYear, pillars.dayStemIndex);

  // ── 7. 계산 근거 ──
  const lunar = calendar === 'solar' ? solarToLunar(solarYear, solarMonth, solarDay) : null;

  const basis: CalculationBasis = {
    inputSummary:
      `${year}-${pad(month)}-${pad(day)} ` +
      `${timeUnknown ? '(시각 모름)' : `${pad(hour)}:${pad(minute)}`} ` +
      `${calendar === 'lunar' ? (isLeapMonth ? '음력 윤달' : '음력') : '양력'}`,
    convertedSolarDate,
    lunarDate: lunar
      ? `${lunar.year}-${pad(lunar.month)}-${pad(lunar.day)}${lunar.isLeapMonth ? ' (윤달)' : ''}`
      : undefined,
    place: { name: placeName, longitude, timeZone },
    offsetLabel: resolved.offsetLabel,
    isDaylightSaving: resolved.isDaylightSaving,
    nonexistentLocalTime: resolved.nonexistent,
    utcInstant: resolved.utc.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    solarTimeMode,
    totalCorrectionMinutes: round1(solar.totalCorrectionMinutes),
    longitudeCorrectionMinutes: round1(solar.longitudeCorrectionMinutes),
    equationOfTimeMinutes: round1(solar.equationOfTimeMinutes),
    correctedLocalTime: formatPseudoUtc(solar.local),
    monthTerm: {
      name: pillars.monthPeriod.current.name,
      startKst: formatInZone(pillars.monthPeriod.current.date, DISPLAY_TZ),
      endName: pillars.monthPeriod.next.name,
      endKst: formatInZone(pillars.monthPeriod.next.date, DISPLAY_TZ),
    },
    ipchunKst: formatInZone(ipchunOf(pillars.sajuYear), DISPLAY_TZ),
    lateZiHour,
    dayRolledOver: pillars.dayRolledOver,
  };

  return {
    input,
    sajuYear: pillars.sajuYear,
    pillars: {
      year: pillars.year,
      month: pillars.month,
      day: pillars.day,
      hour: pillars.hour,
    },
    dayMaster: {
      stem: pillars.day.stem,
      stemKo: pillars.day.stemKo,
      element: pillars.day.stemElement,
      yinYang: pillars.day.stemYinYang,
    },
    voidBranches: pillars.voidBranches,
    zodiac: ZODIAC_KO[pillars.year.branchIndex],
    analysis,
    daeun,
    seun,
    basis,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const round1 = (n: number) => Math.round(n * 10) / 10;
