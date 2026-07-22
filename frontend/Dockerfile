# syntax=docker/dockerfile:1.7
FROM node:20 AS dependencies

WORKDIR /frontend

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca,target=/run/secrets/npm-ca.pem \
    NODE_EXTRA_CA_CERTS=/run/secrets/npm-ca.pem \
    NPM_CONFIG_CAFILE=/run/secrets/npm-ca.pem \
    npm ci --no-audit --no-fund \
    && test -x node_modules/.bin/ng

FROM dependencies AS development

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 4200

ENV NG_CLI_ANALYTICS=false

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start", "--", "--host=0.0.0.0"]

FROM development AS test

RUN apt-get update \
    && apt-get install --yes --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium
