'use client';

import { useRef, useState } from 'react';
import { Markdown } from './Markdown';
import { splitInterrupt } from '@/lib/streamMarker';
import type { SajuInput } from '@/lib/saju/types';

interface Props {
  input: SajuInput;
}

/**
 * 사주풀이 생성 패널.
 *
 * 만세력은 이미 화면에 떠 있고, 여기서 버튼을 눌러야 비로소 Gemini를 호출한다.
 * 만세력만 보고 나가는 사용자는 API 할당량을 전혀 쓰지 않는다.
 */
export function ReadingPanel({ input }: Props) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'done' | 'interrupted' | 'error'>('idle');
  const [error, setError] = useState('');
  const [interrupted, setInterrupted] = useState('');
  const [model, setModel] = useState('');
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
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? '사주풀이를 생성하지 못했습니다.');
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
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setError((err as Error)?.message ?? '알 수 없는 오류가 발생했습니다.');
      setStatus('error');
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">사주풀이</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            위 만세력을 근거로 Gemini가 해석합니다. 이 단계에서만 AI를 사용합니다.
          </p>
        </div>

        {status !== 'streaming' && (
          <button
            type="button"
            onClick={generate}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
            style={{ background: 'var(--accent)' }}
          >
            {status === 'idle' ? '사주풀이 생성' : '다시 생성'}
          </button>
        )}
      </div>

      {status === 'streaming' && !text && (
        <p className="mt-5 text-sm text-[var(--text-muted)]">
          해석을 쓰는 중입니다… 무료 티어에서는 첫 글자까지 몇 초 걸릴 수 있습니다.
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
              {model} 이 생성했습니다. 같은 만세력이라도 생성할 때마다 표현이 달라집니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}
