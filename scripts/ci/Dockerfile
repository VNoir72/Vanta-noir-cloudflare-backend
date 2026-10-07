FROM node:24-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends chromium php-cli python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
RUN npm install --prefix /browser --ignore-scripts --no-audit --no-fund playwright@1.55.1
WORKDIR /scratch
