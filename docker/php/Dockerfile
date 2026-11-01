FROM php:8.5.10-fpm-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libzip-dev libicu-dev unzip git && docker-php-ext-install -j2 pdo_pgsql zip intl && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2.10.3 /usr/bin/composer /usr/bin/composer
WORKDIR /app
