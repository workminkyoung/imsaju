/**
 * 관리자 로그아웃.
 *
 * POST 로 받는 이유는 navigator.sendBeacon 이 POST 만 보내기 때문이다.
 * 페이지를 떠나는 순간에는 일반 fetch 가 중간에 잘릴 수 있어서, 자동 로그아웃은
 * 반드시 sendBeacon 으로 보낸다.
 */

import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/adminAuth';

export const runtime = 'nodejs';

function clearSession() {
  const response = NextResponse.json({ ok: true });
  // 로그인 여부를 따지지 않는다. 이미 없으면 지울 것이 없을 뿐이다.
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}

export async function POST() {
  return clearSession();
}

/** 버튼에서 부르던 기존 방식도 계속 받는다. */
export async function DELETE() {
  return clearSession();
}
