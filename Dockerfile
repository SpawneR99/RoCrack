FROM node:20-alpine

# better-sqlite3 needs build tools on Alpine
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && mkdir -p /app/data /app/uploads

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
    && apk del .build-deps

COPY . .

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data \
    UPLOADS_DIR=/app/uploads

EXPOSE 3000

# Mount these paths as persistent volumes in Coolify:
#   /app/data     -> SQLite database
#   /app/uploads  -> uploaded script icons
VOLUME ["/app/data", "/app/uploads"]

CMD ["node", "server.js"]
