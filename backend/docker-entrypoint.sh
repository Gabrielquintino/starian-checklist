#!/bin/sh
set -eu

if [ ! -f .env ]; then
    cp .env.example .env
fi

if ! grep -Eq '^APP_KEY=base64:.+' .env; then
    app_key="base64:$(php -r 'echo base64_encode(random_bytes(32));')"

    if grep -q '^APP_KEY=' .env; then
        sed -i "s|^APP_KEY=.*|APP_KEY=$app_key|" .env
    else
        printf '\nAPP_KEY=%s\n' "$app_key" >> .env
    fi
fi

if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

if [ "$1" = "php" ] && [ "${2:-}" = "artisan" ] && [ "${3:-}" = "serve" ]; then
    if [ -f bootstrap/cache/config.php ]; then
        php artisan config:clear
    fi

    database_path="${DB_DATABASE:-}"

    if [ -z "$database_path" ]; then
        database_path="$(sed -n 's/^DB_DATABASE=//p' .env | head -n 1)"
    fi

    if [ -z "$database_path" ]; then
        echo 'DB_DATABASE must be configured for the development SQLite database.' >&2
        exit 1
    fi

    case "$database_path" in
        /*) ;;
        *) database_path="$PWD/$database_path" ;;
    esac

    database_directory="$(dirname "$database_path")"
    mkdir -p "$database_directory"

    if [ ! -e "$database_path" ]; then
        touch "$database_path"
    fi

    chmod u+rw "$database_path"

    php artisan migrate --force
fi

exec "$@"