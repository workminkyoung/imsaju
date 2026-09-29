/**
 * 원국 분석: 오행 분포, 십신 분포, 신강·신약 추정.
 *
 * 주의 — 신강/신약 판정은 유파마다 기준이 다르고 격국·조후까지 봐야 제대로 가려진다.
 * 여기서 내는 값은 기계적인 참고 지표이며, 화면과 프롬프트 양쪽에 그렇게 명시한다.
 */

import {
  ELEMENTS,
  GENERATES,
  OVERCOMES,
  STEMS,
  STEM_ELEMENT,
  TEN_GODS,
  type Element,
  type TenGod,
} from './constants';
import { tenGod, type FourPillars } from './pillars';

export interface ElementDistribution {
  /** 여덟 글자를 단순히 센 개수 */
  counts: Record<Element, number>;
  /** 지장간과 월령 가중치까지 반영한 점수 */
  scores: Record<Element, number>;
  /** 점수를 백분율로 (합 100) */
  percentages: Record<Element, number>;
  /** 하나도 없는 오행 */
  missing: Element[];
  /** 가장 강한 오행 */
  strongest: Element;
}

export interface StrengthEstimate {
  /** 나를 돕는 세력(비겁·인성) 점수 */
  supportScore: number;
  /** 나를 소모시키는 세력(식상·재성·관성) 점수 */
  drainScore: number;
  /** 0~1. 0.5 가 균형점 */
  supportRatio: number;
  verdict: '신강' | '중화' | '신약';
  /** 월지가 일간을 돕는가 */
  hasMonthSupport: boolean;
  /** 일지가 일간을 돕는가 */
  hasDaySupport: boolean;
  /** 전체 세력이 일간 쪽인가 */
  hasOverallSupport: boolean;
  /** 판정 근거 한 줄 설명 */
  reason: string;
}

export interface ChartAnalysis {
  elements: ElementDistribution;
  tenGods: Record<TenGod, number>;
  strength: StrengthEstimate;
}

const emptyElements = (): Record<Element, number> =>
  ({ 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 });

/**
 * 오행 분포.
 *
 * 천간은 드러난 기운이라 1점, 지지는 지장간 일수 비율로 1점을 나눠 갖는다.
 * 월지는 계절을 지배하므로 1.5배 가중한다(월령).
 */
export function analyzeElements(pillars: FourPillars): ElementDistribution {
  const counts = emptyElements();
  const scores = emptyElements();

  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  for (const pillar of list) {
    const isMonth = pillar === pillars.month;
    const weight = isMonth ? 1.5 : 1;

    counts[pillar.stemElement]++;
    counts[pillar.branchElement]++;

    scores[pillar.stemElement] += weight;

    // 지지 1점을 지장간 일수 비율로 분배한다.
    const totalDays = pillar.hiddenStems.reduce((sum, h) => sum + h.days, 0);
    for (const hidden of pillar.hiddenStems) {
      const element = STEM_ELEMENT[STEMS.indexOf(hidden.stem)];
      scores[element] += (hidden.days / totalDays) * weight;
    }
  }

  const total = ELEMENTS.reduce((sum, e) => sum + scores[e], 0);
  const percentages = emptyElements();
  for (const e of ELEMENTS) {
    percentages[e] = total > 0 ? Math.round((scores[e] / total) * 1000) / 10 : 0;
  }

  const strongest = ELEMENTS.reduce((a, b) => (scores[a] >= scores[b] ? a : b));

  return {
    counts,
    scores,
    percentages,
    missing: ELEMENTS.filter((e) => counts[e] === 0),
    strongest,
  };
}

/** 십신 분포. 천간(일간 제외)과 지지 정기를 센다. */
export function analyzeTenGods(pillars: FourPillars): Record<TenGod, number> {
  const result = Object.fromEntries(TEN_GODS.map((g) => [g, 0])) as Record<TenGod, number>;

  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  for (const pillar of list) {
    if (pillar.tenGodOfStem !== '일간') result[pillar.tenGodOfStem]++;
    result[pillar.tenGodOfBranch]++;
  }
  return result;
}

/**
 * 신강·신약 추정.
 *
 * 일간과 같은 오행(비겁)과 일간을 생하는 오행(인성)이 내 편,
 * 내가 생하거나 극하는 오행과 나를 극하는 오행(식상·재성·관성)이 나를 덜어낸다.
 *
 * 전통적으로는 득령(월지)·득지(일지)·득세(전체)를 따로 보므로 셋 다 함께 낸다.
 */
export function analyzeStrength(
  pillars: FourPillars,
  elements: ElementDistribution,
): StrengthEstimate {
  const me = STEM_ELEMENT[pillars.dayStemIndex];
  const resource = ELEMENTS.find((e) => GENERATES[e] === me)!; // 나를 생하는 오행 = 인성
  const output = GENERATES[me]; //                               내가 생하는 오행 = 식상
  const wealth = OVERCOMES[me]; //                               내가 극하는 오행 = 재성
  const officer = ELEMENTS.find((e) => OVERCOMES[e] === me)!; // 나를 극하는 오행 = 관성

  const supportScore = elements.scores[me] + elements.scores[resource];
  const drainScore =
    elements.scores[output] + elements.scores[wealth] + elements.scores[officer];
  const total = supportScore + drainScore;
  const supportRatio = total > 0 ? supportScore / total : 0.5;

  const supportsMe = (element: Element) => element === me || element === resource;
  const hasMonthSupport = supportsMe(pillars.month.branchElement);
  const hasDaySupport = supportsMe(pillars.day.branchElement);
  const hasOverallSupport = supportRatio >= 0.5;

  const verdict: StrengthEstimate['verdict'] =
    supportRatio >= 0.55 ? '신강' : supportRatio <= 0.45 ? '신약' : '중화';

  const marks = [
    hasMonthSupport ? '득령' : '실령',
    hasDaySupport ? '득지' : '실지',
    // 정확히 반반이면 어느 쪽도 아니다.
    supportRatio === 0.5 ? '세력 균형' : hasOverallSupport ? '득세' : '실세',
  ];

  return {
    supportScore: Math.round(supportScore * 100) / 100,
    drainScore: Math.round(drainScore * 100) / 100,
    supportRatio: Math.round(supportRatio * 1000) / 1000,
    verdict,
    hasMonthSupport,
    hasDaySupport,
    hasOverallSupport,
    reason:
      `일간 ${STEMS[pillars.dayStemIndex]}(${me}) 기준 ${marks.join('·')}. ` +
      `내 편 ${Math.round(supportScore * 10) / 10} 대 덜어내는 쪽 ${Math.round(drainScore * 10) / 10}.`,
  };
}

export function analyzeChart(pillars: FourPillars): ChartAnalysis {
  const elements = analyzeElements(pillars);
  return {
    elements,
    tenGods: analyzeTenGods(pillars),
    strength: analyzeStrength(pillars, elements),
  };
}

/** 일간과 임의 천간의 십신 관계 (외부에서 대운·세운 해석에 쓴다) */
export { tenGod };
