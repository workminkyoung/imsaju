'use client';

import { useState } from 'react';
import { BirthForm } from './BirthForm';
import { newProfileId, type Profile } from '@/lib/profiles';
import type { SajuInput } from '@/lib/saju/types';

interface Props {
  /** 수정이면 기존 카드, 추가면 undefined */
  editing?: Profile;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
}

/**
 * 카드 추가·수정.
 *
 * 입력 폼은 개인 사주 화면의 BirthForm 을 그대로 쓴다. 폼을 따로 만들면
 * 도시 목록이나 관법 옵션이 두 곳에서 서서히 어긋난다.
 */
export function ProfileEditor({ editing, onSave, onCancel }: Props) {
  const [memo, setMemo] = useState(editing?.memo ?? '');

  function handleSubmit(input: SajuInput) {
    const label = input.name.trim() || '이름 없음';
    onSave({
      id: editing?.id ?? newProfileId(),
      label,
      memo: memo.trim() || undefined,
      input: { ...input, name: label },
      createdAt: editing?.createdAt ?? Date.now(),
    });
  }

  return (
    <section className="space-y-3">
      <div className="card" style={{ background: 'var(--surface-sunken)' }}>
        <h2 className="text-base font-semibold">{editing ? '카드 수정' : '카드 추가'}</h2>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          이름은 카드에 표시될 이름입니다. 본인이면 「나」 처럼 적어도 됩니다.
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
      </div>

      <BirthForm
        onSubmit={handleSubmit}
        loading={false}
        initial={editing?.input}
        submitLabel={editing ? '수정 저장' : '카드 저장'}
        footnote="이 카드는 이 브라우저에만 저장됩니다."
        onCancel={onCancel}
      />
    </section>
  );
}
