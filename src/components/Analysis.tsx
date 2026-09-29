'use client';

import { ELEMENTS, type Element } from '@/lib/saju/constants';
import type { SajuChart } from '@/lib/saju/types';

const ELEMENT_VAR: Record<Element, string> = {
  목: 'var(--wood)',
  화: 'var(--fire)',
  토: 'var(--earth)',
  금: 'var(--metal)',
  수: 'var(--water)',
};

export function Analysis({ chart }: { chart: SajuChart }) {
  const { elements, tenGods, strength } = chart.analysis;
  const maxPercent = Math.max(...ELEMENTS.map((e) => elements.percentages[e]), 1);

  const activeTenGods = Object.entries(tenGods).filter(([, count]) => count > 0);
  const maxTenGod = Math.max(...activeTenGods.map(([, c]) => c), 1);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="mb-4 text-base font-semibold">오행 분포</h2>

        <div className="space-y-2.5">
          {ELEMENTS.map((element) => {
            const percent = elements.percentages[element];
            const count = elements.counts[element];
            return (
              <div key={element} className="flex items-center gap-3">
                <span className="ganji w-5 text-sm" style={{ color: ELEMENT_VAR[element] }}>
                  {element}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full"
                  style={{ background: 'var(--surface-sunken)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(percent / maxPercent) * 100}%`, background: ELEMENT_VAR[element] }}
                  />
                </div>
                <span className="w-20 text-right text-xs tabular-nums text-[var(--text-muted)]">
                  {count}개 · {percent}%
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
          글자 수는 여덟 글자를 센 것이고, 백분율은 지장간과 월령 가중치까지 반영한 점수입니다.
          {elements.missing.length > 0 && (
            <> 없는 오행: <strong>{elements.missing.join(', ')}</strong>.</>
          )}
        </p>
      </section>

      <section className="card">
        <h2 className="mb-4 text-base font-semibold">십신과 세력</h2>

        <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--surface-sunken)' }}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {strength.verdict}
            </span>
            <span className="text-xs tabular-nums text-[var(--text-muted)]">
              내 편 {strength.supportScore} · 덜어내는 쪽 {strength.drainScore}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${strength.supportRatio * 100}%`, background: 'var(--accent)' }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {strength.reason} 격국·조후까지 본 판단이 아니라 기계적인 참고 지표입니다.
          </p>
        </div>

        <div className="space-y-1.5">
          {activeTenGods.map(([god, count]) => (
            <div key={god} className="flex items-center gap-3">
              <span className="w-10 text-xs">{god}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full"
                style={{ background: 'var(--surface-sunken)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / maxTenGod) * 100}%`, background: 'var(--accent)' }}
                />
              </div>
              <span className="w-6 text-right text-xs tabular-nums text-[var(--text-muted)]">{count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
