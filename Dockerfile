FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY apps ./apps
COPY packages ./packages

RUN test -f apps/web/package.json && test -f apps/api/package.json && test -f packages/domain/package.json
RUN npm install --workspaces --include-workspace-root --legacy-peer-deps
RUN npm --prefix apps/web run build
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV WEB_DIST=/app/apps/web/dist

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --schema apps/api/prisma/schema.prisma && npm run start:prod"]
