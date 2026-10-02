'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardFan } from './CardFan';
import { DropSlots } from './DropSlots';
import { CARD_H, CARD_W } from './TableCard';
import { BirthDateGate } from '@/components/BirthDateGate';
import { ProfileEditor } from '@/components/ProfileEditor';
import {
  createProfile,
  deleteProfile,
  fetchProfiles,
  migrateLegacyProfiles,
  updateProfile,
  type FullProfile,
  type PublicProfile,
  type StorageInfo,
} from '@/lib/profiles';
import type { SajuInput } from '@/lib/saju/types';

type EditState =
  | { mode: 'none' }
  | { mode: 'new' }
  | { mode: 'gate'; profile: PublicProfile }
  | { mode: 'edit'; profile: FullProfile; birthDate: string };

interface Drag {
  profile: PublicProfile;
  x: number;
  y: number;
}

export function CardTable() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [slots, setSlots] = useState<(PublicProfile | null)[]>([null, null]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState>({ mode: 'none' });

  const slotRefs = useRef<(HTMLDivElement | null)[]>([null, null]);

  const reload = useCallback(async () => {
    try {
      const data = await fetchProfiles();
      setProfiles(data.profiles);
      setStorage(data.storage);
      setError('');
    } catch (err) {
      setError((err as Error)?.message ?? '카드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const moved = await migrateLegacyProfiles();
      if (moved > 0) setNotice(`이 브라우저에 있던 카드 ${moved}장을 서버로 옮겼습니다.`);
      await reload();
    })();
  }, [reload]);

  // ── 드래그 ──
  /** 포인터가 어느 슬롯 위에 있는지. 없으면 null. */
  const slotAt = useCallback((x: number, y: number): number | null => {
    for (let i = 0; i < slotRefs.current.length; i++) {
      const rect = slotRefs.current[i]?.getBoundingClientRect();
      if (!rect) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      setDrag((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
      setHovered(slotAt(event.clientX, event.clientY));
    };

    const up = (event: PointerEvent) => {
      const index = slotAt(event.clientX, event.clientY);
      if (index !== null) {
        setSlots((prev) => {
          // 같은 카드가 두 슬롯에 들어가지 않게 다른 슬롯에서는 빼낸다.
          const next = prev.map((p) => (p?.id === drag.profile.id ? null : p));
          next[index] = drag.profile;
          return next;
        });
        setFlippedId(null);
      }
      setDrag(null);
      setHovered(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, slotAt]);

  function startDrag(profile: PublicProfile, event: React.PointerEvent) {
    setFlippedId(null);
    setDrag({ profile, x: event.clientX, y: event.clientY });
  }

  // ── 카드 관리 ──
  async function saveNew(input: SajuInput, memo?: string) {
    await createProfile(input, memo);
    setEdit({ mode: 'none' });
    await reload();
  }

  async function saveEdit(state: Extract<EditState, { mode: 'edit' }>, input: SajuInput, memo?: string) {
    await updateProfile(state.profile.id, state.birthDate, input, memo);
    setEdit({ mode: 'none' });
    await reload();
  }

  async function removeCard(state: Extract<EditState, { mode: 'edit' }>) {
    await deleteProfile(state.profile.id, state.birthDate);
    setSlots((prev) => prev.map((p) => (p?.id === state.profile.id ? null : p)));
    setEdit({ mode: 'none' });
    await reload();
  }

  if (edit.mode === 'new' || edit.mode === 'edit') {
    return (
      <div className="space-y-4">
        <ProfileEditor
          editing={edit.mode === 'edit' ? edit.profile : undefined}
          onSave={
            edit.mode === 'edit'
              ? (input, memo) => saveEdit(edit, input, memo)
              : (input, memo) => saveNew(input, memo)
          }
          onDelete={edit.mode === 'edit' ? () => removeCard(edit) : undefined}
          onCancel={() => setEdit({ mode: 'none' })}
        />
      </div>
    );
  }

  const bothPlaced = Boolean(slots[0] && slots[1]);

  return (
    <div className="relative">
      {notice && (
        <p
          className="mb-4 rounded-lg p-2.5 text-xs leading-relaxed"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {notice}
        </p>
      )}

      {/* 상단 — 궁합 슬롯 */}
      <section className="pt-2">
        <DropSlots
          slots={slots}
          hovered={hovered}
          onClear={(i) => setSlots((prev) => prev.map((p, j) => (j === i ? null : p)))}
          slotRefs={slotRefs}
        />

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={!bothPlaced}
            onClick={() =>
              router.push(`/compatibility?a=${slots[0]!.id}&b=${slots[1]!.id}`)
            }
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-35"
            style={{ background: 'var(--accent)' }}
          >
            궁합보기
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            {bothPlaced
              ? `${slots[0]!.label} ↔ ${slots[1]!.label}`
              : '카드 두 장을 위 칸으로 끌어다 놓으세요'}
          </p>
        </div>
      </section>

      {/* 하단 — 카드 부채꼴 */}
      <section className="table-felt mt-5 px-2 pt-3">
        {loading ? (
          <p className="py-16 text-center text-sm text-[var(--text-muted)]">카드를 불러오는 중…</p>
        ) : (
          <CardFan
            profiles={profiles}
            flippedId={flippedId}
            placedIds={slots.filter(Boolean).map((p) => p!.id)}
            onFlip={(id) => setFlippedId((prev) => (prev === id ? null : id))}
            onAdd={() => setEdit({ mode: 'new' })}
            onViewSaju={(id) => router.push(`/saju/${id}`)}
            onEdit={(profile) => setEdit({ mode: 'gate', profile })}
            onDragStart={startDrag}
          />
        )}

      </section>

      <p className="mt-2.5 text-center text-xs text-[var(--text-muted)]">
        카드를 누르면 뒤집히고, 끌어다 놓으면 궁합 칸에 들어갑니다.
      </p>

      {error && (
        <div
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          {error}
        </div>
      )}

      {storage && !storage.durable && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          이 서버는 카드를 오래 보관하지 못합니다({storage.name}). 재시작하면 사라집니다.
        </p>
      )}

      {edit.mode === 'gate' && (
        <BirthDateGate
          profile={edit.profile}
          onVerified={(full, birthDate) => setEdit({ mode: 'edit', profile: full, birthDate })}
          onCancel={() => setEdit({ mode: 'none' })}
        />
      )}

      {/* 드래그 중 따라다니는 카드 */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[60] rounded-xl border-2 shadow-lg"
          style={{
            left: drag.x - CARD_W / 2,
            top: drag.y - CARD_H / 2,
            width: CARD_W,
            height: CARD_H,
            borderColor: 'var(--accent)',
            background: 'var(--surface)',
            transform: 'rotate(-4deg)',
          }}
        >
          <div className="flex size-full items-center justify-center p-2 text-center">
            <span className="line-clamp-3 text-sm font-semibold">{drag.profile.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
