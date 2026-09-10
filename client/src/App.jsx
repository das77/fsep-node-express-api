import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import BookForm from './components/BookForm.jsx';
import BookList from './components/BookList.jsx';

const EMPTY_FILTERS = { genre: '', author: '' };

// Swagger UI served by the Express API. Same-origin by default: nginx (prod)
// and the Vite dev proxy both forward /api-docs to the API. Override with
// VITE_DOCS_URL only for an off-origin docs URL.
const DOCS_URL = import.meta.env.VITE_DOCS_URL || '/api-docs/';

export default function App() {
  const [books, setBooks] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editing, setEditing] = useState(null); // book being edited, or null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeFilters = useMemo(
    () => ({
      genre: filters.genre || undefined,
      author: filters.author.trim() || undefined,
    }),
    [filters]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooks(await api.listBooks(activeFilters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(data) {
    await api.createBook(data);
    await refresh();
  }

  async function handleUpdate(data) {
    await api.updateBook(editing.id, data);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this book?')) return;
    try {
      await api.deleteBook(id);
      if (editing?.id === id) setEditing(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="container">
      <h1>Books</h1>
      <p className="subtitle">
        React SPA over <code>/api/books</code>
        {' · '}
        <a href={DOCS_URL} target="_blank" rel="noreferrer">
          API docs (Swagger)
        </a>
      </p>

      <section className="panel">
        <h2>{editing ? `Edit “${editing.title}”` : 'Add a book'}</h2>
        <BookForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={editing ? () => setEditing(null) : null}
        />
      </section>

      <section className="panel">
        <div className="filters">
          <label>
            Genre
            <select
              value={filters.genre}
              onChange={(e) => setFilters((f) => ({ ...f, genre: e.target.value }))}
            >
              <option value="">any</option>
              <option value="science-fiction">science-fiction</option>
              <option value="fantasy">fantasy</option>
            </select>
          </label>
          <label>
            Author
            <input
              type="text"
              placeholder="substring match"
              value={filters.author}
              onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value }))}
            />
          </label>
          {(filters.genre || filters.author) && (
            <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : (
          <BookList books={books} onEdit={setEditing} onDelete={handleDelete} />
        )}
      </section>
    </main>
  );
}
