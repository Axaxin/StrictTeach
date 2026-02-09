
import React, { useState, useEffect } from 'react';
import { Unit, ActivityType } from '../types';
import { List, BookOpen, ClipboardCheck, Trophy, BookText, Settings, X, RotateCcw, TrendingUp, AlertCircle, Loader2, CheckCircle, Plus, Minus } from 'lucide-react';
import { getBatchMasteryPost, deleteUnitData } from '../services/api';
import { getQuizQuestionCount, setQuizQuestionCount } from '../utils/settings';
import { globalMasteryRefresh } from '../hooks/useMasteryRefresh';

interface ActivitySelectorProps {
  unit: Unit;
  onSelectActivity: (activity: ActivityType) => void;
  onBack: () => void;
}

const ActivitySelector: React.FC<ActivitySelectorProps> = ({ unit, onSelectActivity, onBack }) => {
  const [masteryData, setMasteryData] = useState<{[wordId: string]: any}>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0); // 全局刷新触发器
  const [showSettings, setShowSettings] = useState(false);
  const [settingsAction, setSettingsAction] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [quizQuestionCount, setQuizQuestionCountState] = useState(() => getQuizQuestionCount());

  // 获取所有单词ID
  const allWordIds = unit.words.map((_, idx) => `${unit.id}-${idx}`);

  // 获取云端熟练度数据（完整数据）
  const fetchMasteryData = () => {
    getBatchMasteryPost(allWordIds)
      .then(data => {
        const map: {[wordId: string]: any} = {};
        data.forEach(m => {
          map[m.word_id] = m;
        });
        setMasteryData(map);
        console.log(`[ActivitySelector] Fetched ${data.length} mastery records`);
      })
      .catch(err => {
        console.error('Failed to fetch mastery data:', err);
      });
  };

  // 初始化时和全局刷新时获取数据
  useEffect(() => {
    fetchMasteryData();
  }, [unit.id, refreshTrigger]);

  // 订阅全局刷新事件
  useEffect(() => {
    const unsubscribe = globalMasteryRefresh.subscribe(() => {
      console.log('[ActivitySelector] Global refresh triggered, refetching...');
      setRefreshTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  // 计算掌握进度（基于云端数据，>= 60 视为已掌握）
  const masteredCount = Object.values(masteryData).filter(level => level.mastery_level >= 60).length;
  const learningCount = Object.values(masteryData).filter(level => level.mastery_level > 0 && level.mastery_level < 60).length;
  const progressPercent = Math.round((masteredCount / unit.words.length) * 100);

  // 计算单元统计数据
  const unitStats = () => {
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalTime = 0;

    Object.values(masteryData).forEach(mastery => {
      if (mastery) {
        totalAttempts += mastery.attempt_count || 0;
        totalCorrect += mastery.correct_count || 0;
        totalTime += mastery.total_time_spent || 0;
      }
    });

    const totalWrong = totalAttempts - totalCorrect;
    const avgTimeMs = totalAttempts > 0 ? totalTime / totalAttempts : 0;

    return {
      totalAttempts,
      totalCorrect,
      totalWrong,
      avgTimeSec: avgTimeMs > 0 ? (avgTimeMs / 1000).toFixed(1) : '0.0',
      accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0
    };
  };

  const stats = unitStats();

  // 重新获取mastery数据
  const refreshMasteryData = () => {
    getBatchMasteryPost(allWordIds)
      .then(data => {
        const map: {[wordId: string]: any} = {};
        data.forEach(m => {
          map[m.word_id] = m;
        });
        setMasteryData(map);
      })
      .catch(err => {
        console.error('Failed to fetch mastery data:', err);
      });
  };

  // 处理重置操作
  const handleReset = async () => {
    setIsResetting(true);
    setResetError(null);

    try {
      const result = await deleteUnitData(unit.id);

      if (result.success) {
        setResetSuccess(true);
        // 2秒后关闭弹窗并刷新数据
        setTimeout(() => {
          setShowSettings(false);
          setSettingsAction(null);
          setResetSuccess(false);
          refreshMasteryData();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Reset failed:', error);
      setResetError(error.message || '重置失败，请稍后重试');
    } finally {
      setIsResetting(false);
    }
  };

  // 处理测验题目数量变更
  const handleQuizCountChange = (delta: number) => {
    const newCount = quizQuestionCount + delta;
    const validCount = Math.max(6, Math.min(24, newCount)); // 限制在 6-24 之间
    setQuizQuestionCountState(validCount);
    setQuizQuestionCount(validCount);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        {/* 单词总汇 */}
        <button
          onClick={() => onSelectActivity(ActivityType.WORD_LIST)}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all group text-left"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <List size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">单词总汇</h3>
          <p className="text-slate-500 text-sm">浏览所有单词</p>
        </button>

        {/* Learn 模式 */}
        <button
          onClick={() => onSelectActivity(ActivityType.LEARN)}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all group text-left"
        >
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <BookText size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">情景阅读</h3>
          <p className="text-slate-500 text-sm">在文章中学习单词</p>
        </button>

        {/* Quiz 模式 */}
        <button
          onClick={() => onSelectActivity(ActivityType.QUIZ)}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all group text-left"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <ClipboardCheck size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Quiz</h3>
          <p className="text-slate-500 text-sm">测验检验成果</p>
        </button>

        {/* 设置 */}
        <button
          onClick={() => setShowSettings(true)}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-slate-400 hover:shadow-xl transition-all group text-left"
        >
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 mb-4 group-hover:bg-slate-600 group-hover:text-white transition-colors">
            <Settings size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">设置</h3>
          <p className="text-slate-500 text-sm">单元管理</p>
        </button>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">单元设置</h3>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setSettingsAction(null);
                  setResetError(null);
                  setResetSuccess(false);
                }}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {settingsAction === null ? (
              <>
                {/* 统计信息 */}
                <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3 text-indigo-700">
                    <TrendingUp size={18} />
                    <span className="text-sm font-bold">学习统计</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="text-2xl font-bold text-indigo-600">{stats.totalAttempts}</div>
                      <div className="text-xs text-slate-500">测试次数</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="text-2xl font-bold text-green-600">{stats.accuracy}%</div>
                      <div className="text-xs text-slate-500">正确率</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-100">
                      <div className="text-2xl font-bold text-red-600">{stats.totalWrong}</div>
                      <div className="text-xs text-slate-500">错误次数</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="text-2xl font-bold text-amber-600">{stats.avgTimeSec}</div>
                      <div className="text-xs text-slate-500">平均秒</div>
                    </div>
                  </div>
                </div>

                {/* 操作选项 */}
                <div className="space-y-3">
                  {/* 测验题目数量设置 */}
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-purple-700">
                        <ClipboardCheck size={18} />
                        <span className="text-sm font-bold">每次测验题目数量</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => handleQuizCountChange(-2)}
                        disabled={quizQuestionCount <= 6}
                        className="w-12 h-12 rounded-full bg-purple-200 hover:bg-purple-300 text-purple-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        <Minus size={20} />
                      </button>
                      <div className="text-center">
                        <div className="text-3xl font-black text-purple-700">{quizQuestionCount}</div>
                        <div className="text-xs text-purple-500">题/次</div>
                      </div>
                      <button
                        onClick={() => handleQuizCountChange(2)}
                        disabled={quizQuestionCount >= 24}
                        className="w-12 h-12 rounded-full bg-purple-200 hover:bg-purple-300 text-purple-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="mt-2 text-center text-xs text-purple-500">
                      范围：6-24 题
                    </div>
                  </div>

                  <button
                    onClick={() => setSettingsAction('reset')}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-red-50 rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <RotateCcw size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-800">重置学习统计</div>
                      <div className="text-sm text-slate-500">清除本单元所有云端数据</div>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 重置中/成功/错误状态 */}
                {resetSuccess ? (
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">重置成功！</h4>
                    <p className="text-sm text-slate-500">本单元的所有学习数据已被清除。</p>
                  </div>
                ) : (
                  <>
                    {/* 确认重置 */}
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-red-600" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 mb-2">确定要重置吗？</h4>
                      <p className="text-sm text-slate-500">此操作将删除本单元所有单词的云端学习记录，包括答题历史和熟练度数据。此操作不可撤销。</p>
                      {resetError && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                          <strong>错误：</strong>{resetError}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSettingsAction(null);
                          setResetError(null);
                        }}
                        disabled={isResetting}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={isResetting}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isResetting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>重置中...</span>
                          </>
                        ) : (
                          '确认重置'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySelector;
