# ---- Stage 1: build the React SPA ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first so this layer caches until the manifests change.
COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build          # -> /app/dist

# ---- Stage 2: serve the static bundle with nginx ----
FROM nginx:alpine

# Upstream Express service that /api/ is proxied to. This must be a hostname
# reachable FROM the nginx container - a sibling container's name on a shared
# Docker network, a compose service name, or host.docker.internal. It is NOT
# localhost (that resolves to the nginx container itself). Override at run time:
#   docker run --network books-net -e API_URL=http://books-api:3000 ...
ENV API_URL=http://api:3000

# Opt in to the base image populating ${NGINX_LOCAL_RESOLVERS} from
# /etc/resolv.conf; the nginx template uses it so /api/ DNS is resolved
# at request time (nginx starts even when the API is down).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# nginx's entrypoint runs envsubst on *.template -> /etc/nginx/conf.d/ at start.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine has busybox wget but no curl; hit the config's /healthz.
# Use 127.0.0.1, not localhost: the envsubst step overwrites default.conf
# after the image's IPv6 helper runs, so nginx ends up IPv4-only and
# busybox would try ::1 first.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

# Base image's CMD already runs the envsubst entrypoint + `nginx -g 'daemon off;'`.
