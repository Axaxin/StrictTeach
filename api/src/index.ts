/**
 * VocabMaster API - Cloudflare Workers
 * 提供答题记录和熟练度查询接口
 */

import { Router } from 'itty-router';

const router = Router();

// CORS 预检响应
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS 预检
router.options('*', () => new Response(null, { headers: corsHeaders }));

/**
 * 健康检查
 */
router.get('/', () => {
  return new Response(JSON.stringify({
    name: 'VocabMaster API',
    version: '1.0.0',
    endpoints: {
      'GET /api/health': '健康检查',
      'GET /api/mastery/:wordId': '获取单词熟练度',
      'POST /api/attempts': '记录答题结果',
      'GET /api/attempts/word/:wordId': '获取单词答题历史',
      'GET /api/words/need-practice': '获取需要练习的单词',
      'GET /api/stats': '获取学习统计',
    }
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

/**
 * 健康检查
 */
router.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

/**
 * 获取单词熟练度
 */
router.get('/api/mastery/:wordId', async (request, env) => {
  const { wordId } = request.params;

  try {
    const result = await env.DB.prepare(
      'SELECT * FROM mastery WHERE word_id = ?'
    ).bind(wordId).first();

    return new Response(JSON.stringify(result || {
      word_id: wordId,
      mastery_level: 0,
      attempt_count: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 批量获取单词熟练度
 */
router.get('/api/mastery', async (request, env) => {
  const url = new URL(request.url);
  const wordIds = url.searchParams.get('wordIds'); // 逗号分隔

  if (!wordIds) {
    return new Response(JSON.stringify({ error: 'Missing wordIds parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const ids = wordIds.split(',');
    const placeholders = ids.map(() => '?').join(',');

    const result = await env.DB.prepare(
      `SELECT * FROM mastery WHERE word_id IN (${placeholders})`
    ).bind(...ids).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 计算熟练度分数（更合理的算法）
 *
 * 新计算模型：
 * 1. 正确率分 (70%)：总体正确率，拼写题权重更高
 * 2. 效率分 (30%)：所有题目（包括答错的）的平均用时
 * 3. 答错惩罚：连续答错或错误率过高时额外扣分
 * 4. 最少答题要求：至少需要2次答题才能达到>60分，至少3次才能达到>80分
 *
 * 设计理念：
 * - 拼写题比选择题难，权重应该是选择题的2倍
 * - 答错应该有明显惩罚，不仅仅是不得分
 * - 效率分应该反映所有答题，不只是答对的
 * - 需要多次验证才能达到精通，避免一次答对就标记为精通
 */
function calculateMasteryLevel(attempts: any[]): number {
  if (!attempts || attempts.length === 0) return 0;

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter(a => a.is_correct).length;
  const overallAccuracy = totalCorrect / totalAttempts;

  // 分类统计
  const mcqAttempts = attempts.filter(a =>
    a.question_type === 'EN_TO_CN' || a.question_type === 'CN_TO_EN'
  );
  const spellingAttempts = attempts.filter(a =>
    a.question_type === 'SPELLING' || a.question_type === 'CN_TO_EN_SPELLING'
  );

  // ========== 正确率分 (70%) ==========
  let accuracyScore = 0;

  if (spellingAttempts.length > 0 && mcqAttempts.length > 0) {
    // 两种题型都有：拼写题权重2倍
    const mcqCorrect = mcqAttempts.filter(a => a.is_correct).length;
    const spellingCorrect = spellingAttempts.filter(a => a.is_correct).length;

    const mcqRate = mcqCorrect / mcqAttempts.length;
    const spellingRate = spellingCorrect / spellingAttempts.length;

    // 加权正确率：拼写题权重2倍
    // 公式：(2×拼写题数 + 选择题数) / (2×拼写题总数 + 选择题总数)
    const weightedAccuracy = (2 * spellingCorrect + mcqCorrect) / (2 * spellingAttempts.length + mcqAttempts.length);
    accuracyScore = weightedAccuracy * 70;

  } else if (spellingAttempts.length > 0) {
    // 只有拼写题
    const spellingCorrect = spellingAttempts.filter(a => a.is_correct).length;
    accuracyScore = (spellingCorrect / spellingAttempts.length) * 70;

  } else {
    // 只有选择题
    const mcqCorrect = mcqAttempts.filter(a => a.is_correct).length;
    accuracyScore = (mcqCorrect / mcqAttempts.length) * 70;
  }

  // ========== 效率分 (30%) ==========
  // 基于所有题目的平均用时（包括答错的）
  const avgTime = attempts.reduce((sum, a) => sum + a.time_spent, 0) / totalAttempts;

  let efficiencyScore = 0;

  if (spellingAttempts.length > 0) {
    // 有拼写题时，使用拼写题的标准
    let efficiencyFactor = 0;
    if (avgTime < 8000) efficiencyFactor = 1.0;      // < 8秒：非常熟练
    else if (avgTime < 15000) efficiencyFactor = 0.85; // 8-15秒：熟练
    else if (avgTime < 30000) efficiencyFactor = 0.65; // 15-30秒：一般
    else if (avgTime < 50000) efficiencyFactor = 0.4;   // 30-50秒：较慢
    else efficiencyFactor = 0.2;                       // > 50秒：很慢

    efficiencyScore = efficiencyFactor * 30;
  } else {
    // 只有选择题时，标准放宽
    let efficiencyFactor = 0;
    if (avgTime < 3000) efficiencyFactor = 1.0;
    else if (avgTime < 8000) efficiencyFactor = 0.9;
    else if (avgTime < 15000) efficiencyFactor = 0.7;
    else if (avgTime < 30000) efficiencyFactor = 0.4;
    else efficiencyFactor = 0.2;

    efficiencyScore = efficiencyFactor * 30;
  }

  // ========== 答错惩罚 ==========
  // 如果错误率超过50%，额外扣分
  const errorRate = 1 - overallAccuracy;
  let errorPenalty = 0;

  if (errorRate > 0.5) {
    // 错误率50%-100%，扣0-20分
    errorPenalty = (errorRate - 0.5) * 2 * 20;
  }

  // ========== 最终计算 ==========
  let finalScore = accuracyScore + efficiencyScore - errorPenalty;

  // ========== 最少答题次数限制 ==========
  // 避免一次答对就标记为精通
  if (totalAttempts === 1) {
    // 第一次答题最高只能得55分（勉强及格）
    return Math.min(55, Math.max(5, Math.round(finalScore))); // 最低5分（练习过但不会）
  } else if (totalAttempts === 2) {
    // 第二次答题最高只能得75分（学习中）
    return Math.min(75, Math.max(5, Math.round(finalScore))); // 最低5分
  }

  // 三次及以上才有机会获得满分
  // 全对且快（适用于3次及以上答题）
  if (overallAccuracy === 1 && avgTime < 10000 && spellingAttempts.length > 0) {
    return 100;
  }

  return Math.min(100, Math.max(5, Math.round(finalScore))); // 最低5分，确保练习过的词不显示"新词"
}

/**
 * 记录答题结果
 */
router.post('/api/attempts', async (request, env) => {
  try {
    const { userId, attempts } = await request.json();

    if (!Array.isArray(attempts) || attempts.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid attempts data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 开始事务
    const batchSize = 20; // D1 限制批量操作数量
    const results = [];

    for (let i = 0; i < attempts.length; i += batchSize) {
      const batch = attempts.slice(i, i + batchSize);

      // 批量插入答题记录
      for (const attempt of batch) {
        await env.DB.prepare(`
          INSERT INTO attempts (user_id, word_id, word_term, question_type, is_correct, time_spent, user_answer)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId || 'default',
          attempt.wordId,
          attempt.wordTerm,
          attempt.questionType,
          attempt.isCorrect ? 1 : 0,
          attempt.timeSpent,
          attempt.userAnswer || ''
        ).run();
      }

      // 批量更新熟练度
      for (const attempt of batch) {
        const wordId = attempt.wordId;
        const isSpelling = attempt.questionType === 'SPELLING' ||
                           attempt.questionType === 'CN_TO_EN_SPELLING';

        // 检查是否已有熟练度记录
        const existing = await env.DB.prepare(
          'SELECT * FROM mastery WHERE word_id = ?'
        ).bind(wordId).first();

        if (existing) {
          // 获取现有记录
          const newAttemptCount = existing.attempt_count + 1;
          const newCorrectCount = existing.correct_count + (attempt.isCorrect ? 1 : 0);
          const newTotalTime = existing.total_time_spent + attempt.timeSpent;

          // 获取该单词的所有答题记录用于重新计算熟练度
          const allAttempts = await env.DB.prepare(`
            SELECT question_type, is_correct, time_spent
            FROM attempts
            WHERE word_id = ?
            ORDER BY created_at DESC
            LIMIT 50
          `).bind(wordId).all();

          // 加上当前这次答题
          allAttempts.results.push({
            question_type: attempt.questionType,
            is_correct: attempt.isCorrect ? 1 : 0,
            time_spent: attempt.timeSpent
          });

          // 计算新的熟练度
          const newMasteryLevel = calculateMasteryLevel(allAttempts.results);

          await env.DB.prepare(`
            UPDATE mastery
            SET attempt_count = ?,
                correct_count = ?,
                total_time_spent = ?,
                mastery_level = ?,
                last_attempt_at = CURRENT_TIMESTAMP,
                last_correct_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE last_correct_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE word_id = ?
          `).bind(
            newAttemptCount,
            newCorrectCount,
            newTotalTime,
            newMasteryLevel,
            attempt.isCorrect ? 1 : 0,
            wordId
          ).run();
        } else {
          // 创建新记录 - 单次答题
          const masteryLevel = calculateMasteryLevel([{
            question_type: attempt.questionType,
            is_correct: attempt.isCorrect ? 1 : 0,
            time_spent: attempt.timeSpent
          }]);

          await env.DB.prepare(`
            INSERT INTO mastery (word_id, word_term, unit_id, mastery_level, attempt_count, correct_count, total_time_spent, last_attempt_at, last_correct_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)
          `).bind(
            wordId,
            attempt.wordTerm,
            attempt.unitId || '',
            masteryLevel,
            1,
            attempt.isCorrect ? 1 : 0,
            attempt.timeSpent,
            attempt.isCorrect ? 1 : 0
          ).run();
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      recorded: attempts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to record attempts', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 获取单词答题历史
 */
router.get('/api/attempts/word/:wordId', async (request, env) => {
  const { wordId } = request.params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    const result = await env.DB.prepare(`
      SELECT * FROM attempts
      WHERE word_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(wordId, limit).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 获取需要练习的单词（低熟练度优先）
 */
router.get('/api/words/need-practice', async (request, env) => {
  const url = new URL(request.url);
  const unitId = url.searchParams.get('unitId');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const maxMasteryLevel = parseInt(url.searchParams.get('maxMasteryLevel') || '80');

  try {
    let query = `
      SELECT * FROM mastery
      WHERE mastery_level < ?
    `;
    const params = [maxMasteryLevel];

    if (unitId) {
      query += ' AND unit_id = ?';
      params.push(unitId);
    }

    query += ' ORDER BY mastery_level ASC, last_attempt_at ASC LIMIT ?';
    params.push(limit);

    const result = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 获取学习统计
 */
router.get('/api/stats', async (request, env) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || 'default';

  try {
    // 总答题次数和正确率
    const totalStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_attempts,
        SUM(is_correct) as total_correct,
        SUM(time_spent) as total_time_spent,
        COUNT(DISTINCT word_id) as unique_words
      FROM attempts
      WHERE user_id = ?
    `).bind(userId).first();

    // 按题型统计
    const byQuestionType = await env.DB.prepare(`
      SELECT
        question_type,
        COUNT(*) as count,
        SUM(is_correct) as correct,
        ROUND(AVG(time_spent)) as avg_time
      FROM attempts
      WHERE user_id = ?
      GROUP BY question_type
    `).bind(userId).all();

    // 最近7天练习趋势
    const recentTrend = await env.DB.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as attempts,
        SUM(is_correct) as correct
      FROM attempts
      WHERE user_id = ?
        AND created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).bind(userId).all();

    // 熟练度分布
    const masteryDistribution = await env.DB.prepare(`
      SELECT
        CASE
          WHEN mastery_level >= 80 THEN 'mastered'
          WHEN mastery_level >= 50 THEN 'learning'
          WHEN mastery_level > 0 THEN 'started'
          ELSE 'new'
        END as level,
        COUNT(*) as count
      FROM mastery
      GROUP BY level
    `).all();

    return new Response(JSON.stringify({
      total: totalStats,
      byQuestionType: byQuestionType.results || [],
      recentTrend: recentTrend.results || [],
      masteryDistribution: masteryDistribution.results || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 批量获取熟练度（通过 wordIds 查询）
 */
router.post('/api/mastery/batch', async (request, env) => {
  try {
    const { wordIds } = await request.json();

    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid wordIds' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const placeholders = wordIds.map(() => '?').join(',');
    const result = await env.DB.prepare(
      `SELECT * FROM mastery WHERE word_id IN (${placeholders})`
    ).bind(...wordIds).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 删除单元的所有学习数据
 */
router.delete('/api/units/:unitId', async (request, env) => {
  const { unitId } = request.params;

  try {
    // 首先获取该单元的所有word_id
    const words = await env.DB.prepare(`
      SELECT DISTINCT word_id FROM mastery WHERE unit_id = ?
    `).bind(unitId).all();

    const wordIds = words.results?.map(w => w.word_id) || [];

    if (wordIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        deleted: 0,
        message: 'No data found for this unit'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 删除attempts记录
    const placeholders = wordIds.map(() => '?').join(',');
    await env.DB.prepare(`
      DELETE FROM attempts WHERE word_id IN (${placeholders})
    `).bind(...wordIds).run();

    // 删除mastery记录
    await env.DB.prepare(`
      DELETE FROM mastery WHERE unit_id = ?
    `).bind(unitId).run();

    return new Response(JSON.stringify({
      success: true,
      deleted: wordIds.length,
      unitId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Database error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * AI 分析单词熟练度（可选功能）
 */
router.post('/api/analyze-mastery', async (request, env) => {
  try {
    const { wordId } = await request.json();

    // 获取最近20次答题记录
    const attempts = await env.DB.prepare(`
      SELECT * FROM attempts
      WHERE word_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(wordId).all();

    if (!attempts.results || attempts.results.length === 0) {
      return new Response(JSON.stringify({
        mastery_level: 0,
        message: 'No attempts yet'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 计算基础统计
    const total = attempts.results.length;
    const correct = attempts.results.filter(a => a.is_correct).length;
    const baseLevel = Math.round((correct / total) * 100);

    // TODO: 可以集成 AI 服务进行更深入分析
    // 考虑因素：题目类型分布、答题速度趋势、最近表现等

    return new Response(JSON.stringify({
      word_id: wordId,
      mastery_level: baseLevel,
      attempt_count: total,
      correct_count: correct,
      analysis: {
        strong_points: [],
        weak_points: [],
        recommendation: baseLevel < 50 ? '需要加强练习' : '继续保持'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Analysis failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// 导出 Workers 使用的 fetch handler
export default {
  fetch: (request: Request, env: any, ctx: any) => {
    return router.handle(request, env).catch((error: Error) => {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    });
  }
};
