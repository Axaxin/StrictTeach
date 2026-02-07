
import React, { useState } from 'react';
import { Word, UserProgress } from '../types';
import { Volume2, Check, X, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { highlightWordInSentenceReact } from '../utils/highlight';

interface WordListProps {
  words: Word[];
  progress: UserProgress;
  onComplete: () => void;
  onMastered: (wordId: string) => void;
  onReview: (wordId: string) => void;
}

const WordList: React.FC<WordListProps> = ({ words, progress, onComplete, onMastered, onReview }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mastered' | 'learning' | 'unstudied'>('all');
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());

  // 筛选单词
  const filteredWords = words.filter(word => {
    const matchesSearch = word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (word.definition?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (word.definitions?.some(d => d.meaning.toLowerCase().includes(searchTerm.toLowerCase())));

    const isMastered = progress.masteredWords.includes(word.id);
    const isLearning = progress.learningWords.includes(word.id);

    switch (filterType) {
      case 'mastered':
        return matchesSearch && isMastered;
      case 'learning':
        return matchesSearch && isLearning;
      case 'unstudied':
        return matchesSearch && !isMastered && !isLearning;
      default:
        return matchesSearch;
    }
  });

  const masteredCount = words.filter(w => progress.masteredWords.includes(w.id)).length;
  const learningCount = words.filter(w => progress.learningWords.includes(w.id)).length;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const getWordStatus = (wordId: string) => {
    if (progress.masteredWords.includes(wordId)) return 'mastered';
    if (progress.learningWords.includes(wordId)) return 'learning';
    return 'unstudied';
  };

  const toggleExpand = (wordId: string) => {
    setExpandedWords(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onComplete}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <div className="text-sm text-slate-500">
          共 {words.length} 个单词 · 已掌握 {masteredCount}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`p-4 rounded-xl text-center transition-all ${
            filterType === 'all'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold mb-1">{words.length}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">全部</div>
        </button>
        <button
          onClick={() => setFilterType('mastered')}
          className={`p-4 rounded-xl text-center transition-all ${
            filterType === 'mastered'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold mb-1">{masteredCount}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">已掌握</div>
        </button>
        <button
          onClick={() => setFilterType('learning')}
          className={`p-4 rounded-xl text-center transition-all ${
            filterType === 'learning'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-2xl font-bold mb-1">{learningCount}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">学习中</div>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜索单词或释义..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* 单词列表 */}
      <div className="space-y-4">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>没有找到匹配的单词</p>
          </div>
        ) : (
          filteredWords.map((word, index) => {
            const status = getWordStatus(word.id);
            const isExpanded = expandedWords.has(word.id);
            return (
              <div
                key={word.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
                  status === 'mastered' ? 'border-green-200' :
                  status === 'learning' ? 'border-amber-200' :
                  'border-slate-200'
                }`}
              >
                {/* 单词头部 - 始终显示 */}
                <div className="p-5">
                  {/* 第一行：单词 + 发音按钮 + 状态标签 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">#{index + 1}</span>
                      <h3 className="text-2xl font-bold text-slate-800">{word.term}</h3>
                      {word.phonetic && (
                        <span className="text-sm text-slate-500 font-mono hidden sm:inline">[{word.phonetic}]</span>
                      )}
                      {/* 状态标签 */}
                      {status === 'mastered' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">已掌握</span>
                      )}
                      {status === 'learning' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">学习中</span>
                      )}
                    </div>
                    {/* 发音按钮 - 更大更显眼 */}
                    <button
                      onClick={() => speak(word.term)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition-all active:scale-95"
                    >
                      <Volume2 size={20} />
                      <span className="font-medium">发音</span>
                    </button>
                  </div>

                  {/* 音标 - 移动端单独显示 */}
                  {word.phonetic && (
                    <div className="mb-3 sm:hidden text-xs text-slate-500 font-mono">[{word.phonetic}]</div>
                  )}

                  {/* 第二行：主要释义 + 操作按钮 */}
                  <div className="flex items-start justify-between gap-4">
                    {/* 主要释义 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-700">
                        {word.definitions && word.definitions.length > 0 ? (
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {word.definitions.slice(0, 2).map((def, i) => (
                              <span key={i} className="text-sm">
                                <span className="text-indigo-600 font-medium">{def.partOfSpeech}</span>
                                <span className="text-slate-600">{def.meaning}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p>{word.definition || '暂无释义'}</p>
                        )}
                      </div>

                      {/* 展开按钮 */}
                      {(word.definitions && word.definitions.length > 2) ||
                       (word.examples && word.examples.length > 0) ? (
                        <button
                          onClick={() => toggleExpand(word.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          {isExpanded ? '收起详情 ▲' : '展开更多 ▼'}
                        </button>
                      ) : null}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onMastered(word.id)}
                        className={`p-2 rounded-lg transition-all ${
                          status === 'mastered'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'
                        }`}
                        title="标记为已掌握"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => onReview(word.id)}
                        className={`p-2 rounded-lg transition-all ${
                          status === 'learning'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'
                        }`}
                        title="标记为学习中"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 展开的详细内容 */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    {/* 全部释义 */}
                    {word.definitions && word.definitions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <BookOpen size={14} />
                          释义
                        </h4>
                        <div className="space-y-1">
                          {word.definitions.map((def, i) => (
                            <div key={i} className="text-sm pl-4 border-l-2 border-indigo-200">
                              <span className="text-indigo-600 font-medium">{def.partOfSpeech}</span>
                              <span className="text-slate-600 ml-2">{def.meaning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 例句 */}
                    {word.examples && word.examples.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <BookOpen size={14} />
                          例句
                        </h4>
                        <div className="space-y-3">
                          {word.examples.map((ex, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3">
                              <p className="text-sm text-slate-700 italic">"{highlightWordInSentenceReact(ex.sentence, word.term)}"</p>
                              {ex.translation && (
                                <p className="text-xs text-slate-500 mt-1">{ex.translation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 兼容旧例句格式 */}
                    {!word.examples || word.examples.length === 0 ? (
                      word.example && (
                        <div className="bg-slate-50 rounded-lg p-3 mt-2">
                          <p className="text-sm text-slate-700 italic">"{highlightWordInSentenceReact(word.example, word.term)}"</p>
                        </div>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 底部统计 */}
      <div className="mt-8 text-center text-sm text-slate-400">
        显示 {filteredWords.length} / {words.length} 个单词
      </div>
    </div>
  );
};

export default WordList;
