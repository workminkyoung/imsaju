'use client';

import { useState } from 'react';
import { BirthForm } from './BirthForm';
import type { FullProfile } from '@/lib/profiles';
import type { SajuInput } from '@/lib/saju/types';

interface Props {
  /** 수정이면 본인 확인을 통과한 전체 카드, 추가면 undefined */
  editing?: FullProfile;
  onSave: (input: SajuInput, memo: string | undefined) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

/**
 * 카드 추가·수정.
 *
 * 입력 폼은 개인 사주 화면의 BirthForm 을 그대로 쓴다. 폼을 따로 만들면
 * 도시 목록이나 관법 옵션이 두 곳에서 서서히 어긋난다.
 */
export function ProfileEditor({ editing, onSave, onDelete, onCancel }: Props) {
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(input: SajuInput) {
    setBusy(true);
    setError('');
    try {
      await onSave(input, memo.trim() || undefined);
    } catch (err) {
      setError((err as Error)?.message ?? '저장하지 못했습니다.');
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm(`「${editing?.label}」 카드를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError((err as Error)?.message ?? '삭제하지 못했습니다.');
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="card" style={{ background: 'var(--surface-sunken)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{editing ? '카드 수정' : '카드 추가'}</h2>
          {editing && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="text-xs text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--accent)] hover:underline disabled:opacity-50"
            >
              이 카드 삭제
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          이름은 카드에 표시됩니다. 생년월일은 목록에 보이지 않고, 나중에 수정할 때 본인
          확인용으로 쓰입니다.
        </p>

        <label className="label mt-3" htmlFor="profile-memo">
          메모 (선택)
        </label>
        <input
          id="profile-memo"
          className="field"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="직속 상사 / 같은 팀 후임"
          maxLength={40}
        />
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
          메모도 카드 목록에 그대로 보이니 민감한 내용은 적지 마세요.
        </p>

        {error && (
          <p className="mt-2.5 text-xs leading-relaxed" style={{ color: 'var(--accent)' }}>
            {error}
          </p>
        )}
      </div>

      <BirthForm
        onSubmit={handleSubmit}
        loading={busy}
        initial={editing?.input}
        submitLabel={editing ? '수정 저장' : '카드 저장'}
        footnote="생년월일은 서버에 저장되며 카드 목록에는 표시되지 않습니다."
        onCancel={onCancel}
      />
    </section>
  );
}
