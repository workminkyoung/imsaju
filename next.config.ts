import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * serverExternalPackages 에 astronomy-engine 을 넣지 않는다.
   *
   * 넣으면 Next 가 번들에 담지 않고 런타임에 외부 모듈로 불러오는데, 이 패키지는
   * CJS 진입점(astronomy.js)과 ESM 진입점(esm/astronomy.js)이 따로다. 추적에는
   * ESM 쪽만 실려서 로더가 그걸 CommonJS 로 읽다가
   * "SyntaxError: Unexpected token 'export'" 로 죽는다. Vercel 에서 만세력 라우트가
   * 전부 500 을 내던 원인이 이것이었다.
   *
   * 네이티브 바인딩이 없는 순수 JS 라 번들에 들어가도 문제없다. Node 런타임 고정은
   * 각 라우트의 `export const runtime = 'nodejs'` 가 이미 하고 있다.
   */

  /**
   * 도커나 일반 서버로 옮길 때는 standalone 빌드가 필요하다.
   * Vercel 은 자체적으로 번들하므로 켜지 않는다 — 환경변수로 가른다.
   */
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,

  /**
   * 프롬프트는 런타임에 파일로 읽는다. Next 가 정적 분석으로 알아서 포함해 주지만,
   * 나중에 경로를 변수로 바꾸면 조용히 빠질 수 있으므로 명시해 둔다.
   * 빠지면 프로덕션에서 풀이 생성이 통째로 실패한다.
   */
  outputFileTracingIncludes: {
    '/api/**': ['./prompts/**'],
  },

  /**
   * 관리자 영역은 CDN·프록시가 절대 캐시하면 안 된다.
   *
   * Next 는 이 응답들에 Cache-Control 을 붙이지 않고 Vary 에도 Cookie 가 없다.
   * 그대로 두면 앞단 캐시가 URL 만으로 응답을 재사용해서,
   *   - 로그인 전에 받은 401 이 로그인 후에도 계속 돌아오고(로그인이 안 되는 것처럼 보인다)
   *   - 반대로 인증된 응답이 남에게 나갈 수도 있다.
   * 로컬에는 앞단 캐시가 없어서 드러나지 않는다.
   */
  async headers() {
    const noStore = [
      { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
      { key: 'Vary', value: 'Cookie' },
    ];
    return [
      { source: '/api/admin/:path*', headers: noStore },
      { source: '/admin', headers: noStore },
    ];
  },
};

export default nextConfig;
