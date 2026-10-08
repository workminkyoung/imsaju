/**
 * 궁합 요청의 검증과 계산.
 *
 * 두 개의 궁합 라우트(계산용·풀이용)가 앞부분에서 똑같은 일을 하므로 여기로 모은다.
 *
 * 카드는 브라우저에만 있으므로 두 사람의 이름과 입력을 그대로 받는다.
 * 계산에만 쓰고 저장하지 않는다.
 */

import { findRelationship, isRelationshipId, type Relationship } from './relationship';
import { computeCompatibility, type CompatibilityResult } from './saju/compatibility';
import { computeSaju } from './saju';
import type { SajuChart, SajuInput } from './saju/types';
import { ValidationError, parseSajuInput } from './validate';

/** 궁합에 올린 한 사람 */
export interface CompatibilityPerson {
  label: string;
  input: SajuInput;
}

export interface CompatibilityRequest {
  a: CompatibilityPerson;
  b: CompatibilityPerson;
  chartA: SajuChart;
  chartB: SajuChart;
  relationship: Relationship;
  compatibility: CompatibilityResult;
}

export async function loadAndCompute(body: unknown): Promise<CompatibilityRequest> {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('요청 본문이 올바르지 않습니다.');
  }
  const b = body as Record<string, unknown>;

  if (!isRelationshipId(b.relationship)) {
    throw new ValidationError('관계 설정이 올바르지 않습니다.');
  }
  const relationship = findRelationship(b.relationship)!;

  const a = readPerson(b.a, 'A');
  const b2 = readPerson(b.b, 'B');

  const chartA = withContext(a.label, () => computeSaju(a.input));
  const chartB = withContext(b2.label, () => computeSaju(b2.input));

  return {
    a,
    b: b2,
    chartA,
    chartB,
    relationship,
    compatibility: computeCompatibility(chartA, chartB),
  };
}

/**
 * 브라우저로 내보내도 되는 만세력.
 *
 * `input`(입력 원문)과 `basis`(생년월일·출생시각·보정 내역)를 통째로 뺀다.
 * 화면이 쓰는 것은 간지와 분석뿐이라 빼도 보이는 것은 같다.
 *
 * 다만 완전히 감춰지지는 않는다. 사주 네 기둥 자체가 태어난 해와 날짜를 상당히
 * 좁혀 주기 때문이다. 만세력을 보여 주는 이상 피할 수 없는 부분이다.
 */
export interface PublicChart {
  pillars: SajuChart['pillars'];
  dayMaster: SajuChart['dayMaster'];
  voidBranches: SajuChart['voidBranches'];
  zodiac: string;
  analysis: SajuChart['analysis'];
}

export function toPublicChart(chart: SajuChart): PublicChart {
  return {
    // sajuYear(생년)는 일부러 뺀다. 평문 연도까지 주면 "이름만 보인다"가 무너진다.
    // 연주 간지로 60년 주기 안의 해는 좁혀지지만, 평문으로 건네지는 않는다.
    pillars: chart.pillars,
    dayMaster: chart.dayMaster,
    voidBranches: chart.voidBranches,
    zodiac: chart.zodiac,
    analysis: chart.analysis,
  };
}

function readPerson(raw: unknown, slot: 'A' | 'B'): CompatibilityPerson {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError(`${slot} 카드가 없습니다. 카드 두 장을 골라 주세요.`);
  }
  const person = raw as Record<string, unknown>;
  const input = withContext(`${slot} 카드`, () => parseSajuInput(person.input));
  const label = (typeof person.label === 'string' ? person.label.trim() : '') || input.name || slot;
  return { label: label.slice(0, 40), input };
}

function withContext<T>(who: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '계산에 실패했습니다.';
    throw new ValidationError(`${who}: ${message}`);
  }
}
