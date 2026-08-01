# Architecture

This document describes how the application is structured: its layers, module dependencies, and how a request travels through the system. For *why* the API behaves the way it does (status codes, data model, trade-offs), see [DESIGN.md](DESIGN.md).

## Overview

The app is a layered Express 5 application in CommonJS. Each layer has one responsibility and only talks to the layer directly below it:

```mermaid
flowchart TD
    Client([HTTP Client])
    subgraph "Express application"
        A[app.js<br/>middleware pipeline + mounting]
        R[routes/books.routes.js<br/>URL → handler mapping]
        C[controllers/books.controller.js<br/>req/res handling]
        S[services/books.service.js<br/>business logic + data access]
    end
    D[(src/data/books.json)]

    Client -->|HTTP request| A
    A --> R
    R --> C
    C --> S
    S -->|fs/promises| D
```

- **`server.js`** — process entry point. Loads environment variables via `dotenv`, imports the app, binds the port. Nothing else.
- **`app.js`** — assembles the Express app: registers global middleware, mounts routers, and installs the terminal 404/error handlers. Exports the app *without* calling `.listen()`, so tests can import it directly (e.g. with supertest).
- **Routes** — declare which URL + HTTP method invokes which controller, and attach per-route middleware (validation). No logic.
- **Controllers** — translate HTTP to service calls: parse params/query, call the service, set the status code and JSON body. No business rules.
- **Services** — own the business logic and the data store. Throw errors with an attached `status` for the error middleware to translate. Know nothing about Express.

## Request pipeline

Middleware and routes execute in registration order. The ordering is load-bearing: routes must be registered before the 404 catch-all, and the error handler must be last.

```mermaid
flowchart LR
    IN([request]) --> J[express.json]
    J --> L[requestLogger]
    L --> RT{route match?}
    RT -->|"GET /, /health"| H[inline handlers]
    RT -->|"/api/books/*"| V[validateId / validateBook]
    V --> CT[controller]
    RT -->|no match| NF[notFoundHandler → 404]
    CT -->|throws / rejects| EH[errorHandler]
    V -->|invalid| B4[400 response]
```

Two validation middleware run before controllers on the routes that need them:

| Middleware | Applied to | Rejects with |
| ---------- | --------- | ------------ |
| `validateId` | `GET/PUT/DELETE /api/books/:id` | 400 if `:id` is not a positive integer |
| `validateBook` | `POST`, `PUT /api/books` | 400 with per-field detail messages |

## Error propagation

Services never touch `res`. They throw `Error` objects carrying a `status` property (e.g. 404 for an unknown id). Express 5 forwards rejected promises from async handlers to the error middleware automatically, so controllers contain no try/catch:

```mermaid
sequenceDiagram
    participant C as Controller
    participant S as Service
    participant E as errorHandler
    C->>S: getById(99)
    S-->>C: throws Error{status: 404}
    Note over C: async rejection auto-forwarded (Express 5)
    C->>E: err
    E-->>E: status = err.status ?? 500
    E->>E: log if status >= 500
    E-->>C: res.status(status).json({error: message})
```

Anything without an explicit `status` is treated as an unexpected `500` and logged server-side; the client only ever sees JSON.

## Module dependency graph

Dependencies point strictly downward — no cycles, and no layer imports from a layer above it:

```mermaid
flowchart TD
    server[server.js] --> app[app.js]
    app --> routes[books.routes.js]
    app --> logger[requestLogger.js]
    app --> errh[errorHandler.js]
    routes --> ctrl[books.controller.js]
    routes --> vid[validateId.js]
    routes --> vbook[validateBook.js]
    ctrl --> svc[books.service.js]
    svc --> data[(books.json)]
```

## Data layer

`books.service.js` implements a **read-through cache over a JSON file**:

1. First access reads `src/data/books.json` with `fs.promises.readFile` and caches the parsed array in module scope.
2. Reads are served from memory.
3. Every mutation (create/update/delete) rewrites the whole file with `fs.promises.writeFile`, so data survives restarts.

This is intentionally simple — a single process, small dataset, no concurrent-writer concerns. The service's public API (`getAll`, `getById`, `create`, `update`, `remove`) is fully async, so swapping the JSON file for a real database later changes only this one module.

## Configuration

Environment variables are loaded once in `server.js` via `dotenv` from a git-ignored `.env` file. Currently only `PORT` (default `3000`) is used.

## CI / repository automation

GitHub Actions workflows in `.github/workflows/`:

- **`ci.yml`** — installs dependencies and runs `npm audit` on pushes/PRs
- **`gemini-review.yml`** / **`gemini-triage.yml`** — AI-assisted PR review and issue triage
- **`pages.yml`** — publishes `docs/` via GitHub Pages (Jekyll config in `docs/_config.yml`)
