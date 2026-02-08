# VocabMaster - 项目记忆文档

## 项目概述
VocabMaster 是一个为初一学生设计的英语词汇学习应用，使用 React 19 + TypeScript + Vite 构建。

## 当前状态 (2026-02-08)

### 核心功能
1. **单词学习系统**：7个单元（Starter + Unit 1-6），287个单词
2. **情景阅读模块**：通过阅读文章学习词汇（替代传统卡片学习）
3. **测验系统**：4种测验模式 + 3种出题策略，支持计时和熟练度追踪
4. **云端同步**：Cloudflare Workers + D1 数据库
5. **音频播放**：Web Speech API，支持 Safari、Edge、Arc 浏览器

### 最近完成的功能
1. **Quiz出题策略系统** (2026-02-08)
   - 一般模式 (RANDOM)：等概率随机
   - 平衡模式 (BALANCED)：练习次数少的词概率更高
   - 攻克模式 (FOCUS)：优先选择低熟练度单词
   - 3种重试选项，使用不同策略

2. **Arc浏览器音频修复** (2026-02-08)
   - 移除 speak() 函数开头的 cancel() 调用
   - 让浏览器自然处理语音队列
   - Safari、Edge、Arc 现在都能正常播放

3. **情景阅读模块** (2026-02-08)
   - 两种阅读模式：全文阅读 / 逐句拆解
   - 完整音频控制系统
   - 7个单元的阅读passage JSON文件

4. **单元设置重置功能** (2026-02-08)
   - DELETE /api/units/:unitId API
   - 前端重置UI和流程

5. **全局熟练度刷新系统** (2026-02-08)
   - 解决各模块熟练度数据割裂问题
   - 统一的数据刷新机制，确保WordList、ActivitySelector、QuizMode显示一致
   - 修复单次答对显示"精通"的问题（后端算法：第1次最高55分，第2次最高75分）
   - 修复攻克模式不生效的问题（刷新机制确保数据同步）

6. **Quiz报告按钮防误触** (2026-02-08)
   - 数据上传中禁用"再来"/"轮换"/"攻克"按钮
   - 显示loading状态和"上传中..."文字
   - 防止数据同步完成前开始新一轮测验

7. **WordList筛选UI优化** (2026-02-08)
   - 新增"生疏"分类按钮（5-39分）
   - 按优先级排序：新词 → 生疏 → 一般 → 熟练 → 精通 → 全部
   - 未选中状态使用彩色底色区分（灰/橙/黄/蓝/绿），更醒目

8. **WordList卡片网格重构** (2026-02-08)
   - 从纵向列表改为响应式网格布局（1/2/3列适配不同屏幕）
   - 移除展开式设计，改为点击卡片弹出模态框显示详情
   - 卡片显示：单词、熟练度标签、释义预览、测试统计、发音按钮
   - 模态框显示：完整释义、例句、详细测试统计（正确率、错误次数、平均用时）
   - 发音按钮阻止冒泡，避免误触发模态框
   - 优化视觉效果：hover状态、阴影、边框颜色随熟练度变化

9. **WordList UI细节优化** (2026-02-08)
   - 移除卡片上的音标显示（仅在模态框中显示）
   - 修复长单词截断问题：使用 `break-words` 替代 `truncate`，字体从 `text-2xl` 降至 `text-xl`
   - 优化释义文本层级：词性标签使用 `font-semibold text-xs`，释义使用 `text-sm`
   - 修复模态框头部布局：关闭按钮移至右上角外侧（`-top-2 -right-2`），播放按钮移至左侧，避免重叠

10. **导航系统简化** (2026-02-08)
    - 移除顶部导航栏的返回按钮
    - 移除各子页面的返回按钮（WordList、ActivitySelector、QuizModeSelector、ContextualMode）
    - 统一使用底部导航栏的"返回"按钮，减少UI冗余

11. **设置菜单清理** (2026-02-08)
    - 移除"清除本地缓存"功能（已废弃，云端数据无需本地缓存管理）
    - 保留：云端服务状态、关于

12. **WordList布局重组** (2026-02-08)
    - 交换位置：云端测试统计 → 搜索框 → 分类筛选 → 单词网格
    - 将单词总数移至顶部导航栏面包屑标题："单词总汇 (42)"
    - 优化用户浏览流程：先看统计数据，再搜索筛选，最后浏览单词

### Hooks
- `hooks/useMasteryRefresh.ts` - 全局熟练度刷新系统（事件订阅/发布）
- `hooks/useMasteryData.ts` - 熟练度数据获取hook（集成全局刷新）

## 技术栈

### 前端
- React 19 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- Lucide React (图标)

### 后端
- Cloudflare Workers (serverless)
- Cloudflare D1 (SQLite at edge)
- itty-router v4 (路由)

