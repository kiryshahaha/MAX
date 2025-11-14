FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

# Отключаем телеметрию
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 5173

CMD ["npm", "start"]