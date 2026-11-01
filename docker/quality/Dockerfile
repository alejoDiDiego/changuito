FROM php:8.5.10-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libzip-dev libicu-dev unzip git ca-certificates && docker-php-ext-install -j2 pdo_pgsql zip intl && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2.10.3 /usr/bin/composer /usr/bin/composer
COPY --from=node:24.15.0-bookworm /usr/local/ /usr/local/
# Local npm tool prefix, not a global installation; match native and CI before npm ci.
RUN npm install --prefix /opt/npm --save-exact --ignore-scripts --no-fund --no-audit npm@12.0.2
ENV PATH="/opt/npm/node_modules/.bin:${PATH}"
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright PLAYWRIGHT_SKIP_BROWSER_GC=1
COPY package.json package-lock.json .npmrc /opt/browser/
RUN cd /opt/browser && npm ci --no-fund --no-audit && npx --no-install playwright install --with-deps chromium
WORKDIR /app
