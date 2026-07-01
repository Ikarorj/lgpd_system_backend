FROM node:18-alpine AS builder
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json backend/
COPY backend/src/ backend/src/
COPY shared/ shared/

RUN ./node_modules/.bin/tsc -p backend/tsconfig.json

FROM node:18-alpine
WORKDIR /app/backend

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY backend/package.json ./

EXPOSE 3000

CMD ["node", "dist/app.js"]
