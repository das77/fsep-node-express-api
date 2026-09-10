# Books client

A small React single-page app (Vite) that drives the `/api/books` endpoints of
the Express server in the repo root. Full CRUD: list with genre/author filters,
create, edit, and delete.

## Run it

Start the API from the repo root first:

```bash
npm start            # serves the API on http://localhost:3000
```

Then, in this directory:

```bash
npm install
npm run dev          # SPA on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:3000` (see
`vite.config.js`; override with `API_PROXY_TARGET`).

## Build

```bash
npm run build        # static bundle in dist/
npm run preview      # serve the built bundle
```

For production, serve `dist/` behind the same origin as the API (or a reverse
proxy that routes `/api` to the Express server) so the same-origin `fetch`
calls in `src/api.js` resolve.

## Docker

The repo-root `Dockerfile` builds this SPA and serves it with nginx, proxying
`/api/` to an upstream set by `API_URL` (default `http://api:3000`):

```bash
docker build -t books-client .          # from the repo root
docker run -p 8080:80 -e API_URL=http://books-api:3000 books-client
```

nginx config: `client/nginx.conf.template` (rendered at start via envsubst).
The container exposes `/healthz` for the Docker `HEALTHCHECK`.

