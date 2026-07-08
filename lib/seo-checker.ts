import * as cheerio from "cheerio";
import { URL } from "url";

export interface SeoIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface SeoResult {
  // Crawlability
  robotsTxtFound: boolean;
  robotsBlocked: boolean;
  sitemapFound: boolean;
  sitemapUrlCount: number | null;
  canonicalUrl: string | null;
  hasHreflang: boolean;

  // Indexability
  noindex: boolean;
  hasNosnippet: boolean;
  maxSnippet: number | null;

  // Metadata
  title: string | null;
  titleLength: number | null;
  description: string | null;
  descLength: number | null;
  hasOgTitle: boolean;
  hasOgDesc: boolean;
  hasOgImage: boolean;

  // Schema
  hasSchema: boolean;
  hasArticleSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasHowToSchema: boolean;
  hasProductSchema: boolean;
  hasFaqSchema: boolean;
  hasOrgSchema: boolean;

  // Content
  wordCount: number;
  wordCountOk: boolean;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  headingHierarchyOk: boolean;
  internalLinks: number;
  externalLinks: number;
  imgWithoutAlt: number;
  hasDateSignal: boolean;

  // Technical
  hasIndexNow: boolean;

  // Score & Issues
  score: number;
  issues: SeoIssue[];
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "WOMP-SEO-Checker/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function checkIndexNow(origin: string): Promise<boolean> {
  // Check common IndexNow key file patterns
  const paths = ["/indexnow", "/indexnow.txt"];
  for (const p of paths) {
    const res = await fetchText(`${origin}${p}`, 4000);
    if (res !== null) return true;
  }
  return false;
}

function detectSchemaType(scripts: string[], type: string | string[]): boolean {
  const types = Array.isArray(type) ? type : [type];
  return scripts.some(s => types.some(t => new RegExp(`"@type"\\s*:\\s*"${t}"`, "i").test(s)));
}

function checkHeadingHierarchy($: cheerio.CheerioAPI): boolean {
  // Collect heading levels in order, check for skips (e.g. H1 → H3 without H2)
  const levels: number[] = [];
  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    const tag = (el as cheerio.Element & { tagName: string }).tagName;
    levels.push(parseInt(tag[1]));
  });
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) return false;
  }
  return true;
}

