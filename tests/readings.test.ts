/**
 * 만들어 둔 사주풀이 저장소.
 *
 * 풀이는 카드 한 장당 한 번만 만든다. 그 약속이 지켜지려면 두 가지가 맞아야 한다.
 *   - 끝까지 받아 낸 풀이는 남아서 다음에 그대로 나온다
 *   - 카드가 사라지면 풀이도 따라 사라진다 (주인 없는 글이 남지 않는다)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteReading, getReading, pruneReadings, saveReading } from '@/lib/readings';

/** 테스트용 localStorage. 실제 브라우저처럼 문자열만 담는다. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, String(value)); },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('풀이 저장소', () => {
  it('넣고 읽고 지운다', () => {
    saveReading('card-1', '庚금 일간은…', 'gemini-test');

    const found = getReading('card-1');
    expect(found?.text).toBe('庚금 일간은…');
    expect(found?.model).toBe('gemini-test');

    deleteReading('card-1');
    expect(getReading('card-1')).toBeNull();
  });

  it('만든 적 없는 카드는 null', () => {
    expect(getReading('없는카드')).toBeNull();
  });

  it('카드마다 따로 담긴다', () => {
    saveReading('card-1', '첫째 풀이', 'm');
    saveReading('card-2', '둘째 풀이', 'm');

    expect(getReading('card-1')?.text).toBe('첫째 풀이');
    expect(getReading('card-2')?.text).toBe('둘째 풀이');
  });

  it('같은 카드를 다시 저장하면 덮어쓰고 늘어나지 않는다', () => {
    saveReading('card-1', '먼저', 'm');
    saveReading('card-1', '나중', 'm');

    expect(getReading('card-1')?.text).toBe('나중');
    expect(JSON.parse(localStorage.getItem('imsaju.readings.v1')!)).toHaveLength(1);
  });

  it('빈 글은 저장하지 않는다 — 중단된 풀이가 굳으면 다시 만들 수 없다', () => {
    expect(saveReading('card-1', '   ', 'm')).toBeNull();
    expect(getReading('card-1')).toBeNull();
  });

  it('카드가 사라지면 그 풀이도 걷어 낸다', () => {
    saveReading('살아있는카드', '남아야 한다', 'm');
    saveReading('지워진카드', '사라져야 한다', 'm');

    pruneReadings(['살아있는카드']);

    expect(getReading('살아있는카드')?.text).toBe('남아야 한다');
    expect(getReading('지워진카드')).toBeNull();
  });

  it('저장 내용이 깨져 있어도 빈 채로 열린다', () => {
    localStorage.setItem('imsaju.readings.v1', '{{깨진 JSON');
    expect(getReading('card-1')).toBeNull();
  });

  it('모양이 맞지 않는 항목은 무시한다', () => {
    localStorage.setItem(
      'imsaju.readings.v1',
      JSON.stringify([{ id: 'card-1' }, { id: 'card-2', text: '멀쩡한 풀이', model: 'm' }]),
    );

    expect(getReading('card-1')).toBeNull();
    expect(getReading('card-2')?.text).toBe('멀쩡한 풀이');
  });
});
