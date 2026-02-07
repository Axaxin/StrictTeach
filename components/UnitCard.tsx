
import React from 'react';
import { Unit, AppMode } from '../types';
import { Play, ClipboardCheck, ChevronRight } from 'lucide-react';

interface UnitCardProps {
  unit: Unit;
  onSelect: (mode: AppMode) => void;
  masteredCount: number;
}

const UnitCard: React.FC<UnitCardProps> = ({ unit, onSelect, masteredCount }) => {
  const progressPercent = Math.round((masteredCount / unit.words.length) * 100);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <BookOpen size={80} className="text-indigo-600" />
      </div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-slate-800 mb-2">{unit.name}</h3>
        <p className="text-slate-400 text-sm mb-6 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
          {unit.words.length} Vocabulary Words
        </p>

        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</span>
            <span className="text-xs font-bold text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => onSelect(AppMode.LEARN)}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100"
          >
            <Play size={16} fill="currentColor" />
            Learn
          </button>
          <button 
            onClick={() => onSelect(AppMode.QUIZ)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold text-sm border border-slate-200 transition-all"
          >
            <ClipboardCheck size={16} />
            Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

import { BookOpen } from 'lucide-react';
export default UnitCard;
