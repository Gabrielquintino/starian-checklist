#!/bin/sh
set -eu

if [ ! -x node_modules/.bin/ng ]; then
    npm ci --no-audit --no-fund
    test -x node_modules/.bin/ng
fi

exec "$@"
