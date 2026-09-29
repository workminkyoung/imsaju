'use client';

import { RELATIONSHIPS, type RelationshipId } from '@/lib/relationship';

interface Props {
  aName: string;
  bName: string;
  value: RelationshipId;
  onChange: (id: RelationshipId) => void;
}

/**
 * 관계 설정.
 *
 * 방향까지 받는 이유: 같은 십신이라도 누가 위인지에 따라 정반대로 읽힌다.
 * 상대가 내 관성일 때 그가 상사면 정당한 지휘지만, 부하면 나를 누르는 부담이 된다.
 */
export function RelationshipPicker({ aName, bName, value, onChange }: Props) {
  /**
   * 라벨의 A·B 를 실제 이름으로 바꾼다.
   * 한 번에 훑는다 — A를 먼저 바꾸고 B를 바꾸면, 이름이 "B" 같은 한 글자일 때
   * 방금 넣은 이름까지 다시 치환된다.
   */
  const withNames = (label: string) =>
    label.replace(/\b[AB]\b/g, (token) => (token === 'A' ? aName : bName));

  return (
    <section className="card">
      <h2 className="text-base font-semibold">두 사람의 관계</h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        누가 위인지에 따라 같은 글자도 다르게 읽힙니다. 방향까지 골라 주세요.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {RELATIONSHIPS.map((relationship) => {
          const active = relationship.id === value;
          return (
            <button
              key={relationship.id}
              type="button"
              onClick={() => onChange(relationship.id)}
              className="rounded-lg border p-3 text-left transition"
              style={{
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              <span
                className="block text-sm font-medium"
                style={{ color: active ? 'var(--accent)' : 'var(--text)' }}
              >
                {withNames(relationship.label)}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--text-muted)]">
                {withNames(relationship.description)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
        관계는 <strong>풀이의 관점만 바꿉니다.</strong> 합·충 같은 궁합 수치는 두 사주만으로 정해지므로
        관계를 바꿔도 점수는 그대로입니다.
      </p>
    </section>
  );
}
