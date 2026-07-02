export function parseKeywords(value = process.env.KEYWORDS || "") {
  return value
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

export function applyKeywordFilter(items, keywords = parseKeywords()) {
  if (keywords.length === 0) return items;

  return items.filter((item) => {
    const haystack = [
      item.source,
      item.title,
      item.link,
      item.contentSnippet,
      ...categoryTexts(item.categories)
    ]
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

export function uniqueById(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }

  return unique;
}

const highValueKeywords = [
  "openai",
  "chatgpt",
  "gpt",
  "claude",
  "anthropic",
  "gemini",
  "google",
  "deepseek",
  "qwen",
  "kimi",
  "cursor",
  "agent",
  "agents",
  "ai agent",
  "llm",
  "model",
  "人工智能",
  "大模型",
  "模型",
  "智能体",
  "多模态",
  "推理",
  "开源",
  "融资",
  "发布",
  "上线",
  "突破"
];

const lowValueKeywords = [
  "招聘",
  "课程",
  "广告",
  "优惠",
  "购买",
  "邀请码",
  "提醒"
];

export function scoreItem(item) {
  const text = [item.source, item.title, item.contentSnippet, ...categoryTexts(item.categories)].join(" ").toLowerCase();
  let score = 0;

  for (const keyword of highValueKeywords) {
    if (text.includes(keyword.toLowerCase())) score += 3;
  }

  for (const keyword of lowValueKeywords) {
    if (text.includes(keyword.toLowerCase())) score -= 4;
  }

  const hoursOld = (Date.now() - (Date.parse(item.pubDate || "") || Date.now())) / 36e5;
  if (hoursOld <= 3) score += 5;
  else if (hoursOld <= 12) score += 3;
  else if (hoursOld <= 24) score += 1;

  if (item.source.includes("精选")) score += 5;

  return score;
}

export function sortByRadarScore(items) {
  return [...items].sort((a, b) => {
    const scoreDiff = scoreItem(b) - scoreItem(a);
    if (scoreDiff !== 0) return scoreDiff;

    const left = Date.parse(a.pubDate || "") || 0;
    const right = Date.parse(b.pubDate || "") || 0;
    return right - left;
  });
}

export function detectTheme(item) {
  const categoriesText = categoryTexts(item.categories).join(" ");
  const text = `${item.title} ${item.summary || item.contentSnippet || ""} ${categoriesText}`.toLowerCase();

  if (/融资|估值|funding|invest|capital/i.test(text)) return "融资";
  if (/发布|launch|released|update|version|changelog/i.test(text)) return "发布";
  if (/api|sdk|model|agent|llm|openai|claude|gemini|deepseek|qwen|cursor/i.test(text)) {
    return "模型/Agent";
  }
  if (/status|incident|outage|down|error|限流|故障|宕机/i.test(text)) return "事故";
  if (/价格|billing|quota|rate limit|subscription|订阅/i.test(text)) return "价格/额度";
  return "综合";
}

export function groupByTheme(items) {
  const groups = new Map();

  for (const item of items) {
    const theme = detectTheme(item);
    if (!groups.has(theme)) groups.set(theme, []);
    groups.get(theme).push(item);
  }

  return [...groups.entries()].map(([theme, groupItems]) => ({
    theme,
    items: groupItems
      .sort((a, b) => scoreItem(b) - scoreItem(a))
      .filter((item) => cleanHeadline(item.headline || item.title).length >= 6)
  }));
}

function cleanHeadline(value) {
  return String(value || "")
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "")
    .trim();
}

function categoryTexts(categories = []) {
  return categories
    .map((category) => {
      if (category == null) return "";
      if (typeof category !== "object") return String(category);
      return String(category._ || category.term || category.name || category.label || "");
    })
    .filter(Boolean);
}
