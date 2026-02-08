import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Word } from '../types';
import { ArrowLeft, Volume2, VolumeX, BookOpen, Play, Pause, Loader2, FileText, List } from 'lucide-react';
import { highlightWordInSentenceReact } from '../utils/highlight';

interface ContextualModeProps {
  words: Word[];
  unitId: string;
  onComplete: () => void;
}

interface Passage {
  title: string;
  paragraphs: Paragraph[];
}

interface Paragraph {
  sentences: SentencePair[];
}

interface SentencePair {
  english: string;
  chinese: string;
}

interface Sentence extends SentencePair {
  index: number;
}

type ViewMode = 'full' | 'sentence';

const ContextualMode: React.FC<ContextualModeProps> = ({ words, unitId, onComplete }) => {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('sentence');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);

  // Audio state - for sentence mode
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState<number | null>(null);
  const activeUtteranceRef = useRef<number | null>(null);

  // Audio state - for full text mode
  const [isFullPlaying, setIsFullPlaying] = useState(false);
  const [isFullPaused, setIsFullPaused] = useState(false);
  const [currentFullSentenceIndex, setCurrentFullSentenceIndex] = useState(0);

  // Load passage from JSON file
  useEffect(() => {
    const loadPassage = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/passages/${unitId}.json`);
        if (response.ok) {
          const data: Passage = await response.json();
          setPassage(data);

          // Parse sentences from the new structure
          const parsedSentences: Sentence[] = [];
          data.paragraphs.forEach((paragraph, pIdx) => {
            paragraph.sentences.forEach((sentencePair) => {
              parsedSentences.push({
                ...sentencePair,
                index: parsedSentences.length
              });
            });
          });

          setParagraphs(data.paragraphs);
          setSentences(parsedSentences);
        } else {
          setPassage(null);
        }
      } catch (error) {
        console.error('Failed to load passage:', error);
        setPassage(null);
      } finally {
        setLoading(false);
      }
    };

    loadPassage();
  }, [unitId]);

  // Create a set of word terms for quick lookup
  const wordSet = useMemo(() => new Set(words.map(w => w.term.toLowerCase())), [words]);

  // Find word by term (case-insensitive)
  const findWord = (term: string) => {
    return words.find(w => w.term.toLowerCase() === term.toLowerCase());
  };

  // Render text with clickable word highlights
  const renderInteractiveText = (text: string) => {
    const words = text.split(/(\s+|[.,!?;:"'()])/);

    return words.map((word, index) => {
      const trimmedWord = word.trim();
      const isEmpty = !trimmedWord;
      const isPunctuation = /^[.,!?;:"'()]+$/.test(trimmedWord);
      const isWordInList = !isEmpty && !isPunctuation && wordSet.has(trimmedWord.toLowerCase());

      if (isWordInList) {
        const foundWord = findWord(trimmedWord);
        return (
          <span
            key={index}
            onClick={() => foundWord && setSelectedWord(foundWord)}
            className="inline-block cursor-pointer"
          >
            <span className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-1 rounded transition-colors font-medium">
              {word}
            </span>
          </span>
        );
      }

      return <span key={index}>{word}</span>;
    });
  };

  // Stop all speech
  const stopAllSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setPlayingSentenceIndex(null);
    activeUtteranceRef.current = null;
    setIsFullPlaying(false);
    setIsFullPaused(false);
    setCurrentFullSentenceIndex(0);
  };

  // Speak individual sentence (for sentence mode)
  const speakSentence = (index: number) => {
    stopAllSpeech();

    const sentence = sentences[index];
    if (!sentence) return;

    const utterance = new SpeechSynthesisUtterance(sentence.english);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setPlayingSentenceIndex(index);
      activeUtteranceRef.current = index;
    };

    utterance.onend = () => {
      setPlayingSentenceIndex(null);
      activeUtteranceRef.current = null;
    };

    utterance.onerror = () => {
      setPlayingSentenceIndex(null);
      activeUtteranceRef.current = null;
    };

    speechSynthesis.speak(utterance);
  };

  // Full text mode audio controls
  const playFullText = () => {
    if (isFullPlaying && !isFullPaused) {
      // Pause if currently playing
      speechSynthesis.pause();
      setIsFullPaused(true);
      return;
    }
    if (isFullPlaying && isFullPaused) {
      // Resume if paused
      speechSynthesis.resume();
      setIsFullPaused(false);
      return;
    }

    const playNextSentence = (index: number) => {
      if (index >= sentences.length) {
        setIsFullPlaying(false);
        setCurrentFullSentenceIndex(0);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[index].english);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setCurrentFullSentenceIndex(index);
      };

      utterance.onend = () => {
        playNextSentence(index + 1);
      };

      utterance.onerror = () => {
        setIsFullPlaying(false);
      };

      speechSynthesis.speak(utterance);
    };

    setIsFullPlaying(true);
    setIsFullPaused(false);
    playNextSentence(0);
  };

  const pauseFullText = () => {
    if (isFullPlaying && !isFullPaused) {
      speechSynthesis.pause();
      setIsFullPaused(true);
    }
  };

  // Speak individual word
  const speakWord = (word: string) => {
    stopAllSpeech();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onComplete}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
          <p className="text-slate-600 font-medium">加载阅读内容中...</p>
        </div>
      </div>
    );
  }

  // If no passage available for this unit
  if (!passage || sentences.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onComplete}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
        </div>

        <div className="text-center py-16">
          <BookOpen size={64} className="mx-auto mb-6 text-slate-300" />
          <h2 className="text-2xl font-bold text-slate-700 mb-3">情景阅读</h2>
          <p className="text-slate-500">
            该单元的情景阅读内容正在准备中...
          </p>
          <p className="text-sm text-slate-400 mt-2">
            请检查 public/data/passages/{unitId}.json 是否存在
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onComplete}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>

        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => { setViewMode('sentence'); stopAllSpeech(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'sentence'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <List size={18} />
            <span className="text-sm font-medium">逐句拆解</span>
          </button>
          <button
            onClick={() => { setViewMode('full'); stopAllSpeech(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'full'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <FileText size={18} />
            <span className="text-sm font-medium">全文阅读</span>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{passage.title}</h1>
        <p className="text-slate-500">点击高亮单词查看释义</p>
      </div>

      {/* Full text mode */}
      {viewMode === 'full' && (
        <>
          {/* Full text audio controls */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 mb-6 border border-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={18} className="text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">全文朗读</span>
              </div>
              <div className="flex items-center gap-2">
                {isFullPlaying && (
                  <span className="text-sm text-slate-600 mr-2">
                    {currentFullSentenceIndex + 1} / {sentences.length}
                  </span>
                )}

                <button
                  onClick={playFullText}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  {!isFullPlaying ? (
                    <>
                      <Play size={18} />
                      <span className="text-sm font-medium">播放全文</span>
                    </>
                  ) : isFullPaused ? (
                    <>
                      <Play size={18} />
                      <span className="text-sm font-medium">继续</span>
                    </>
                  ) : (
                    <>
                      <Pause size={18} />
                      <span className="text-sm font-medium">暂停</span>
                    </>
                  )}
                </button>

                <button
                  onClick={stopAllSpeech}
                  className={`p-2 rounded-lg transition-colors ${
                    isFullPlaying ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                  }`}
                >
                  <VolumeX size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Full text content */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${selectedWord ? 'lg:grid-cols-3' : ''}`}>
            <div className={`lg:col-span-${selectedWord ? '2' : '3'}`}>
              {/* English paragraphs */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 mb-4">
                <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  英文原文
                </h3>
                <div className="text-slate-700 leading-relaxed text-justify space-y-4">
                  {paragraphs.map((para, pIdx) => (
                    <p key={pIdx}>
                      {para.sentences.map((sent, sIdx) => (
                        <span key={sIdx}>
                          {renderInteractiveText(sent.english)}
                          {sIdx < para.sentences.length - 1 && ' '}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>

              {/* Chinese translation */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  中文译文
                </h3>
                <div className="text-slate-500 leading-relaxed space-y-4">
                  {paragraphs.map((para, pIdx) => (
                    <p key={pIdx}>
                      {para.sentences.map((sent, sIdx) => (
                        <span key={sIdx}>
                          {sent.chinese}
                          {sIdx < para.sentences.length - 1 && ' '}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Word detail panel */}
            {selectedWord && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-indigo-200 sticky top-4">
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Word header */}
                  <div className="mb-4">
                    <h3 className="text-3xl font-bold text-slate-800 mb-1">{selectedWord.term}</h3>
                    {selectedWord.phonetic && (
                      <p className="text-slate-500 font-mono">[{selectedWord.phonetic}]</p>
                    )}
                  </div>

                  {/* Pronunciation button */}
                  <button
                    onClick={() => speakWord(selectedWord.term)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition-all mb-4"
                  >
                    <Volume2 size={18} />
                    <span className="font-medium">发音</span>
                  </button>

                  {/* Definitions */}
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-600 mb-2">释义</h4>
                    <div className="space-y-2">
                      {selectedWord.definitions && selectedWord.definitions.length > 0 ? (
                        selectedWord.definitions.map((def, i) => (
                          <div key={i} className="flex items-start gap-2 text-slate-700">
                            <span className="text-indigo-600 font-medium text-sm">{def.partOfSpeech}</span>
                            <span>{def.meaning}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-700">{selectedWord.definition || '暂无释义'}</p>
                      )}
                    </div>
                  </div>

                  {/* Example */}
                  {selectedWord.examples && selectedWord.examples.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-600 mb-2">例句</h4>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-sm text-slate-700 italic mb-1">
                          "{highlightWordInSentenceReact(selectedWord.examples[0].sentence, selectedWord.term)}"
                        </p>
                        {selectedWord.examples[0].translation && (
                          <p className="text-xs text-slate-500">{selectedWord.examples[0].translation}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Sentence mode */}
      {viewMode === 'sentence' && (
        <>
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${selectedWord ? 'lg:grid-cols-3' : ''}`}>
            <div className={`lg:col-span-${selectedWord ? '2' : '3'}`}>
              {/* Sentences with individual controls */}
              <div className="space-y-3">
                {sentences.map((sentence, idx) => (
                  <div
                    key={sentence.index}
                    className={`bg-white rounded-xl p-4 border transition-all ${
                      playingSentenceIndex === idx
                        ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Sentence number */}
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* English sentence */}
                        <div className="text-slate-700 leading-relaxed mb-2 text-justify">
                          {renderInteractiveText(sentence.english)}
                        </div>

                        {/* Chinese translation */}
                        <div className="text-slate-500 leading-relaxed text-sm border-l-2 border-indigo-200 pl-3">
                          {sentence.chinese}
                        </div>
                      </div>

                      {/* Audio control for this sentence */}
                      <button
                        onClick={() => {
                          if (playingSentenceIndex === idx) {
                            stopAllSpeech();
                          } else {
                            speakSentence(idx);
                          }
                        }}
                        className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                          playingSentenceIndex === idx
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {playingSentenceIndex === idx ? (
                          <VolumeX size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Word detail panel */}
            {selectedWord && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-indigo-200 sticky top-4">
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedWord(null)}
                    className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Word header */}
                  <div className="mb-4">
                    <h3 className="text-3xl font-bold text-slate-800 mb-1">{selectedWord.term}</h3>
                    {selectedWord.phonetic && (
                      <p className="text-slate-500 font-mono">[{selectedWord.phonetic}]</p>
                    )}
                  </div>

                  {/* Pronunciation button */}
                  <button
                    onClick={() => speakWord(selectedWord.term)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition-all mb-4"
                  >
                    <Volume2 size={18} />
                    <span className="font-medium">发音</span>
                  </button>

                  {/* Definitions */}
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-600 mb-2">释义</h4>
                    <div className="space-y-2">
                      {selectedWord.definitions && selectedWord.definitions.length > 0 ? (
                        selectedWord.definitions.map((def, i) => (
                          <div key={i} className="flex items-start gap-2 text-slate-700">
                            <span className="text-indigo-600 font-medium text-sm">{def.partOfSpeech}</span>
                            <span>{def.meaning}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-700">{selectedWord.definition || '暂无释义'}</p>
                      )}
                    </div>
                  </div>

                  {/* Example */}
                  {selectedWord.examples && selectedWord.examples.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-600 mb-2">例句</h4>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-sm text-slate-700 italic mb-1">
                          "{highlightWordInSentenceReact(selectedWord.examples[0].sentence, selectedWord.term)}"
                        </p>
                        {selectedWord.examples[0].translation && (
                          <p className="text-xs text-slate-500">{selectedWord.examples[0].translation}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Word list summary at bottom */}
      <div className="mt-8 bg-white rounded-2xl p-5 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3">本单元词汇</h3>
        <div className="flex flex-wrap gap-2">
          {words.map(word => (
            <button
              key={word.id}
              onClick={() => setSelectedWord(word)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedWord?.id === word.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {word.term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContextualMode;
