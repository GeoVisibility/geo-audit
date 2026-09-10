import * as cheerio from "cheerio";
import { URL } from "url";

export interface CrawlData {
  origin: string;
  html: string | null;
  $: cheerio.CheerioAPI | null;
  robotsText: string | null;
  llmsText: string | null;
  aiTxtText: string | null;
  schemaScripts: string[];
  sitemapFound: boolean;
  sitemapUrlCount: number | null;
}

export async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "WOMP-Checker/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function detectSchemaType(scripts: string[], type: string | string[]): boolean {
  const types = Array.isArray(type) ? type : [type];
  return scripts.some((s) => types.some((t) => new RegExp(`"@type"\\s*:\\s*"${t}"`, "i").test(s)));
}

export function isBotBlocked(robotsText: string, botName: string): boolean {
  const lines = robotsText.split("\n").map((l) => l.trim().toLowerCase());
  let inBlock = false;
  for (const line of lines) {
    if (line.startsWith("user-agent:")) {
      inBlock = line.includes(botName.toLowerCase());
    }
    if (inBlock && line.startsWith("disallow:")) {
      const path = line.replace("disallow:", "").trim();
      if (path === "/") return true;
    }
  }
  return false;
}

/**
 * Tek seferlik crawl: HTML + robots.txt + sitemap.xml + llms.txt + ai.txt.
 * SEO ve GEO checker'ları aynı siteye ayrı ayrı istek atmak yerine bu veriyi paylaşır.
 */
export async function crawlSite(siteUrl: string): Promise<CrawlData> {
  const origin = new URL(siteUrl).origin;

  const [html, robotsText, sitemapText, llmsText, aiTxtText] = await Promise.all([
    fetchText(siteUrl),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/ai.txt`),
  ]);

  const $ = html ? cheerio.load(html) : null;
  const schemaScripts = $
    ? $('script[type="application/ld+json"]').toArray().map((el) => $(el).html() ?? "")
    : [];

  let sitemapFound = sitemapText !== null;
  let sitemapUrlCount: number | null = null;
  if (sitemapText) {
    sitemapUrlCount = (sitemapText.match(/<loc>/g) ?? []).length;
  } else if (robotsText) {
    const match = robotsText.match(/Sitemap:\s*(\S+)/i);
    if (match) {
      const alt = await fetchText(match[1]);
      if (alt) {
        sitemapFound = true;
        sitemapUrlCount = (alt.match(/<loc>/g) ?? []).length;
      }
    }
  }

  return { origin, html, $, robotsText, llmsText, aiTxtText, schemaScripts, sitemapFound, sitemapUrlCount };
}
