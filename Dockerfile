FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY . .
RUN npm run build
RUN cp server/db/schema.sql dist/server/server/db/schema.sql

FROM build AS api

ENV NODE_ENV=production
ENV API_PORT=3000
ENV DATABASE_PATH=/app/data/pqs.sqlite
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["sh", "-c", "node dist/server/server/db/seed.js && exec node dist/server/server/index.js"]

FROM build AS client

ENV NODE_ENV=production
EXPOSE 5173
CMD ["npm", "exec", "--", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
