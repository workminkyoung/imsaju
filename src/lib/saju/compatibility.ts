/**
 * 두 사주 사이의 궁합 계산.
 *
 * 만세력과 같은 원칙을 지킨다 — **여기에 LLM은 없다.**
 * 합·충·형·해·파·원진은 전부 고정된 표라서 계산하고 검증할 수 있다.
 * Gemini는 이 결과를 해석만 한다.
 *
 * 점수를 내되 숫자만 던지지 않는다. 어느 자리에서 어떤 관계로 몇 점이 나왔는지
 * 항목을 전부 남겨, 화면에서 총점의 근거를 그대로 펼쳐 볼 수 있게 한다.
 */

import {
  BRANCHES,
  BRANCH_BREAK,
  BRANCH_CLASH,
  BRANCH_HARM,
  BRANCH_RESENTMENT,
  DIRECTION_HARMONY,
  ELEMENTS,
  GENERATES,
  MUTUAL_PUNISHMENT,
  OVERCOMES,
  SELF_PUNISHMENT,
  SIX_HARMONY,
  STEMS,
  STEM_CLASH,
  STEM_ELEMENT,
  STEM_HARMONY,
  THREE_HARMONY,
  THREE_PUNISHMENT,
  hasPair,
  type Element,
} from './constants';
import { tenGod } from './pillars';
import type { SajuChart } from './types';

// ── 배점 규칙 (화면에 그대로 공개한다) ────────────────────────────────────

/** 관계 하나당 점수. 양수는 끌어당기고 음수는 부딪힌다. */
export const RELATION_POINTS = {
  육합: 3,
  삼합: 3,
  방합: 2,
  천간합: 3,
  천간충: -3,
  충: -3,
  형: -2,
  원진: -2,
  해: -1,
  파: -1,
} as const;

export type RelationName = keyof typeof RELATION_POINTS;

/**
 * 표에 없는 항목의 이름.
 *
 * 십신 친화도와 오행 보완은 합·충 같은 고정된 관계가 아니라 별도로 매긴 점수다.
 * 이걸 '삼합' 같은 이름으로 적으면 LLM이 있지도 않은 합을 근거로 삼는다.
 */
export type DerivedName = '십신' | '오행보완';

/** 자리별 가중치. 직장 관계를 보므로 사회 활동 영역인 월지를 일지보다 높게 둔다. */
export const SLOT_WEIGHTS = {
  일간: 3.0,
  월지: 2.0,
  연지: 1.5,
  일지: 1.5,
  시지: 1.0,
  오행보완: 2.0,
} as const;

export type SlotName = keyof typeof SLOT_WEIGHTS;

/** 한 자리에서 나올 수 있는 점수의 상한·하한. 여러 관계가 겹쳐도 여기서 잘린다. */
const SLOT_SCORE_LIMIT = 5;

/** 자리가 왜 그 가중치를 갖는지. 화면에 함께 보여 준다. */
export const SLOT_REASON: Record<SlotName, string> = {
  일간: '두 사람 본질이 직접 만나는 자리',
  월지: '사회 활동과 직업 영역. 직장 관계에서 가장 중요하다',
  연지: '사회적 위치와 첫인상',
  일지: '내면과 사적인 친밀도',
  시지: '실무와 결과',
  오행보완: '서로 부족한 기운을 채워 주는 정도',
};

// ── 관계 찾기 ─────────────────────────────────────────────────────────────

export interface DetectedRelation {
  name: RelationName | DerivedName;
  points: number;
  /** "寅亥 육합" 처럼 사람이 읽을 설명 */
  detail: string;
}

