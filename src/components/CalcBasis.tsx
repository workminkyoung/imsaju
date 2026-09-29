'use client';

import { useState } from 'react';
import type { SajuChart } from '@/lib/saju/types';

const MODE_LABEL = {
  none: '보정 없음 (입력 표준시 그대로)',
  longitude: '경도 보정 (지방 평균태양시)',
  apparent: '경도 + 균시차 (진태양시)',
} as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="text-xs leading-relaxed">{children}</dd>
    </div>
  );
}

/**
 * 계산 과정을 그대로 열어 보여준다.
 * 결과만 던지는 대신 어떻게 나왔는지를 공개하는 것이 이 서비스의 신빙성 근거다.
 */
export function CalcBasis({ chart }: { chart: SajuChart }) {
  const [open, setOpen] = useState(false);
  const b = chart.basis;

  const warnings = [
    b.nonexistentLocalTime &&
      '입력한 시각은 서머타임 전환으로 실제로 존재하지 않았던 시각입니다. 전환 직후 시각으로 계산했습니다.',
    b.isDaylightSaving &&
      '출생 당시 서머타임이 적용된 구간입니다. 시계가 한 시간 앞당겨져 있었으므로 실제 태양시는 그만큼 이릅니다.',
    b.dayRolledOver &&
      '보정된 시각이 23시를 넘어 일주를 다음 날로 넘겼습니다. 야자시 관법을 쓰면 넘기지 않습니다.',
  ].filter(Boolean) as string[];

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold">계산 근거</span>
        <span className="text-xs text-[var(--text-muted)]">{open ? '접기' : '펼치기'}</span>
      </button>

      {!open && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
          적용된 표준시 오프셋, 진태양시 보정량, 월주 기준 절입 시각을 모두 공개합니다.
          {warnings.length > 0 && (
            <span className="ml-1 font-medium" style={{ color: 'var(--accent)' }}>
              확인할 사항 {warnings.length}건
            </span>
          )}
        </p>
      )}

      {open && (
        <div className="mt-4">
          {warnings.length > 0 && (
            <ul className="mb-4 space-y-1.5 rounded-lg p-3 text-xs leading-relaxed"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {warnings.map((w) => <li key={w}>· {w}</li>)}
            </ul>
          )}

          <dl className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <Row label="입력">
              {b.inputSummary}
              {b.convertedSolarDate && (
                <span className="text-[var(--text-muted)]"> → 양력 {b.convertedSolarDate}</span>
              )}
            </Row>

            {b.lunarDate && <Row label="음력">{b.lunarDate}</Row>}

            <Row label="출생지">
              {b.place.name} · 동경 {b.place.longitude}도 · {b.place.timeZone}
            </Row>

            <Row label="적용 표준시">
              <span className="font-medium">{b.offsetLabel}</span>
              {b.isDaylightSaving && (
                <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px]"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  서머타임
                </span>
              )}
              <span className="block text-[11px] text-[var(--text-muted)]">
                IANA 표준시 데이터베이스에서 그 시점의 실제 오프셋을 가져옵니다.
              </span>
            </Row>

            <Row label="절대 시각">{b.utcInstant}</Row>

            <Row label="시각 보정">
              {MODE_LABEL[b.solarTimeMode]}
              {b.solarTimeMode === 'longitude' && (
                <span className="block text-[11px] text-[var(--text-muted)]">
                  경도 보정{' '}
                  <span className="font-medium text-[var(--text)]">{b.longitudeCorrectionMinutes}분</span>
                </span>
              )}
              {b.solarTimeMode === 'apparent' && (
                <span className="block text-[11px] text-[var(--text-muted)]">
                  경도 {b.longitudeCorrectionMinutes}분 + 균시차 {b.equationOfTimeMinutes}분 ={' '}
                  <span className="font-medium text-[var(--text)]">{b.totalCorrectionMinutes}분</span>
                </span>
              )}
            </Row>

            <Row label="보정된 시각">
              <span className="font-medium">{b.correctedLocalTime}</span>
              <span className="block text-[11px] text-[var(--text-muted)]">
                일주와 시주는 이 시각으로 정합니다.
              </span>
            </Row>

            <Row label="월주 기준">
              {b.monthTerm.name} {b.monthTerm.startKst}
              {' ~ '}
              {b.monthTerm.endName} {b.monthTerm.endKst}
              <span className="block text-[11px] text-[var(--text-muted)]">
                태양 겉보기 황경으로 직접 계산한 절입 시각입니다 (한국 표준시 표기).
              </span>
            </Row>

            <Row label="연주 기준">
              입춘 {b.ipchunKst}
              <span className="block text-[11px] text-[var(--text-muted)]">
                사주의 해는 1월 1일이 아니라 입춘에 바뀝니다.
              </span>
            </Row>

            <Row label="일주 경계">
              {b.lateZiHour ? '야자시 관법 (23시 이후에도 일주 유지)' : '23시 기준 (23시 이후 다음 날)'}
            </Row>
          </dl>
        </div>
      )}
    </section>
  );
}
