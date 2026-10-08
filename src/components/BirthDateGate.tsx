'use client';

import { useEffect, useRef, useState } from 'react';
import { verifyProfile, type FullProfile, type PublicProfile } from '@/lib/profiles';

interface Props {
  profile: PublicProfile;
  /** 확인을 통과하면 전체 카드와 입력한 생년월일을 넘긴다. 수정·삭제에 다시 필요하다. */
  onVerified: (full: FullProfile, birthDate: string) => void;
  onCancel: () => void;
}

/**
 * 카드 주인 확인 창.
 *
 * 생년월일은 약한 비밀이라 서버에서 시도 횟수를 제한한다. 화면에서도 그 사실을 알려
 * 남의 카드를 찍어 맞히려는 시도를 꺾는다.
 */
export function BirthDateGate({ profile, onVerified, onCancel }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const full = await verifyProfile(profile.id, value);
      onVerified(full, value);
    } catch (err) {
      setError((err as Error)?.message ?? '확인에 실패했습니다.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onCancel}
      role="presentation"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-sm"
        role="dialog"
        aria-modal="true"
        aria-label="본인 확인"
      >
        <h2 className="text-base font-semibold">본인 확인</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          <strong>{profile.label}</strong> 카드의 생년월일을 여섯 자리로 입력해 주세요.
          맞아야 수정 화면으로 넘어갑니다.
        </p>

        <label className="label mt-4" htmlFor="birth-gate">
          생년월일 (YYMMDD)
        </label>
        <input
          id="birth-gate"
          ref={inputRef}
          className="field text-center tracking-[0.3em]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="970304"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
        />

        {error && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--accent)' }}>
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2.5 text-sm transition"
            style={{ borderColor: 'var(--border)' }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy || value.trim().length === 0}
            className="px-btn flex-1 px-4 py-2.5 text-sm"
          >
            {busy ? '확인 중…' : '확인'}
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
          남의 카드를 함부로 열 수 없도록 시도 횟수를 제한합니다. 여러 번 틀리면 잠시 막힙니다.
        </p>
      </form>
    </div>
  );
}
