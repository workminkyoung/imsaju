'use client';

import { useMemo } from 'react';
import type { Element } from '@/lib/saju/constants';
import type { SajuChart } from '@/lib/saju/types';

/** 대운·세운만 있으면 그린다. */
export type LuckChart = Pick<SajuChart, 'daeun' | 'seun'>;

const ELEMENT_VAR: Record<Element, string> = {
  목: 'var(--wood)',
  화: 'var(--fire)',
  토: 'var(--earth)',
  금: 'var(--metal)',
  수: 'var(--water)',
};

export function LuckCycles({ chart }: { chart: LuckChart }) {
  const { daeun, seun } = chart;
  const thisYear = new Date().getFullYear();

  /** 지금 지나는 대운 */
  const currentIndex = useMemo(() => {
    let index = -1;
    daeun.list.forEach((d, i) => {
      if (d.startYear <= thisYear) index = i;
    });
    return index;
  }, [daeun.list, thisYear]);

  const { years, months, days } = daeun.startAfter;

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">대운 · 세운</h2>
        <span className="text-xs text-[var(--text-muted)]">
          {daeun.forward ? '순행' : '역행'} · 대운수 {daeun.startAge}
          <span className="ml-1.5">
            ({daeun.referenceTerm.name} 절입까지 {years}년 {months}개월 {days}일 → {daeun.list[0].startYear}년부터)
          </span>
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {daeun.list.map((entry, index) => {
            const active = index === currentIndex;
            return (
              <div
                key={entry.order}
                className="w-[74px] shrink-0 rounded-lg border p-2 text-center transition"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <div className="text-[10px] text-[var(--text-muted)]">{entry.startAge}세</div>
                <div className="ganji mt-1 text-xl leading-tight"
                  style={{ color: ELEMENT_VAR[entry.pillar.stemElement] }}>
                  {entry.pillar.stem}
                </div>
                <div className="ganji text-xl leading-tight"
                  style={{ color: ELEMENT_VAR[entry.pillar.branchElement] }}>
                  {entry.pillar.branch}
                </div>
                <div className="mt-1 text-[9px] leading-tight text-[var(--text-muted)]">
                  {entry.pillar.tenGodOfStem}
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">{entry.startYear}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        나이는 만 나이 기준입니다. 강조된 칸이 지금 지나는 대운입니다.
      </p>

      <h3 className="mt-5 mb-2 text-xs font-medium text-[var(--text-muted)]">세운 (향후 10년)</h3>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {seun.map((entry) => {
            const active = entry.year === thisYear;
            return (
              <div
                key={entry.year}
                className="w-[62px] shrink-0 rounded-lg border p-2 text-center"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <div className="text-[10px] text-[var(--text-muted)]">{entry.year}</div>
                <div className="ganji mt-0.5 text-base leading-tight">
                  <span style={{ color: ELEMENT_VAR[entry.pillar.stemElement] }}>{entry.pillar.stem}</span>
                  <span style={{ color: ELEMENT_VAR[entry.pillar.branchElement] }}>{entry.pillar.branch}</span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)]">{entry.age}세</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
