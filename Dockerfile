# Vercel 말고 다른 곳(Railway·Render·Fly·직접 운영하는 서버)으로 옮길 때 쓴다.
# Vercel 은 이 파일을 쓰지 않는다 — 저장소를 연결하면 알아서 빌드한다.
#
#   docker build -t imsaju .
#   docker run -p 3000:3000 --env-file .env.local -v imsaju-data:/app/data imsaju
#
# 볼륨을 붙이면 관리자가 고친 프롬프트가 재시작 후에도 남는다.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# standalone 으로 빌드해야 실행 이미지에 node_modules 를 통째로 넣지 않아도 된다.
ENV BUILD_STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# root 로 돌리지 않는다.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 프롬프트는 런타임에 읽으므로 반드시 함께 올라가야 한다.
COPY --from=builder --chown=nextjs:nodejs /app/prompts ./prompts

# 관리자 수정본이 쌓이는 곳. 볼륨을 붙이지 않으면 컨테이너와 함께 사라진다.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
