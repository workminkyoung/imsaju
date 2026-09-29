/**
 * 사주 계산의 시간 처리.
 *
 * 만세력 결과가 서비스마다 갈리는 가장 큰 원인이 여기다. 세 가지를 분리해서 다룬다.
 *
 *   1. 벽시계 시각 → 절대 시각(UTC)
 *      한국 표준시는 여러 번 바뀌었다(1908 지방시, 1912/1954/1961 표준자오선 변경,
 *      1948~1960·1987~88 서머타임). 이걸 손으로 표에 적으면 반드시 틀린다.
 *      대신 Node 내장 ICU의 IANA tz 데이터베이스를 그대로 쓴다.
 *
 *   2. 절대 시각 → 진태양시
 *      사주의 시주는 표준시가 아니라 출생지에서 태양이 실제로 어디 있는지로 정한다.
 *      경도만 더하면 평균태양시, 균시차까지 더하면 진태양시가 된다.
 *
 *   3. 계산 근거 기록
 *      어떤 오프셋이 적용됐고 얼마나 보정됐는지를 결과에 남긴다. 이게 신빙성의 실체다.
 */

import { Body, HourAngle, Observer } from 'astronomy-engine';

/** 한국 표준시 자오선(동경 135도)과 서울의 경도 */
export const KOREA_STANDARD_MERIDIAN = 135;
export const SEOUL_LONGITUDE = 126.9784;

// ── 1. 타임존 ─────────────────────────────────────────────────────────────

/**
 * 주어진 순간에 해당 타임존이 UTC보다 몇 밀리초 앞서는지.
 *
 * 1900년 서울의 +08:27:52 처럼 분 단위가 아닌 과거 지방시도 초 단위까지 잡아낸다.
 */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');

  // 해당 타임존의 벽시계 값을 UTC인 척 재조립해서 원래 순간과 뺀다.
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asIfUtc - instant.getTime();
}

export interface WallClockResolution {
  /** 절대 시각 */
  utc: Date;
  /** 적용된 UTC 오프셋 (밀리초) */
  offsetMs: number;
  /** "UTC+09:00" 같은 표시용 문자열 */
  offsetLabel: string;
  /**
   * 그 지역의 표준 오프셋보다 앞서 있으면 true = 서머타임 구간.
   * 1954~1961 처럼 표준시 자체가 달랐던 시기는 서머타임이 아니므로 구분한다.
   */
  isDaylightSaving: boolean;
  /** 서머타임 시작 등으로 존재하지 않는 벽시계 시각이었다면 true */
  nonexistent: boolean;
}

/**
 * 벽시계 시각(사람이 출생신고서에 적은 그 시각)을 절대 시각으로 바꾼다.
 *
 * 오프셋은 결과에 의존하고 결과는 오프셋에 의존하므로 두 번 반복해 수렴시킨다.
 * 이것만으로 표준자오선 변경과 서머타임이 전부 자동으로 맞는다.
 */
export function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): WallClockResolution {
  const naive = Date.UTC(year, month - 1, day, hour, minute);

  let offsetMs = timeZoneOffsetMs(new Date(naive), timeZone);
  offsetMs = timeZoneOffsetMs(new Date(naive - offsetMs), timeZone);
  const utc = new Date(naive - offsetMs);

  // 되돌려봐서 원래 벽시계와 다르면 존재하지 않는 시각(서머타임 시작 직후 한 시간)이다.
  const roundTrip = utc.getTime() + timeZoneOffsetMs(utc, timeZone);
  const nonexistent = roundTrip !== naive;

  return {
    utc,
    offsetMs,
    offsetLabel: formatOffset(offsetMs),
    isDaylightSaving: isDaylightSaving(utc, timeZone),
    nonexistent,
  };
}

