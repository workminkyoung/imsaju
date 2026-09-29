/**
 * 한국 표준시 이력과 진태양시 보정 검증.
 *
 * 만세력이 갈리는 지점 중 손으로 표를 적다가 가장 많이 틀리는 부분이다.
 * 우리는 표를 적지 않고 IANA tz 데이터베이스(Node 내장 ICU)에 맡겼으므로,
 * 그 위임이 실제로 옳게 동작하는지를 확인한다.
 */

import { describe, expect, it } from 'vitest';
import {
  equationOfTimeMinutes,
  formatOffset,
  timeZoneOffsetMs,
  toSolarTime,
  wallClockToUtc,
  SEOUL_LONGITUDE,
} from '@/lib/saju/time';

const SEOUL = 'Asia/Seoul';
const HOUR = 3_600_000;

describe('한국 표준시 이력', () => {
  it('시기별 UTC 오프셋이 실제 역사와 맞는다', () => {
    const at = (iso: string) => timeZoneOffsetMs(new Date(iso), SEOUL);

    // 1908년 이전: 서울 지방 평균시 (동경 126.9784도 → 약 +8시간 27분 52초)
    expect(at('1900-01-01T04:00:00Z')).toBe(8 * HOUR + 27 * 60_000 + 52_000);

    // 1908~1912: 동경 127.5도 기준 +8:30
    expect(at('1908-05-01T04:00:00Z')).toBe(8.5 * HOUR);

    // 1912~1954: 일본 표준시에 편입되어 +9
    expect(at('1912-06-01T04:00:00Z')).toBe(9 * HOUR);

    // 1954~1961: 동경 127.5도로 되돌아가 +8:30
    expect(at('1954-04-01T04:00:00Z')).toBe(8.5 * HOUR);

    // 1961년 이후 현재까지 +9
    expect(at('1961-09-01T04:00:00Z')).toBe(9 * HOUR);
    expect(at('2026-09-29T04:00:00Z')).toBe(9 * HOUR);
  });

  it('서머타임 구간을 잡아낸다', () => {
    const at = (iso: string) => timeZoneOffsetMs(new Date(iso), SEOUL);

    // 1955~1960 서머타임: 표준시가 +8:30이던 시기라 여름에는 +9:30
    expect(at('1957-06-15T04:00:00Z')).toBe(9.5 * HOUR);
    expect(at('1960-06-15T04:00:00Z')).toBe(9.5 * HOUR);

    // 1987~1988 서머타임: 표준시 +9 → 여름에는 +10
    expect(at('1987-06-15T04:00:00Z')).toBe(10 * HOUR);
    expect(at('1988-06-15T04:00:00Z')).toBe(10 * HOUR);

    // 같은 해 겨울은 표준시로 복귀
    expect(at('1988-01-15T04:00:00Z')).toBe(9 * HOUR);
  });

  it('서머타임 여부를 표준시 변경과 구분한다', () => {
    // 1988년 여름은 서머타임
    expect(wallClockToUtc(1988, 6, 15, 12, 0, SEOUL).isDaylightSaving).toBe(true);
    // 1957년 여름도 서머타임(표준시 +8:30 위의 +1시간)
    expect(wallClockToUtc(1957, 6, 15, 12, 0, SEOUL).isDaylightSaving).toBe(true);
    // 1956년 겨울은 표준시가 +8:30이지만 서머타임은 아니다
    expect(wallClockToUtc(1956, 1, 15, 12, 0, SEOUL).isDaylightSaving).toBe(false);
    // 평범한 현대 날짜
    expect(wallClockToUtc(1990, 3, 15, 13, 20, SEOUL).isDaylightSaving).toBe(false);
  });

  it('벽시계 시각을 절대 시각으로 정확히 되돌린다', () => {
    // 1988-06-15 09:00 KST(서머타임 +10) = 1988-06-14 23:00 UTC
    const r = wallClockToUtc(1988, 6, 15, 9, 0, SEOUL);
    expect(r.utc.toISOString()).toBe('1988-06-14T23:00:00.000Z');
    expect(r.offsetLabel).toBe('UTC+10:00');

    // 1955-06-15 09:00 KST(+9:30) = 1955-06-14 23:30 UTC
    expect(wallClockToUtc(1955, 6, 15, 9, 0, SEOUL).utc.toISOString())
      .toBe('1955-06-14T23:30:00.000Z');

    // 현대
    expect(wallClockToUtc(1990, 3, 15, 13, 20, SEOUL).utc.toISOString())
      .toBe('1990-03-15T04:20:00.000Z');
  });

  it('서머타임 시작으로 존재하지 않는 시각을 표시한다', () => {
    // 1988-05-08 02:00 에 시계를 03:00 으로 돌렸다. 02:00~02:59 는 존재하지 않는다.
    expect(wallClockToUtc(1988, 5, 8, 2, 30, SEOUL).nonexistent).toBe(true);
    expect(wallClockToUtc(1988, 5, 8, 4, 30, SEOUL).nonexistent).toBe(false);
  });

  it('오프셋 표시 형식', () => {
    expect(formatOffset(9 * HOUR)).toBe('UTC+09:00');
    expect(formatOffset(8.5 * HOUR)).toBe('UTC+08:30');
    expect(formatOffset(8 * HOUR + 27 * 60_000 + 52_000)).toBe('UTC+08:27:52');
  });
});

