# Use the official Node.js 16 image.
# https://hub.docker.com/_/node
FROM node:20-slim

# Puppeteer dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates procps libxshmfence1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Add a user and group called "puppeteer"
RUN groupadd -r puppeteer && useradd -r -g puppeteer -G audio,video puppeteer \
    && mkdir -p /home/puppeteer/Downloads \
    && chown -R puppeteer:puppeteer /home/puppeteer

# Run everything after as non-privileged user.
USER puppeteer

# Set working directory
WORKDIR /home/puppeteer

# Copy package.json and package-lock.json
COPY --chown=puppeteer:puppeteer package*.json ./

# Install dependencies
RUN npm install

# Copy the app
COPY --chown=puppeteer:puppeteer . .

# Run the script
CMD ["node", "scrape.js"]
