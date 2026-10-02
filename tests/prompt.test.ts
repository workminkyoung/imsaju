/**
 * 프롬프트 템플릿 회귀 방지.
 *
 * 말투를 손보려고 템플릿을 통째로 다시 쓰다가 {{daewoon}} 같은 변수를 빠뜨리면,
 * 에러 하나 없이 **조용히 대운이 빠진 풀이**가 나간다. 화면에는 멀쩡한 글이 뜨므로
 * 사람이 알아채기 어렵다. 그래서 여기서 막는다.
 */

import { describe, expect, it } from 'vitest';
import {
  PROMPT_KINDS,
  PROMPT_VARIABLES,
  buildCompatibilityVariables,
  buildVariables,
  loadDefaultPrompt,
  renderPrompt,
  type PromptKind,
} from '@/lib/prompt';
import { findRelationship } from '@/lib/relationship';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';
import type { SajuInput } from '@/lib/saju/types';

const PERSON_A: SajuInput = {
  name: '김만세', calendar: 'solar', year: 1990, month: 3, day: 15,
  hour: 13, minute: 20, gender: 'male', city: '서울',
};
const PERSON_B: SajuInput = {
  name: '이사주', calendar: 'solar', year: 1985, month: 8, day: 2,
  hour: 7, minute: 45, gender: 'female', city: '부산',
};

/** 템플릿에 쓰인 {{변수}} 이름을 전부 뽑는다. */
function variablesIn(template: string): string[] {
  return [...new Set([...template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
}

/** 해당 종류의 기본 템플릿을 실제 데이터로 렌더한 결과 */
function renderDefault(kind: PromptKind): string {
  const chartA = computeSaju(PERSON_A);
  if (kind === 'compatibility') {
    const chartB = computeSaju(PERSON_B);
    const relationship = findRelationship('boss-b')!;
    return renderPrompt(
      loadDefaultPrompt(kind),
      buildCompatibilityVariables(chartA, chartB, computeCompatibility(chartA, chartB), relationship),
    );
  }
  return renderPrompt(loadDefaultPrompt(kind), buildVariables(chartA));
}

describe.each(PROMPT_KINDS)('%s 기본 템플릿', (kind) => {
  const template = loadDefaultPrompt(kind);
  const declared = PROMPT_VARIABLES[kind].map((v) => v.key);
  const used = variablesIn(template);

  it('선언된 변수를 하나도 빠뜨리지 않는다', () => {
    const missing = declared.filter((key) => !used.includes(key));
    expect(missing, `템플릿에서 빠진 변수: ${missing.join(', ')}`).toEqual([]);
  });

  it('선언되지 않은 변수(오타)를 쓰지 않는다', () => {
    const unknown = used.filter((key) => !declared.includes(key));
    expect(unknown, `알 수 없는 변수: ${unknown.join(', ')}`).toEqual([]);
  });

  it('렌더 후 치환되지 않은 {{...}} 가 남지 않는다', () => {
    const leftovers = variablesIn(renderDefault(kind));
    expect(leftovers, `치환 안 된 변수: ${leftovers.join(', ')}`).toEqual([]);
  });

  it('원국만 근거로 삼으라는 지시가 살아 있다', () => {
    // 말투와 목차는 운영자가 자유롭게 바꾼다. 테스트가 특정 문체를 강제하면 안 된다.
    // 다만 "주어진 원국만 쓰고 지어내지 마라"는 품질의 토대라 사라지면 안 된다.
    expect(template).toMatch(/지어내|있는 글자|근거/);
  });

  it('그 종류에 맞는 안전 규칙이 살아 있다', () => {
    // 개인 풀이는 단정적 예언을, 궁합은 인격 평가와 관계 단절 조언을 막아야 한다.
    const required =
      kind === 'compatibility' ? /깎아내리지|피하라|끊으라/ : /단정적|예언/;
    expect(template).toMatch(required);
  });
});

describe('개인 사주풀이 렌더 결과', () => {
  const rendered = renderDefault('reading');

  it('원국 네 기둥이 실제로 들어간다', () => {
    const chart = computeSaju(PERSON_A);
    for (const pillar of [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour!]) {
      expect(rendered).toContain(pillar.ganji);
    }
  });

  it('대운과 세운이 실제로 들어간다', () => {
    const chart = computeSaju(PERSON_A);
    expect(rendered).toContain(chart.daeun.list[0].pillar.ganji);
    expect(rendered).toContain(String(chart.seun[0].year));
  });

  it('오행 분포와 신강·신약이 들어간다', () => {
    expect(rendered).toContain('오행');
    expect(rendered).toMatch(/신강|신약|중화/);
  });

  it('시주가 없는 경우를 다루라고 지시한다', () => {
    // 목차는 운영자가 정한다. 다만 시각 미상 처리는 빠지면 모델이 시주를 지어낸다.
    expect(rendered).toContain('시주');
  });
});

describe('궁합 풀이 렌더 결과', () => {
  const rendered = renderDefault('compatibility');

  it('두 사람의 이름과 관계가 들어간다', () => {
    expect(rendered).toContain('김만세');
    expect(rendered).toContain('이사주');
    expect(rendered).toContain('상사');
  });

  it('궁합 점수와 항목 표가 들어간다', () => {
    const chartA = computeSaju(PERSON_A);
    const chartB = computeSaju(PERSON_B);
    const result = computeCompatibility(chartA, chartB);
    expect(rendered).toContain(`${result.score}점`);
    // 배점 규칙을 함께 넘겨야 LLM이 점수의 근거를 짚을 수 있다
    expect(rendered).toContain('배점 규칙');
    expect(rendered).toContain('가중치');
  });

  it('여섯 항목을 모두 지시한다', () => {
    for (const heading of [
      '한눈에 보기', '두 사람의 기질', '잘 맞는 지점',
      '부딪히는 지점', '이 관계에서의 처신', '협업이 잘 되는 방식',
    ]) {
      expect(rendered, `누락된 항목: ${heading}`).toContain(heading);
    }
  });

  it('없는 관계를 지어내지 말라는 지시가 살아 있다', () => {
    expect(rendered).toMatch(/지어내지 마세요/);
  });
});

describe('공통 안전 규칙이 두 템플릿에 모두 남아 있다', () => {
  it.each(PROMPT_KINDS)('%s — 단정적 예언 금지와 시주 미상 처리', (kind) => {
    const template = loadDefaultPrompt(kind);
    expect(template).toContain('시주');
    expect(template).toMatch(/지어내|단정|피하라/);
  });
});
