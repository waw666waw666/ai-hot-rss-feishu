import axios from "axios";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

export function fallbackSummary(item) {
  const snippet = cleanText(item.contentSnippet);
  if (snippet) return truncate(snippet, 90);
  return truncate(`${item.title}。关注该事件的产品进展、行业影响和后续动态。`, 90);
}

export function fallbackHeadline(item) {
  return truncate(item.summary || item.title || "AI HOT 重要更新", 28);
}

export async function summarizeItem(item) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const agnesKey = process.env.AGNES_API_KEY;
  const apiKey = openaiKey || agnesKey;

  if (!apiKey) return fallbackSummary(item);

  const baseURL = openaiKey
    ? "https://api.openai.com/v1"
    : process.env.AGNES_BASE_URL;

  if (!baseURL) {
    console.warn("AGNES_API_KEY is set, but AGNES_BASE_URL is missing. Use fallback summary.");
    return fallbackSummary(item);
  }

  try {
    const response = await axios.post(
      `${baseURL.replace(/\/$/, "")}/chat/completions`,
      {
        model: process.env.AGNES_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: [
              "你是资深 AI 情报编辑和翻译。",
              "任务：把 RSS 条目改写成一句中文情报摘要。",
              "如果原文是英文，先翻译再总结。",
              "要求：不超过 60 个汉字；直接说事实和影响；不要复述标题；不要输出项目符号；不要寒暄；不要提来源。"
            ].join("")
          },
          {
            role: "user",
            content: [
              `来源：${item.source}`,
              `标题：${item.title}`,
              `原文摘要：${item.contentSnippet || ""}`,
              "请输出一条可直接发给飞书群的中文摘要。"
            ].join("\n")
          }
        ],
        temperature: 0.2,
        max_tokens: 120
      },
      {
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        timeout: Number(process.env.AI_SUMMARY_TIMEOUT_MS || 45000)
      }
    );

    return truncate(response.data?.choices?.[0]?.message?.content || fallbackSummary(item), 90);
  } catch (error) {
    console.warn("AI summary failed, use fallback:", error.response?.data || error.message);
    return fallbackSummary(item);
  }
}

export async function generateHeadline(item) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const agnesKey = process.env.AGNES_API_KEY;
  const apiKey = openaiKey || agnesKey;

  if (!apiKey) return fallbackHeadline(item);

  const baseURL = openaiKey
    ? "https://api.openai.com/v1"
    : process.env.AGNES_BASE_URL;

  if (!baseURL) return fallbackHeadline(item);

  try {
    const response = await axios.post(
      `${baseURL.replace(/\/$/, "")}/chat/completions`,
      {
        model: process.env.AGNES_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "你是 AI 情报标题编辑。生成一个中文短标题，18 个汉字以内，突出事件主体和影响，不要标点，不要表情，不要提来源。"
          },
          {
            role: "user",
            content: `原标题：${item.title}\n摘要：${item.summary || item.contentSnippet || ""}`
          }
        ],
        temperature: 0.2,
        max_tokens: 60
      },
      {
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        timeout: Number(process.env.AI_SUMMARY_TIMEOUT_MS || 45000)
      }
    );

    return truncate(response.data?.choices?.[0]?.message?.content || fallbackHeadline(item), 28);
  } catch (error) {
    console.warn("AI headline failed, use fallback:", error.response?.data || error.message);
    return fallbackHeadline(item);
  }
}

function importanceLabel(item) {
  const text = `${item.title} ${item.summary || ""}`;
  if (/融资|估值|发布|上线|突破|OpenAI|Anthropic|DeepSeek|Claude|GPT|Gemini|Cursor/i.test(text)) {
    return "重要";
  }
  return "关注";
}

export function buildPostMessage(item) {
  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: `🔥 ${cleanText(item.headline || fallbackHeadline(item))}`,
          content: [
            [
              { tag: "text", text: `级别：${importanceLabel(item)}\n` },
              { tag: "text", text: `${cleanText(item.summary || fallbackSummary(item))}\n` },
              { tag: "a", text: "阅读全文", href: item.link }
            ]
          ]
        }
      }
    }
  };
}

export async function sendToFeishu(item, webhook = process.env.FEISHU_WEBHOOK) {
  if (!webhook) {
    throw new Error("Missing FEISHU_WEBHOOK");
  }

  await axios.post(webhook, buildPostMessage(item), {
    headers: {
      "content-type": "application/json"
    },
    timeout: 15000
  });
}
