# VendWiz production image: `node build` (adapter-node) on port 3000.
#
# PUBLIC_APP_URL and VITE_ROOT_DOMAIN are compiled into the build, so they are build args.
# Every other setting (DATABASE_URL, BETTER_AUTH_SECRET, S3_*, SMTP_*, …) is read at startup
# from the container's environment and never ends up in the image.

FROM node:22-bookworm-slim AS base
RUN npm install -g pnpm@12.10.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Production dependencies only (sharp's native binary is installed here, for Linux)
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
ARG PUBLIC_APP_URL
ARG VITE_ROOT_DOMAIN
RUN test -n "$PUBLIC_APP_URL" && test -n "$VITE_ROOT_DOMAIN" || \
	(echo "Build args PUBLIC_APP_URL and VITE_ROOT_DOMAIN are required" && exit 1)
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN
RUN pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000 \
	BODY_SIZE_LIMIT=15M \
	PROTOCOL_HEADER=x-forwarded-proto
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
# For the migrate service: `node scripts/migrate.mjs`
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
USER node
EXPOSE 3000
CMD ["node", "build"]
