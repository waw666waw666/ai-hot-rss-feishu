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
      item.contentSnippet
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
