'use client';

import { useMemo, useState } from 'react';
import { CITIES } from '@/lib/cities';
import type { SajuInput } from '@/lib/saju/types';

interface Props {
  onSubmit: (input: SajuInput) => void;
  loading: boolean;
}

const YEARS = Array.from({ length: 151 }, (_, i) => 2050 - i);

export function BirthForm({ onSubmit, loading }: Props) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [isLeapMonth, setIsLeapMonth] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [city, setCity] = useState('서울');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [solarTimeMode, setSolarTimeMode] = useState<'none' | 'longitude' | 'apparent'>('longitude');
  const [lateZiHour, setLateZiHour] = useState(false);

  // 양력일 때만 그 달의 실제 일수를 반영한다. 음력은 29~30일이라 30까지 둔다.
  const daysInMonth = useMemo(() => {
    if (calendar === 'lunar') return 30;
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }, [calendar, year, month]);

  const groups = useMemo(
    () => ({
      국내: CITIES.filter((c) => c.group === '국내'),
      해외: CITIES.filter((c) => c.group === '해외'),
    }),
    [],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      name,
      calendar,
      year,
      month,
      day: Math.min(day, daysInMonth),
      isLeapMonth: calendar === 'lunar' && isLeapMonth,
      timeUnknown,
      hour: timeUnknown ? undefined : hour,
      minute: timeUnknown ? undefined : minute,
      gender,
      city,
      solarTimeMode,
      lateZiHour,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">이름</label>
          <input
            id="name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            maxLength={40}
          />
        </div>

        <div>
          <span className="label">성별</span>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                  gender === g
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                }`}
              >
                {g === 'male' ? '남자' : '여자'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <span className="label">달력</span>
        <div className="flex gap-2">
          {(['solar', 'lunar'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setCalendar(c); if (c === 'solar') setIsLeapMonth(false); }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                calendar === c
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
              }`}
            >
              {c === 'solar' ? '양력' : '음력'}
            </button>
          ))}
        </div>
        {calendar === 'lunar' && (
          <label className="mt-2.5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={isLeapMonth}
              onChange={(e) => setIsLeapMonth(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            윤달
          </label>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="year">연</label>
          <select id="year" className="field" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="month">월</label>
          <select id="month" className="field" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="day">일</label>
          <select id="day" className="field" value={Math.min(day, daysInMonth)} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label mb-0">출생 시각</span>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
              className="size-3.5 accent-[var(--accent)]"
            />
            시각 모름
          </label>
        </div>
        <div className={`grid grid-cols-2 gap-3 ${timeUnknown ? 'opacity-40' : ''}`}>
          <select className="field" value={hour} disabled={timeUnknown} onChange={(e) => setHour(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}시</option>
            ))}
          </select>
          <select className="field" value={minute} disabled={timeUnknown} onChange={(e) => setMinute(Number(e.target.value))}>
            {Array.from({ length: 60 }, (_, i) => i).map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
            ))}
          </select>
        </div>
        {timeUnknown && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            시주 없이 세 기둥만 세웁니다. 시각을 추정하지 않습니다.
          </p>
        )}
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="city">출생지</label>
        <select id="city" className="field" value={city} onChange={(e) => setCity(e.target.value)}>
          <optgroup label="국내">
            {groups.국내.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </optgroup>
          <optgroup label="해외">
            {groups.해외.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </optgroup>
        </select>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          경도로 진태양시를 보정하고, 그 시절의 표준시·서머타임을 자동 반영합니다.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-4 text-xs text-[var(--text-muted)] underline-offset-2 transition hover:text-[var(--accent)] hover:underline"
      >
        {showAdvanced ? '관법 설정 접기' : '관법 설정 펼치기'}
      </button>

      {showAdvanced && (
        <div className="mt-3 space-y-4 rounded-lg border p-4"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          <div>
            <span className="label">시각 보정</span>
            <div className="space-y-1.5">
              {([
                ['longitude', '경도 보정', '출생지 경도로 평균태양시를 구합니다. 국내 만세력의 일반적 관행입니다.'],
                ['apparent', '경도 + 균시차', '균시차(최대 ±16분)까지 반영한 진태양시. 가장 엄밀합니다.'],
                ['none', '보정 없음', '입력한 표준시를 그대로 씁니다.'],
              ] as const).map(([value, label, desc]) => (
                <label key={value} className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="radio"
                    name="solarTimeMode"
                    checked={solarTimeMode === value}
                    onChange={() => setSolarTimeMode(value)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={lateZiHour}
              onChange={(e) => setLateZiHour(e.target.checked)}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">야자시 관법 적용</span>
              <span className="block text-xs text-[var(--text-muted)]">
                23시 이후 출생의 일주를 다음 날로 넘기지 않습니다. 시주만 다음 날 자시로 봅니다.
              </span>
            </span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ background: 'var(--accent)' }}
      >
        {loading ? '계산 중…' : '만세력 보기'}
      </button>
      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        만세력 계산에는 AI를 쓰지 않습니다. 사주풀이는 결과 화면에서 따로 요청합니다.
      </p>
    </form>
  );
}
