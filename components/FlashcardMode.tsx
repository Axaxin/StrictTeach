
import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, Shuffle, X, TrendingUp } from 'lucide-react';
import { useMasteryData, getMasteryBadgeByLevel } from '../hooks/useMasteryData';

interface FlashcardModeProps {
  words: Word[];
  onComplete: () => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ words, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [shuffledWords, setShuffledWords] = useState<Word[]>(words);

  const currentWord = shuffledWords[currentIndex];

  // 获取云端熟练度数据
  const { getMasteryLevel, getMasteryBadge, masteryData } = useMasteryData(words);

  // 当 words 变化时更新 shuffledWords
  useEffect(() => {
    setShuffledWords(words);
  }, [words]);

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
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    // 优先选择美国英语
    return englishVoices.find(v => v.lang === 'en-US') || englishVoices[0] || null;
  };

  // 打乱单词顺序
  const handleShuffle = () => {
    const shuffled = [...shuffledWords].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
    // 如果当前是背面，先翻回正面，然后再重置到第一张
    if (isFlipped) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(0);
      }, 500);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < shuffledWords.length - 1) {
      // 如果当前是背面，先翻回正面
      if (isFlipped) {
        setIsFlipped(false);
        // 等待翻转动画完成（500ms）后再切换到下一个单词
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
        }, 500);
      } else {
        // 如果已经是正面，直接切换
        setCurrentIndex(currentIndex + 1);
      }
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      // 如果当前是背面，先翻回正面
      if (isFlipped) {
        setIsFlipped(false);
        // 等待翻转动画完成（500ms）后再切换到上一个单词
        setTimeout(() => {
          setCurrentIndex(currentIndex - 1);
        }, 500);
      } else {
        // 如果已经是正面，直接切换
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // 取消当前正在播放的语音（Android 修复）
    window.speechSynthesis.cancel();

    // 短暂延迟确保 cancel 完成（Android 修复）
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);

      // 设置语音属性
      utterance.lang = 'en-US';
      utterance.rate = 1.0;      // 语速
      utterance.pitch = 1.0;     // 音调
      utterance.volume = 1.0;    // 音量

      // 尝试设置英文语音
      const englishVoice = getEnglishVoice();
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      // 错误处理
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
      };

      // 播放完成后的处理
      utterance.onend = () => {
        // Android: 确保语音完全结束
        window.speechSynthesis.cancel();
      };

      window.speechSynthesis.speak(utterance);

      // Android 修复：保持语音合成活跃状态
      if (window.speechSynthesis.speaking) {
        console.log('Speech started');
      }
    }, 50);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onComplete}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-2"
            title="退出学习"
          >
            <X size={20} />
            <span className="text-sm font-bold">退出</span>
          </button>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Card {currentIndex + 1} of {shuffledWords.length}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleShuffle}
            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2"
            title="打乱顺序"
          >
            <Shuffle size={20} />
            <span className="text-sm font-bold">随机</span>
          </button>
          <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
            {(() => {
              const badge = getMasteryBadge(currentWord.id);
              const masteryLevel = getMasteryLevel(currentWord.id);
              const progressColor = masteryLevel >= 80 ? 'bg-green-500' :
                                   masteryLevel >= 60 ? 'bg-blue-500' :
                                   masteryLevel >= 40 ? 'bg-amber-500' :
                                   masteryLevel > 0 ? 'bg-orange-500' : 'bg-indigo-500';
              return (
                <div
                  className={`h-full ${progressColor} transition-colors duration-300`}
                  style={{ width: `${((currentIndex + 1) / shuffledWords.length) * 100}%` }}
                />
              );
            })()}
          </div>
        </div>
      </div>

      <div
        className="relative h-[400px] w-full cursor-pointer perspective-1000 mb-6 group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
          {/* Front Side */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center p-8 text-center">
            {/* 云端熟练度标签 */}
            {(() => {
              const badge = getMasteryBadge(currentWord.id);
              const masteryLevel = getMasteryLevel(currentWord.id);
              return masteryLevel > 0 ? (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full ${badge.bgColor} ${badge.color} font-medium text-sm flex items-center gap-2`}>
                  <TrendingUp size={16} />
                  {badge.level} {masteryLevel}%
                </div>
              ) : (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 font-medium text-sm">
                  新词
                </div>
              );
            })()}
            {currentWord.phonetic && (
              <p className="text-lg text-slate-500 font-mono mb-2">[{currentWord.phonetic}]</p>
            )}
            <h2 className="text-5xl font-black text-slate-800 mb-6 group-hover:scale-110 transition-transform">{currentWord.term}</h2>
            <button
              onClick={(e) => { e.stopPropagation(); speak(currentWord.term); }}
              className="p-3 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
            >
              <Volume2 size={24} />
            </button>
            <p className="mt-8 text-slate-300 font-medium text-sm animate-pulse">Click to see definition</p>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 backface-hidden bg-indigo-600 rotate-y-180 rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-8 text-center text-white">
            {/* 释义 - 显示带词性的多个释义 */}
            <div className="w-full">
              {currentWord.definitions && currentWord.definitions.length > 0 ? (
                <div className="space-y-4">
                  {currentWord.definitions.map((def, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-indigo-200 font-semibold text-sm">{def.partOfSpeech}</span>
                      <span className="text-4xl font-black">{def.meaning}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <h3 className="text-5xl font-black">{currentWord.definition}</h3>
              )}
            </div>

            {/* 熟练度统计 */}
            {(() => {
              const masteryLevel = getMasteryLevel(currentWord.id);
              const mastery = masteryData[currentWord.id];
              if (mastery && masteryLevel > 0) {
                return (
                  <div className="mt-6 pt-6 border-t border-indigo-400 w-full">
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} />
                        <span className="text-indigo-200">熟练度: <strong className="text-white">{masteryLevel}%</strong></span>
                      </div>
                      <div className="text-indigo-200">练习: <strong className="text-white">{mastery.attempt_count}</strong> 次</div>
                      <div className="text-indigo-200">正确: <strong className="text-white">{mastery.correct_count}</strong> 次</div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <p className="mt-12 text-indigo-200 font-medium text-sm">Click to see word</p>
          </div>
        </div>
      </div>

      {/* 翻页按钮 - 移到卡片下方 */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-3 rounded-2xl flex items-center gap-2 font-bold transition-all ${currentIndex === 0 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <ChevronLeft size={20} />
          Previous
        </button>
        <button
          onClick={() => setIsFlipped(false)}
          className="p-3 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all"
          title="Reset Card"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={handleNext}
          className="p-3 rounded-2xl flex items-center gap-2 font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default FlashcardMode;
