# fsep-node-express-api

A small Express REST API for managing a collection of **science fiction and fantasy books**. It demonstrates layered Express architecture (routes → controllers → services), custom middleware, REST conventions, and a **MongoDB**-backed data store.

🚀 **Live site:** [fsep-node-express-api.onrender.com](https://fsep-node-express-api.onrender.com/) — try [`/api/books`](https://fsep-node-express-api.onrender.com/api/books) or the interactive [Swagger UI](https://fsep-node-express-api.onrender.com/api-docs). Runs on Render's free tier, so the first request after idle can take up to a minute to wake the service; the seed books are inserted the first time the MongoDB collection is empty.

## Documentation

<!-- PAGES-LINK:START -->
📖 **[Documentation site](https://das77.github.io/fsep-node-express-api/)** — architecture & design docs, published from `docs/` via GitHub Pages.
<!-- PAGES-LINK:END -->

- [Live API Explorer](https://das77.github.io/fsep-node-express-api/api.html) — Swagger UI on the docs site, executing against the Render deployment
- [Architecture](docs/ARCHITECTURE.md) — layers, module dependencies, request pipeline
- [Design](docs/DESIGN.md) — API design decisions, data model, trade-offs
- [Deployment](docs/DEPLOYMENT.md) — production plan: image workflow, EC2 vs. EKS, secrets, scaling, cost
- [AI Usage](docs/AI-USAGE.md) — how AI assistance was used and validated during development

## Features

- **Full CRUD** for books at `/api/books` with proper HTTP methods and status codes
- **Filtering & search** — `?genre=fantasy`, `?author=tolkien` (case-insensitive substring match, filters compose)
- **Custom middleware** — request logging, body validation, id validation, centralized error handling
- **Interactive API docs** — Swagger UI at `/api-docs` with "Try it out" against the live server; raw OpenAPI 3.0.3 spec at `/api-docs.json`
- **CommonJS** module system with async/await throughout
- **MongoDB persistence** via the official `mongodb` driver; seed books load on first run when the collection is empty

## Quick start

Requires a MongoDB instance. The quickest way to run everything (API + MongoDB + the React client) is Docker Compose:

```bash
docker compose up --build     # client on http://localhost:8080, API on :3000
docker compose down -v         # stop and drop the mongo volume
```

To run the API directly against your own MongoDB:

```bash
npm install
export MONGODB_URI=mongodb://localhost:27017   # or put it in .env
npm run dev      # development with auto-restart (nodemon)
npm start        # production mode
```

The server listens on `http://localhost:3000` by default. Environment variables (all optional except `MONGODB_URI` in non-default setups):

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `books` | Database name |

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

Book fields: `title` (string), `author` (string), `genre` (`science-fiction` | `fantasy`), `year` (integer). All are required on create/update; invalid bodies return `400` with per-field details. The server-assigned `id` is a 24-character hex MongoDB ObjectId; a malformed `:id` returns `400`.

## Project structure

```
api/
├── app.js               # Express app: middleware pipeline + route mounting
├── server.js            # Entry point: loads .env, connects to MongoDB, starts the server
├── db.js                # MongoDB connection lifecycle (connect / getDb / close)
├── routes/              # Express Router definitions
├── controllers/         # Request/response handling
├── services/            # Business logic + MongoDB data access
├── middleware/          # requestLogger, validateBook, validateId, errorHandler
└── data/books.json      # Seed data (inserted into MongoDB on first run)
```

## License

[GPL-3.0](LICENSE)
