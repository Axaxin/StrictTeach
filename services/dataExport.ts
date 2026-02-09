/**
 * 导出/导入学习数据
 */

// 数据导出的完整结构
export interface AppDataExport {
  version: string;           // 数据版本号
  exportDate: string;        // 导出时间
  data: {
    words: Record<string, any[]>;  // 所有章节的单词缓存 (vocab_cache_unitId)
    progress: {                // 用户学习进度
      masteredWords: string[];
      learningWords: string[];
    };
  };
}

/**
 * 导出所有应用数据到 JSON 文件
 */
export const exportAppData = (): void => {
  const data: AppDataExport = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      words: {} as Record<string, any[]>,
      progress: {
        masteredWords: [],
        learningWords: []
      }
    }
  };

  // 收集所有单词缓存
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('vocab_cache_')) {
      try {
        const unitId = key.replace('vocab_cache_', '');
        data.data.words[unitId] = JSON.parse(localStorage.getItem(key) || '[]');
      } catch (e) {
        console.warn(`Failed to read cache for ${key}:`, e);
      }
    }
  });

  // 收集学习进度
  try {
    const progressData = localStorage.getItem('vocab_progress');
    if (progressData) {
      data.data.progress = JSON.parse(progressData);
    }
  } catch (e) {
    console.warn('Failed to read progress data:', e);
  }

  // 创建并下载 JSON 文件
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `strictteach_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('[Export] Data exported successfully');
};

/**
 * 从 JSON 文件导入应用数据
 */
export const importAppData = (file: File): Promise<{
  success: boolean;
  message: string;
  stats?: {
    units: number;
    wordsCount: number;
    masteredWordsCount: number;
    learningWordsCount: number;
  };
}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedData: AppDataExport = JSON.parse(json);

        // 数据版本检查（未来扩展用）
        if (!importedData.version) {
          resolve({
            success: false,
            message: '无效的数据文件格式'
          });
          return;
        }

        // 验证数据结构
        if (!importedData.data || !importedData.data.words || !importedData.data.progress) {
          resolve({
            success: false,
            message: '数据文件结构不完整'
          });
          return;
        }

        // 导入单词数据
        let unitsCount = 0;
        let wordsCount = 0;
        Object.entries(importedData.data.words).forEach(([unitId, words]) => {
          if (Array.isArray(words)) {
            const cacheKey = `vocab_cache_${unitId}`;
            localStorage.setItem(cacheKey, JSON.stringify(words));
            unitsCount++;
            wordsCount += words.length;
          }
        });

        // 导入学习进度
        if (importedData.data.progress) {
          localStorage.setItem('vocab_progress', JSON.stringify(importedData.data.progress));
        }

        // 刷新页面以应用导入的数据
        window.location.reload();

        resolve({
          success: true,
          message: `导入成功！${unitsCount} 个章节，${wordsCount} 个单词`,
          stats: {
            units: unitsCount,
            wordsCount: wordsCount,
            masteredWordsCount: importedData.data.progress.masteredWords.length,
            learningWordsCount: importedData.data.progress.learningWords.length
          }
        });
      } catch (error) {
        console.error('Import error:', error);
        resolve({
          success: false,
          message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        message: '无法读取文件'
      });
    };

    reader.readAsText(file);
  });
};

/**
 * 清除所有应用数据
 */
export const clearAllAppData = (): void => {
  if (confirm('确定要清除所有数据吗？这将删除：\n\n• 所有单词缓存\n• 学习进度\n\n此操作不可撤销！')) {
    clearWordCache();
    localStorage.removeItem('vocab_progress');
    console.log('[Clear] All app data cleared');
    window.location.reload();
  }
};

/**
 * 获取应用数据统计信息
 */
export const getAppDataStats = (): {
  cacheUnits: string[];
  totalCachedWords: number;
  masteredWordsCount: number;
  learningWordsCount: number;
  dataSize: string;
} => {
  const keys = Object.keys(localStorage);
  const cacheUnits: string[] = [];
  let totalCachedWords = 0;

  // 统计缓存数据
  keys.forEach(key => {
    if (key.startsWith('vocab_cache_')) {
      try {
        const unitId = key.replace('vocab_cache_', '');
        const words = JSON.parse(localStorage.getItem(key) || '[]');
        cacheUnits.push(unitId);
        totalCachedWords += words.length;
      } catch (e) {
        // ignore
      }
    }
  });

  // 统计学习进度
  let masteredWordsCount = 0;
  let learningWordsCount = 0;
  try {
    const progressData = localStorage.getItem('vocab_progress');
    if (progressData) {
      const progress = JSON.parse(progressData);
      masteredWordsCount = progress.masteredWords?.length || 0;
      learningWordsCount = progress.learningWords?.length || 0;
    }
  } catch (e) {
    // ignore
  }

  // 计算数据大小
  const dataSize = new Blob([JSON.stringify(localStorage)]).size;

  return {
    cacheUnits,
    totalCachedWords,
    masteredWordsCount,
    learningWordsCount,
    dataSize: formatBytes(dataSize)
  };
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
