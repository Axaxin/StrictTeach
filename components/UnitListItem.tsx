
import React from 'react';
import { Unit, AppMode, UserProgress } from '../types';
import { ChevronRight, BookOpen } from 'lucide-react';

interface UnitListItemProps {
  unit: Unit;
  progress: UserProgress;
  onClick: () => void;
}

const UnitListItem: React.FC<UnitListItemProps> = ({ unit, progress, onClick }) => {
  const masteredCount = unit.words.filter(w => progress.masteredWords.some(id => id.startsWith(unit.id))).length;
  const progressPercent = Math.round((masteredCount / unit.words.length) * 100);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all group text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{unit.name}</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{unit.words.length} 词</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500">{masteredCount}/{unit.words.length} 已掌握</span>
            </div>
            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-600">{progressPercent}%</span>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
      </div>
    </button>
  );
};

export default UnitListItem;
