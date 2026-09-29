/**
 * 두 사람 사이의 관계.
 *
 * 같은 십신이라도 누가 위인지에 따라 정반대로 읽힌다. 예를 들어 상대가 내 관성(官星)일 때,
 * 그가 상사라면 정당한 지휘가 되지만 부하라면 나를 압박하는 부담이 된다.
 * 그래서 관계 종류뿐 아니라 **방향**까지 받는다.
 *
 * 다만 관계는 궁합 **수치를 바꾸지 않는다.** 해석의 프레임일 뿐이고 프롬프트에만 들어간다.
 */

export const RELATIONSHIPS = [
  {
    id: 'boss-a',
    label: 'A가 상사 · B가 직원',
    short: '상사-직원',
    /** LLM에게 넘길 설명 */
    description:
      'A가 B의 상사입니다. A는 B를 지휘하고 평가하는 위치이고, B는 A의 지시를 받는 위치입니다.',
    aRole: '상사',
    bRole: '직원',
  },
  {
    id: 'boss-b',
    label: 'A가 직원 · B가 상사',
    short: '직원-상사',
    description:
      'B가 A의 상사입니다. B는 A를 지휘하고 평가하는 위치이고, A는 B의 지시를 받는 위치입니다.',
    aRole: '직원',
    bRole: '상사',
  },
  {
    id: 'senior-a',
    label: 'A가 선임 · B가 후임',
    short: '선임-후임',
    description:
      'A가 B의 선임입니다. 지휘 계통은 아니지만 A가 먼저 들어와 일을 가르치고 이끄는 관계입니다.',
    aRole: '선임',
    bRole: '후임',
  },
  {
    id: 'senior-b',
    label: 'A가 후임 · B가 선임',
    short: '후임-선임',
    description:
      'B가 A의 선임입니다. 지휘 계통은 아니지만 B가 먼저 들어와 일을 가르치고 이끄는 관계입니다.',
    aRole: '후임',
    bRole: '선임',
  },
  {
    id: 'peer',
    label: '동료',
    short: '동료-동료',
    description: '둘은 위아래 없는 동료입니다. 같은 위치에서 협업하고 때로 경쟁합니다.',
    aRole: '동료',
    bRole: '동료',
  },
] as const;

export type RelationshipId = (typeof RELATIONSHIPS)[number]['id'];
export type Relationship = (typeof RELATIONSHIPS)[number];

export const DEFAULT_RELATIONSHIP: RelationshipId = 'peer';

export function findRelationship(id: string): Relationship | undefined {
  return RELATIONSHIPS.find((r) => r.id === id);
}

/** 서버로 들어온 값이 허용된 다섯 가지인지 확인한다. */
export function isRelationshipId(value: unknown): value is RelationshipId {
  return typeof value === 'string' && RELATIONSHIPS.some((r) => r.id === value);
}

/** 화면·프롬프트에 쓸 한 줄 (예: "김팀장(상사) ↔ 나(직원)") */
export function describeRelationship(
  relationship: Relationship,
  aName: string,
  bName: string,
): string {
  if (relationship.id === 'peer') return `${aName} ↔ ${bName} (동료)`;
  return `${aName}(${relationship.aRole}) ↔ ${bName}(${relationship.bRole})`;
}