export async function checkSeo(siteUrl: string): Promise<SeoResult> {
  const base = new URL(siteUrl);
  const origin = base.origin;
  const issues: SeoIssue[] = [];

  const html = await fetchText(siteUrl);
  if (!html) {
    return {
      robotsTxtFound: false, robotsBlocked: false,
      sitemapFound: false, sitemapUrlCount: null,
      canonicalUrl: null, hasHreflang: false,
      noindex: false, hasNosnippet: false, maxSnippet: null,
      title: null, titleLength: null, description: null, descLength: null,
      hasOgTitle: false, hasOgDesc: false, hasOgImage: false,
      hasSchema: false, hasArticleSchema: false, hasBreadcrumbSchema: false,
      hasHowToSchema: false, hasProductSchema: false, hasFaqSchema: false, hasOrgSchema: false,
      wordCount: 0, wordCountOk: false,
      h1Count: 0, h2Count: 0, h3Count: 0, headingHierarchyOk: false,
      internalLinks: 0, externalLinks: 0, imgWithoutAlt: 0,
      hasDateSignal: false, hasIndexNow: false,
      score: 0,
      issues: [{ type: "fetch", message: "Sayfa yüklenemedi", severity: "error" }],
    };
  }

  const $ = cheerio.load(html);

  const [robotsText, sitemapText, indexNow] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
    checkIndexNow(origin),
  ]);

  // --- Robots ---
  const robotsTxtFound = robotsText !== null;
  const robotsBlocked = robotsText
    ? /User-agent:\s*\*/m.test(robotsText) && /Disallow:\s*\/\s*$/m.test(robotsText)
    : false;

  // --- Sitemap ---
  let sitemapFound = sitemapText !== null;
  let sitemapUrlCount: number | null = null;
  if (sitemapText) {
    sitemapUrlCount = (sitemapText.match(/<loc>/g) ?? []).length;
  } else if (robotsText) {
    const match = robotsText.match(/Sitemap:\s*(\S+)/i);
    if (match) {
      const alt = await fetchText(match[1]);
      if (alt) { sitemapFound = true; sitemapUrlCount = (alt.match(/<loc>/g) ?? []).length; }
    }
  }

  // --- Indexability ---
  const metaRobots = $('meta[name="robots"]').attr("content") ?? "";
  const noindex = metaRobots.toLowerCase().includes("noindex");
  const hasNosnippet = metaRobots.toLowerCase().includes("nosnippet");
  const maxSnippetMatch = metaRobots.match(/max-snippet:\s*(-?\d+)/i);
  const maxSnippet = maxSnippetMatch ? parseInt(maxSnippetMatch[1]) : null;

  // --- Canonical ---
  const canonicalUrl = $('link[rel="canonical"]').attr("href") ?? null;
  const hasHreflang = $('link[rel="alternate"][hreflang]').length > 0;

  // --- Metadata ---
  const title = $("title").first().text().trim() || null;
  const titleLength = title ? title.length : null;
  const description = $('meta[name="description"]').attr("content")?.trim() ?? null;
  const descLength = description ? description.length : null;
  const hasOgTitle = !!$('meta[property="og:title"]').attr("content");
  const hasOgDesc = !!$('meta[property="og:description"]').attr("content");
  const hasOgImage = !!$('meta[property="og:image"]').attr("content");

  // --- Schema detection ---
  const schemaScripts = $('script[type="application/ld+json"]').toArray()
    .map(el => $(el).html() ?? "");
  const hasSchema = schemaScripts.length > 0 || $("[itemtype]").length > 0;
  const hasArticleSchema = detectSchemaType(schemaScripts, ["Article", "NewsArticle", "BlogPosting"]);
  const hasBreadcrumbSchema = detectSchemaType(schemaScripts, "BreadcrumbList");
  const hasHowToSchema = detectSchemaType(schemaScripts, "HowTo");
  const hasProductSchema = detectSchemaType(schemaScripts, "Product");
  const hasFaqSchema = detectSchemaType(schemaScripts, "FAQPage");
  const hasOrgSchema = detectSchemaType(schemaScripts, ["Organization", "LocalBusiness", "Corporation"]);

  // --- Content ---
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(" ").filter(Boolean).length;
  const wordCountOk = wordCount >= 500 && wordCount <= 2000;

  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const headingHierarchyOk = checkHeadingHierarchy($);

  let internalLinks = 0, externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    try {
      if (new URL(href, siteUrl).origin === origin) internalLinks++;
      else externalLinks++;
    } catch { internalLinks++; }
  });

  let imgWithoutAlt = 0;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined || alt === "") imgWithoutAlt++;
  });

  const hasDateSignal =
    $("time, [itemprop='datePublished'], [itemprop='dateModified'], meta[property='article:published_time']").length > 0;

  const hasIndexNow = indexNow;

  // --- Issues ---
  if (!robotsTxtFound) issues.push({ type: "robots", message: "robots.txt bulunamadı", severity: "warning" });
  if (robotsBlocked) issues.push({ type: "robots", message: "robots.txt tüm botları engelliyor", severity: "error" });
  if (!sitemapFound) issues.push({ type: "sitemap", message: "sitemap.xml bulunamadı", severity: "warning" });
  if (noindex) issues.push({ type: "index", message: "Sayfa noindex ile işaretlenmiş", severity: "error" });
  if (hasNosnippet) issues.push({ type: "snippet", message: "nosnippet etkin — AI snippet üretemiyor", severity: "error" });
  if (maxSnippet !== null && maxSnippet === 0) issues.push({ type: "snippet", message: "max-snippet:0 — snippet tamamen kapalı", severity: "error" });
  if (!title) issues.push({ type: "title", message: "Title tag eksik", severity: "error" });
  else if (titleLength! < 30) issues.push({ type: "title", message: `Title çok kısa (${titleLength} kr, önerilen: 50–60)`, severity: "warning" });
  else if (titleLength! > 65) issues.push({ type: "title", message: `Title çok uzun (${titleLength} kr, önerilen: 50–60)`, severity: "warning" });
  if (!description) issues.push({ type: "desc", message: "Meta description eksik", severity: "error" });
  else if (descLength! < 80) issues.push({ type: "desc", message: `Description çok kısa (${descLength} kr)`, severity: "warning" });
  else if (descLength! > 165) issues.push({ type: "desc", message: `Description çok uzun (${descLength} kr)`, severity: "warning" });
  if (!hasOgTitle || !hasOgDesc || !hasOgImage) issues.push({ type: "og", message: "Eksik Open Graph tag'ları", severity: "warning" });
  if (!hasSchema) issues.push({ type: "schema", message: "Hiç structured data yok", severity: "error" });
  else {
    if (!hasOrgSchema) issues.push({ type: "schema", message: "Organization schema eksik", severity: "error" });
    const looksLikeArticle = hasArticleSchema || /\/(blog|makale|article|post|news|yazi)\//i.test(siteUrl);
    if (looksLikeArticle && !hasArticleSchema) issues.push({ type: "schema", message: "Article/BlogPosting schema eksik", severity: "warning" });
    if (!hasBreadcrumbSchema) issues.push({ type: "schema", message: "BreadcrumbList schema eksik", severity: "info" });
    if (!hasFaqSchema) issues.push({ type: "schema", message: "FAQPage schema eksik", severity: "warning" });
  }
  if (!canonicalUrl) issues.push({ type: "canonical", message: "Canonical tag eksik", severity: "warning" });
  if (h1Count === 0) issues.push({ type: "h1", message: "H1 başlık yok", severity: "error" });
  else if (h1Count > 1) issues.push({ type: "h1", message: `Birden fazla H1 var (${h1Count} adet)`, severity: "warning" });
  if (!headingHierarchyOk) issues.push({ type: "heading", message: "Başlık hiyerarşisinde atlama var (örn. H1→H3)", severity: "warning" });
  if (wordCount < 500) issues.push({ type: "content", message: `İçerik çok kısa (${wordCount} kelime, önerilen: 500–2000)`, severity: "warning" });
  else if (wordCount > 2000) issues.push({ type: "content", message: `İçerik çok uzun (${wordCount} kelime, önerilen: 500–2000)`, severity: "info" });
  if (imgWithoutAlt > 0) issues.push({ type: "alt", message: `${imgWithoutAlt} görselde alt text eksik`, severity: "warning" });
  if (internalLinks < 3) issues.push({ type: "links", message: "Yetersiz iç bağlantı (en az 3 önerilir)", severity: "info" });
  if (!hasDateSignal) issues.push({ type: "date", message: "Tarih/güncelleme sinyali yok — AI tazeliği ölçemiyor", severity: "warning" });
  if (!hasIndexNow) issues.push({ type: "indexnow", message: "IndexNow desteği yok — içerik değişikliklerinde anlık bildirim gönderilemiyor", severity: "info" });

  // --- Score ---
  const deductions: Record<string, number> = {
    fetch: 100, robots: 5, sitemap: 10, index: 20, snippet: 10,
    title: 15, desc: 10, og: 5,
    schema: 15, canonical: 5,
    h1: 10, heading: 5, content: 5, alt: 5, links: 5, date: 5, indexnow: 0,
  };
  let score = 100;
  for (const issue of issues) score -= deductions[issue.type] ?? 0;
  score = Math.max(0, score);

  return {
    robotsTxtFound, robotsBlocked,
    sitemapFound, sitemapUrlCount,
    canonicalUrl, hasHreflang,
    noindex, hasNosnippet, maxSnippet,
    title, titleLength, description, descLength,
    hasOgTitle, hasOgDesc, hasOgImage,
    hasSchema, hasArticleSchema, hasBreadcrumbSchema, hasHowToSchema,
    hasProductSchema, hasFaqSchema, hasOrgSchema,
    wordCount, wordCountOk,
    h1Count, h2Count, h3Count, headingHierarchyOk,
    internalLinks, externalLinks, imgWithoutAlt,
    hasDateSignal, hasIndexNow,
    score, issues,
  };
}
