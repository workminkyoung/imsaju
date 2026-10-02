/**
 * 사람 카드 목록과 생성.
 *
 * 목록은 **이름과 메모만** 내보낸다. 생년월일은 서버 밖으로 나가지 않는다.
 */

import { NextResponse } from 'next/server';
import { getProfileStore, profileStorageInfo, toPublic, type StoredProfile } from '@/lib/profileStore';
import { ValidationError, parseSajuInput } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function newId(): string {
  return crypto.randomUUID();
}

function readLabel(body: Record<string, unknown>, fallback: string): string {
  const raw = typeof body.label === 'string' ? body.label.trim() : '';
  return (raw || fallback).slice(0, 40);
}

export async function GET() {
  const profiles = await getProfileStore().list();
  return NextResponse.json({
    profiles: profiles.map(toPublic),
    storage: profileStorageInfo(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseSajuInput(body.input ?? body);
    const label = readLabel(body, input.name || '이름 없음');
    const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 40) : undefined;

    const now = Date.now();
    const profile: StoredProfile = {
      id: newId(),
      label,
      memo: memo || undefined,
      input: { ...input, name: label },
      createdAt: now,
      updatedAt: now,
    };
    await getProfileStore().put(profile);

    return NextResponse.json({ profile: toPublic(profile) }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '카드를 저장하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
