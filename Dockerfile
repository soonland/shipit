# Stage 1: build the React app
FROM node:26-slim AS build
WORKDIR /app
# Node 25+ no longer ships corepack: install the pnpm version pinned in package.json
COPY package.json ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: small runtime image with only the server + built files
FROM node:26-slim
WORKDIR /app
COPY package.json server.js chaos.js ./
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "server.js"]