/** 두 지지 사이의 모든 관계. 한 쌍이 여러 관계를 동시에 가질 수 있다(예: 子未는 해이자 원진). */
export function branchRelations(a: number, b: number): DetectedRelation[] {
  const found: DetectedRelation[] = [];
  const label = `${BRANCHES[a]}${BRANCHES[b]}`;
  const add = (name: RelationName, detail: string) =>
    found.push({ name, points: RELATION_POINTS[name], detail });

  if (hasPair(SIX_HARMONY, a, b)) add('육합', `${label} 육합 — 서로 끌어당긴다`);

  for (const group of THREE_HARMONY) {
    if (a !== b && group.branches.includes(a) && group.branches.includes(b)) {
      add('삼합', `${label} 삼합(반합) — ${group.element}국으로 뭉친다`);
    }
  }

  for (const group of DIRECTION_HARMONY) {
    if (a !== b && group.branches.includes(a) && group.branches.includes(b)) {
      add('방합', `${label} 방합 — 같은 ${group.element} 계절을 공유한다`);
    }
  }

  if (hasPair(BRANCH_CLASH, a, b)) add('충', `${label} 충 — 정면으로 부딪힌다`);

  for (const group of THREE_PUNISHMENT) {
    if (a !== b && group.includes(a) && group.includes(b)) {
      add('형', `${label} 형 — 서로를 찌른다`);
    }
  }
  if (hasPair(MUTUAL_PUNISHMENT, a, b)) add('형', `${label} 상형 — 예의가 어긋난다`);
  if (a === b && SELF_PUNISHMENT.includes(a)) add('형', `${label} 자형 — 같은 글자가 겹쳐 스스로를 친다`);

  if (hasPair(BRANCH_RESENTMENT, a, b)) add('원진', `${label} 원진 — 까닭 없이 거슬린다`);
  if (hasPair(BRANCH_HARM, a, b)) add('해', `${label} 해 — 은근히 갉아먹는다`);
  if (hasPair(BRANCH_BREAK, a, b)) add('파', `${label} 파 — 틀을 깨뜨린다`);

  return found;
}

/** 두 천간 사이의 합·충. */
export function stemRelations(a: number, b: number): DetectedRelation[] {
  const found: DetectedRelation[] = [];
  const label = `${STEMS[a]}${STEMS[b]}`;

  for (const { pair, element } of STEM_HARMONY) {
    if ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)) {
      found.push({
        name: '천간합',
        points: RELATION_POINTS.천간합,
        detail: `${label} 천간합 — 합하여 ${element}으로 변한다`,
      });
    }
  }
  if (hasPair(STEM_CLASH, a, b)) {
    found.push({
      name: '천간충',
      points: RELATION_POINTS.천간충,
      detail: `${label} 천간충 — 기운이 정면으로 맞선다`,
    });
  }
  return found;
}

// ── 항목 ──────────────────────────────────────────────────────────────────

export interface CompatibilityItem {
  slot: SlotName;
  weight: number;
  /** 두 사람이 이 자리에 놓은 글자 */
  a: string;
  b: string;
  relations: DetectedRelation[];
  /** 관계 점수 합계 (상·하한으로 자른 값) */
  rawScore: number;
  /** rawScore × weight */
  weightedScore: number;
  /** 관계가 하나도 없을 때 보여줄 한 줄 */
  note?: string;
}

const clampSlot = (n: number) => Math.max(-SLOT_SCORE_LIMIT, Math.min(SLOT_SCORE_LIMIT, n));

/**
 * 일간끼리의 십신 관계 점수.
 *
 * 서로 생해 주면 편안하고, 같으면 통하되 부딪히기도 하며, 극하면 긴장이 생긴다.
 * 방향이 있으므로 A→B, B→A 를 모두 본다.
 */
