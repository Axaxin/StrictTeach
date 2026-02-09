
import React, { useState, useEffect, useRef } from 'react';
import { Word, QuizQuestion, QuestionType, QuizMode as QuizModeEnum, QuizAttemptRecord, QuizStrategy } from '../types';
import { CheckCircle2, XCircle, ArrowRight, Award, Languages, Keyboard, Volume2, Loader2, Timer, RotateCcw, Target, Scale, BookOpen, PenTool } from 'lucide-react';
import { recordAttempts, getBatchMasteryPost, type WordMastery } from '../services/api';
import { getQuizQuestionCount } from '../utils/settings';
import { selectWordsByStrategy } from '../utils/quizStrategy';
import { triggerMasteryRefresh } from '../hooks/useMasteryRefresh';
import { findSentencesWithWord, createFillInBlankQuestion, type Passage } from '../utils/sentenceSelector';

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
  const [voicesLoaded, setVoicesLoaded] = useState(false); // 追踪 voices 是否已加载
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]); // 使用 ref 以便在闭包中访问最新值
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord[]>([]);
  const [quizKey, setQuizKey] = useState(0); // 用于强制重新生成题目
  const autoPlayTriggeredRef = useRef<Set<number>>(new Set()); // 追踪已自动播放的题目索引
  const pendingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map()); // 追踪每个题目的 pending timeout
  const expectedWordIdRef = useRef<string | null>(null); // 追踪当前轮次预期应该播放的单词ID
  const spellingInputRef = useRef<HTMLInputElement>(null); // 拼写输入框引用

  // 同步 voices 到 ref，并更新加载状态
  useEffect(() => {
    voicesRef.current = voices;
    setVoicesLoaded(voices.length > 0);
  }, [voices]);

  // 全局键盘事件处理：拼写题确认后按回车触发下一题
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 只处理拼写题确认后的回车键（包括普通拼写和填空拼写）
      if (e.key === 'Enter' && isConfirmed) {
        const currentQ = questions[currentIndex];
        if (currentQ?.type === QuestionType.SPELLING || currentQ?.type === QuestionType.FILL_IN_BLANK_SPELLING) {
          // 直接执行 handleNext 的逻辑，避免依赖函数引用
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev: number) => prev + 1);
            setSelectedAnswer(null);
            setUserSpelling('');
            setIsCorrect(null);
            setIsConfirmed(false);
          } else {
            setQuizFinished(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isConfirmed, currentIndex, questions]);

  // 拼写题自动聚焦：当切换到拼写题时自动聚焦输入框
  useEffect(() => {
    const currentQ = questions[currentIndex];
    // 只在拼写题且未确认状态下聚焦
    if (currentQ?.type === QuestionType.SPELLING && !isConfirmed) {
      // 使用 setTimeout 确保在 DOM 更新后聚焦
      setTimeout(() => {
        spellingInputRef.current?.focus();
      }, 50);
    }
  }, [currentIndex, isConfirmed, questions]);

  // 答题计时相关状态
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0);

  // 熟练度相关状态
  const [masteryData, setMasteryData] = useState<Map<string, WordMastery>>(new Map());
  const [masteryDataLoaded, setMasteryDataLoaded] = useState(false); // 追踪masteryData是否已加载
  const [masteryRefreshKey, setMasteryRefreshKey] = useState(0); // 触发刷新熟练度数据
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // 出题策略状态（默认一般模式）
  const [strategy, setStrategy] = useState<QuizStrategy>(QuizStrategy.RANDOM);
  const [currentQuizWords, setCurrentQuizWords] = useState<Word[]>([]);
  const [isRetryMode, setIsRetryMode] = useState(false); // 是否为"再来"模式（使用相同单词）

  // 文章数据（用于填空题）
  const [passage, setPassage] = useState<Passage | null>(null);

  // 加载文章数据
  useEffect(() => {
    const loadPassage = async () => {
      if (words.length > 0) {
        const unitId = words[0]?.unit;
        if (unitId) {
          try {
            const response = await fetch(`/data/passages/${unitId}.json`);
            if (response.ok) {
              const data: Passage = await response.json();
              setPassage(data);
              console.log(`[Passage] Loaded passage for unit: ${unitId}`);
            } else {
              console.log(`[Passage] No passage found for unit: ${unitId}`);
            }
          } catch (err) {
            console.error('[Passage] Failed to load passage:', err);
          }
        }
      }
    };
    loadPassage();
  }, [words]);

  // Helper function to get definition from word (supports both new and old formats)
  // For quiz: only use the first meaning to keep options concise
  const getDefinition = (w: Word): string => {
    // New format: definitions array
    if (w.definitions && w.definitions.length > 0) {
      // 只返回第一个释义，保持简洁
      return w.definitions[0].meaning;
    }
    // Old format: definition string - split by semicolon and take first
    if (w.definition) {
      const parts = w.definition.split('；');
      return parts[0].trim();
    }
    return '';
  };

  // 初始化时获取所有单词的熟练度数据（用于策略选择）
  // 当 words 或 masteryRefreshKey 变化时重新获取数据
  useEffect(() => {
    const allWordIds = words.map(w => w.id);
    getBatchMasteryPost(allWordIds)
      .then((masteryList) => {
        const map = new Map(masteryList.map(m => [m.word_id, m]));
        setMasteryData(map);
        setMasteryDataLoaded(true);
        console.log(`[Mastery Data] Loaded ${masteryList.length} mastery records (refreshKey: ${masteryRefreshKey})`);
      })
      .catch((err) => {
        console.error('Failed to fetch mastery data:', err);
        // 即使失败也标记为已加载，将使用空 masteryData
        setMasteryDataLoaded(true);
      });
  }, [words, masteryRefreshKey]);

  useEffect(() => {
    const qs: QuizQuestion[] = [];
    const quizCount = getQuizQuestionCount();

    // "再来"模式使用之前保存的单词，否则根据策略选择新单词
    let selectedWords: Word[];
    if (isRetryMode && currentQuizWords.length > 0) {
      selectedWords = currentQuizWords;
    } else {
      selectedWords = selectWordsByStrategy(words, masteryData, strategy, quizCount);
      // 保存选中的单词，供"再来"模式使用
      setCurrentQuizWords(selectedWords);
    }

    switch (quizMode) {
      case QuizModeEnum.EN_TO_CN_MCQ:
      case QuizModeEnum.CN_TO_EN_MCQ:
        // 已弃用的模式，降级为拼写模式
        selectedWords.forEach(word => {
          qs.push({
            word,
            type: QuestionType.SPELLING,
            question: getDefinition(word),
            correctAnswer: word.term
          });
        });
        break;

      case QuizModeEnum.CN_TO_EN_SPELLING:
        // 中对英拼写：全部生成拼写题目（12题）
        selectedWords.forEach(word => {
          qs.push({
            word,
            type: QuestionType.SPELLING,
            question: getDefinition(word),
            correctAnswer: word.term
          });
        });
        break;

      case QuizModeEnum.FILL_IN_BLANK_MCQ:
        // 句子填空(选择)：全部生成填空选择题
        selectedWords.forEach(word => {
          const sentences = findSentencesWithWord(word, passage);
          if (sentences.length > 0) {
            const sentence = sentences[0];
            const hint = getDefinition(word);
            const { question, answer } = createFillInBlankQuestion(sentence, word);

            // 生成干扰项
            const distractors = words
              .filter(w => w.id !== word.id)
              .sort(() => 0.5 - Math.random())
              .slice(0, 3)
              .map(w => w.term);

            const options = [answer, ...distractors].sort(() => 0.5 - Math.random());

            qs.push({
              word,
              type: QuestionType.FILL_IN_BLANK_MCQ,
              question: question,  // 仅存储填空句子
              options,
              correctAnswer: answer,
              sentenceContext: {
                originalSentence: sentence.english,
                hint,
                chineseTranslation: sentence.chinese  // 添加中文翻译
              }
            });
          }
        });
        break;

      case QuizModeEnum.FILL_IN_BLANK_SPELLING:
        // 句子填空(拼写)：全部生成填空拼写题
        selectedWords.forEach(word => {
          const sentences = findSentencesWithWord(word, passage);
          if (sentences.length > 0) {
            const sentence = sentences[0];
            const hint = getDefinition(word);
            const { question, answer } = createFillInBlankQuestion(sentence, word);

            qs.push({
              word,
              type: QuestionType.FILL_IN_BLANK_SPELLING,
              question: question,  // 仅存储填空句子
              correctAnswer: answer,
              sentenceContext: {
                originalSentence: sentence.english,
                hint,
                chineseTranslation: sentence.chinese  // 添加中文翻译
              }
            });
          }
        });
        break;

      case QuizModeEnum.MIXED:
        // 混合题型：20% 填空 + 50% 拼写 + 30% 选择
        const fillBlankCount = Math.max(1, Math.floor(selectedWords.length * 0.2));
        const spellingCount = Math.floor(selectedWords.length * 0.5);
        const mcqCount = selectedWords.length - fillBlankCount - spellingCount;

        // 1. 填空题 (20%)
        selectedWords.slice(0, fillBlankCount).forEach(word => {
          const sentences = findSentencesWithWord(word, passage);
          if (sentences.length > 0) {
            const sentence = sentences[0];
            const hint = getDefinition(word);
            const { question, answer } = createFillInBlankQuestion(sentence, word);

            // 生成干扰项
            const distractors = words
              .filter(w => w.id !== word.id)
              .sort(() => 0.5 - Math.random())
              .slice(0, 3)
              .map(w => w.term);

            const options = [answer, ...distractors].sort(() => 0.5 - Math.random());

            qs.push({
              word,
              type: QuestionType.FILL_IN_BLANK_MCQ,
              question: question,  // 仅存储填空句子
              options,
              correctAnswer: answer,
              sentenceContext: {
                originalSentence: sentence.english,
                hint,
                chineseTranslation: sentence.chinese  // 添加中文翻译
              }
            });
          }
        });

        // 2. 拼写题 (50%)
        selectedWords.slice(fillBlankCount, fillBlankCount + spellingCount).forEach(word => {
          qs.push({
            word,
            type: QuestionType.SPELLING,
            question: getDefinition(word),
            correctAnswer: word.term
          });
        });

        // 3. 选择题（30%）- 随机分配为英对中或中对英
        selectedWords.slice(fillBlankCount + spellingCount).forEach(word => {
          const isEnToCn = Math.random() > 0.5;

          if (isEnToCn) {
            // 英对中
            const definition = getDefinition(word);
            const distractors = words
              .filter(w => w.id !== word.id)
              .sort(() => 0.5 - Math.random())
              .slice(0, 3)
              .map(w => getDefinition(w));

            const options = [definition, ...distractors].sort(() => 0.5 - Math.random());

            qs.push({
              word,
              type: QuestionType.EN_TO_CN,
              question: word.term,
              options,
              correctAnswer: definition
            });
          } else {
            // 中对英
            const definition = getDefinition(word);
            const distractors = words
              .filter(w => w.id !== word.id)
              .sort(() => 0.5 - Math.random())
              .slice(0, 3)
              .map(w => w.term);

            const options = [word.term, ...distractors].sort(() => 0.5 - Math.random());

            qs.push({
              word,
              type: QuestionType.CN_TO_EN,
              question: definition,
              options,
              correctAnswer: word.term
            });
          }
        });
        break;
    }

    // 打乱题目顺序
    qs.sort(() => 0.5 - Math.random());

    setQuestions(qs);
  }, [words, quizMode, quizKey, strategy, isRetryMode, masteryDataLoaded]); // 添加 masteryDataLoaded 依赖，确保熟练度数据加载后重新生成题目

  // 当 quizKey 变化时清空自动播放追踪记录并刷新熟练度数据
  useEffect(() => {
    // 停止所有正在播放的音频
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log(`[Auto-play] Canceled all pending speech for new quiz (quizKey: ${quizKey})`);
    }
    autoPlayTriggeredRef.current.clear();
    // 清理所有 pending timeouts
    pendingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    pendingTimeoutRef.current.clear();
    // 设置预期单词ID为null，表示新一轮测验开始，需要等待题目更新
    expectedWordIdRef.current = null;
    // 刷新熟练度数据（触发重新从API获取）
    setMasteryDataLoaded(false);
    setMasteryRefreshKey((prev: number) => prev + 1);
    console.log(`[Auto-play] Cleared tracking for new quiz (quizKey: ${quizKey})`);
  }, [quizKey]);

  // 初始化语音列表（Android 兼容性修复）
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      console.log(`[Voice loading] Loaded ${availableVoices.length} voices`);
      setVoices(availableVoices);
    };

    loadVoices();

    // Android 浏览器需要监听 voiceschanged 事件
    window.speechSynthesis.onvoiceschanged = () => {
      console.log('[Voice loading] voiceschanged event fired');
      loadVoices();
    };

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // 追踪题目开始时间（用于计时）
  useEffect(() => {
    if (!quizFinished && questions.length > 0) {
      setQuestionStartTime(Date.now());
      setCurrentElapsedTime(0);
    }
  }, [currentIndex, quizFinished, questions]);

  // 实时更新计时器
  useEffect(() => {
    if (quizFinished || questions.length === 0) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - questionStartTime;
      setCurrentElapsedTime(elapsed);
    }, 100); // 每100ms更新一次

    return () => clearInterval(timer);
  }, [questionStartTime, quizFinished, questions]);

  // 获取英文语音（使用 ref 以获取最新值）
  const getEnglishVoice = (): SpeechSynthesisVoice | null => {
    const currentVoices = voicesRef.current;
    const englishVoices = currentVoices.filter(v => v.lang.startsWith('en'));
    // 优先选择美国英语
    return englishVoices.find(v => v.lang === 'en-US') || englishVoices[0] || null;
  };

  // 发音函数（Arc 浏览器修复：不使用 cancel，让浏览器自然处理队列）
  const speak = (text: string) => {
    console.log(`[QuizMode] speak() called with: "${text}"`);

    if (!window.speechSynthesis) {
      console.warn('[QuizMode] Speech synthesis not supported');
      return;
    }

    // 检查 voices 是否可用
    if (voicesRef.current.length === 0) {
      console.warn('[QuizMode] No voices available, skipping.');
      return;
    }

    // Arc 浏览器修复：不调用 cancel()，让浏览器自然处理队列
    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语音属性
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 设置英文语音
    const englishVoice = getEnglishVoice();
    console.log('[QuizMode] Selected voice:', englishVoice?.name || 'default');
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      console.log(`[QuizMode] ✓ Started playing "${text}"`);
    };

    utterance.onend = () => {
      console.log(`[QuizMode] ✓ Finished playing "${text}"`);
    };

    utterance.onerror = (event) => {
      console.error(`[QuizMode] ✗ Error for "${text}":`, event.error);
    };

    window.speechSynthesis.speak(utterance);
    console.log('[QuizMode] speak() called. speaking:', window.speechSynthesis.speaking, 'pending:', window.speechSynthesis.pending);
  };

  // 自动播放发音（当题目变化时）
  // 只在 voices 加载完成后才开始工作
  useEffect(() => {
    if (!voicesLoaded || questions.length === 0 || quizFinished) {
      console.log(`[Auto-play] Skipping - voicesLoaded: ${voicesLoaded}, questions.length: ${questions.length}, quizFinished: ${quizFinished}`);
      return;
    }

    const currentQ = questions[currentIndex];
    if (!currentQ) {
      console.log(`[Auto-play] No question at index ${currentIndex}`);
      return;
    }

    // 检查题目是否是当前轮次的预期题目（仅检查第一题，防止播放旧题目）
    const currentWordId = currentQ.word.id;
    if (currentIndex === 0 && expectedWordIdRef.current === null) {
      // 新一轮测验的第一题，设置预期ID但不播放（避免播放旧题目）
      expectedWordIdRef.current = currentWordId;
      console.log(`[Auto-play] Set expected word ID for new quiz: ${currentWordId}, skipping first auto-play`);
      return;
    }

    if (currentIndex === 0 && currentWordId !== expectedWordIdRef.current) {
      // 第一题的单词ID与预期不符，说明是旧题目的残留数据，不播放
      console.log(`[Auto-play] First question word ${currentWordId} != expected ${expectedWordIdRef.current}, skipping (stale data)`);
      // 更新为新的预期ID
      expectedWordIdRef.current = currentWordId;
      return;
    }

    let textToSpeak = '';

    // 英译中题型：播放问题（英文单词）
    if (currentQ.type === QuestionType.EN_TO_CN && currentQ.question) {
      textToSpeak = currentQ.question;
    }
    // 拼写题型：播放正确答案（英文单词）作为提示
    else if (currentQ.type === QuestionType.SPELLING && currentQ.correctAnswer) {
      textToSpeak = currentQ.correctAnswer;
    }
    // 中对英题型：不自动播放，避免泄露答案

    console.log(`[Auto-play] Question ${currentIndex}, type: ${currentQ.type}, textToSpeak: "${textToSpeak}"`);

    if (textToSpeak) {
      // 检查是否已经为当前题目触发过自动播放
      if (autoPlayTriggeredRef.current.has(currentIndex)) {
        console.log(`[Auto-play] Already played for question ${currentIndex}, skipping`);
        return;
      }

      // 标记此题目已触发自动播放（立即标记，防止重复触发）
      autoPlayTriggeredRef.current.add(currentIndex);
      console.log(`[Auto-play] Marked question ${currentIndex} as played`);

      // 清理之前可能存在的同一题目的 timeout
      const existingTimeout = pendingTimeoutRef.current.get(currentIndex);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        console.log(`[Auto-play] Cleared existing timeout for question ${currentIndex}`);
      }

      // 直接播放，不使用 setTimeout（Chromium 浏览器要求）
      console.log(`[Auto-play] Triggering speak for: "${textToSpeak}" (question ${currentIndex})`);
      speak(textToSpeak);

      return; // 不需要清理函数
    }
  }, [currentIndex, questions[0]?.word?.id, quizFinished, voicesLoaded]); // 移除 quizKey，只追踪题目内容变化，避免在题目更新前播放旧题目的音频

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

              // 触发全局刷新，通知其他组件（WordList、ActivitySelector）更新数据
              triggerMasteryRefresh();
            })
            .catch((err) => {
              console.error('❌ Failed to fetch mastery data:', err);
              // 即使获取熟练度失败，记录答题成功的状态也显示
              setRecordError(`答题记录成功，但获取熟练度数据失败: ${err.message}`);
              setTimeout(() => setRecordError(null), 5000);
            });
        })
        .catch((err) => {
          console.error('❌ Failed to record attempts:', err);
          setIsRecording(false);
          // 显示更详细的错误信息
          let errorMsg = '数据同步失败';
          if (err.message) {
            errorMsg += `: ${err.message}`;
          }
          if (err.status) {
            errorMsg += ` (HTTP ${err.status})`;
          }
          if (err.details) {
            errorMsg += ` - ${err.details}`;
          }
          setRecordError(errorMsg);
          setTimeout(() => setRecordError(null), 8000); // 8秒后自动消失
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
    setAnswerRecords(prev => [...prev, {
      question: currentQ,
      userAnswer: selectedAnswer,
      isCorrect: correct,
      timeSpent: currentElapsedTime
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
    setAnswerRecords(prev => [...prev, {
      question: currentQ,
      userAnswer: userAnswer,
      isCorrect: correct,
      timeSpent: currentElapsedTime
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
        case QuestionType.FILL_IN_BLANK: return { label: '句子填空', color: 'bg-indigo-100 text-indigo-600' };
        case QuestionType.FILL_IN_BLANK_MCQ: return { label: '填空(选择)', color: 'bg-indigo-100 text-indigo-600' };
        case QuestionType.FILL_IN_BLANK_SPELLING: return { label: '填空(拼写)', color: 'bg-violet-100 text-violet-600' };
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
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-center gap-2">
              <XCircle size={24} className="text-red-500" />
              需要复习的题目 ({answerRecords.filter(r => !r.isCorrect).length} 题)
            </h3>
            <div className="space-y-4">
              {answerRecords.filter(r => !r.isCorrect).map((record, idx) => {
                const typeInfo = getQuestionTypeLabel(record.question.type);
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-5 border-2 border-red-200 shadow-sm hover:shadow-md transition-all"
                  >
                    {/* 卡片头部：单词 + 题型标签 + 发音按钮 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-slate-800">
                          {record.question.word.term}
                        </h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <button
                        onClick={() => speak(record.question.word.term)}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-all active:scale-95"
                        aria-label="播放发音"
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>

                    {/* 答案对比区域 */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* 你的答案 */}
                      <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                        <div className="text-xs text-red-600 font-semibold mb-1">你的答案</div>
                        <div className="text-base font-bold text-red-700 break-words">
                          {record.userAnswer}
                        </div>
                      </div>

                      {/* 正确答案 */}
                      <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                        <div className="text-xs text-green-600 font-semibold mb-1">正确答案</div>
                        <div className="text-base font-bold text-green-700 break-words">
                          {record.question.correctAnswer}
                        </div>
                      </div>
                    </div>

                    {/* 底部信息栏：用时 + 熟练度 */}
                    <div className="flex items-center justify-between text-xs">
                      {/* 用时 */}
                      <div className="text-slate-500">
                        ⏱ 用时 {Math.round(record.timeSpent / 1000)} 秒
                      </div>

                      {/* 熟练度 */}
                      {masteryData.size > 0 && (() => {
                        const mastery = masteryData.get(record.question.word.id);
                        if (mastery) {
                          const getMasteryColor = (level: number) => {
                            if (level >= 80) return 'bg-green-100 text-green-700 border-green-300';
                            if (level >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
                            if (level >= 40) return 'bg-orange-100 text-orange-700 border-orange-300';
                            return 'bg-red-100 text-red-700 border-red-300';
                          };
                          const getMasteryLabel = (level: number) => {
                            if (level >= 80) return '已掌握';
                            if (level >= 60) return '熟练';
                            if (level >= 40) return '学习中';
                            return '需加强';
                          };
                          return (
                            <div className={`px-3 py-1 rounded-full font-bold border ${getMasteryColor(mastery.mastery_level)}`}>
                              {getMasteryLabel(mastery.mastery_level)} {mastery.mastery_level}%
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8 text-center py-10 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border-2 border-green-200 shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} className="text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-green-700 mb-2">全对！太棒了！</h3>
            <p className="text-base text-green-600">所有题目都回答正确，继续保持！</p>
          </div>
        )}

        {/* 按钮区域 - 三个横向按钮 */}
        <div className="space-y-4">
          {/* 说明文字 */}
          <p className="text-sm text-center text-slate-500">
            选择下一步学习方式：
          </p>

          {/* 三个横向按钮 */}
          <div className="grid grid-cols-3 gap-3">
            {/* 再来（同样题目） */}
            <button
              onClick={() => {
                // 启用重试模式，使用相同的单词
                setIsRetryMode(true);
                setStrategy(QuizStrategy.RANDOM);
                setQuizKey((prev: number) => prev + 1);
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setUserSpelling('');
                setIsCorrect(null);
                setIsConfirmed(false);
                setScore(0);
                setQuizFinished(false);
                setAnswerRecords([]);
              }}
              disabled={isRecording}
              className={`flex flex-col items-center justify-center gap-2 text-white py-4 rounded-2xl font-bold transition-all shadow-xl ${
                isRecording
                  ? 'bg-slate-300 cursor-not-allowed shadow-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              {isRecording ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <RotateCcw size={24} />
              )}
              <span className="text-sm">{isRecording ? '上传中...' : '再来'}</span>
            </button>

            {/* 轮换（平衡模式） */}
            <button
              onClick={() => {
                // 使用平衡模式重新生成题目
                setIsRetryMode(false);
                setStrategy(QuizStrategy.BALANCED);
                setQuizKey((prev: number) => prev + 1);
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setUserSpelling('');
                setIsCorrect(null);
                setIsConfirmed(false);
                setScore(0);
                setQuizFinished(false);
                setAnswerRecords([]);
              }}
              disabled={isRecording}
              className={`flex flex-col items-center justify-center gap-2 text-white py-4 rounded-2xl font-bold transition-all shadow-xl ${
                isRecording
                  ? 'bg-slate-300 cursor-not-allowed shadow-slate-200'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'
              }`}
            >
              {isRecording ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Scale size={24} />
              )}
              <span className="text-sm">{isRecording ? '上传中...' : '轮换'}</span>
            </button>

            {/* 攻克（攻克模式） */}
            <button
              onClick={() => {
                // 使用攻克模式重新生成题目
                setIsRetryMode(false);
                setStrategy(QuizStrategy.FOCUS);
                setQuizKey((prev: number) => prev + 1);
                setCurrentIndex(0);
                setSelectedAnswer(null);
                setUserSpelling('');
                setIsCorrect(null);
                setIsConfirmed(false);
                setScore(0);
                setQuizFinished(false);
                setAnswerRecords([]);
              }}
              disabled={isRecording}
              className={`flex flex-col items-center justify-center gap-2 text-white py-4 rounded-2xl font-bold transition-all shadow-xl ${
                isRecording
                  ? 'bg-slate-300 cursor-not-allowed shadow-slate-200'
                  : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'
              }`}
            >
              {isRecording ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Target size={24} />
              )}
              <span className="text-sm">{isRecording ? '上传中...' : '攻克'}</span>
            </button>
          </div>

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
      case QuestionType.FILL_IN_BLANK:
        return 'Fill in the blank:';
      case QuestionType.FILL_IN_BLANK_MCQ:
        return 'Fill in the blank:';
      case QuestionType.FILL_IN_BLANK_SPELLING:
        return 'Fill in the blank:';
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
      case QuestionType.FILL_IN_BLANK:
        return '句子填空';
      case QuestionType.FILL_IN_BLANK_MCQ:
        return '填空(选择)';
      case QuestionType.FILL_IN_BLANK_SPELLING:
        return '填空(拼写)';
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
      case QuestionType.FILL_IN_BLANK:
        return 'bg-indigo-100 text-indigo-600';
      case QuestionType.FILL_IN_BLANK_MCQ:
        return 'bg-indigo-100 text-indigo-600';
      case QuestionType.FILL_IN_BLANK_SPELLING:
        return 'bg-violet-100 text-violet-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  // 判断是否为选择题（填空选择题也是选择题形式）
  const isMultipleChoice = currentQ.type === QuestionType.EN_TO_CN || currentQ.type === QuestionType.CN_TO_EN || currentQ.type === QuestionType.FILL_IN_BLANK_MCQ;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question {currentIndex + 1}/{questions.length}</span>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getTypeColor()} flex items-center gap-1`}>
              {(() => {
                if (currentQ.type === QuestionType.SPELLING) return <Keyboard size={14} />;
                if (currentQ.type === QuestionType.FILL_IN_BLANK_SPELLING) return <PenTool size={14} />;
                if (currentQ.type === QuestionType.FILL_IN_BLANK_MCQ || currentQ.type === QuestionType.FILL_IN_BLANK) return <BookOpen size={14} />;
                return <Languages size={14} />;
              })()}
              {getTypeLabel()}
            </span>
            {/* 计时器显示 */}
            <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
              <Timer size={16} />
              {(currentElapsedTime / 1000).toFixed(1)}s
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

      {/* 句子填空题专用UI */}
      {(currentQ.type === QuestionType.FILL_IN_BLANK_MCQ || currentQ.type === QuestionType.FILL_IN_BLANK_SPELLING) && currentQ.sentenceContext ? (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-100 mb-6">
          {/* 题型徽章 */}
          <div className="flex justify-center mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getTypeColor()} flex items-center gap-1`}>
              {currentQ.type === QuestionType.FILL_IN_BLANK_MCQ ? <BookOpen size={14} /> : <PenTool size={14} />}
              {getTypeLabel()}
            </span>
          </div>

          {/* 英语句子（带填空） */}
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <p className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed">
              {(() => {
                // 获取当前显示在填空处的内容
                const getBlankContent = () => {
                  if (isConfirmed) {
                    // 已确认：显示正确答案（绿色）或错误答案（红色）
                    return isCorrect
                      ? currentQ.correctAnswer
                      : (currentQ.type === QuestionType.FILL_IN_BLANK_MCQ ? selectedAnswer : userSpelling);
                  } else {
                    // 未确认：显示当前输入
                    if (currentQ.type === QuestionType.FILL_IN_BLANK_MCQ) {
                      return selectedAnswer || '___';
                    } else {
                      return userSpelling || '___';
                    }
                  }
                };

                const blankContent = getBlankContent();
                const isBlankCorrect = isConfirmed && isCorrect;
                const isBlankWrong = isConfirmed && !isCorrect;

                return currentQ.question.split('___').map((part, idx, arr) => (
                  <span key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <span
                        className={`inline-block mx-1 px-2 py-0.5 rounded font-bold ${
                          isBlankCorrect
                            ? 'bg-green-100 text-green-700 border-b-2 border-green-500'
                            : isBlankWrong
                            ? 'bg-red-100 text-red-700 border-b-2 border-red-500'
                            : 'border-b-2 border-slate-400 text-slate-700'
                        }`}
                      >
                        {blankContent}
                      </span>
                    )}
                  </span>
                ));
              })()}
            </p>
          </div>

          {/* 中文翻译 */}
          {currentQ.sentenceContext.chineseTranslation && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">中文翻译</p>
              <p className="text-base text-slate-700 leading-relaxed">{currentQ.sentenceContext.chineseTranslation}</p>
            </div>
          )}
        </div>
      ) : (
        /* 其他题型：标准题目卡片 */
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 mb-6 text-center">
          <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-3 md:mb-4">{getQuestionLabel()}</p>
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <h2 className="text-2xl md:text-4xl font-black text-slate-800 break-words px-2">{currentQ.question}</h2>
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
              onClick={() => {
                speak(currentQ.correctAnswer);
                // 播放后将焦点返回输入框
                setTimeout(() => {
                  spellingInputRef.current?.focus();
                }, 100);
              }}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center transition-all active:scale-95"
              aria-label="播放发音提示"
            >
              <Volume2 size={24} />
            </button>
          )}
          {/* 中对英题型：不提供发音按钮，避免泄露答案 */}
          </div>
        </div>
      )}

      {/* 拼写题 - 输入框（包括普通拼写题和填空拼写题） */}
      {currentQ.type === QuestionType.SPELLING || currentQ.type === QuestionType.FILL_IN_BLANK_SPELLING ? (
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-6 border-2 shadow-lg">
            <input
              ref={spellingInputRef}
              type="text"
              value={userSpelling}
              onChange={(e) => setUserSpelling(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (userSpelling.trim() && !isConfirmed) {
                    handleSpellingSubmit();
                  } else if (isConfirmed) {
                    handleNext();
                  }
                }
              }}
              disabled={isConfirmed}
              placeholder={currentQ.type === QuestionType.FILL_IN_BLANK_SPELLING ? "填入正确的英文单词..." : "Type the English word..."}
              className="w-full text-2xl font-bold text-center py-4 border-0 focus:ring-0 focus:outline-none"
              autoFocus={currentQ.type === QuestionType.SPELLING}
            />
          </div>

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
        /* 单选题 - 选项按钮 (2x2布局) */
        <div className="grid grid-cols-2 gap-3 mb-6">
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
                className={`w-full p-4 md:p-5 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center gap-3 ${styles}`}
              >
                <span className="break-words flex-1">{option}</span>
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
        <div className="flex gap-3">
          {/* 已选择但未确认 */}
          {selectedAnswer !== null && !isConfirmed && (
            <>
              <button
                onClick={handleConfirmAnswer}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                确认答案
              </button>
              <button
                onClick={handleChangeSelection}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-600 py-3 rounded-2xl font-medium transition-all"
              >
                <RotateCcw size={18} />
                重新选择
              </button>
            </>
          )}

          {/* 已确认 - 显示结果和下一步按钮 */}
          {isConfirmed && (
            <>
              {!isCorrect && (
                <div className="flex-1 bg-red-50 text-red-700 p-4 rounded-xl text-center flex items-center justify-center">
                  <p className="font-bold flex items-center justify-center gap-2">
                    <XCircle size={20} /> 正确答案是: {currentQ.correctAnswer}
                  </p>
                </div>
              )}
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                {currentIndex === questions.length - 1 ? '完成测验' : '下一题'}
                <ArrowRight size={20} />
              </button>
            </>
          )}
        </div>
      ) : (
        /* 拼写题完成后的下一步按钮（横向布局） */
        isConfirmed && (
          <div className="flex gap-3">
            <div className={`flex-1 p-4 rounded-xl ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center justify-center`}>
              <p className="font-bold flex items-center justify-center gap-2">
                {isCorrect ? (
                  <><CheckCircle2 size={20} /> Correct!</>
                ) : (
                  <><XCircle size={20} /> The answer is: {currentQ.correctAnswer}</>
                )}
              </p>
            </div>
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              {currentIndex === questions.length - 1 ? '完成测验' : '下一题'}
              <ArrowRight size={20} />
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default QuizMode;
