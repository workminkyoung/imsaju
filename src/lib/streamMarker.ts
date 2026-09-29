/**
 * 스트리밍 응답은 헤더를 이미 보낸 뒤라 상태 코드를 바꿀 수 없다.
 * 중단 사실은 본문 끝에 이 표시를 붙여 전달하고, 클라이언트가 떼어내 안내로 바꾼다.
 *
 * 널 문자라 정상적인 사주풀이 본문에는 절대 나타나지 않는다.
 */
export const INTERRUPT_MARKER = '\u0000IMSAJU_INTERRUPTED\u0000';

/** 스트림 본문에서 중단 표시를 분리한다. */
export function splitInterrupt(text: string): { body: string; interrupted: string | null } {
  const at = text.indexOf(INTERRUPT_MARKER);
  if (at < 0) return { body: text, interrupted: null };
  return {
    body: text.slice(0, at),
    interrupted: text.slice(at + INTERRUPT_MARKER.length) || '생성이 중단되었습니다.',
  };
}
