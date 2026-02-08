
import React, { useState } from 'react';
import { Word } from '../types';
import { Volume2, ArrowLeft, Search, BookOpen, TrendingUp } from 'lucide-react';
import { highlightWordInSentenceReact } from '../utils/highlight';
import { useMasteryData, getMasteryBadgeByLevel } from '../hooks/useMasteryData';

interface WordListProps {
  words: Word[];
  onComplete: () => void;
}

type MasteryFilterType = 'all' | 'mastered' | 'proficient' | 'learning' | 'new' | 'unpracticed';

const WordList: React.FC<WordListProps> = ({ words, onComplete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MasteryFilterType>('all');
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());

  // 获取云端熟练度数据
  const { masteryData, getMasteryLevel, getMasteryBadge, isLoading: masteryLoading } = useMasteryData(words);

  // 筛选单词（基于云端熟练度）
  const filteredWords = words.filter(word => {
    const matchesSearch = word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (word.definition?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (word.definitions?.some(d => d.meaning.toLowerCase().includes(searchTerm.toLowerCase())));

    const masteryLevel = getMasteryLevel(word.id);

    switch (filterType) {
      case 'mastered':
        return matchesSearch && masteryLevel >= 80;
      case 'proficient':
        return matchesSearch && masteryLevel >= 60 && masteryLevel < 80;
      case 'learning':
        return matchesSearch && masteryLevel >= 40 && masteryLevel < 60;
      case 'new':
        return matchesSearch && masteryLevel === 0;
      case 'unpracticed':
        return matchesSearch && masteryLevel > 0 && masteryLevel < 40;
      default:
        return matchesSearch;
    }
  });

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
          共 {words.length} 个单词
        </div>
      </div>

      {/* 统计卡片 - 基于云端熟练度 */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'all'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.length}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">全部</div>
        </button>
        <button
          onClick={() => setFilterType('mastered')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'mastered'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) >= 80).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">精通</div>
        </button>
        <button
          onClick={() => setFilterType('proficient')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'proficient'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) >= 60 && getMasteryLevel(w.id) < 80).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">熟练</div>
        </button>
        <button
          onClick={() => setFilterType('learning')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'learning'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) >= 40 && getMasteryLevel(w.id) < 60).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">一般</div>
        </button>
        <button
          onClick={() => setFilterType('new')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'new'
              ? 'bg-slate-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) === 0).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-70">新词</div>
        </button>
      </div>

      {/* 云端测试统计 */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 mb-6 border border-indigo-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <TrendingUp size={18} />
            <span className="text-sm font-bold">测试统计</span>
          </div>
          {masteryLoading && (
            <span className="text-xs text-indigo-500">加载中...</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {(() => {
            // 计算统计数据
            let totalAttempts = 0;
            let totalCorrect = 0;
            let totalTime = 0;
            let testedWords = 0;

            Object.values(masteryData).forEach(mastery => {
              if (mastery) {
                totalAttempts += mastery.attempt_count || 0;
                totalCorrect += mastery.correct_count || 0;
                totalTime += mastery.total_time_spent || 0;
                testedWords++;
              }
            });

            const totalWrong = totalAttempts - totalCorrect;
            const avgTimeMs = totalAttempts > 0 ? totalTime / totalAttempts : 0;
            const avgTimeSec = (avgTimeMs / 1000).toFixed(1);

            return [
              {
                label: '共测试',
                value: totalAttempts,
                unit: '次',
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-100'
              },
              {
                label: '正确',
                value: totalCorrect,
                unit: '次',
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              },
              {
                label: '错误',
                value: totalWrong,
                unit: '次',
                color: 'text-red-600',
                bgColor: 'bg-red-100'
              },
              {
                label: '平均用时',
                value: avgTimeSec,
                unit: '秒',
                color: 'text-amber-600',
                bgColor: 'bg-amber-100'
              }
            ].map((stat, i) => (
              <div key={i} className={`rounded-lg p-3 border border-indigo-100 ${stat.bgColor}`}>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-600">{stat.label}（{stat.unit}）</div>
              </div>
            ));
          })()}
        </div>
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
            const isExpanded = expandedWords.has(word.id);
            const masteryLevel = getMasteryLevel(word.id);
            const badge = getMasteryBadge(word.id);

            return (
              <div
                key={word.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
                  masteryLevel >= 80 ? 'border-green-200' :
                  masteryLevel >= 60 ? 'border-blue-200' :
                  masteryLevel >= 40 ? 'border-amber-200' :
                  masteryLevel > 0 ? 'border-orange-200' :
                  'border-slate-200'
                }`}
              >
                {/* 单词头部 - 始终显示 */}
                <div className="p-5">
                  {/* 第一行：单词 + 发音按钮 + 熟练度标签 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">#{index + 1}</span>
                      <h3 className="text-2xl font-bold text-slate-800">{word.term}</h3>
                      {word.phonetic && (
                        <span className="text-sm text-slate-500 font-mono hidden sm:inline">[{word.phonetic}]</span>
                      )}
                      {/* 云端熟练度标签 */}
                      {masteryLevel > 0 ? (
                        <span className={`text-xs px-2 py-1 rounded-full ${badge.bgColor} ${badge.color} font-medium flex items-center gap-1`}>
                          <TrendingUp size={12} />
                          {badge.level} {masteryLevel}%
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">新词</span>
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

                      {/* 测试统计 - 紧凑单行显示 */}
                      {(() => {
                        const mastery = masteryData[word.id];
                        if (mastery && mastery.attempt_count > 0) {
                          const wrongCount = mastery.attempt_count - mastery.correct_count;
                          const accuracy = Math.round((mastery.correct_count / mastery.attempt_count) * 100);
                          return (
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                测试 {mastery.attempt_count} 次
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                正确 {accuracy}%
                              </span>
                              {wrongCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                  错误 {wrongCount}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* 展开按钮 */}
                      {(word.definitions && word.definitions.length > 2) ||
                       (word.examples && word.examples.length > 0) ? (
                        <button
                          onClick={() => toggleExpand(word.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2"
                        >
                          {isExpanded ? '收起详情 ▲' : '展开更多 ▼'}
                        </button>
                      ) : null}
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
