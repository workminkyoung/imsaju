/**
 * 카드 앞면에 올릴 요약.
 *
 * 카드 목록은 누구나 보므로 **날짜·시각은 담지 않는다.** 띠·연주·일주·오행 비율과
 * 그로부터 고정 규칙으로 뽑은 키워드만 낸다. LLM 은 쓰지 않는다 — 목록을 부를 때마다
 * 계산하므로 빠르고 매번 같아야 한다.
 */

import { ELEMENTS, type Element } from './constants';
import type { SajuChart } from './types';

export interface CardKeyword {
  text: string;
  /** 칩 색을 정하는 오행 */
  element: Element;
}

export interface CardFace {
  /** 예: "정축년 소띠 · 갑자일주" */
  identity: string;
  /** 오행 비율(정수, 합 ≈ 100) */
  elements: Record<Element, number>;
  /** 최대 4개, 중복 없음 */
  keywords: CardKeyword[];
  /** 한 줄 소개. 메모가 있으면 메모 */
  tagline: string;
}

/** 일간 오행의 대표 성향 */
const PRIMARY: Record<Element, string> = {
  목: '성장', 화: '열정', 토: '신뢰', 금: '결단', 수: '지혜',
};

/** 가장 강한 오행이 일간과 다를 때 덧붙이는 성향 */
const SECONDARY: Record<Element, string> = {
  목: '유연함', 화: '표현력', 토: '포용', 금: '원칙', 수: '통찰',
};

const STRENGTH: Record<'신강' | '중화' | '신약', string> = {
  신강: '추진력', 중화: '균형', 신약: '섬세함',
};

const YIN_YANG: Record<'양' | '음', string> = {
  양: '단단함', 음: '부드러움',
};

const ADJECTIVE: Record<Element, string> = {
  목: '곧고', 화: '따뜻하고', 토: '듬직하고', 금: '단단하고', 수: '깊고',
};

const STRENGTH_ADJECTIVE: Record<'신강' | '중화' | '신약', string> = {
  신강: '힘 있는', 중화: '균형 잡힌', 신약: '섬세한',
};

export function buildCardFace(chart: SajuChart, memo?: string): CardFace {
  const { pillars, zodiac, dayMaster, analysis } = chart;
  const dayElement = dayMaster.element as Element;
  const { strongest, missing, percentages } = analysis.elements;
  const verdict = analysis.strength.verdict;

  const candidates: CardKeyword[] = [{ text: PRIMARY[dayElement], element: dayElement }];
  if (strongest !== dayElement) candidates.push({ text: SECONDARY[strongest], element: strongest });
  candidates.push({ text: STRENGTH[verdict], element: dayElement });
  if (missing.length > 0) {
    candidates.push({ text: `${missing[0]} 보완`, element: missing[0] });
  } else {
    candidates.push({ text: YIN_YANG[dayMaster.yinYang], element: dayElement });
  }

  const seen = new Set<string>();
  const keywords = candidates
    .filter((k) => (seen.has(k.text) ? false : (seen.add(k.text), true)))
    .slice(0, 4);

  const elements = Object.fromEntries(
    ELEMENTS.map((e) => [e, Math.round(percentages[e])]),
  ) as Record<Element, number>;

  const tagline =
    memo?.trim() ||
    `${ADJECTIVE[dayElement]} ${STRENGTH_ADJECTIVE[verdict]} ${dayElement}(${dayMaster.stem})형`;

  return {
    identity: `${pillars.year.ganjiKo}년 ${zodiac}띠 · ${pillars.day.ganjiKo}일주`,
    elements,
    keywords,
    tagline,
  };
}
