'use client';

import { useState } from 'react';
import type { CompatibilityResult as Result } from '@/lib/saju/compatibility';
import type { SajuChart } from '@/lib/saju/types';

interface Props {
  result: Result;
  aName: string;
  bName: string;
  chartA: SajuChart;
  chartB: SajuChart;
}

/** 점수에 따라 막대 색을 바꾼다. 50이 중립. */
function scoreColor(score: number): string {
  if (score >= 55) return 'var(--wood)';
  if (score >= 45) return 'var(--earth)';
  return 'var(--fire)';
}

export function CompatibilityResult({ result, aName, bName, chartA, chartB }: Props) {
  const [showRules, setShowRules] = useState(false);

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">궁합</h2>
        <span className="text-xs text-[var(--text-muted)]">
          일간 <span className="ganji">{result.dayMasters.a}</span>
          {' ↔ '}
          <span className="ganji">{result.dayMasters.b}</span>
        </span>
      </div>

      {/* 총점 */}
      <div className="mt-4 rounded-lg p-4" style={{ background: 'var(--surface-sunken)' }}>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(result.score) }}>
            {result.score}
            <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">/ 100</span>
          </span>
          <span className="text-sm font-medium" style={{ color: scoreColor(result.score) }}>
            {result.verdict}
          </span>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${result.score}%`, background: scoreColor(result.score) }}
          />
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
          아래 항목을 가중합한 원점수 {result.weightedTotal}점을 가능 범위
          ({result.range.min} ~ {result.range.max})에 맞춰 환산한 값입니다.
          격국·용신까지 본 판단이 아니라 기계적인 참고 지표입니다.
        </p>
      </div>

      {/* 항목별 근거 */}
      <div className="mt-4 -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[34rem] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[var(--text-muted)]">
              <th className="border-b py-2 pr-2 font-medium" style={{ borderColor: 'var(--border)' }}>자리</th>
              <th className="border-b px-2 py-2 font-medium" style={{ borderColor: 'var(--border)' }}>{aName}</th>
              <th className="border-b px-2 py-2 font-medium" style={{ borderColor: 'var(--border)' }}>{bName}</th>
              <th className="border-b px-2 py-2 font-medium" style={{ borderColor: 'var(--border)' }}>관계</th>
              <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--border)' }}>점수</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.slot} className="align-top">
                <td className="border-b py-2.5 pr-2" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-medium">{item.slot}</span>
                  <span className="block text-[10px] text-[var(--text-muted)]">×{item.weight}</span>
                </td>
                <td className="ganji border-b px-2 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                  {item.a}
                </td>
                <td className="ganji border-b px-2 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                  {item.b}
                </td>
                <td className="border-b px-2 py-2.5" style={{ borderColor: 'var(--border)' }}>
                  {item.relations.length === 0 ? (
                    <span className="text-[var(--text-muted)]">{item.note ?? '없음'}</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {item.relations.map((relation, i) => (
                        <li key={i} className="leading-relaxed">
                          <span
                            className="mr-1 rounded px-1 py-0.5 text-[10px] font-medium"
                            style={{
                              background: relation.points >= 0 ? 'var(--accent-soft)' : 'var(--border)',
                              color: relation.points >= 0 ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                          >
                            {relation.points > 0 ? '+' : ''}{relation.points}
                          </span>
                          {relation.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td
                  className="border-b px-2 py-2.5 text-right tabular-nums"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="font-medium">{Math.round(item.weightedScore * 100) / 100}</span>
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {item.rawScore} × {item.weight}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 배점 규칙 */}
      <button
        type="button"
        onClick={() => setShowRules((v) => !v)}
        className="mt-4 text-xs text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--accent)] hover:underline"
      >
        {showRules ? '배점 규칙 접기' : '배점 규칙 펼치기'}
      </button>

      {showRules && (
        <div
          className="mt-3 space-y-3 rounded-lg p-3.5 text-xs leading-relaxed"
          style={{ background: 'var(--surface-sunken)' }}
        >
          <div>
            <span className="font-medium">관계 점수</span>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[var(--text-muted)]">
              {Object.entries(result.rules.relationPoints).map(([name, points]) => (
                <span key={name}>
                  {name}{' '}
                  <span style={{ color: points >= 0 ? 'var(--wood)' : 'var(--fire)' }}>
                    {points > 0 ? '+' : ''}{points}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              한 자리에 여러 관계가 겹칠 수 있고, 그 합은 −{result.rules.slotScoreLimit} ~ +
              {result.rules.slotScoreLimit} 로 잘립니다.
            </p>
          </div>

          <div>
            <span className="font-medium">자리별 가중치</span>
            <ul className="mt-1.5 space-y-0.5 text-[var(--text-muted)]">
              {Object.entries(result.rules.slotWeights).map(([slot, weight]) => (
                <li key={slot}>
                  <span className="text-[var(--text)]">{slot} ×{weight}</span> —{' '}
                  {result.rules.slotReason[slot as keyof typeof result.rules.slotReason]}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            {aName}은 {chartA.analysis.strength.verdict}, {bName}은 {chartB.analysis.strength.verdict}
            으로 추정됩니다. 이 값은 점수에 직접 들어가지 않고 풀이에서 참고용으로 쓰입니다.
          </p>
        </div>
      )}
    </section>
  );
}