### AI集成
- OpenAI SDK (支持智谱 GLM)
- 预生成缓存系统

## 关键文件路径

### 工具函数
- `utils/quizStrategy.ts` - Quiz出题策略（RANDOM/BALANCED/FOCUS）
- `utils/settings.ts` - 应用设置管理（测验题目数量）
- `utils/highlight.tsx` - 单词高亮显示

### Hooks
- `hooks/useMasteryRefresh.ts` - 全局熟练度刷新系统（解决数据割裂）
- `hooks/useMasteryData.ts` - 熟练度数据获取hook（集成全局刷新）

### 组件
- `components/ContextualMode.tsx` - 情景阅读（两种模式：全文/逐句）
- `components/WordList.tsx` - 单词总汇（搜索、筛选、详情）
- `components/QuizMode.tsx` - 测验模式（4种模式 + 3种策略）
- `components/ActivitySelector.tsx` - 活动选择+单元设置
- `components/BookList.tsx` - 书籍/学期选择
- `components/BookListItem.tsx` - 书籍卡片
- `components/UnitListItem.tsx` - 单元列表项
- `components/QuizModeSelector.tsx` - Quiz模式选择
- `components/FlashcardMode.tsx` - ~~已废弃~~（被ContextualMode取代）

### 服务
- `services/api.ts` - Cloudflare Workers API客户端
- `services/aiService.ts` - AI词汇丰富服务

### 数据
- `public/data/cache/*.json` - 预生成的单词缓存（287个单词）
- `public/data/passages/*.json` - 7个单元的阅读passage
- `year7_vocabulary_with_cn.json` - 基础词汇数据

### 后端
- `api/src/index.ts` - Workers API入口
- `api/schema.sql` - D1数据库结构

## 已知问题和解决方案

### 熟练度数据割裂问题（已修复）
**症状**：
- WordList显示"精通"，但ActivitySelector显示"新词"
- Quiz完成后其他模块数据不更新
- 攻克模式选不到低熟练度单词
- 1次答对就显示"精通"，1次答错显示"新词"

**原因**：
1. 各组件独立管理熟练度数据，没有统一刷新机制
2. useMasteryData只依赖words.length，数据更新不触发重新获取
3. QuizMode完成答题后其他组件不知道数据已变化
4. **后端算法bug**："全对且快"特殊判断在答题次数限制之前执行，绕过了次数限制

**解决方案**：
1. 创建全局刷新系统 `hooks/useMasteryRefresh.ts`
   - 事件订阅/发布模式，组件订阅全局刷新事件
   - Quiz完成答题后触发全局刷新 `triggerMasteryRefresh()`
2. 更新useMasteryData集成全局刷新
   - 订阅全局刷新事件，自动重新获取数据
3. 后端算法优化：
   - 第1次答题最高55分（需要更多练习）
   - 第2次答题最高75分（学习中）
   - 第3次及以后无上限（可达100分）
   - **修复bug**：将答题次数限制移到"全对且快"特殊判断之前，避免绕过限制

### Arc浏览器音频播放问题
**症状**：点击发音按钮没有声音
**原因**：Web Speech API 在 Arc 中有时进入"坏状态"
**解决方案**：
1. 重启 Arc 浏览器
2. 代码已修复：移除 `cancel()` 调用，让浏览器自然处理队列
**影响组件**：WordList、QuizMode、ContextualMode

### macOS Downloads权限问题
```bash
xattr -cr node_modules
chmod +x node_modules/.bin/*
```

### Workers D1访问问题
- 确保 `router.handle(request, env)` 传递了env参数
- 使用 `npm run d1:schema` 初始化远程数据库（带--remote标志）

### JSON格式问题
- passage文件中的多行字符串必须使用 `\n` 转义符，不能有实际换行

## 开发笔记

### 情景阅读设计
- 句子级别拆分更适合语言学习
- 音频控制需要完整的播放/暂停/停止循环
- 组件卸载时必须停止所有音频（useEffect cleanup）

### API设计
- DELETE操作需要先查询再删除（D1不支持复杂的级联删除）
- 批量操作使用20个一批的分组（D1限制）

### 用户体验
- 重置操作需要二次确认
- Loading状态提供即时反馈
- 成功后自动关闭弹窗并刷新数据

## 部署信息

### 前端
- 开发服务器：`npm run dev` (port 3000)
- 生产构建：`npm run build`

### 后端API
- 部署命令：`cd api && npm run deploy`
- 当前URL：https://vocabmaster-api.jk-veda.workers.dev
- 数据库ID：f90bed8d-f21e-4d05-842a-1744d0ef4e09

## 未来改进
- [ ] 添加更多阅读passage
- [ ] 实现单词复习算法（基于遗忘曲线）
- [ ] 添加学习进度图表
- [ ] 支持多用户/班级管理
