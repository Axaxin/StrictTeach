
import React from 'react';
import { QuizMode } from '../types';
import { ArrowLeft, Languages, RotateCcw, Keyboard, Shuffle } from 'lucide-react';

interface QuizModeSelectorProps {
  onSelectMode: (mode: QuizMode) => void;
  onBack: () => void;
}

const QuizModeSelector: React.FC<QuizModeSelectorProps> = ({ onSelectMode, onBack }) => {
  const quizModes = [
    {
      mode: QuizMode.EN_TO_CN_MCQ,
      title: '英对中单选',
      description: '看英文单词，选择正确的中文释义',
      icon: Languages,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      mode: QuizMode.CN_TO_EN_MCQ,
      title: '中对英单选',
      description: '看中文释义，选择正确的英文单词',
      icon: RotateCcw,
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      mode: QuizMode.CN_TO_EN_SPELLING,
      title: '中对英拼写',
      description: '看中文释义，拼写正确的英文单词',
      icon: Keyboard,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      mode: QuizMode.MIXED,
      title: '混合题型',
      description: '包含英对中、中对英、拼写的混合测试',
      icon: Shuffle,
      color: 'indigo',
      gradient: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
      >
        <ArrowLeft size={20} />
        <span>返回</span>
      </button>

      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">选择 Quiz 模式</h1>
        <p className="text-slate-500">选择你想要的测验方式</p>
      </div>

      {/* Quiz 模式选择 */}
      <div className="space-y-4">
        {quizModes.map(({ mode, title, description, icon: Icon, gradient }) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className="w-full bg-white rounded-2xl p-6 border-2 border-slate-200 hover:shadow-xl hover:border-transparent transition-all group text-left"
          >
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                <Icon size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">{title}</h3>
                <p className="text-slate-500">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuizModeSelector;
