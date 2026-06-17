import axios from "axios";

function escapeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function summarizeItem(item) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const agnesKey = process.env.AGNES_API_KEY;
  const apiKey = openaiKey || agnesKey;

  if (!apiKey) return "";

  const baseURL = openaiKey
    ? "https://api.openai.com/v1"
    : process.env.AGNES_BASE_URL;

  if (!baseURL) {
    console.warn("AGNES_API_KEY is set, but AGNES_BASE_URL is missing. Skip AI summary.");
    return "";
  }

  try {
    const response = await axios.post(
      `${baseURL.replace(/\/$/, "")}/chat/completions`,
      {
        model: process.env.AGNES_MODEL || process.env.OPENAI_MODEL || process.env.AI_SUMMARY_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "你是 AI 情报编辑。把 RSS 条目压缩成一句中文摘要，不超过 45 个字。"
          },
          {
            role: "user",
            content: `标题：${item.title}\n来源：${item.source}\n正文：${item.contentSnippet || ""}`
          }
        ],
        temperature: 0.2,
        max_tokens: 80
      },
      {
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        timeout: 20000
      }
    );

    return escapeText(response.data?.choices?.[0]?.message?.content);
  } catch (error) {
    console.warn("AI summary failed:", error.response?.data || error.message);
    return "";
  }
}

export function buildPostMessage(items) {
  const content = [];

  for (const item of items) {
    content.push([
      { tag: "text", text: `来源：${escapeText(item.source)}\n` },
      { tag: "text", text: `标题：${escapeText(item.title)}\n` },
      ...(item.summary ? [{ tag: "text", text: `摘要：${escapeText(item.summary)}\n` }] : []),
      { tag: "a", text: "原文链接", href: item.link }
    ]);
  }

  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: "🔥 AI HOT 更新",
          content
        }
      }
    }
  };
}

export async function sendToFeishu(items, webhook = process.env.FEISHU_WEBHOOK) {
  if (!webhook) {
    throw new Error("Missing FEISHU_WEBHOOK");
  }

  if (items.length === 0) return;

  await axios.post(webhook, buildPostMessage(items), {
    headers: {
      "content-type": "application/json"
    },
    timeout: 15000
  });
}
