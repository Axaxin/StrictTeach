
import React, { useState, useEffect, useRef } from 'react';
import { BOOKS } from './constants';
import {
  NavigationLevel,
  Book,
  Unit,
  Word,
  UserProgress,
  ActivityType,
  QuizMode as QuizModeEnum
} from './types';
import { enrichWords, clearWordCache } from './services/aiService';
import { exportAppData, importAppData } from './services/dataExport';
import BookList from './components/BookList';
import UnitListItem from './components/UnitListItem';
import ActivitySelector from './components/ActivitySelector';
import QuizModeSelector from './components/QuizModeSelector';
import FlashcardMode from './components/FlashcardMode';
import WordList from './components/WordList';
import QuizMode from './components/QuizMode';
import { Home as HomeIcon, Settings, ArrowLeft, Download, Upload, Trash2, Plus, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  // 文件导入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 设置菜单状态
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭设置菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // 导航状态
  const [navLevel, setNavLevel] = useState<NavigationLevel>(NavigationLevel.BOOK_LIST);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedQuizMode, setSelectedQuizMode] = useState<QuizModeEnum | null>(null);

  // 学习数据状态
  const [unitWords, setUnitWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);

  // 用户进度
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('vocab_progress');
    return saved ? JSON.parse(saved) : { masteredWords: [], learningWords: [] };
  });

  useEffect(() => {
    localStorage.setItem('vocab_progress', JSON.stringify(progress));
  }, [progress]);

  // 加载单词数据
  const loadUnitWords = async (unit: Unit) => {
    setLoading(true);
    try {
      const words = await enrichWords(unit.words, unit.id);
      setUnitWords(words);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 导航处理函数
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setNavLevel(NavigationLevel.UNIT_LIST);
  };

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setNavLevel(NavigationLevel.ACTIVITY_SELECT);
  };

  const handleSelectActivity = async (activity: ActivityType) => {
    setSelectedActivity(activity);

    if (activity === ActivityType.WORD_LIST) {
      // 单词总汇直接显示
      setNavLevel(NavigationLevel.LEARNING);
      await loadUnitWords(selectedUnit!);
    } else if (activity === ActivityType.LEARN) {
      // 卡片式学习
      setNavLevel(NavigationLevel.LEARNING);
      await loadUnitWords(selectedUnit!);
    } else if (activity === ActivityType.QUIZ) {
      // 进入 Quiz 模式选择
      setNavLevel(NavigationLevel.QUIZ_MODE_SELECT);
    }
  };

  const handleSelectQuizMode = async (quizMode: QuizModeEnum) => {
    setSelectedQuizMode(quizMode);
    setNavLevel(NavigationLevel.LEARNING);
    await loadUnitWords(selectedUnit!);
  };

  const handleBack = () => {
    switch (navLevel) {
      case NavigationLevel.UNIT_LIST:
        setSelectedBook(null);
        setNavLevel(NavigationLevel.BOOK_LIST);
        break;
      case NavigationLevel.ACTIVITY_SELECT:
        setSelectedUnit(null);
        setNavLevel(NavigationLevel.UNIT_LIST);
        break;
      case NavigationLevel.QUIZ_MODE_SELECT:
        setSelectedActivity(null);
        setNavLevel(NavigationLevel.ACTIVITY_SELECT);
        break;
      case NavigationLevel.LEARNING:
        if (selectedQuizMode) {
          setSelectedQuizMode(null);
          setNavLevel(NavigationLevel.QUIZ_MODE_SELECT);
        } else if (selectedActivity === ActivityType.QUIZ) {
          setSelectedActivity(null);
          setNavLevel(NavigationLevel.ACTIVITY_SELECT);
        } else {
          setSelectedActivity(null);
          setNavLevel(NavigationLevel.ACTIVITY_SELECT);
        }
        break;
    }
  };

  const handleBackToRoot = () => {
    setNavLevel(NavigationLevel.BOOK_LIST);
    setSelectedBook(null);
    setSelectedUnit(null);
    setSelectedActivity(null);
    setSelectedQuizMode(null);
    setUnitWords([]);
  };

  // 标记单词状态
  const markAsMastered = (wordId: string) => {
    setProgress(prev => {
      if (prev.masteredWords.includes(wordId)) return prev;
      return {
        ...prev,
        masteredWords: [...prev.masteredWords, wordId],
        learningWords: prev.learningWords.filter(id => id !== wordId)
      };
    });
  };

  const markForReview = (wordId: string) => {
    setProgress(prev => {
      if (prev.learningWords.includes(wordId)) return prev;
      return {
        ...prev,
        learningWords: [...prev.learningWords, wordId],
        masteredWords: prev.masteredWords.filter(id => id !== wordId)
      };
    });
  };

  const handleClearCache = () => {
    if (confirm('确定要清除所有单词缓存吗？之后进入单元需要重新生成 AI 内容。')) {
      clearWordCache();
      alert('缓存已清除！');
    }
  };

  const handleResetProgress = () => {
    if (confirm('确定要重置所有学习进度吗？这将清空所有已掌握和学习中的单词记录。此操作不可撤销！')) {
      setProgress({ masteredWords: [], learningWords: [] });
      alert('学习进度已重置！');
    }
  };

  const handleExportData = () => {
    try {
      exportAppData();
      alert('数据导出成功！');
    } catch (error) {
      alert('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importAppData(file);
      if (result.success) {
        alert(result.message);
      } else {
        alert('导入失败：' + result.message);
      }
    } catch (error) {
      alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 获取面包屑导航文本
  const getBreadcrumbTitle = () => {
    switch (navLevel) {
      case NavigationLevel.BOOK_LIST:
        return 'VocabMaster Pro';
      case NavigationLevel.UNIT_LIST:
        return selectedBook?.name || '章节列表';
      case NavigationLevel.ACTIVITY_SELECT:
        return selectedUnit?.name || '活动选择';
      case NavigationLevel.QUIZ_MODE_SELECT:
        return 'Quiz 模式';
      case NavigationLevel.LEARNING:
        if (selectedQuizMode) {
          const modeNames = {
            [QuizModeEnum.EN_TO_CN_MCQ]: '英对中单选',
            [QuizModeEnum.CN_TO_EN_MCQ]: '中对英单选',
            [QuizModeEnum.CN_TO_EN_SPELLING]: '中对英拼写',
            [QuizModeEnum.MIXED]: '混合题型'
          };
          return modeNames[selectedQuizMode];
        }
        if (selectedActivity === ActivityType.WORD_LIST) return '单词总汇';
        if (selectedActivity === ActivityType.LEARN) return '卡片学习';
        return '学习中';
    }
  };

  // 渲染内容
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <p className="text-slate-600 font-medium">AI is preparing your words...</p>
        </div>
      );
    }

    switch (navLevel) {
      case NavigationLevel.BOOK_LIST:
        return <BookList books={BOOKS} progress={progress} onSelectBook={handleSelectBook} />;

      case NavigationLevel.UNIT_LIST:
        return (
          <div className="max-w-2xl mx-auto px-4 py-8">
            <header className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{selectedBook?.name}</h1>
              <p className="text-slate-500">{selectedBook?.description}</p>
            </header>

            <div className="space-y-3">
              {selectedBook?.units.map(unit => (
                <UnitListItem
                  key={unit.id}
                  unit={unit}
                  progress={progress}
                  onClick={() => handleSelectUnit(unit)}
                />
              ))}
            </div>
          </div>
        );

      case NavigationLevel.ACTIVITY_SELECT:
        return selectedUnit && (
          <ActivitySelector
            unit={selectedUnit}
            progress={progress}
            onSelectActivity={handleSelectActivity}
            onBack={handleBack}
          />
        );

      case NavigationLevel.QUIZ_MODE_SELECT:
        return (
          <QuizModeSelector
            onSelectMode={handleSelectQuizMode}
            onBack={handleBack}
          />
        );

      case NavigationLevel.LEARNING:
        if (!selectedUnit) return null;

        // 单词总汇模式
        if (selectedActivity === ActivityType.WORD_LIST) {
          return (
            <WordList
              words={unitWords}
              progress={progress}
              onComplete={handleBack}
              onMastered={markAsMastered}
              onReview={markForReview}
            />
          );
        }

        // 卡片学习模式
        if (selectedActivity === ActivityType.LEARN) {
          return (
            <FlashcardMode
              words={unitWords}
              onComplete={handleBack}
              onMastered={markAsMastered}
              onReview={markForReview}
              progress={progress}
            />
          );
        }

        // Quiz 模式
        if (selectedActivity === ActivityType.QUIZ && selectedQuizMode) {
          return (
            <QuizMode
              words={unitWords}
              quizMode={selectedQuizMode}
              onComplete={(score) => {
                console.log("Quiz Score:", score);
                handleBack();
              }}
            />
          );
        }

        return null;
    }
  };

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {navLevel !== NavigationLevel.BOOK_LIST && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-medium"
            >
              <ArrowLeft size={20} />
              <span>返回</span>
            </button>
          )}
          <div className="text-sm font-bold text-slate-700">
            {getBreadcrumbTitle()}
          </div>
        </div>
        <button
          onClick={handleBackToRoot}
          className={`flex items-center gap-2 ${navLevel === NavigationLevel.BOOK_LIST ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'} transition-colors font-medium`}
        >
          <HomeIcon size={20} />
          <span className="hidden sm:inline">首页</span>
        </button>
      </nav>

      {renderContent()}

      {/* 底部导航栏 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-6 z-40">
        <div className="max-w-4xl mx-auto flex justify-around items-center">
          {/* 首页 */}
          <button
            onClick={handleBackToRoot}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              navLevel === NavigationLevel.BOOK_LIST ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HomeIcon size={24} />
            <span className="text-xs font-bold">首页</span>
          </button>

          {/* 预留位置 */}
          <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-slate-300 cursor-not-allowed">
            <Plus size={24} />
            <span className="text-xs font-bold">预留</span>
          </button>

          {/* 设置 */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                showSettingsMenu ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings size={24} />
              <span className="text-xs font-bold">设置</span>
            </button>

            {/* 设置菜单 */}
            {showSettingsMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => { handleExportData(); setShowSettingsMenu(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <Download size={18} className="text-indigo-600" />
                  <span className="text-sm font-medium text-slate-700">导出数据</span>
                </button>
                <button
                  onClick={() => { handleImportClick(); setShowSettingsMenu(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                >
                  <Upload size={18} className="text-indigo-600" />
                  <span className="text-sm font-medium text-slate-700">导入数据</span>
                </button>
                <button
                  onClick={() => { handleResetProgress(); setShowSettingsMenu(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                >
                  <RotateCcw size={18} className="text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">重置进度</span>
                </button>
                <button
                  onClick={() => { handleClearCache(); setShowSettingsMenu(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                >
                  <Trash2 size={18} className="text-red-500" />
                  <span className="text-sm font-medium text-slate-700">清除缓存</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 隐藏的文件输入框 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFileChange}
          className="hidden"
        />
      </footer>
    </div>
  );
};

export default App;