function dayMasterAffinity(aStem: number, bStem: number): DetectedRelation[] {
  const out: DetectedRelation[] = [];
  const ae = STEM_ELEMENT[aStem];
  const be = STEM_ELEMENT[bStem];

  const describe = (from: number, to: number, fromLabel: string, toLabel: string) => {
    const fe = STEM_ELEMENT[from];
    const te = STEM_ELEMENT[to];
    const god = tenGod(from, to);
    if (GENERATES[fe] === te) {
      return { points: 2, detail: `${fromLabel}이 ${toLabel}을 생한다 (${god})` };
    }
    if (OVERCOMES[fe] === te) {
      return { points: -1, detail: `${fromLabel}이 ${toLabel}을 극한다 (${god})` };
    }
    if (fe === te) {
      return { points: 1, detail: `같은 ${fe} 기운 (${god})` };
    }
    return { points: 0, detail: `${fromLabel}과 ${toLabel}은 직접 생극이 없다 (${god})` };
  };

  const forward = describe(aStem, bStem, `A 일간 ${STEMS[aStem]}(${ae})`, `B 일간 ${STEMS[bStem]}(${be})`);
  out.push({ name: '십신', points: forward.points, detail: `A→B: ${forward.detail}` });

  // 같은 오행이면 방향을 바꿔도 결과가 같으므로 한 번만 센다.
  if (ae !== be) {
    const backward = describe(bStem, aStem, `B 일간 ${STEMS[bStem]}(${be})`, `A 일간 ${STEMS[aStem]}(${ae})`);
    out.push({ name: '십신', points: backward.points, detail: `B→A: ${backward.detail}` });
  }

  return out;
}

/**
 * 오행 보완도.
 *
 * 한쪽에 없는 기운을 다른 쪽이 넉넉히 가지고 있으면 서로를 채운다.
 * 둘 다 같은 기운이 비어 있으면 함께 약해지므로 감점한다.
 */
function elementComplement(a: SajuChart, b: SajuChart): CompatibilityItem {
  const LACK = 12;
  const RICH = 25;
  const relations: DetectedRelation[] = [];

  for (const element of ELEMENTS) {
    const ap = a.analysis.elements.percentages[element];
    const bp = b.analysis.elements.percentages[element];
    const aLack = ap < LACK;
    const bLack = bp < LACK;

    if (aLack && bLack) {
      relations.push({
        name: '오행보완',
        points: -1,
        detail: `둘 다 ${element}이 약하다 (A ${ap}% · B ${bp}%)`,
      });
      continue;
    }
    if (aLack && bp > RICH) {
      relations.push({
        name: '오행보완',
        points: 1,
        detail: `A에게 부족한 ${element}을 B가 채워 준다 (A ${ap}% → B ${bp}%)`,
      });
    }
    if (bLack && ap > RICH) {
      relations.push({
        name: '오행보완',
        points: 1,
        detail: `B에게 부족한 ${element}을 A가 채워 준다 (B ${bp}% → A ${ap}%)`,
      });
    }
  }

  const raw = clampSlot(relations.reduce((sum, r) => sum + r.points, 0));
  return {
    slot: '오행보완',
    weight: SLOT_WEIGHTS.오행보완,
    a: summarizeElements(a),
    b: summarizeElements(b),
    relations,
    rawScore: raw,
    weightedScore: raw * SLOT_WEIGHTS.오행보완,
    note: relations.length === 0 ? '서로 채워 주지도, 함께 비지도 않는다' : undefined,
  };
}

function summarizeElements(chart: SajuChart): string {
  const { missing, strongest } = chart.analysis.elements;
  return missing.length ? `${strongest} 강 / ${missing.join('·')} 없음` : `${strongest} 강`;
}

// ── 종합 ──────────────────────────────────────────────────────────────────

export interface CompatibilityResult {
  /** 0~100. 50이 중립 */
  score: number;
  /** 가중합 원점수 */
  weightedTotal: number;
  /** 이론상 도달 가능한 최대·최소 (정규화 근거) */
  range: { min: number; max: number };
  items: CompatibilityItem[];
  /** 점수 구간 설명 */
  verdict: '매우 좋음' | '좋음' | '보통' | '주의' | '많이 부딪힘';
  /** 두 사람 일간 요약 */
  dayMasters: { a: string; b: string };
  /** 화면·프롬프트에 함께 싣는 배점 규칙 */
  rules: {
    relationPoints: typeof RELATION_POINTS;
    slotWeights: typeof SLOT_WEIGHTS;
    slotReason: typeof SLOT_REASON;
    slotScoreLimit: number;
  };
}

