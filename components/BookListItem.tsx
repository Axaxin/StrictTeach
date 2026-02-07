
import React from 'react';
import { Book, UserProgress } from '../types';
import { ChevronRight, BookOpen } from 'lucide-react';

interface BookListItemProps {
  book: Book;
  progress: UserProgress;
  onClick: () => void;
}

const BookListItem: React.FC<BookListItemProps> = ({ book, progress, onClick }) => {
  // 计算整本书的掌握进度
  const totalWords = book.units.reduce((sum, unit) => sum + unit.words.length, 0);
  const masteredWords = book.units.reduce((sum, unit) => {
    return sum + unit.words.filter(w =>
      progress.masteredWords.some(id => id.startsWith(unit.id))
    ).length;
  }, 0);
  const progressPercent = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-400 transition-all group text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{book.name}</h3>
              <p className="text-sm text-slate-500">{book.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-15">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{book.units.length} 章节 · {masteredWords}/{totalWords} 已掌握</span>
            </div>
            <div className="h-2 flex-1 max-w-32 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-indigo-600">{progressPercent}%</span>
          </div>
        </div>
        <ChevronRight size={24} className="text-slate-300 group-hover:text-indigo-600 transition-colors ml-4" />
      </div>
    </button>
  );
};

export default BookListItem;
