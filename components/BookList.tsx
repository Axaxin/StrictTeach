
import React from 'react';
import { Book } from '../types';
import BookListItem from './BookListItem';

interface BookListProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

const BookList: React.FC<BookListProps> = ({ books, onSelectBook }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
          VocabMaster <span className="text-indigo-600">Pro</span>
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          选择教材开始学习
        </p>
      </header>

      <div className="space-y-4">
        {books.map(book => (
          <BookListItem
            key={book.id}
            book={book}
            onClick={() => onSelectBook(book)}
          />
        ))}
      </div>
    </div>
  );
};

export default BookList;
