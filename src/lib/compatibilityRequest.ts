/**
 * 궁합 요청의 검증과 계산.
 *
 * 두 개의 궁합 라우트(계산용·풀이용)가 앞부분에서 똑같은 일을 하므로 여기로 모은다.
 *
 * 입력은 **카드 id** 로 받는다. 브라우저가 생년월일을 들고 있을 필요가 없도록
 * 서버가 저장소에서 꺼내 쓴다. 그래야 "이름만 보이고 상세 정보는 감춘다"가 성립한다.
 */

import { findRelationship, isRelationshipId, type Relationship } from './relationship';
import { getProfileStore, type StoredProfile } from './profileStore';
import { computeCompatibility, type CompatibilityResult } from './saju/compatibility';
import { computeSaju } from './saju';
import type { SajuChart } from './saju/types';
import { ValidationError } from './validate';

export interface CompatibilityRequest {
  a: StoredProfile;
  b: StoredProfile;
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

  const idA = typeof b.aId === 'string' ? b.aId : '';
  const idB = typeof b.bId === 'string' ? b.bId : '';
  if (!idA || !idB) throw new ValidationError('카드를 두 장 골라 주세요.');
  if (idA === idB) throw new ValidationError('서로 다른 카드를 골라 주세요.');

  const store = getProfileStore();
  const [a, b2] = await Promise.all([store.get(idA), store.get(idB)]);

  // 어느 쪽이 없어졌는지 알려 줘야 사용자가 다시 고를 수 있다.
  if (!a) throw new ValidationError('A 카드를 찾을 수 없습니다. 이미 지워졌을 수 있습니다.');
  if (!b2) throw new ValidationError('B 카드를 찾을 수 없습니다. 이미 지워졌을 수 있습니다.');

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

function withContext<T>(who: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '계산에 실패했습니다.';
    throw new ValidationError(`${who}: ${message}`);
  }
}
