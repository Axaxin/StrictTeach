/**
 * 应用设置管理
 */

const STORAGE_KEY = 'vocab_app_settings';

export interface AppSettings {
  quizQuestionCount: number; // 每次测验的题目数量
}

const DEFAULT_SETTINGS: AppSettings = {
  quizQuestionCount: 12,
};

/**
 * 获取应用设置
 */
export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存应用设置
 */
export function saveSettings(settings: Partial<AppSettings>): void {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * 获取测验题目数量
 */
export function getQuizQuestionCount(): number {
  return getSettings().quizQuestionCount;
}

/**
 * 设置测验题目数量
 */
export function setQuizQuestionCount(count: number): void {
  // 验证范围：6-24题
  const validCount = Math.max(6, Math.min(24, count));
  saveSettings({ quizQuestionCount: validCount });
}
