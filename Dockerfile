FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    lsb-release \
    libgbm-dev \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci
RUN npx puppeteer browsers install chrome

COPY . .
RUN npm run build

CMD ["node", "dist/main.js"]
