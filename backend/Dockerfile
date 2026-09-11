FROM node:22-alpine

WORKDIR /app

# Ensure openssl/curl if package index is reachable; node:22-alpine already contains libssl.so.3
RUN apk add --no-cache openssl curl || true

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY tsconfig.json ./
COPY src ./src/
COPY data ./data/
COPY scripts ./scripts/

RUN npx prisma generate
RUN npm run build

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
