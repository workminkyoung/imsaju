/**
 * 음력 → 양력 변환.
 *
 * 한국 음력은 중국 농력과 윤달 위치가 다를 수 있다. 같은 천문 현상(삭)을 쓰지만
 * 한국은 UTC+9, 중국은 UTC+8 기준으로 날짜를 끊기 때문이다.
 * 그래서 중국 계열 라이브러리가 아니라 한국천문연구원(KASI) 자료 기반 라이브러리를 쓴다.
 */

import KoreanLunarCalendar from 'korean-lunar-calendar';

/** 이 라이브러리가 다루는 범위 */
export const LUNAR_RANGE = {
  minYear: 1000,
  maxYear: 2050,
} as const;

export interface LunarToSolarResult {
  year: number;
  month: number;
  day: number;
}

/**
 * 음력 날짜를 양력으로 바꾼다.
 *
 * 윤달이 없는 달에 `isLeapMonth: true` 를 주는 등 불가능한 입력은 예외를 던진다.
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): LunarToSolarResult {
  const calendar = new KoreanLunarCalendar();

  if (!calendar.setLunarDate(year, month, day, isLeapMonth)) {
    throw new Error(
      isLeapMonth
        ? `음력 ${year}년 윤${month}월 ${day}일은 존재하지 않습니다. 그 해 그 달에 윤달이 있는지 확인해 주세요.`
        : `음력 ${year}년 ${month}월 ${day}일은 존재하지 않습니다.`,
    );
  }

  const solar = calendar.getSolarCalendar();
  return { year: solar.year, month: solar.month, day: solar.day };
}

/** 양력 날짜를 음력으로 (결과 화면 표시용) */
export function solarToLunar(
  year: number,
  month: number,
  day: number,
): { year: number; month: number; day: number; isLeapMonth: boolean } | null {
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setSolarDate(year, month, day)) return null;

  const lunar = calendar.getLunarCalendar();
  return {
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    isLeapMonth: Boolean(lunar.intercalation),
  };
}

/** 해당 음력 연·월에 윤달이 존재하는지 (입력 폼에서 체크박스를 열지 판단) */
export function hasLeapMonth(year: number, month: number): boolean {
  const calendar = new KoreanLunarCalendar();
  return calendar.setLunarDate(year, month, 1, true);
}
