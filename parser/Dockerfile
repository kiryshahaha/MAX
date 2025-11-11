
    FROM node:20-alpine3.21

    # Установка зависимостей для Chromium
    RUN apk add --no-cache \
        chromium \
        chromium-chromedriver \
        nss \
        freetype \
        harfbuzz \
        ca-certificates \
        ttf-freefont \
        bash \
        curl \
        git \
        udev \
        libx11 \
        libxcomposite \
        libxdamage \
        libxext \
        libxrandr \
        libxrender \
        libxtst \
        alsa-lib \
        at-spi2-core \
        ttf-dejavu
    
    # Создаем рабочую директорию
    WORKDIR /app
    
    # Копируем package.json и package-lock.json
    COPY package*.json ./
    
    # Устанавливаем зависимости
    RUN npm install
    
    # Копируем весь проект
    COPY . .
    
    # Указываем Puppeteer использовать системный Chromium
    ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    
    # Опционально: если нужен headless режим
    ENV PUPPETEER_HEADLESS=true
    
    # Команда запуска
    CMD ["node", "server.js"]
