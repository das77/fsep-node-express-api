# fsep-node-express-api

A small Express REST API for managing a collection of **science fiction and fantasy books**. It demonstrates layered Express architecture (routes → controllers → services), custom middleware, REST conventions, and a file-backed in-memory data store — no database required.

## Documentation

<!-- PAGES-LINK:START -->
📖 **[Documentation site](https://das77.github.io/fsep-node-express-api/)** — architecture & design docs, published from `docs/` via GitHub Pages.
<!-- PAGES-LINK:END -->

- [Architecture](docs/ARCHITECTURE.md) — layers, module dependencies, request pipeline
- [Design](docs/DESIGN.md) — API design decisions, data model, trade-offs
- [AI Usage](docs/AI-USAGE.md) — how AI assistance was used and validated during development

## Features

- **Full CRUD** for books at `/api/books` with proper HTTP methods and status codes
- **Filtering & search** — `?genre=fantasy`, `?author=tolkien` (case-insensitive substring match, filters compose)
- **Custom middleware** — request logging, body validation, id validation, centralized error handling
- **CommonJS** module system with async/await throughout
- **JSON-file persistence** via `fs/promises` — survives restarts, cached in memory

## Quick start

```bash
npm install
npm run dev      # development with auto-restart (nodemon)
npm start        # production mode
```

The server listens on `http://localhost:3000` by default; set `PORT` in a `.env` file to override.

## API overview

| Method | Path | Description | Success | Errors |
| -------- | ------ | ------------- | --------- | -------- |
| GET | `/` | API index | 200 | |
| GET | `/health` | Health check | 200 | |
| GET | `/api-docs` | Interactive Swagger UI (try out every endpoint) | 200 | |
| GET | `/api/books` | List books; supports `?genre=` and `?author=` | 200 | |
| GET | `/api/books/:id` | Get one book | 200 | 400, 404 |
| POST | `/api/books` | Create a book | 201 | 400 |
| PUT | `/api/books/:id` | Replace a book | 200 | 400, 404 |
| DELETE | `/api/books/:id` | Delete a book | 204 | 400, 404 |

Example:

```bash
curl -X POST http://localhost:3000/api/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hyperion","author":"Dan Simmons","genre":"science-fiction","year":1989}'
```

Book fields: `title` (string), `author` (string), `genre` (`science-fiction` | `fantasy`), `year` (integer). All are required on create/update; invalid bodies return `400` with per-field details.

## Project structure

```
src/
├── app.js               # Express app: middleware pipeline + route mounting
├── server.js            # Entry point: loads .env, starts the server
├── routes/              # Express Router definitions
├── controllers/         # Request/response handling
├── services/            # Business logic + data access
├── middleware/          # requestLogger, validateBook, validateId, errorHandler
└── data/books.json      # Seed data / persistent store
```

## License

[GPL-3.0](LICENSE)
