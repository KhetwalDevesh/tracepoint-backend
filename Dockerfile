FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install

# Install dev dependencies (for prisma generate)
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install prod dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build / generate stage
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Typecheck
RUN bun run typecheck

# Release stage
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/src ./src
COPY --from=prerelease /app/prisma ./prisma
COPY --from=prerelease /app/prisma.config.ts ./prisma.config.ts
COPY --from=prerelease /app/package.json ./package.json
COPY --from=prerelease /app/node_modules/.prisma ./node_modules/.prisma

USER bun
EXPOSE 4000/tcp
ENTRYPOINT ["bun", "run", "src/index.ts"]
