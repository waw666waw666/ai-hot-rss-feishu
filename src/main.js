import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fetchAllFeeds } from "./rss.js";
import { applyKeywordFilter, groupByTheme, sortByRadarScore, uniqueById } from "./filter.js";
import { generateHeadline, sendThemeDigestToFeishu, summarizeItem } from "./feishu.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seenPath = resolve(__dirname, "../data/seen.json");
const maxItemsPerRun = Number(process.env.MAX_ITEMS_PER_RUN || 5);

async function loadSeen() {
  try {
    const content = await readFile(seenPath, "utf8");
    const parsed = JSON.parse(content);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function saveSeen(seen) {
  const values = [...seen].slice(-5000);
  await writeFile(seenPath, `${JSON.stringify(values, null, 2)}\n`, "utf8");
}

export async function main() {
  const seen = await loadSeen();
  const allItems = uniqueById(await fetchAllFeeds());
  const filteredItems = applyKeywordFilter(allItems);
  const newItems = sortByRadarScore(filteredItems)
    .filter((item) => !seen.has(item.id))
    .slice(0, maxItemsPerRun);

  if (newItems.length === 0) {
    console.log("No new RSS items.");
    return;
  }

  const enriched = [];
  for (const item of newItems) {
    const summary = await summarizeItem(item);
    enriched.push({
      ...item,
      summary,
      headline: await generateHeadline({ ...item, summary })
    });
  }

  const groups = groupByTheme(enriched);
  let pushedCount = 0;

  for (const group of groups) {
    const topItems = group.items.slice(0, 3);
    await sendThemeDigestToFeishu(group.theme, topItems);
    for (const item of topItems) {
      seen.add(item.id);
      pushedCount += 1;
    }
  }

  await saveSeen(seen);

  console.log(`Pushed ${pushedCount} RSS item(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
