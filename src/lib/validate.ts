/** 클라이언트에서 온 입력을 신뢰하지 않고 검사한다. */

import { CITIES } from './cities';
import { LUNAR_RANGE } from './lunar';
import type { SajuInput } from './saju/types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** 절기 계산이 신뢰할 수 있는 범위 */
const MIN_YEAR = 1900;
const MAX_YEAR = 2050;

export function parseSajuInput(body: unknown): SajuInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('요청 본문이 올바르지 않습니다.');
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '';

  const calendar = b.calendar === 'lunar' ? 'lunar' : 'solar';
  const gender = b.gender === 'female' ? 'female' : 'male';

  const year = int(b.year, '연도');
  const month = int(b.month, '월');
  const day = int(b.day, '일');

  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new ValidationError(`연도는 ${MIN_YEAR}년부터 ${MAX_YEAR}년까지 지원합니다.`);
  }
  if (calendar === 'lunar' && (year < LUNAR_RANGE.minYear || year > LUNAR_RANGE.maxYear)) {
    throw new ValidationError(
      `음력은 ${LUNAR_RANGE.minYear}년부터 ${LUNAR_RANGE.maxYear}년까지 변환할 수 있습니다.`,
    );
  }
  if (month < 1 || month > 12) throw new ValidationError('월은 1부터 12 사이여야 합니다.');
  if (day < 1 || day > 31) throw new ValidationError('일은 1부터 31 사이여야 합니다.');

  // 양력이면 실제로 존재하는 날짜인지 확인한다 (2월 30일 같은 입력 차단).
  if (calendar === 'solar') {
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
      throw new ValidationError(`${year}년 ${month}월 ${day}일은 존재하지 않는 날짜입니다.`);
    }
  }

  const timeUnknown = b.timeUnknown === true;
  let hour: number | undefined;
  let minute: number | undefined;
  if (!timeUnknown) {
    hour = int(b.hour ?? 0, '시');
    minute = int(b.minute ?? 0, '분');
    if (hour < 0 || hour > 23) throw new ValidationError('시는 0부터 23 사이여야 합니다.');
    if (minute < 0 || minute > 59) throw new ValidationError('분은 0부터 59 사이여야 합니다.');
  }

  // 출생지: 프리셋 이름이거나 직접 입력한 경도
  let city: string | undefined;
  let longitude: number | undefined;
  let timeZone: string | undefined;

  if (typeof b.city === 'string' && b.city.length > 0) {
    // 한글은 자모 분리(NFD)로 올 수 있어 정규화 후 비교한다.
    const requested = b.city.normalize('NFC');
    const matched = CITIES.find((c) => c.name.normalize('NFC') === requested);
    // 모르는 도시를 조용히 서울로 바꾸면 사용자는 엉뚱한 사주를 받고도 알 수 없다.
    if (!matched) throw new ValidationError(`'${b.city}' 는 목록에 없는 출생지입니다.`);
    city = matched.name;
  } else if (b.longitude !== undefined) {
    longitude = Number(b.longitude);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new ValidationError('경도는 -180부터 180 사이여야 합니다.');
    }
    timeZone = typeof b.timeZone === 'string' ? b.timeZone : 'Asia/Seoul';
    if (!isValidTimeZone(timeZone)) throw new ValidationError('알 수 없는 시간대입니다.');
  } else {
    city = '서울';
  }

  const solarTimeMode =
    b.solarTimeMode === 'none' || b.solarTimeMode === 'apparent' ? b.solarTimeMode : 'longitude';

  return {
    name,
    calendar,
    year,
    month,
    day,
    isLeapMonth: b.isLeapMonth === true,
    timeUnknown,
    hour,
    minute,
    gender,
    city,
    longitude,
    timeZone,
    solarTimeMode,
    lateZiHour: b.lateZiHour === true,
  };
}

function int(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  return n;
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
