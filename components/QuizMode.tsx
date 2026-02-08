
import React, { useState, useEffect, useRef } from 'react';
import { Word, QuizQuestion, QuestionType, QuizMode as QuizModeEnum, QuizAttemptRecord } from '../types';
import { CheckCircle2, XCircle, ArrowRight, Award, Languages, Keyboard, RotateCcw, Volume2, Loader2 } from 'lucide-react';
import { recordAttempts, getBatchMasteryPost, type WordMastery } from '../services/api';

interface QuizModeProps {
  words: Word[];
  quizMode: QuizModeEnum;
  onComplete: (score: number) => void;
}

// 答题记录
interface AnswerRecord {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;  // 答题用时（毫秒）
}

const QuizMode: React.FC<QuizModeProps> = ({ words, quizMode, onComplete }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userSpelling, setUserSpelling] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord[]>([]);
  const [quizKey, setQuizKey] = useState(0); // 用于强制重新生成题目
  const hasAutoPlayedRef = useRef(false);

  // 答题计时相关状态
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  // 熟练度相关状态
  const [masteryData, setMasteryData] = useState<Map<string, WordMastery>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  useEffect(() => {
    const qs: QuizQuestion[] = [];
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, Math.min(10, words.length));

    switch (quizMode) {
      case QuizModeEnum.EN_TO_CN_MCQ:
        // 英对中单选：全部生成英译中题目
        selectedWords.forEach(word => {
          const distractors = words
            .filter(w => w.id !== word.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.definition || '');

          const options = [word.definition || '', ...distractors].sort(() => 0.5 - Math.random());

          qs.push({
            word,
            type: QuestionType.EN_TO_CN,
            question: word.term,
            options,
            correctAnswer: word.definition || ''
          });
        });
        break;

      case QuizModeEnum.CN_TO_EN_MCQ:
        // 中对英单选：全部生成中译英题目
        selectedWords.forEach(word => {
          const distractors = words
            .filter(w => w.id !== word.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.term);

          const options = [word.term, ...distractors].sort(() => 0.5 - Math.random());

          qs.push({
            word,
            type: QuestionType.CN_TO_EN,
            question: word.definition || '',
            options,
            correctAnswer: word.term
          });
        });
        break;

      case QuizModeEnum.CN_TO_EN_SPELLING:
        // 中对英拼写：全部生成拼写题目
        selectedWords.forEach(word => {
          qs.push({
            word,
            type: QuestionType.SPELLING,
            question: word.definition || '',
            correctAnswer: word.term
          });
        });
        break;

      case QuizModeEnum.MIXED:
        // 混合题型：约 1/3 英对中，1/3 中对英，1/3 拼写
        const third = Math.ceil(selectedWords.length / 3);

        // 英对中题目
        selectedWords.slice(0, third).forEach(word => {
          const distractors = words
            .filter(w => w.id !== word.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.definition || '');

          const options = [word.definition || '', ...distractors].sort(() => 0.5 - Math.random());

          qs.push({
            word,
            type: QuestionType.EN_TO_CN,
            question: word.term,
            options,
            correctAnswer: word.definition || ''
          });
        });

        // 中对英题目
        selectedWords.slice(third, third * 2).forEach(word => {
          const distractors = words
            .filter(w => w.id !== word.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.term);

          const options = [word.term, ...distractors].sort(() => 0.5 - Math.random());

          qs.push({
            word,
            type: QuestionType.CN_TO_EN,
            question: word.definition || '',
            options,
            correctAnswer: word.term
          });
        });

        // 拼写题目
        selectedWords.slice(third * 2).forEach(word => {
          qs.push({
            word,
            type: QuestionType.SPELLING,
            question: word.definition || '',
            correctAnswer: word.term
          });
        });
        break;
    }

    // 打乱题目顺序
    qs.sort(() => 0.5 - Math.random());

    setQuestions(qs);
  }, [words, quizMode, quizKey]); // 添加 quizKey 依赖，重做时重新生成题目

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

  // 追踪题目开始时间（用于计时）
  useEffect(() => {
    if (!quizFinished && questions.length > 0) {
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, quizFinished, questions]);

  // 获取英文语音
  const getEnglishVoice = (): SpeechSynthesisVoice | null => {
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    // 优先选择美国英语
    return englishVoices.find(v => v.lang === 'en-US') || englishVoices[0] || null;
  };

  // 发音函数
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
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

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
        window.speechSynthesis.cancel();
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  // 自动播放发音（当题目变化时）
  useEffect(() => {
    if (questions.length === 0 || quizFinished) return;

    const currentQ = questions[currentIndex];
    let textToSpeak = '';

    // 英译中题型：播放问题（英文单词）
    if (currentQ?.type === QuestionType.EN_TO_CN && currentQ.question) {
      textToSpeak = currentQ.question;
    }
    // 拼写题型：播放正确答案（英文单词）作为提示
    else if (currentQ?.type === QuestionType.SPELLING && currentQ.correctAnswer) {
      textToSpeak = currentQ.correctAnswer;
    }

    if (textToSpeak) {
      // 延迟播放，让 UI 先渲染
      const delay = voices.length === 0 ? 800 : 300; // 语音未加载时等待更长时间
      setTimeout(() => {
        // 直接检查 ref，如果还没播放就播放
        if (!hasAutoPlayedRef.current) {
          speak(textToSpeak);
          hasAutoPlayedRef.current = true;
        }
      }, delay);
    }

    // 切换题目时重置标记（为下一题准备）
    return () => {
      hasAutoPlayedRef.current = false;
    };
  }, [currentIndex, questions, quizFinished, voices]);

  // Quiz 完成时记录答题数据到 Cloudflare D1
  useEffect(() => {
    if (quizFinished && answerRecords.length > 0) {
      // 将答题记录转换为 API 格式
      const attempts: QuizAttemptRecord[] = answerRecords.map((record) => ({
        wordId: record.question.word.id,
        wordTerm: record.question.word.term,
        unitId: record.question.word.unit,
        questionType: record.question.type,
        isCorrect: record.isCorrect,
        timeSpent: record.timeSpent,
        userAnswer: record.userAnswer,
      }));

      // 发送到 Cloudflare Workers API
      setIsRecording(true);
      setRecordError(null);

      recordAttempts(attempts)
        .then((response) => {
          console.log(`✅ Successfully recorded ${response.recorded} attempts`);
          setIsRecording(false);

          // 获取更新的熟练度数据
          const wordIds = attempts.map(a => a.wordId);
          getBatchMasteryPost(wordIds)
            .then((masteryList) => {
              // 将数组转换为 Map 以便快速查找
              const map = new Map(masteryList.map(m => [m.word_id, m]));
              setMasteryData(map);
              console.log('✅ Mastery data updated');
            })
            .catch((err) => {
              console.error('❌ Failed to fetch mastery data:', err);
            });
        })
        .catch((err) => {
          console.error('❌ Failed to record attempts:', err);
          setIsRecording(false);
          setRecordError(err.message || 'Failed to record attempts');
        });
    }
  }, [quizFinished, answerRecords]);

  // 选择答案（单选题）
  const handleSelectAnswer = (answer: string) => {
    if (selectedAnswer !== null && isConfirmed) return;
    setSelectedAnswer(answer);
    setIsConfirmed(false);
    setIsCorrect(null);
  };

  // 确认答案
  const handleConfirmAnswer = () => {
    if (!selectedAnswer) return;

    const currentQ = questions[currentIndex];
    const correct = selectedAnswer.toLowerCase() === currentQ.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setIsConfirmed(true);
    if (correct) setScore(prev => prev + 1);

    // 记录答题结果（包含计时）
    const timeSpent = Date.now() - questionStartTime;
    setAnswerRecords(prev => [...prev, {
      question: currentQ,
      userAnswer: selectedAnswer,
      isCorrect: correct,
      timeSpent
    }]);
  };

  // 更改选择
  const handleChangeSelection = () => {
    setIsConfirmed(false);
    setIsCorrect(null);
    setSelectedAnswer(null); // 清空已选择答案，允许重新选择
  };

  // 拼写题直接提交
  const handleSpellingSubmit = () => {
    if (!userSpelling.trim()) return;
    const currentQ = questions[currentIndex];
    const userAnswer = userSpelling.trim();
    setSelectedAnswer(userAnswer);
    const correct = userAnswer.toLowerCase() === currentQ.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setIsConfirmed(true);
    if (correct) setScore(prev => prev + 1);

    // 记录答题结果（包含计时）
    const timeSpent = Date.now() - questionStartTime;
    setAnswerRecords(prev => [...prev, {
      question: currentQ,
      userAnswer: userAnswer,
      isCorrect: correct,
      timeSpent
    }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setUserSpelling('');
      setIsCorrect(null);
      setIsConfirmed(false);
    } else {
      setQuizFinished(true);
    }
  };

  if (questions.length === 0) return null;

  if (quizFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const correctCount = answerRecords.filter(r => r.isCorrect).length;
    const wrongCount = answerRecords.length - correctCount;

    // 获取题型标签和颜色
    const getQuestionTypeLabel = (type: QuestionType) => {
      switch (type) {
        case QuestionType.EN_TO_CN: return { label: '英→中', color: 'bg-blue-100 text-blue-600' };
        case QuestionType.CN_TO_EN: return { label: '中→英', color: 'bg-purple-100 text-purple-600' };
        case QuestionType.SPELLING: return { label: '拼写', color: 'bg-emerald-100 text-emerald-600' };
        default: return { label: '', color: 'bg-slate-100 text-slate-600' };
      }
    };

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 头部统计 */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <Award size={40} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Quiz Complete!</h2>
          <p className="text-slate-500 mb-6 text-lg font-medium">You scored {score} out of {questions.length}</p>

          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-green-50 rounded-2xl px-6 py-4 border border-green-100">
              <div className="text-3xl font-black text-green-600">{correctCount}</div>
              <div className="text-xs font-bold text-green-500 uppercase">Correct</div>
            </div>
            <div className="bg-red-50 rounded-2xl px-6 py-4 border border-red-100">
              <div className="text-3xl font-black text-red-600">{wrongCount}</div>
              <div className="text-xs font-bold text-red-500 uppercase">Wrong</div>
            </div>
            <div className="bg-indigo-50 rounded-2xl px-6 py-4 border border-indigo-100">
              <div className="text-3xl font-black text-indigo-600">{percentage}%</div>
              <div className="text-xs font-bold text-indigo-500 uppercase">Accuracy</div>
            </div>
          </div>

          {/* 云同步状态 */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-medium">正在同步学习数据...</span>
            </div>
          )}
          {recordError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-xl mb-4 text-sm">
              ⚠️ 数据同步失败: {recordError}
            </div>
          )}
          {!isRecording && !recordError && masteryData.size > 0 && (
            <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">学习数据已同步到云端</span>
            </div>
          )}
        </div>

        {/* 详细答题记录 - 只显示错题 */}
        {answerRecords.filter(r => !r.isCorrect).length > 0 ? (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <XCircle size={20} className="text-red-500" />
              需要复习的题目 ({answerRecords.filter(r => !r.isCorrect).length} 题)
            </h3>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto px-2">
              {answerRecords.filter(r => !r.isCorrect).map((record, idx) => {
                const typeInfo = getQuestionTypeLabel(record.question.type);
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 border-2 bg-red-50 border-red-200 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* 状态图标 */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <XCircle size={20} />
                      </div>

                      {/* 题目内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>

                        {/* 题目 */}
                        <div className="text-sm text-slate-600 mb-1">
                          <span className="font-semibold">题目:</span> {record.question.question}
                        </div>

                        {/* 用户答案 */}
                        <div className="text-sm text-red-700 mb-1">
                          <span className="font-semibold">你的答案:</span> {record.userAnswer}
                        </div>

                        {/* 正确答案 */}
                        <div className="text-sm text-green-700 font-medium mb-1">
                          <span className="font-semibold">正确答案:</span> {record.question.correctAnswer}
                        </div>

                        {/* 用时显示 */}
                        {record.timeSpent > 0 && (
                          <div className="text-xs text-slate-500">
                            用时: {Math.round(record.timeSpent / 1000)}秒
                          </div>
                        )}

                        {/* 熟练度显示 */}
                        {masteryData.size > 0 && (() => {
                          const mastery = masteryData.get(record.question.word.id);
                          if (mastery) {
                            const getMasteryColor = (level: number) => {
                              if (level >= 80) return 'bg-green-100 text-green-700';
                              if (level >= 60) return 'bg-yellow-100 text-yellow-700';
                              if (level >= 40) return 'bg-orange-100 text-orange-700';
                              return 'bg-red-100 text-red-700';
                            };
                            return (
                              <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-full inline-block ${getMasteryColor(mastery.mastery_level)}`}>
                                熟练度: {mastery.mastery_level}%
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8 text-center py-8 bg-green-50 rounded-2xl border-2 border-green-200">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-700 mb-1">全对！太棒了！</h3>
            <p className="text-sm text-green-600">所有题目都回答正确，继续保持！</p>
          </div>
        )}

        {/* 按钮区域 */}
        <div className="space-y-3">
          {/* 同一题目再练一次 */}
          <button
            onClick={() => {
              // 重置状态，但保持题目顺序不变
              setCurrentIndex(0);
              setSelectedAnswer(null);
              setUserSpelling('');
              setIsCorrect(null);
              setIsConfirmed(false);
              setScore(0);
              setQuizFinished(false);
              setAnswerRecords([]);
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-100"
          >
            <RotateCcw size={20} />
            同一题目再练一次
          </button>

          {/* 新题目 */}
          <button
            onClick={() => {
              // 强制重新生成题目
              setQuizKey(prev => prev + 1);
              setCurrentIndex(0);
              setSelectedAnswer(null);
              setUserSpelling('');
              setIsCorrect(null);
              setIsConfirmed(false);
              setScore(0);
              setQuizFinished(false);
              setAnswerRecords([]);
            }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-100"
          >
            <Languages size={20} />
            换一批新题目
          </button>

          {/* 返回按钮 */}
          <button
            onClick={() => onComplete(score)}
            className="w-full flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-2xl font-medium transition-all"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  // 根据题型显示不同的提示文本
  const getQuestionLabel = () => {
    switch (currentQ.type) {
      case QuestionType.EN_TO_CN:
        return 'What is the meaning of:';
      case QuestionType.CN_TO_EN:
        return 'Which word means:';
      case QuestionType.SPELLING:
        return 'Spell the word for:';
      default:
        return 'Question:';
    }
  };

  const getTypeLabel = () => {
    switch (currentQ.type) {
      case QuestionType.EN_TO_CN:
        return '英 → 中';
      case QuestionType.CN_TO_EN:
        return '中 → 英';
      case QuestionType.SPELLING:
        return '拼写';
      default:
        return '';
    }
  };

  const getTypeColor = () => {
    switch (currentQ.type) {
      case QuestionType.EN_TO_CN:
        return 'bg-blue-100 text-blue-600';
      case QuestionType.CN_TO_EN:
        return 'bg-purple-100 text-purple-600';
      case QuestionType.SPELLING:
        return 'bg-emerald-100 text-emerald-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  // 判断是否为选择题
  const isMultipleChoice = currentQ.type === QuestionType.EN_TO_CN || currentQ.type === QuestionType.CN_TO_EN;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question {currentIndex + 1}/{questions.length}</span>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getTypeColor()} flex items-center gap-1`}>
              {currentQ.type === QuestionType.SPELLING ? <Keyboard size={14} /> : <Languages size={14} />}
              {getTypeLabel()}
            </span>
            <span className="text-sm font-bold text-indigo-600">Score: {score}</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 mb-6 text-center">
        <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">{getQuestionLabel()}</p>
        <div className="flex items-center justify-center gap-4">
          <h2 className="text-4xl font-black text-slate-800">{currentQ.question}</h2>
          {/* 英译中题型：播放英文单词 */}
          {currentQ.type === QuestionType.EN_TO_CN && (
            <button
              onClick={() => speak(currentQ.question)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-all active:scale-95"
              aria-label="播放发音"
            >
              <Volume2 size={24} />
            </button>
          )}
          {/* 拼写题型：播放正确答案（英文单词）作为提示 */}
          {currentQ.type === QuestionType.SPELLING && (
            <button
              onClick={() => speak(currentQ.correctAnswer)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center transition-all active:scale-95"
              aria-label="播放发音提示"
            >
              <Volume2 size={24} />
            </button>
          )}
        </div>
      </div>

      {/* 拼写题 - 输入框 */}
      {currentQ.type === QuestionType.SPELLING ? (
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-6 border-2 shadow-lg">
            <input
              type="text"
              value={userSpelling}
              onChange={(e) => setUserSpelling(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && userSpelling.trim() && !isConfirmed) {
                  handleSpellingSubmit();
                }
              }}
              disabled={isConfirmed}
              placeholder="Type the English word..."
              className="w-full text-2xl font-bold text-center py-4 border-0 focus:ring-0 focus:outline-none"
              autoFocus
            />
          </div>

          {isConfirmed && (
            <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="font-bold flex items-center justify-center gap-2">
                {isCorrect ? (
                  <><CheckCircle2 size={20} /> Correct!</>
                ) : (
                  <><XCircle size={20} /> The answer is: {currentQ.correctAnswer}</>
                )}
              </p>
            </div>
          )}

          {!isConfirmed && userSpelling.trim() && (
            <button
              onClick={handleSpellingSubmit}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all"
            >
              Submit Answer
            </button>
          )}
        </div>
      ) : (
        /* 单选题 - 选项按钮 */
        <div className="space-y-4 mb-6">
          {currentQ.options?.map((option, idx) => {
            let styles = "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
            let icon = null;
            let showSelectionIndicator = false;

            // 已确认状态
            if (isConfirmed) {
              if (selectedAnswer === option) {
                if (isCorrect) {
                  styles = "bg-green-50 border-green-500 text-green-700 ring-2 ring-green-500 ring-opacity-20";
                  icon = <CheckCircle2 className="text-green-500" size={20} />;
                } else {
                  styles = "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500 ring-opacity-20";
                  icon = <XCircle className="text-red-500" size={20} />;
                }
              } else if (option === currentQ.correctAnswer) {
                styles = "bg-green-50 border-green-500 text-green-700 opacity-60";
              } else {
                styles = "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed";
              }
            }
            // 已选择但未确认状态
            else if (selectedAnswer === option) {
              styles = "bg-indigo-100 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500 ring-opacity-20";
              showSelectionIndicator = true;
            }
            // 其他选项（已选择其他选项后）
            else if (selectedAnswer !== null) {
              styles = "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed";
            }

            return (
              <button
                key={idx}
                disabled={selectedAnswer !== null && selectedAnswer !== option}
                onClick={() => handleSelectAnswer(option)}
                className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${styles}`}
              >
                <span>{option}</span>
                {showSelectionIndicator && (
                  <span className="text-xs font-bold text-indigo-600">已选择</span>
                )}
                {icon}
              </button>
            );
          })}
        </div>
      )}

      {/* 确认/下一步按钮区域 */}
      {isMultipleChoice ? (
        <div className="space-y-3">
          {/* 已选择但未确认 */}
          {selectedAnswer !== null && !isConfirmed && (
            <button
              onClick={handleConfirmAnswer}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              确认答案
            </button>
          )}

          {/* 已确认 - 显示结果和下一步按钮 */}
          {isConfirmed && (
            <>
              {!isCorrect && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center">
                  <p className="font-bold flex items-center justify-center gap-2">
                    <XCircle size={20} /> 正确答案是: {currentQ.correctAnswer}
                  </p>
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                {currentIndex === questions.length - 1 ? '完成测验' : '下一题'}
                <ArrowRight size={20} />
              </button>
            </>
          )}

          {/* 未选择 - 可以添加重置按钮（可选） */}
          {selectedAnswer !== null && !isConfirmed && (
            <button
              onClick={handleChangeSelection}
              className="w-full flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-600 py-3 rounded-2xl font-medium transition-all"
            >
              <RotateCcw size={18} />
              重新选择
            </button>
          )}
        </div>
      ) : (
        /* 拼写题完成后的下一步按钮 */
        isConfirmed && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {currentIndex === questions.length - 1 ? '完成测验' : '下一题'}
            <ArrowRight size={20} />
          </button>
        )
      )}
    </div>
  );
};

export default QuizMode;
