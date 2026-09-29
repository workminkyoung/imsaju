/**
 * 궁합 요청의 검증과 계산.
 *
 * 두 개의 궁합 라우트(계산용·풀이용)가 똑같은 일을 앞부분에서 하므로 여기로 모은다.
 * 클라이언트가 보낸 차트를 믿지 않고 **입력값으로 서버에서 다시 계산한다.**
 */

import { findRelationship, isRelationshipId, type Relationship } from './relationship';
import { computeCompatibility, type CompatibilityResult } from './saju/compatibility';
import { computeSaju } from './saju';
import type { SajuChart, SajuInput } from './saju/types';
import { ValidationError, parseSajuInput } from './validate';

export interface CompatibilityRequest {
  inputA: SajuInput;
  inputB: SajuInput;
  chartA: SajuChart;
  chartB: SajuChart;
  relationship: Relationship;
  compatibility: CompatibilityResult;
}

export function parseAndCompute(body: unknown): CompatibilityRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('요청 본문이 올바르지 않습니다.');
  }
  const b = body as Record<string, unknown>;

  if (!isRelationshipId(b.relationship)) {
    throw new ValidationError('관계 설정이 올바르지 않습니다.');
  }
  const relationship = findRelationship(b.relationship)!;

  // 어느 쪽이 잘못됐는지 알려 줘야 사용자가 그 카드를 고칠 수 있다.
  const inputA = withContext('A', () => parseSajuInput(b.a));
  const inputB = withContext('B', () => parseSajuInput(b.b));

  const chartA = withContext('A', () => computeSaju(inputA));
  const chartB = withContext('B', () => computeSaju(inputB));

  return {
    inputA,
    inputB,
    chartA,
    chartB,
    relationship,
    compatibility: computeCompatibility(chartA, chartB),
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
