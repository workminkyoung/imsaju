'use client';

import type { PublicProfile } from '@/lib/profiles';
import { CARD_H, CARD_W } from './TableCard';

interface Props {
  /** [A, B] — 비어 있으면 null */
  slots: (PublicProfile | null)[];
  /** 드래그 중 포인터가 올라와 있는 슬롯 번호 */
  hovered: number | null;
  onClear: (index: number) => void;
  /** 슬롯의 화면 좌표를 바깥에서 재야 드롭 판정을 할 수 있다. */
  slotRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

const LABELS = ['A', 'B'];

export function DropSlots({ slots, hovered, onClear, slotRefs }: Props) {
  return (
    <div className="flex items-start justify-center gap-5">
      {slots.map((profile, index) => {
        const active = hovered === index;
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <span
              className="text-xs font-semibold tracking-[0.2em]"
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {LABELS[index]}
            </span>

            <div
              ref={(el) => {
                if (slotRefs.current) slotRefs.current[index] = el;
              }}
              className="flex items-center justify-center rounded-xl border-2 border-dashed transition"
              style={{
                width: CARD_W,
                height: CARD_H,
                borderColor: active || profile ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--accent-soft)' : 'var(--surface-sunken)',
                transform: active ? 'scale(1.04)' : undefined,
              }}
            >
              {profile ? (
                <button
                  type="button"
                  onClick={() => onClear(index)}
                  className="flex size-full flex-col items-center justify-center gap-1.5 rounded-xl p-2"
                  title="빼기"
                >
                  <span className="line-clamp-3 text-sm font-semibold">{profile.label}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">누르면 빼기</span>
                </button>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">여기로 끌어오기</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
