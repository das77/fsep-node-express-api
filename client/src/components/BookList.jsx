export default function BookList({ books, onEdit, onDelete }) {
  if (books.length === 0) {
    return <p className="empty">No books match.</p>;
  }

  return (
    <table className="book-list">
      <thead>
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>Genre</th>
          <th>Year</th>
          <th aria-label="actions" />
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.id}>
            <td>{book.title}</td>
            <td>{book.author}</td>
            <td>{book.genre}</td>
            <td>{book.year}</td>
            <td className="row-actions">
              <button type="button" onClick={() => onEdit(book)}>
                Edit
              </button>
              <button type="button" className="danger" onClick={() => onDelete(book.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
