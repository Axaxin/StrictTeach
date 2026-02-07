
import React from 'react';
import { Unit, AppMode, UserProgress } from '../types';
import { Play, ClipboardCheck, Trophy, BookOpen, ArrowLeft } from 'lucide-react';

interface UnitDetailProps {
  unit: Unit;
  progress: UserProgress;
  onSelectMode: (mode: AppMode) => void;
  onBack: () => void;
}

const UnitDetail: React.FC<UnitDetailProps> = ({ unit, progress, onSelectMode, onBack }) => {
  const masteredCount = unit.words.filter(w => progress.masteredWords.some(id => id.startsWith(unit.id))).length;
  const learningCount = unit.words.filter(w => progress.learningWords.some(id => id.startsWith(unit.id))).length;
  const progressPercent = Math.round((masteredCount / unit.words.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
      >
        <ArrowLeft size={20} />
        <span>返回章节列表</span>
      </button>

      {/* 章节标题卡片 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white mb-8 shadow-xl">
        <h1 className="text-3xl font-black mb-4">{unit.name}</h1>
        <p className="text-indigo-100 mb-6">开始学习本章节的 {unit.words.length} 个单词</p>

        <div className="flex gap-6">
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur px-4 py-3 rounded-2xl">
            <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center text-white">
              <Trophy size={18} />
            </div>
            <div>
              <div className="text-xl font-bold">{masteredCount}</div>
              <div className="text-xs text-indigo-100 uppercase tracking-wider">已掌握</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur px-4 py-3 rounded-2xl">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="text-xl font-bold">{learningCount}</div>
              <div className="text-xs text-indigo-100 uppercase tracking-wider">学习中</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider">学习进度</span>
            <span className="text-sm font-bold">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 学习模式选择 */}
      <h2 className="text-lg font-bold text-slate-700 mb-4">选择学习模式</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Learn 模式 */}
        <button
          onClick={() => onSelectMode(AppMode.LEARN)}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all group text-left"
        >
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Play size={28} fill="currentColor" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Learn</h3>
          <p className="text-slate-500 text-sm">翻卡片学习单词，标记掌握程度</p>
        </button>

        {/* Quiz 模式 */}
        <button
          onClick={() => onSelectMode(AppMode.QUIZ)}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all group text-left"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <ClipboardCheck size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Quiz</h3>
          <p className="text-slate-500 text-sm">混合题型测试，检验学习成果</p>
        </button>
      </div>
    </div>
  );
};

export default UnitDetail;