function branchItem(
  slot: Extract<SlotName, '연지' | '월지' | '일지' | '시지'>,
  aBranch: number | null,
  bBranch: number | null,
): CompatibilityItem | null {
  // 시각을 모르면 시주가 없다. 없는 자리는 계산에서 아예 빼고 정규화 범위도 줄인다.
  if (aBranch === null || bBranch === null) return null;

  const relations = branchRelations(aBranch, bBranch);
  const raw = clampSlot(relations.reduce((sum, r) => sum + r.points, 0));
  return {
    slot,
    weight: SLOT_WEIGHTS[slot],
    a: BRANCHES[aBranch],
    b: BRANCHES[bBranch],
    relations,
    rawScore: raw,
    weightedScore: raw * SLOT_WEIGHTS[slot],
    note: relations.length === 0 ? '특별한 관계가 없다' : undefined,
  };
}

/**
 * 궁합을 계산한다.
 *
 * 관계 설정(상사·동료 등)은 **여기에 들어오지 않는다.** 관계는 해석의 프레임일 뿐이고,
 * 수치를 관계에 따라 흔들면 점수의 근거를 설명할 수 없어지기 때문이다.
 */
export function computeCompatibility(a: SajuChart, b: SajuChart): CompatibilityResult {
  const items: CompatibilityItem[] = [];

  // 일간 — 천간의 합·충에 십신 친화도를 더한다.
  const aStem = a.pillars.day.stemIndex;
  const bStem = b.pillars.day.stemIndex;
  const stemRels = [...stemRelations(aStem, bStem), ...dayMasterAffinity(aStem, bStem)];
  const stemRaw = clampSlot(stemRels.reduce((sum, r) => sum + r.points, 0));
  items.push({
    slot: '일간',
    weight: SLOT_WEIGHTS.일간,
    a: STEMS[aStem],
    b: STEMS[bStem],
    relations: stemRels,
    rawScore: stemRaw,
    weightedScore: stemRaw * SLOT_WEIGHTS.일간,
  });

  const branchSlots = [
    branchItem('월지', a.pillars.month.branchIndex, b.pillars.month.branchIndex),
    branchItem('연지', a.pillars.year.branchIndex, b.pillars.year.branchIndex),
    branchItem('일지', a.pillars.day.branchIndex, b.pillars.day.branchIndex),
    branchItem('시지', a.pillars.hour?.branchIndex ?? null, b.pillars.hour?.branchIndex ?? null),
  ].filter((item): item is CompatibilityItem => item !== null);

  items.push(...branchSlots);
  items.push(elementComplement(a, b));

  // 정규화: 실제로 쓰인 자리의 가중치 합 × 한 자리 최대 점수가 상한이 된다.
  const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
  const max = weightSum * SLOT_SCORE_LIMIT;
  const min = -max;

  const weightedTotal = items.reduce((sum, item) => sum + item.weightedScore, 0);
  const score = Math.round(((weightedTotal - min) / (max - min)) * 100);

  return {
    score,
    weightedTotal: Math.round(weightedTotal * 100) / 100,
    range: { min, max },
    items,
    verdict: verdictOf(score),
    dayMasters: {
      a: `${STEMS[aStem]}(${a.dayMaster.yinYang}${STEM_ELEMENT[aStem]})`,
      b: `${STEMS[bStem]}(${b.dayMaster.yinYang}${STEM_ELEMENT[bStem]})`,
    },
    rules: {
      relationPoints: RELATION_POINTS,
      slotWeights: SLOT_WEIGHTS,
      slotReason: SLOT_REASON,
      slotScoreLimit: SLOT_SCORE_LIMIT,
    },
  };
}

function verdictOf(score: number): CompatibilityResult['verdict'] {
  if (score >= 62) return '매우 좋음';
  if (score >= 55) return '좋음';
  if (score >= 45) return '보통';
  if (score >= 38) return '주의';
  return '많이 부딪힘';
}

/** 오행 이름이 필요할 때 (프롬프트 쪽에서 재사용) */
export type { Element };
