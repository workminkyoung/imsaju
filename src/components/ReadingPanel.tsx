'use client';

import { Fragment, useRef, useState, type ReactNode } from 'react';
import { Markdown } from './Markdown';
import { IconScroll } from './icons';
import { splitInterrupt } from '@/lib/streamMarker';

/** 풀이가 무엇을 근거로 삼는지 보여 주는 한 칸. */
export interface ReadingStep {
  icon: ReactNode;
  label: string;
  hint: string;
}

interface Props {
  /** 스트리밍 엔드포인트 (/api/reading 또는 /api/compatibility/reading) */
  endpoint: string;
  /** 그대로 JSON 으로 보낼 요청 본문 */
  body: unknown;
  title?: string;
  description?: string;
  /** 첫 생성 버튼 문구 */
  actionLabel?: string;
  /**
   * 'hero' 는 아직 생성 전일 때만 테두리를 두른 큰 칸으로 그린다.
   * 분석 칸이 여럿 쌓인 뒤라 같은 모양이면 묻히기 때문이다.
   * 한 번 생성하고 나면 결과가 주인공이므로 보통 패널로 돌아간다.
   */
  variant?: 'panel' | 'hero';
  /** hero 에서 버튼 왼쪽에 놓을 '무엇을 근거로 삼는지' 목록 */
  steps?: readonly ReadingStep[];
  /** 이미 만들어 둔 풀이. 있으면 생성하지 않고 그대로 보여 준다. */
  saved?: { text: string; model: string } | null;
  /**
   * 끝까지 성공했을 때만 불린다. 중단·오류는 부르지 않는다 —
   * 반 토막 난 글이 '이미 만든 풀이'로 굳으면 다시 만들 수 없다.
   */
  onComplete?: (text: string, model: string) => void;
  /**
   * 한 번만 만들게 할지.
   *
   * 같은 만세력이면 근거가 같고 표현만 달라지는데 생성마다 LLM 할당량이 나간다.
   * 그래서 성공한 풀이에는 「다시 생성」을 띄우지 않는다. 다만 API 가 끊기거나 오류로
   * 끝난 경우는 사용자 잘못이 아니므로 그때는 언제든 다시 시도할 수 있어야 한다.
   */
  once?: boolean;
}

/**
 * LLM 풀이 생성 패널. 개인 사주와 궁합이 같은 흐름이라 하나를 공유한다.
 *
 * 계산 결과는 이미 화면에 떠 있고, 여기서 버튼을 눌러야 비로소 Gemini를 호출한다.
 * 계산만 보고 나가는 사용자는 API 할당량을 전혀 쓰지 않는다.
 */
export function ReadingPanel({
  endpoint,
  body,
  title = '사주풀이',
  description = '위 만세력을 그대로 근거 삼아 풀이해 드려요. 이 단계에서만 AI를 씁니다.',
  actionLabel = '사주풀이 생성',
  variant = 'panel',
  steps,
  saved,
  onComplete,
  once = false,
}: Props) {
  // 저장해 둔 풀이가 있으면 다 만들어 놓은 상태로 시작한다.
  const [text, setText] = useState(saved?.text ?? '');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'interrupted' | 'error'>(
    saved ? 'done' : 'idle',
  );
  const [error, setError] = useState('');
  const [interrupted, setInterrupted] = useState('');
  const [model, setModel] = useState(saved?.model ?? '');
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText('');
    setError('');
    setInterrupted('');
    setModel('');
    setStatus('streaming');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? '풀이를 생성하지 못했습니다.');
        setStatus('error');
        return;
      }

      setModel(response.headers.get('x-gemini-model') ?? '');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('응답 본문을 읽을 수 없습니다.');
      const decoder = new TextDecoder();

      let raw = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        // 중단 표시는 본문에서 떼어내고 안내로 따로 보여준다.
        setText(splitInterrupt(raw).body);
      }

      const final = splitInterrupt(raw);
      setText(final.body);
      if (final.interrupted) {
        setInterrupted(final.interrupted);
        setStatus('interrupted');
      } else {
        setStatus('done');
        // 끝까지 받아 낸 것만 넘긴다. 저장할지는 받는 쪽이 정한다.
        onComplete?.(final.body, response.headers.get('x-gemini-model') ?? '');
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setError((err as Error)?.message ?? '알 수 없는 오류가 발생했습니다.');
      setStatus('error');
    }
  }

  // 아직 아무것도 만들지 않았을 때만 큰 칸으로. 결과가 생기면 그쪽이 주인공이다.
  if (variant === 'hero' && status === 'idle') {
    return (
      <section className="card ornate flex flex-wrap items-center gap-x-6 gap-y-5 p-6">
        <div className="flex min-w-[15rem] flex-1 items-center gap-4">
          <IconScroll className="size-9 shrink-0" />
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
          </div>
        </div>

        {steps && steps.length > 0 && (
          <ol className="flex flex-wrap items-center gap-2">
            {steps.map((step, index) => (
              <Fragment key={step.label}>
                {index > 0 && (
                  <span aria-hidden className="text-[var(--text-muted)]">
                    ›
                  </span>
                )}
                <li
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span style={{ color: 'var(--accent)' }}>{step.icon}</span>
                    {step.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                    {step.hint}
                  </span>
                </li>
              </Fragment>
            ))}
          </ol>
        )}

        <button type="button" onClick={generate} className="px-btn-accent px-5 py-3 text-sm">
          {actionLabel} <span aria-hidden>→</span>
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        {status !== 'streaming' && !(once && status === 'done') && (
          <button
            type="button"
            onClick={generate}
            className="px-btn px-4 py-2 text-sm"
          >
            {status === 'idle' ? actionLabel : '다시 생성'}
          </button>
        )}
      </div>

      {status === 'streaming' && !text && (
        <p className="mt-5 text-sm text-[var(--text-muted)]">
          풀이를 쓰는 중이에요… 첫 글자가 나오기까지 몇 초 걸릴 수 있습니다.
        </p>
      )}

      {status === 'error' && (
        <div className="mt-4 rounded-lg p-3.5 text-sm leading-relaxed"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <p>{error}</p>
          <button
            type="button"
            onClick={generate}
            className="mt-2.5 rounded-md border px-3 py-1.5 text-xs font-medium transition"
            style={{ borderColor: 'var(--accent)' }}
          >
            다시 시도
          </button>
        </div>
      )}

      {text && (
        <>
          <Markdown text={text} className="reading mt-5 text-sm" />
          {status === 'streaming' && (
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse align-middle"
              style={{ background: 'var(--accent)' }} />
          )}

          {status === 'interrupted' && (
            <div className="mt-5 rounded-lg p-3.5 text-sm leading-relaxed"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <p>
                <strong>풀이가 끝까지 나오지 못했습니다.</strong> {interrupted} 위 내용은 중간까지의
                결과이니 그대로 믿지 마시고 다시 생성해 주세요.
              </p>
              <button
                type="button"
                onClick={generate}
                className="mt-2.5 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                style={{ borderColor: 'var(--accent)' }}
              >
                다시 생성
              </button>
            </div>
          )}

          {status === 'done' && model && (
            <p className="mt-6 border-t pt-3 text-[11px] text-[var(--text-muted)]"
              style={{ borderColor: 'var(--border)' }}>
              {model} 이 생성했습니다.{' '}
              {once
                ? '풀이는 카드 한 장당 한 번만 만들어지며, 이 브라우저에 저장됩니다.'
                : '같은 만세력이라도 생성할 때마다 표현이 달라집니다.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
