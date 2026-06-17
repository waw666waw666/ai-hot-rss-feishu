# AI HOT RSS -> Feishu

极简 AI 情报流机器人：

RSS feeds -> GitHub Actions -> 去重/过滤/可选 AI 摘要 -> 飞书群机器人。

## Feeds

- `https://aihot.virxact.com/feed.xml`

默认只订阅 `AI HOT - 精选`，避免 all/daily 源噪声过多。

## Setup

1. 创建 GitHub 仓库并上传本项目。
2. 在仓库 `Settings -> Secrets and variables -> Actions` 添加：
   - `FEISHU_WEBHOOK`：飞书机器人 Webhook，必填
   - `AGNES_API_KEY`：可选，用于一句话摘要
   - `AGNES_BASE_URL`：使用 `AGNES_API_KEY` 时必填，需兼容 OpenAI `/chat/completions`
   - `AGNES_MODEL`：可选，摘要模型名
   - `OPENAI_API_KEY`：可选，用于一句话摘要
   - `OPENAI_MODEL`：可选，OpenAI 摘要模型名
3. 可选添加仓库变量：
   - `KEYWORDS`：逗号分隔关键词，例如 `OpenAI,Claude,Agent`

## Run Locally

```bash
npm install
FEISHU_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" npm start
```

## GitHub Actions

`.github/workflows/rss.yml` 支持手动触发，也可以被外部定时器调用 GitHub Actions dispatch API 触发。

去重缓存写入 `data/seen.json`，workflow 会自动提交缓存变化。
