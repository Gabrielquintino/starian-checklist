FROM php:8.3-cli AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends libzip-dev libsqlite3-dev zip unzip git curl libpng-dev \
    && docker-php-ext-install zip pdo pdo_mysql pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /backend

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY . .
RUN composer dump-autoload --optimize --no-interaction \
    && mkdir -p database \
    && touch database/database.sqlite \
    && chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

FROM runtime AS development

RUN apt-get update \
    && apt-get install -y --no-install-recommends $PHPIZE_DEPS \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && rm -rf /var/lib/apt/lists/*

COPY docker/php/conf.d/xdebug.ini /usr/local/etc/php/conf.d/99-xdebug.ini

FROM runtime AS production
