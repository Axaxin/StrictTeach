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

        // 检查是否已有熟练度记录
        const existing = await env.DB.prepare(
          'SELECT * FROM mastery WHERE word_id = ?'
        ).bind(wordId).first();

        if (existing) {
          // 更新现有记录
          const newAttemptCount = existing.attempt_count + 1;
          const newCorrectCount = existing.correct_count + (attempt.isCorrect ? 1 : 0);
          const newTotalTime = existing.total_time_spent + attempt.timeSpent;
          const newMasteryLevel = Math.round((newCorrectCount / newAttemptCount) * 100);

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
          // 创建新记录
          const masteryLevel = attempt.isCorrect ? 100 : 0;

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
