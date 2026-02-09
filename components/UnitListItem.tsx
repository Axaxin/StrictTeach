
import React, { useState, useEffect } from 'react';
import { Unit } from '../types';
import { ChevronRight, BookOpen } from 'lucide-react';
import { getBatchMasteryPost } from '../services/api';

interface UnitListItemProps {
  unit: Unit;
  onClick: () => void;
}

const UnitListItem: React.FC<UnitListItemProps> = ({ unit, onClick }) => {
  const [masteryData, setMasteryData] = useState<{[wordId: string]: number}>({});

  // 获取所有单词ID
  const allWordIds = unit.words.map((_, idx) => `${unit.id}-${idx}`);

  // 获取云端熟练度数据
  useEffect(() => {
    getBatchMasteryPost(allWordIds)
      .then(data => {
        const map: {[wordId: string]: number} = {};
        data.forEach(m => {
          map[m.word_id] = m.mastery_level;
        });
        setMasteryData(map);
      })
      .catch(err => {
        console.error('Failed to fetch mastery data:', err);
      });
  }, [unit.id]);

  // 计算学习进度（熟练度 >= 60 视为已完成）
  const completedCount = Object.values(masteryData).filter(level => level >= 60).length;
  const progressPercent = Math.round((completedCount / unit.words.length) * 100);

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
              <span className="text-xs text-slate-500">{completedCount}/{unit.words.length} 已掌握</span>
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
