import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 만세력 계산은 Node 런타임 전용(Intl tz 오프셋 역산, astronomy-engine)
  serverExternalPackages: ['astronomy-engine'],

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
};

export default nextConfig;
