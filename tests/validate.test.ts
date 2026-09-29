/**
 * 입력 검증.
 *
 * 여기서 중요한 건 "잘못된 입력을 막는다"보다 **조용히 다른 값으로 바꾸지 않는다**는 쪽이다.
 * 오타 하나가 소리 없이 다른 사람의 사주를 만들어내면 결과를 믿을 수 없게 된다.
 */

import { describe, expect, it } from 'vitest';
import { ValidationError, parseSajuInput } from '@/lib/validate';

const base = {
  name: '테스트',
  calendar: 'solar',
  year: 1990,
  month: 3,
  day: 15,
  hour: 13,
  minute: 20,
  gender: 'male',
};

describe('출생지', () => {
  it('프리셋 이름을 그대로 받는다', () => {
    expect(parseSajuInput({ ...base, city: '부산' }).city).toBe('부산');
    expect(parseSajuInput({ ...base, city: '뉴욕' }).city).toBe('뉴욕');
  });

  it('모르는 도시는 조용히 서울로 바꾸지 않고 거부한다', () => {
    expect(() => parseSajuInput({ ...base, city: 'Atlantis' })).toThrow(ValidationError);
    expect(() => parseSajuInput({ ...base, city: '서울시' })).toThrow(/목록에 없는/);
  });

  it('한글 자모가 분리되어 와도 인식한다', () => {
    // 일부 클라이언트(특히 macOS)는 한글을 NFD로 보낸다.
    expect(parseSajuInput({ ...base, city: '부산'.normalize('NFD') }).city).toBe('부산');
  });

  it('도시를 안 주면 서울이 기본값', () => {
    expect(parseSajuInput(base).city).toBe('서울');
  });

  it('경도를 직접 주면 그것을 쓴다', () => {
    const input = parseSajuInput({ ...base, longitude: 128.5, timeZone: 'Asia/Seoul' });
    expect(input.longitude).toBe(128.5);
    expect(input.city).toBeUndefined();
  });

  it('범위를 벗어난 경도와 알 수 없는 시간대를 거부한다', () => {
    expect(() => parseSajuInput({ ...base, longitude: 999 })).toThrow(/경도/);
    expect(() => parseSajuInput({ ...base, longitude: 127, timeZone: 'Mars/Olympus' }))
      .toThrow(/시간대/);
  });
});

describe('날짜', () => {
  it('존재하지 않는 양력 날짜를 거부한다', () => {
    expect(() => parseSajuInput({ ...base, month: 2, day: 30 })).toThrow(/존재하지 않는/);
    expect(() => parseSajuInput({ ...base, year: 1991, month: 2, day: 29 })).toThrow(/존재하지 않는/);
  });

  it('윤년 2월 29일은 통과시킨다', () => {
    expect(parseSajuInput({ ...base, year: 1992, month: 2, day: 29 }).day).toBe(29);
  });

  it('지원 범위 밖 연도를 거부한다', () => {
    expect(() => parseSajuInput({ ...base, year: 1850 })).toThrow(/1900년부터/);
    expect(() => parseSajuInput({ ...base, year: 2100 })).toThrow(/1900년부터/);
  });

  it('범위를 벗어난 시·분을 거부한다', () => {
    expect(() => parseSajuInput({ ...base, hour: 24 })).toThrow(/시는/);
    expect(() => parseSajuInput({ ...base, minute: 60 })).toThrow(/분은/);
  });
});

describe('기타 필드', () => {
  it('시각 모름이면 시·분을 비운다', () => {
    const input = parseSajuInput({ ...base, timeUnknown: true });
    expect(input.timeUnknown).toBe(true);
    expect(input.hour).toBeUndefined();
  });

  it('알 수 없는 값은 안전한 기본값으로 떨어뜨린다', () => {
    const input = parseSajuInput({ ...base, gender: 'x', calendar: 'y', solarTimeMode: 'z' });
    expect(input.gender).toBe('male');
    expect(input.calendar).toBe('solar');
    expect(input.solarTimeMode).toBe('longitude');
  });

  it('이름은 길이를 제한한다', () => {
    expect(parseSajuInput({ ...base, name: 'ㄱ'.repeat(100) }).name).toHaveLength(40);
  });
});
