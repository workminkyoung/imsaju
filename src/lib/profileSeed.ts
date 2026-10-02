/**
 * 카드가 하나도 없을 때 넣어 주는 초기 카드.
 *
 * 예전에는 브라우저마다 예시 카드를 만들어 줬지만, 이제 카드는 서버에 있으므로
 * 저장소가 비었을 때 한 번만 심는다.
 *
 * 주의 — 여기 적힌 생년월일은 실제 사람의 것이다. 이 앱이 공개돼 있다면
 * 누구나 이 이름들을 보게 되고, 생년월일을 맞히면 수정도 할 수 있다.
 * 팀 내부용이 아니라면 이 목록을 비우고 쓰는 쪽이 맞다.
 */

import type { SajuInput } from './saju/types';

interface SeedCard {
  label: string;
  memo: string;
  input: Omit<SajuInput, 'name'>;
}

const common = {
  calendar: 'solar' as const,
  city: '서울',
  solarTimeMode: 'longitude' as const,
  lateZiHour: false,
};

export const SEED_CARDS: SeedCard[] = [
  {
    label: '민경',
    memo: 'ID팀 사원',
    input: { ...common, year: 1997, month: 3, day: 24, hour: 8, minute: 20, gender: 'female' },
  },
  {
    label: '혜린',
    memo: 'ID팀 사원',
    input: { ...common, year: 1998, month: 3, day: 27, hour: 17, minute: 20, gender: 'female' },
  },
  {
    label: '경주',
    memo: 'ID팀 사원',
    input: { ...common, year: 1994, month: 8, day: 18, hour: 4, minute: 30, gender: 'female' },
  },
];

/** 초기 카드를 넣지 않으려면 SEED_PROFILES=off */
export function seedingEnabled(): boolean {
  return process.env.SEED_PROFILES?.trim().toLowerCase() !== 'off';
}
