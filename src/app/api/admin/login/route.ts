import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  AdminNotConfiguredError,
  issueToken,
  verifyPassword,
} from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, issueToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // maxAge 를 주지 않아 세션 쿠키가 된다 — 브라우저를 닫으면 함께 사라진다.
      // 관리자 화면을 벗어날 때도 자동으로 로그아웃하므로 오래 살려 둘 이유가 없다.
    });
    return response;
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: '로그인에 실패했습니다.' }, { status: 400 });
  }
}

/** 로그아웃 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
