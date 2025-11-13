# Dockerfile для parser с Puppeteer
FROM node:20-bullseye-slim

# Устанавливаем необходимые зависимости для Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango1.0-0 \
    libasound2 \
    udev \
    tini \
    curl \
    git \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
