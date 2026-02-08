# VocabMaster - 项目记忆文档

## 项目概述
VocabMaster 是一个为初一学生设计的英语词汇学习应用，使用 React 19 + TypeScript + Vite 构建。

## 当前状态 (2026-02-08)

### 核心功能
1. **单词学习系统**：7个单元，287个单词
2. **情景阅读模块**：替代传统卡片学习，通过阅读文章学习词汇
3. **测验系统**：4种测验模式，支持计时和熟练度追踪
4. **云端同步**：Cloudflare Workers + D1 数据库

### 最近完成的功能
1. **ContextualMode 重构** (2026-02-08)
   - 两种阅读模式：全文阅读 / 逐句拆解
   - 完整音频控制系统
   - 7个单元的阅读passage JSON文件

2. **单元设置重置功能** (2026-02-08)
   - DELETE /api/units/:unitId API
   - 前端重置UI和流程

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

### 组件
- `components/ContextualMode.tsx` - 情景阅读（替代FlashcardMode）
- `components/WordList.tsx` - 单词总汇
- `components/QuizMode.tsx` - 测验模式
- `components/ActivitySelector.tsx` - 活动选择+单元设置

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
