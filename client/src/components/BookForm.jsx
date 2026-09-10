import { useState } from 'react';

const GENRES = ['science-fiction', 'fantasy'];

const blank = { title: '', author: '', genre: GENRES[0], year: '' };

function toFormState(book) {
  if (!book) return blank;
  return {
    title: book.title,
    author: book.author,
    genre: book.genre,
    year: String(book.year),
  };
}

export default function BookForm({ initial, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => toFormState(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: values.title.trim(),
        author: values.author.trim(),
        genre: values.genre,
        year: Number(values.year),
      });
      if (!initial) setValues(blank);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input
          type="text"
          required
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </label>
      <label>
        Author
        <input
          type="text"
          required
          value={values.author}
          onChange={(e) => set('author', e.target.value)}
        />
      </label>
      <label>
        Genre
        <select value={values.genre} onChange={(e) => set('genre', e.target.value)}>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label>
        Year
        <input
          type="number"
          required
          value={values.year}
          onChange={(e) => set('year', e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add book'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
