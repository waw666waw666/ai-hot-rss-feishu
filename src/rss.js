import Parser from "rss-parser";

export const FEED_URLS = [
  "https://aihot.virxact.com/feed.xml",
  "https://aihot.virxact.com/feed/all.xml",
  "https://aihot.virxact.com/feed/daily.xml"
];

const parser = new Parser({
  timeout: 15000,
  headers: {
    "user-agent": "ai-hot-rss-feishu/1.0"
  }
});

export async function fetchFeed(url) {
  const feed = await parser.parseURL(url);
  const source = feed.title || url;

  return (feed.items || []).map((item) => ({
    id: String(item.guid || item.link || item.title || "").trim(),
    source,
    title: item.title || "Untitled",
    link: item.link || "",
    pubDate: item.isoDate || item.pubDate || "",
    contentSnippet: item.contentSnippet || item.summary || item.content || ""
  }));
}

export async function fetchAllFeeds(feedUrls = FEED_URLS) {
  const results = await Promise.allSettled(feedUrls.map(fetchFeed));
  const items = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.error("RSS feed failed:", result.reason?.message || result.reason);
    }
  }

  return items.filter((item) => item.id);
}
