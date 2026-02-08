
import React, { useState, useEffect, useRef } from 'react';
import { Word } from '../types';
import { Volume2, Search, BookOpen, TrendingUp, X, BookCopy } from 'lucide-react';
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
  const [selectedWord, setSelectedWord] = useState<Word | null>(null); // 模态框选中的单词
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // 同步 voices 到 ref
  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  // 获取云端熟练度数据
  const { masteryData, getMasteryLevel, getMasteryBadge, isLoading: masteryLoading } = useMasteryData(words);

  // 初始化语音列表（Android 兼容性修复）
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    // Android 浏览器需要监听 voiceschanged 事件
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // 获取英文语音
  const getEnglishVoice = (): SpeechSynthesisVoice | null => {
    const currentVoices = voicesRef.current;
    const englishVoices = currentVoices.filter(v => v.lang.startsWith('en'));
    // 优先选择美国英语
    return englishVoices.find(v => v.lang === 'en-US') || englishVoices[0] || null;
  };

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
    console.log('[WordList] speak() called with:', text);

    if (!window.speechSynthesis) {
      console.warn('[WordList] Speech synthesis not supported');
      return;
    }

    // 检查 voices 是否可用
    if (voicesRef.current.length === 0) {
      console.warn('[WordList] No voices available, skipping.');
      return;
    }

    // Arc 浏览器修复：不调用 cancel()，让浏览器自然处理队列
    // 快速点击时，让浏览器取消前面的语音，避免 "canceled" 错误
    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语音属性
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 设置英文语音
    const englishVoice = getEnglishVoice();
    console.log('[WordList] Selected voice:', englishVoice?.name || 'default');
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      console.log(`[WordList] ✓ Started playing "${text}"`);
    };

    utterance.onend = () => {
      console.log(`[WordList] ✓ Finished playing "${text}"`);
    };

    utterance.onerror = (event) => {
      console.error(`[WordList] ✗ Error for "${text}":`, event.error);
    };

    window.speechSynthesis.speak(utterance);
    console.log('[WordList] speak() called. speaking:', window.speechSynthesis.speaking, 'pending:', window.speechSynthesis.pending);
  };

  // 打开模态框
  const openModal = (word: Word) => {
    setSelectedWord(word);
  };

  // 关闭模态框
  const closeModal = () => {
    setSelectedWord(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
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
      <div className="relative mb-4">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜索单词或释义..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* 分类筛选 - 按优先级排序：新词 → 生疏 → 一般 → 熟练 → 精通 → 全部 */}
      <div className="grid grid-cols-6 gap-2 mb-6">
        {/* 新词 - 灰色 */}
        <button
          onClick={() => setFilterType('new')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'new'
              ? 'bg-slate-700 text-white shadow-lg'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-slate-300'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) === 0).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-80">新词</div>
        </button>
        {/* 生疏 - 橙红色 */}
        <button
          onClick={() => setFilterType('unpracticed')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'unpracticed'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-2 border-orange-300'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) > 0 && getMasteryLevel(w.id) < 40).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-80">生疏</div>
        </button>
        {/* 一般 - 琥珀色 */}
        <button
          onClick={() => setFilterType('learning')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'learning'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-2 border-amber-300'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) >= 40 && getMasteryLevel(w.id) < 60).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-80">一般</div>
        </button>
        {/* 熟练 - 蓝色 */}
        <button
          onClick={() => setFilterType('proficient')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'proficient'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-2 border-blue-300'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) >= 60 && getMasteryLevel(w.id) < 80).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-80">熟练</div>
        </button>
        {/* 精通 - 绿色 */}
        <button
          onClick={() => setFilterType('mastered')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'mastered'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-300'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.filter(w => getMasteryLevel(w.id) >= 80).length}</div>
          <div className="text-xs uppercase tracking-wider opacity-80">精通</div>
        </button>
        {/* 全部 - 深灰色 */}
        <button
          onClick={() => setFilterType('all')}
          className={`p-3 rounded-xl text-center transition-all ${
            filterType === 'all'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-slate-300'
          }`}
        >
          <div className="text-xl font-bold mb-1">{words.length}</div>
          <div className="text-xs uppercase tracking-wider opacity-80">全部</div>
        </button>
      </div>

      {/* 单词网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWords.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>没有找到匹配的单词</p>
          </div>
        ) : (
          filteredWords.map((word, index) => {
            const masteryLevel = getMasteryLevel(word.id);
            const badge = getMasteryBadge(word.id);
            const mastery = masteryData[word.id];

            return (
              <div
                key={word.id}
                onClick={() => openModal(word)}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden group ${
                  masteryLevel >= 80 ? 'border-green-200 hover:border-green-400' :
                  masteryLevel >= 60 ? 'border-blue-200 hover:border-blue-400' :
                  masteryLevel >= 40 ? 'border-amber-200 hover:border-amber-400' :
                  masteryLevel > 0 ? 'border-orange-200 hover:border-orange-400' :
                  'border-slate-200 hover:border-slate-400'
                }`}
              >
                {/* 卡片内容 */}
                <div className="p-5">
                  {/* 顶部：单词 + 熟练度标签 */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-slate-800 break-words group-hover:text-indigo-600 transition-colors leading-tight">
                        {word.term}
                      </h3>
                    </div>
                    {/* 熟练度标签 */}
                    {masteryLevel > 0 ? (
                      <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full ${badge.bgColor} ${badge.color} font-medium flex items-center gap-1`}>
                        <TrendingUp size={10} />
                        {badge.level}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">新词</span>
                    )}
                  </div>

                  {/* 释义预览（最多显示2个词性） */}
                  <div className="text-sm text-slate-700 mb-3 line-clamp-2 leading-relaxed">
                    {word.definitions && word.definitions.length > 0 ? (
                      word.definitions.slice(0, 2).map((def, i) => (
                        <div key={i} className="leading-snug">
                          <span className="text-indigo-600 font-semibold text-xs">{def.partOfSpeech}</span>
                          <span className="text-slate-700 text-sm ml-1">{def.meaning}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-700">{word.definition || '暂无释义'}</span>
                    )}
                  </div>

                  {/* 底部：测试统计 + 发音按钮 */}
                  <div className="flex items-center justify-between">
                    {/* 测试统计 */}
                    {mastery && mastery.attempt_count > 0 ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          {mastery.attempt_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          {Math.round((mastery.correct_count / mastery.attempt_count) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">点击查看详情</div>
                    )}

                    {/* 发音按钮（阻止冒泡，避免触发模态框） */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(word.term);
                      }}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-all active:scale-95"
                      aria-label="播放发音"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 单词详情模态框 */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          ></div>

          {/* 模态框内容 */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* 模态框头部 */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 pb-8 text-white relative">
              {/* 关闭按钮 - 移到右上角外侧 */}
              <button
                onClick={closeModal}
                className="absolute -top-2 -right-2 z-20 w-10 h-10 rounded-full bg-white shadow-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>

              <div className="flex items-center gap-4 mb-3 pr-8">
                {/* 播放按钮 - 移到左侧 */}
                <button
                  onClick={() => speak(selectedWord.term)}
                  className="flex-shrink-0 w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
                  aria-label="播放发音"
                >
                  <Volume2 size={28} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-3xl font-bold mb-1 break-words">{selectedWord.term}</h2>
                  {selectedWord.phonetic && (
                    <div className="text-indigo-100 font-mono text-sm">[{selectedWord.phonetic}]</div>
                  )}
                </div>
              </div>

              {/* 熟练度信息 */}
              {(() => {
                const masteryLevel = getMasteryLevel(selectedWord.id);
                const badge = getMasteryBadge(selectedWord.id);
                const mastery = masteryData[selectedWord.id];

                if (mastery && mastery.attempt_count > 0) {
                  const wrongCount = mastery.attempt_count - mastery.correct_count;
                  const accuracy = Math.round((mastery.correct_count / mastery.attempt_count) * 100);
                  const avgTimeSec = ((mastery.total_time_spent || 0) / mastery.attempt_count / 1000).toFixed(1);

                  return (
                    <div className="bg-white/10 rounded-xl p-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-300"></span>
                          正确 {accuracy}%
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-300"></span>
                          错误 {wrongCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                          平均 {avgTimeSec}s
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${badge.bgColor} ${badge.color} font-medium`}>
                    <TrendingUp size={14} />
                    {badge.level} {masteryLevel > 0 ? `${masteryLevel}%` : ''}
                  </div>
                );
              })()}
            </div>

            {/* 模态框内容 */}
            <div className="p-6 space-y-6">
              {/* 释义 */}
              {selectedWord.definitions && selectedWord.definitions.length > 0 ? (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <BookCopy size={20} className="text-indigo-500" />
                    释义
                  </h3>
                  <div className="space-y-2">
                    {selectedWord.definitions.map((def, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 border-l-4 border-indigo-400">
                        <span className="text-indigo-600 font-bold">{def.partOfSpeech}</span>
                        <span className="text-slate-700 ml-2">{def.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedWord.definition ? (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-slate-700">{selectedWord.definition}</div>
                </div>
              ) : null}

              {/* 例句 */}
              {selectedWord.examples && selectedWord.examples.length > 0 ? (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <BookOpen size={20} className="text-indigo-500" />
                    例句
                  </h3>
                  <div className="space-y-3">
                    {selectedWord.examples.map((ex, i) => (
                      <div key={i} className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl p-4">
                        <p className="text-slate-700 italic mb-2">
                          "{highlightWordInSentenceReact(ex.sentence, selectedWord.term)}"
                        </p>
                        {ex.translation && (
                          <p className="text-sm text-slate-500">{ex.translation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedWord.example ? (
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl p-4">
                  <p className="text-slate-700 italic">
                    "{highlightWordInSentenceReact(selectedWord.example, selectedWord.term)}"
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 底部统计 */}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
        <BookOpen size={16} />
        <span>显示 {filteredWords.length} / {words.length} 个单词</span>
      </div>
    </div>
  );
};

export default WordList;
