/**
 * 24절기 계산.
 *
 * 사주의 연주·월주 경계는 음력 달이 아니라 태양의 겉보기 황경이 정한다.
 * 근사표를 쓰면 절입일 근처 출생에서 반드시 틀리므로, 천문 계산으로 직접 구한다.
 *
 * 절입 시각은 절대 시각이라 타임존과 무관하다. 출생 순간(UTC)과 바로 비교하면 된다.
 */

import { SearchSunLongitude } from 'astronomy-engine';
import { SOLAR_TERMS, type SolarTermDef } from './constants';

export interface SolarTermInstant extends SolarTermDef {
  /** 절입 순간 (절대 시각) */
  date: Date;
}

/** 연도별 절기 계산은 비싸므로 캐시한다. */
const cache = new Map<number, SolarTermInstant[]>();

/**
 * 태양 황경 L 에 도달하는 순간을 찾는다.
 *
 * SearchSunLongitude 는 탐색 창이 너무 넓으면 null 을 반환하므로,
 * 평균 황경 근사식 L ≈ 280 + 0.98565 × (연중 일수) 로 좁은 창을 먼저 잡는다.
 */
function findTerm(year: number, longitude: number): Date {
  const approxDayOfYear = ((((longitude - 280) / 0.98565) % 365.2422) + 365.2422) % 365.2422;
  const start = new Date(Date.UTC(year, 0, 1) + (approxDayOfYear - 5) * 86_400_000);

  const found = SearchSunLongitude(longitude, start, 12);
  if (!found) {
    throw new Error(`절기 계산 실패: ${year}년 황경 ${longitude}도`);
  }
  return found.date;
}

/** 해당 연도(양력 1~12월)에 드는 24절기 전부. */
export function solarTermsForYear(year: number): SolarTermInstant[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const terms = SOLAR_TERMS.map((def) => ({ ...def, date: findTerm(year, def.longitude) })).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  cache.set(year, terms);
  return terms;
}

/** 월주 경계가 되는 12절만. */
export function monthBoundaryTerms(year: number): SolarTermInstant[] {
  return solarTermsForYear(year).filter((t) => t.isMonthBoundary);
}

/**
 * 주어진 순간이 속한 월(月)의 시작 절과 다음 절.
 *
 * 연말·연초를 걸치므로 전년·당년·익년의 절을 모아서 찾는다.
 */
export function findMonthPeriod(instant: Date): { current: SolarTermInstant; next: SolarTermInstant } {
  const year = instant.getUTCFullYear();
  const candidates = [year - 1, year, year + 1]
    .flatMap((y) => monthBoundaryTerms(y))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const t = instant.getTime();
  const index = candidates.findLastIndex((term) => term.date.getTime() <= t);
  if (index < 0 || index + 1 >= candidates.length) {
    throw new Error('월주 경계를 찾을 수 없습니다. 지원 범위를 벗어난 날짜입니다.');
  }

  return { current: candidates[index], next: candidates[index + 1] };
}

/**
 * 사주에서 말하는 "해". 입춘을 기준으로 바뀐다.
 *
 * 1월 1일에 태어나도 아직 입춘 전이면 전년도 간지를 쓴다.
 */
export function sajuYear(instant: Date): number {
  const year = instant.getUTCFullYear();
  const ipchun = solarTermsForYear(year).find((t) => t.name === '입춘');
  if (!ipchun) throw new Error('입춘 계산 실패');
  return instant.getTime() < ipchun.date.getTime() ? year - 1 : year;
}

/** 해당 연도의 입춘 순간. 세운 계산에 쓴다. */
export function ipchunOf(year: number): Date {
  const t = solarTermsForYear(year).find((term) => term.name === '입춘');
  if (!t) throw new Error('입춘 계산 실패');
  return t.date;
}
