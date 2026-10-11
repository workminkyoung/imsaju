'use client';

import { useEffect, useRef, useState } from 'react';
import { PROFILE_TTL_DAYS } from '@/lib/profiles';

/**
 * 카드 테이블 도움말.
 *
 * 안내 문구를 화면에 늘 펼쳐 두면 카드보다 글이 먼저 눈에 든다. 처음 한 번만 필요한
 * 내용이므로 물음표 뒤에 접어 두고 누를 때만 펼친다.
 */
export function TableHelp() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 열려 있을 때만 바깥 클릭과 Esc 를 듣는다.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      /*
       * 오른쪽 끝은 관리자 링크(layout.tsx)가 쓰고 있어 그 왼쪽에 선다.
       * 글자 수가 고정이라 간격을 숫자로 잡아도 흔들리지 않는다.
       */
      className="fixed top-5 right-16 z-50 sm:top-6 sm:right-[4.75rem]"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? '도움말 닫기' : '도움말 보기'}
        className="flex size-6 items-center justify-center rounded-full border text-[11px] leading-none font-bold transition hover:brightness-125"
        style={{
          borderColor: open ? 'var(--px-cream)' : 'var(--px-on-bg)',
          color: open ? 'var(--px-cream)' : 'var(--text-muted)',
          background: open ? 'rgb(255 255 255 / 0.15)' : 'transparent',
        }}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="카드 테이블 도움말"
          className="surface absolute right-0 mt-2 w-60 rounded-xl border p-3 shadow-xl"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <ul className="space-y-2 text-[11px] leading-relaxed">
            <li>카드를 누르면 뒤집히고, 끌어다 놓으면 궁합 칸에 들어갑니다.</li>
            <li>카드 두 장을 위 칸에 올리면 「궁합보기」가 켜집니다.</li>
            <li>
              카드는 이 브라우저에만 저장됩니다
              {PROFILE_TTL_DAYS !== null && ` · ${PROFILE_TTL_DAYS}일 동안 쓰지 않으면 지워져요`}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