/** 밀리초 오프셋 → "UTC+09:00" / "UTC+08:27:52" */
export function formatOffset(offsetMs: number): string {
  const sign = offsetMs < 0 ? '-' : '+';
  const total = Math.abs(Math.round(offsetMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `UTC${sign}${pad(h)}:${pad(m)}${s ? ':' + pad(s) : ''}`;
}

/**
 * 이 순간이 서머타임 구간인지.
 *
 * 그 해의 1월과 7월 오프셋 중 작은 쪽을 표준으로 보고, 지금이 그보다 앞서면 서머타임.
 * 1954~1961처럼 표준시 자체가 +8:30이던 시기는 연중 내내 같으므로 false가 된다.
 */
export function isDaylightSaving(instant: Date, timeZone: string): boolean {
  const year = Number(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(instant),
  );
  const jan = timeZoneOffsetMs(new Date(Date.UTC(year, 0, 15)), timeZone);
  const jul = timeZoneOffsetMs(new Date(Date.UTC(year, 6, 15)), timeZone);
  return timeZoneOffsetMs(instant, timeZone) > Math.min(jan, jul);
}

// ── 2. 진태양시 ───────────────────────────────────────────────────────────

/**
 * 균시차(Equation of Time): 진태양시 − 평균태양시, 분 단위.
 *
 * 지구 궤도가 타원이고 자전축이 기울어 있어 태양은 매일 같은 속도로 하늘을 돌지 않는다.
 * 연중 최대 ±16분까지 벌어지므로, 시주 경계에 가까운 출생은 이것만으로 시진이 바뀐다.
 *
 * 본초자오선 관측자가 본 태양의 시각(hour angle)과 UTC의 차이로 구한다.
 */
export function equationOfTimeMinutes(instant: Date): number {
  // 경도 0, 위도 0. 균시차는 위도와 무관하다.
  const greenwich = new Observer(0, 0, 0);

  // 태양의 시각(0~24). 자오선 통과가 0이므로 +12시간이 겉보기 태양시가 된다.
  const apparentSolarHours = (HourAngle(Body.Sun, instant, greenwich) + 12) % 24;

  const utcHours =
    instant.getUTCHours() +
    instant.getUTCMinutes() / 60 +
    instant.getUTCSeconds() / 3600 +
    instant.getUTCMilliseconds() / 3_600_000;

  let diff = apparentSolarHours - utcHours;
  // 날짜 경계를 넘나들며 ±24시간으로 튀는 것을 접는다.
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;

  return diff * 60;
}

export type SolarTimeMode = 'none' | 'longitude' | 'apparent';

export interface SolarTimeResult {
  /**
   * 보정된 지방시를 "UTC인 척하는 Date" 로 담은 값.
   * getUTCHours() 등으로 읽으면 그 지역의 태양시가 나온다. 일주·시주 판정에만 쓴다.
   */
  local: Date;
  /** 표준시 대비 총 보정량 (분). 서울·경도보정이면 약 -32 */
  totalCorrectionMinutes: number;
  /** 경도 보정분 */
  longitudeCorrectionMinutes: number;
  /** 균시차 보정분 (mode가 apparent일 때만 0이 아님) */
  equationOfTimeMinutes: number;
}

/**
 * 절대 시각을 출생지 기준 태양시로 바꾼다.
 *
 * - `none`      입력한 표준시를 그대로 쓴다 (standardOffsetMs 로 되돌린다)
 * - `longitude` 경도 기준 평균태양시. 국내 만세력의 일반적인 관행이다.
 * - `apparent`  균시차까지 반영한 진짜 진태양시.
 */
export function toSolarTime(
  utc: Date,
  longitude: number,
  mode: SolarTimeMode,
  standardOffsetMs: number,
): SolarTimeResult {
  if (mode === 'none') {
    return {
      local: new Date(utc.getTime() + standardOffsetMs),
      totalCorrectionMinutes: 0,
      longitudeCorrectionMinutes: 0,
      equationOfTimeMinutes: 0,
    };
  }

  const longitudeOffsetMs = (longitude / 15) * 3_600_000;
  const eotMinutes = mode === 'apparent' ? equationOfTimeMinutes(utc) : 0;
  const local = new Date(utc.getTime() + longitudeOffsetMs + eotMinutes * 60_000);

  // 입력된 표준시 대비 얼마나 움직였는지 (사용자에게 보여줄 값)
  const totalCorrectionMinutes = (longitudeOffsetMs - standardOffsetMs) / 60_000 + eotMinutes;

  return {
    local,
    totalCorrectionMinutes,
    longitudeCorrectionMinutes: (longitudeOffsetMs - standardOffsetMs) / 60_000,
    equationOfTimeMinutes: eotMinutes,
  };
}

// ── 3. 표시 헬퍼 ──────────────────────────────────────────────────────────

/** "UTC인 척하는 Date" 를 YYYY-MM-DD HH:mm 으로 */
export function formatPseudoUtc(d: Date, withSeconds = false): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const base =
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getUTCSeconds())}` : base;
}

/** 절대 시각을 특정 타임존의 벽시계 문자열로 */
export function formatInZone(instant: Date, timeZone: string, withSeconds = false): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const base = `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
  return withSeconds ? `${base}:${g('second')}` : base;
}

/** "UTC인 척하는 Date" 의 율리우스 적일(정오 기준 정수). 일주 계산에 쓴다. */
export function julianDayNumber(pseudoUtc: Date): number {
  let y = pseudoUtc.getUTCFullYear();
  let m = pseudoUtc.getUTCMonth() + 1;
  const d = pseudoUtc.getUTCDate();
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524
  );
}
