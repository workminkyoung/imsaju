'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FAN_CONFIG,
  FAN_FIELDS,
  TUNER_KEY,
  type FanConfig,
  type FanField,
  type FanMetrics,
} from './fanConfig';

interface Props {
  config: FanConfig;
  onChange: (next: FanConfig) => void;
  /** 지금 그려진 부채꼴의 실제 수치. 아직 못 쟀으면 null. */
  metrics: FanMetrics | null;
}

const GROUPS = ['카드', '부채꼴', '영역'] as const;

const ALIGNS: ReadonlyArray<{ value: FanConfig['areaAlign']; label: string }> = [
  { value: 'start', label: '위' },
  { value: 'center', label: '가운데' },
  { value: 'end', label: '아래' },
];

/** 고친 값을 그대로 fanConfig.ts 에 붙여 넣을 수 있게 코드로 만든다. */
function toSnippet(config: FanConfig) {
  const body = (Object.keys(DEFAULT_FAN_CONFIG) as (keyof FanConfig)[])
    .map((key) => {
      const value = config[key];
      return `  ${key}: ${typeof value === 'string' ? `'${value}'` : value},`;
    })
    .join('\n');
  return `export const DEFAULT_FAN_CONFIG: FanConfig = {\n${body}\n};`;
}

/**
 * 카드 테이블 튜너.
 *
 * 숫자를 코드에서 고치고 새로고침하는 대신 화면에서 바로 끌어 보게 한다.
 * 마음에 드는 값이 나오면 「코드 복사」로 받아 fanConfig.ts 의 기본값에 붙여 넣으면
 * 그때부터 모두에게 그 모양이 된다.
 */
export function FanTuner({ config, onChange, metrics }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      // 글자를 입력하는 중에는 단축키를 가로채지 않는다.
      const typing = el?.isContentEditable || (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if (typing) return;
      if (event.key === TUNER_KEY) {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const dirty = useMemo(
    () =>
      (Object.keys(DEFAULT_FAN_CONFIG) as (keyof FanConfig)[]).some(
        (key) => config[key] !== DEFAULT_FAN_CONFIG[key],
      ),
    [config],
  );

  function set<K extends keyof FanConfig>(key: K, value: FanConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(toSnippet(config));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드가 막힌 환경에서는 아래 코드 상자에서 직접 긁어 가면 된다.
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[70] rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg transition hover:opacity-100"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          opacity: 0.55,
        }}
        title={`카드 튜너 열기 (${TUNER_KEY})`}
      >
        카드 튜너 <kbd className="font-mono">{TUNER_KEY}</kbd>
      </button>
    );
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[70] flex w-[min(360px,92vw)] flex-col border-l shadow-2xl"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      aria-label="카드 테이블 튜너"
    >
      <header
        className="flex items-baseline justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold">카드 튜너</h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            <kbd className="font-mono">{TUNER_KEY}</kbd> 또는 Esc 로 닫기
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)]"
        >
          닫기
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {GROUPS.map((group) => (
          <section key={group} className="mb-5 last:mb-0">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-[var(--text-muted)]">
              {group}
            </h3>

            <div className="space-y-3">
              {FAN_FIELDS.filter((field) => field.group === group).map((field) => (
                <Row
                  key={field.key}
                  field={field}
                  value={config[field.key]}
                  onChange={(v) => set(field.key, v)}
                />
              ))}

              {group === '영역' && (
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="text-xs font-medium">부채꼴 위치</label>
                    <div className="flex gap-1">
                      {ALIGNS.map((align) => {
                        const on = config.areaAlign === align.value;
                        return (
                          <button
                            key={align.value}
                            type="button"
                            onClick={() => set('areaAlign', align.value)}
                            className="rounded-md border px-2 py-1 text-[11px] transition"
                            style={{
                              borderColor: on ? 'var(--accent)' : 'var(--border)',
                              background: on ? 'var(--accent-soft)' : 'transparent',
                              color: on ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                          >
                            {align.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
                    남는 높이를 어느 쪽에 둘지
                  </p>
                </div>
              )}
            </div>
          </section>
        ))}

        <section className="mb-5">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-[var(--text-muted)]">
            계산 결과
          </h3>
          {metrics ? (
            <dl
              className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg p-3 text-[11px]"
              style={{ background: 'var(--surface-sunken)' }}
            >
              <Metric label="반지름" value={`${Math.round(metrics.radius)}px`} />
              <Metric label="처짐" value={`${Math.round(metrics.drop)}px`} />
              <Metric label="영역 높이" value={`${metrics.height}px`} />
              <Metric label="쓸 수 있는 높이" value={`${Math.round(metrics.available)}px`} />
              <Metric label="부채꼴 폭" value={`${metrics.fanWidth}px`} />
              <Metric label="장당 각도" value={`${metrics.stepDeg.toFixed(1)}°`} />
              <Metric label="배율" value={`×${metrics.scale.toFixed(2)}`} />
            </dl>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">아직 그려지지 않았습니다.</p>
          )}
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
            반지름은 「최소 드러남·반지름 하한·화면 폭 비율」 중 가장 큰 값에서 출발해, 높이에
            들어가도록 깎인 결과입니다.
          </p>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-[var(--text-muted)]">
            코드로 굳히기
          </h3>
          <pre
            className="max-h-44 overflow-auto rounded-lg p-2.5 text-[10px] leading-relaxed"
            style={{ background: 'var(--surface-sunken)' }}
          >
            {toSnippet(config)}
          </pre>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
            fanConfig.ts 의 DEFAULT_FAN_CONFIG 를 이걸로 바꾸면 모두에게 적용됩니다. 지금 값은 이
            브라우저에만 저장돼 있습니다.
          </p>
        </section>
      </div>

      <footer
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={copy}
          className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition"
          style={{ background: 'var(--accent)' }}
        >
          {copied ? '복사했습니다' : '코드 복사'}
        </button>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FAN_CONFIG)}
          disabled={!dirty}
          className="rounded-lg border px-3 py-2 text-xs transition disabled:opacity-35"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          기본값
        </button>
      </footer>
    </aside>
  );
}

function Row({
  field,
  value,
  onChange,
}: {
  field: FanField;
  value: number;
  onChange: (value: number) => void;
}) {
  const changed = value !== DEFAULT_FAN_CONFIG[field.key];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium" htmlFor={`fan-${field.key}`}>
          {field.label}
        </label>
        <input
          id={`fan-${field.key}`}
          type="number"
          value={value}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="w-20 rounded-md border px-2 py-1 text-right text-xs outline-none"
          style={{
            borderColor: changed ? 'var(--accent)' : 'var(--border)',
            background: 'var(--surface-sunken)',
            color: changed ? 'var(--accent)' : 'var(--text)',
          }}
        />
      </div>
      <input
        type="range"
        value={value}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full"
        style={{ accentColor: 'var(--accent)' }}
        aria-label={field.label}
      />
      <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">{field.hint}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
