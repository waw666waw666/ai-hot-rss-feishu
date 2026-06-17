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
              "你是资深 AI 情报编辑。",
              "任务：把 RSS 条目改写成一句中文情报摘要。",
              "要求：不超过 60 个汉字；直接说事实和影响；不要复述标题；不要输出项目符号；不要寒暄。"
            ].join("")
          },
          {
            role: "user",
            content: [
              `来源：${item.source}`,
              `标题：${item.title}`,
              `原文摘要：${item.contentSnippet || ""}`
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

export function buildPostMessage(item) {
  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: "🔥 AI HOT 更新",
          content: [
            [
              { tag: "text", text: `来源：${cleanText(item.source)}\n` },
              { tag: "text", text: `标题：${cleanText(item.title)}\n` },
              { tag: "text", text: `摘要：${cleanText(item.summary || fallbackSummary(item))}\n` },
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
