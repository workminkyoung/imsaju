'use client';

import { createContext, useContext } from 'react';

/**
 * 카드 테이블의 생김새를 정하는 값들.
 *
 * 부채꼴은 숫자 몇 개가 서로 맞물려 모양이 정해진다. 코드 곳곳에 상수로 흩어 두면
 * 하나를 고칠 때마다 다른 쪽이 깨지므로 한곳에 모아 두고, 화면에서 바로 돌려 보며
 * 맞출 수 있게 튜너(FanTuner)로 같은 값을 내보낸다.
 */
export interface FanConfig {
  /** 카드 한 장의 크기(px). 슬롯과 드래그 고스트도 같은 값을 쓴다. */
  cardW: number;
  cardH: number;
  /** 카드를 뒤집을 때 위로 떠오르는 높이(px). */
  flipLift: number;

  /** 부채꼴 전체가 벌어지는 최대 각도(°). */
  spreadDeg: number;
  /** 카드 한 장당 각도의 상한(°). 장수가 적을 때의 벌어짐을 정한다. */
  stepDeg: number;
  /** 부채꼴 위에 비워 두는 높이(px). 뒤집힌 카드와 그림자가 잘리지 않을 만큼. */
  headroom: number;
  /** 옆 카드에 가려도 최소한 드러나야 할 폭(px). 반지름의 하한을 정한다. */
  minReveal: number;
  /** 호 반지름의 하한·상한(px). 작을수록 둥글게 휘고, 클수록 평평하게 넓어진다. */
  minRadius: number;
  maxRadius: number;
  /** 반지름을 화면 폭의 몇 배로 잡을지. */
  widthRatio: number;

  /** 카드 영역 안에서 부채꼴을 위/가운데/아래 중 어디에 붙일지. */
  areaAlign: 'start' | 'center' | 'end';
  /** 카드 영역의 위쪽 간격과 아래쪽 여백(px). */
  areaGapTop: number;
  areaPadBottom: number;
}

export const DEFAULT_FAN_CONFIG: FanConfig = {
  cardW: 104,
  cardH: 156,
  flipLift: 26,

  spreadDeg: 96,
  stepDeg: 15,
  headroom: 48,
  minReveal: 54,
  minRadius: 320,
  maxRadius: 760,
  widthRatio: 0.62,

  areaAlign: 'end',
  areaGapTop: 12,
  areaPadBottom: 0,
};

/** 부채꼴을 그리고 나서 실제로 나온 값. 튜너에서 읽기 전용으로 보여 준다. */
export interface FanMetrics {
  radius: number;
  drop: number;
  height: number;
  fanWidth: number;
  stepDeg: number;
  available: number;
}

export type FanNumericKey = {
  [K in keyof FanConfig]: FanConfig[K] extends number ? K : never;
}[keyof FanConfig];

export interface FanField {
  key: FanNumericKey;
  group: '카드' | '부채꼴' | '영역';
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
}

/** 튜너에 띄울 항목. 여기 없는 값은 패널에 나오지 않는다. */
export const FAN_FIELDS: readonly FanField[] = [
  {
    key: 'cardW',
    group: '카드',
    label: '카드 너비',
    hint: '슬롯·드래그 고스트도 함께 바뀐다',
    min: 60,
    max: 200,
    step: 2,
  },
  {
    key: 'cardH',
    group: '카드',
    label: '카드 높이',
    hint: '너비의 1.5배쯤이 트럼프 비율',
    min: 90,
    max: 300,
    step: 2,
  },
  {
    key: 'flipLift',
    group: '카드',
    label: '뒤집힘 높이',
    hint: '이 값보다 headroom 이 작으면 위가 잘린다',
    min: 0,
    max: 80,
    step: 1,
  },

  {
    key: 'spreadDeg',
    group: '부채꼴',
    label: '전체 벌어짐',
    hint: '부채꼴이 차지하는 각도',
    min: 0,
    max: 180,
    step: 2,
  },
  {
    key: 'stepDeg',
    group: '부채꼴',
    label: '장당 각도',
    hint: '카드가 적을 때의 벌어짐 상한',
    min: 2,
    max: 40,
    step: 1,
  },
  {
    key: 'headroom',
    group: '부채꼴',
    label: '위 여백',
    hint: '뒤집힌 카드와 그림자가 들어갈 자리',
    min: 0,
    max: 160,
    step: 2,
  },
  {
    key: 'minReveal',
    group: '부채꼴',
    label: '최소 드러남',
    hint: '옆 카드에 가려도 보일 폭',
    min: 10,
    max: 160,
    step: 2,
  },
  {
    key: 'minRadius',
    group: '부채꼴',
    label: '반지름 하한',
    hint: '작을수록 호가 둥글게 휜다',
    min: 120,
    max: 900,
    step: 10,
  },
  {
    key: 'maxRadius',
    group: '부채꼴',
    label: '반지름 상한',
    hint: '클수록 호가 평평하고 넓어진다',
    min: 200,
    max: 1600,
    step: 10,
  },
  {
    key: 'widthRatio',
    group: '부채꼴',
    label: '화면 폭 비율',
    hint: '반지름을 화면 폭의 몇 배로 잡을지',
    min: 0.2,
    max: 1.5,
    step: 0.02,
  },

  {
    key: 'areaGapTop',
    group: '영역',
    label: '영역 위 간격',
    hint: '안내 문구와 카드 영역 사이',
    min: 0,
    max: 120,
    step: 2,
  },
  {
    key: 'areaPadBottom',
    group: '영역',
    label: '영역 아래 여백',
    hint: '0 이면 카드가 페이지 끝에 닿는다',
    min: 0,
    max: 160,
    step: 2,
  },
];

/**
 * 튜너를 띄울지. 개발 중에만 켠다.
 * 배포한 화면에서도 만지고 싶으면 이 값을 true 로 두면 된다.
 */
export const TUNER_ENABLED = process.env.NODE_ENV !== 'production';

/** 사이드시트를 여닫는 키. 바꾸려면 여기만 고치면 된다. */
export const TUNER_KEY = '`';

const STORAGE_KEY = 'imsaju.fan-config';

/**
 * 만져 둔 값을 브라우저에 남겨 새로고침해도 유지한다.
 *
 * 저장된 값은 사람이 고칠 수 있는 자리이므로 그대로 믿지 않는다. 아는 키만,
 * 타입이 맞을 때만 받아 들이고 나머지는 기본값으로 메운다.
 */
export function loadFanConfig(): FanConfig {
  if (typeof window === 'undefined') return DEFAULT_FAN_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FAN_CONFIG;
    const saved = JSON.parse(raw) as Partial<FanConfig>;
    const next = { ...DEFAULT_FAN_CONFIG };
    for (const key of Object.keys(DEFAULT_FAN_CONFIG) as (keyof FanConfig)[]) {
      const value = saved[key];
      if (
        typeof value === typeof DEFAULT_FAN_CONFIG[key] &&
        (typeof value !== 'number' || Number.isFinite(value))
      ) {
        // 키와 타입이 모두 맞을 때만 덮어쓴다.
        (next as Record<string, unknown>)[key] = value;
      }
    }
    return next;
  } catch {
    return DEFAULT_FAN_CONFIG;
  }
}

export function saveFanConfig(config: FanConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 저장이 막혀 있어도 튜닝 자체는 계속할 수 있어야 한다.
  }
}

const FanConfigContext = createContext<FanConfig>(DEFAULT_FAN_CONFIG);

export const FanConfigProvider = FanConfigContext.Provider;

export function useFanConfig(): FanConfig {
  return useContext(FanConfigContext);
}
