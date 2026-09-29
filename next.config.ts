import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 만세력 계산은 Node 런타임 전용(Intl tz 오프셋 역산, astronomy-engine)
  serverExternalPackages: ['astronomy-engine'],
};

export default nextConfig;
