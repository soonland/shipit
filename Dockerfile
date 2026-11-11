# Stage 1: build the React app
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: small runtime image with only the server + built files
FROM node:24-slim
WORKDIR /app
COPY package.json server.js chaos.js ./
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "server.js"]
