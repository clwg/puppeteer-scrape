FROM node:20-slim

RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates procps libxshmfence1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r puppeteer && useradd -r -g puppeteer -G audio,video puppeteer \
    && mkdir -p /home/puppeteer/Downloads \
    && chown -R puppeteer:puppeteer /home/puppeteer

USER puppeteer

WORKDIR /home/puppeteer

COPY --chown=puppeteer:puppeteer package*.json ./

RUN npm install

COPY --chown=puppeteer:puppeteer . .

CMD ["node", "scrape.js"]