describe('진태양시 보정', () => {
  it('서울은 한국 표준시보다 약 32분 늦다', () => {
    const { utc, offsetMs } = wallClockToUtc(1990, 3, 15, 12, 0, SEOUL);
    const solar = toSolarTime(utc, SEOUL_LONGITUDE, 'longitude', offsetMs);

    // (126.9784 - 135) / 15 * 60 = -32.086분
    expect(solar.longitudeCorrectionMinutes).toBeCloseTo(-32.09, 1);
    expect(solar.local.getUTCHours()).toBe(11);
    expect(solar.local.getUTCMinutes()).toBe(27);
  });

  it('표준시가 +8:30이던 시기에도 분기 없이 맞는다', () => {
    // 1955년 서울의 표준자오선은 127.5도. 경도차는 -0.52도 → 약 -2분.
    const { utc, offsetMs } = wallClockToUtc(1955, 1, 15, 12, 0, SEOUL);
    const solar = toSolarTime(utc, SEOUL_LONGITUDE, 'longitude', offsetMs);
    expect(solar.longitudeCorrectionMinutes).toBeCloseTo(-2.09, 1);
  });

  it("보정 없음('none') 모드는 입력 시각을 그대로 유지한다", () => {
    const { utc, offsetMs } = wallClockToUtc(1990, 3, 15, 13, 20, SEOUL);
    const solar = toSolarTime(utc, SEOUL_LONGITUDE, 'none', offsetMs);
    expect(solar.local.getUTCHours()).toBe(13);
    expect(solar.local.getUTCMinutes()).toBe(20);
    expect(solar.totalCorrectionMinutes).toBe(0);
  });

  it('균시차가 알려진 연중 패턴을 따른다', () => {
    // 균시차는 2월 중순 약 -14분, 11월 초 약 +16분, 4월 중순과 9월 초에 0 부근.
    expect(equationOfTimeMinutes(new Date('2025-02-11T12:00:00Z'))).toBeCloseTo(-14.2, 0);
    expect(equationOfTimeMinutes(new Date('2025-11-03T12:00:00Z'))).toBeCloseTo(16.4, 0);
    expect(Math.abs(equationOfTimeMinutes(new Date('2025-04-15T12:00:00Z')))).toBeLessThan(1);
    expect(Math.abs(equationOfTimeMinutes(new Date('2025-09-01T12:00:00Z')))).toBeLessThan(1);
  });

  it("'apparent' 모드는 경도 보정에 균시차를 더한다", () => {
    const { utc, offsetMs } = wallClockToUtc(1990, 2, 11, 12, 0, SEOUL);
    const longitudeOnly = toSolarTime(utc, SEOUL_LONGITUDE, 'longitude', offsetMs);
    const apparent = toSolarTime(utc, SEOUL_LONGITUDE, 'apparent', offsetMs);

    expect(apparent.equationOfTimeMinutes).toBeCloseTo(-14.2, 0);
    expect(apparent.totalCorrectionMinutes).toBeCloseTo(
      longitudeOnly.totalCorrectionMinutes + apparent.equationOfTimeMinutes,
      5,
    );
  });
});
