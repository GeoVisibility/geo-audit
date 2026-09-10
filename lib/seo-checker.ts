import { URL } from "url";
import { crawlSite, detectSchemaType, fetchText, type CrawlData } from "./crawler";

export interface SeoIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
}

/**
 * Klasik arama motoru SEO'suna özgü sinyaller.
 * Sitemap/canonical/schema/kelime sayısı/başlık yapısı/dış link/tarih/alt-text gibi
 * GEO ile çakışan sinyaller kasıtlı olarak burada YOK — bunlar GEO Analiz'de (lib/geo-checker.ts)
 * tek sahiplik ilkesiyle gösteriliyor. Ortak veri lib/crawler.ts'den geliyor.
 */
export interface SeoResult {
  // Crawlability
  robotsTxtFound: boolean;
  robotsBlocked: boolean;
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

  // SEO'ya özgü schema türleri (GEO Organization/Article/FAQ'ı zaten kapsıyor)
  hasBreadcrumbSchema: boolean;
  hasHowToSchema: boolean;
  hasProductSchema: boolean;

  // Site mimarisi
  internalLinks: number;

  // Technical
  hasIndexNow: boolean;

  // Score & Issues
  score: number;
  issues: SeoIssue[];
}

async function checkIndexNow(origin: string): Promise<boolean> {
  const paths = ["/indexnow", "/indexnow.txt"];
  for (const p of paths) {
    const res = await fetchText(`${origin}${p}`, 4000);
    if (res !== null) return true;
  }
  return false;
}

const EMPTY_RESULT: Omit<SeoResult, "issues"> = {
  robotsTxtFound: false, robotsBlocked: false, hasHreflang: false,
  noindex: false, hasNosnippet: false, maxSnippet: null,
  title: null, titleLength: null, description: null, descLength: null,
  hasOgTitle: false, hasOgDesc: false, hasOgImage: false,
  hasBreadcrumbSchema: false, hasHowToSchema: false, hasProductSchema: false,
  internalLinks: 0, hasIndexNow: false,
  score: 0,
};

export async function checkSeo(siteUrl: string, crawl?: CrawlData): Promise<SeoResult> {
  const base = new URL(siteUrl);
  const origin = base.origin;
  const issues: SeoIssue[] = [];

  const data = crawl ?? (await crawlSite(siteUrl));

  if (!data.html || !data.$) {
    return { ...EMPTY_RESULT, issues: [{ type: "fetch", message: "Sayfa yüklenemedi", severity: "error" }] };
  }

  const $ = data.$;
  const indexNow = await checkIndexNow(origin);

  // --- Robots ---
  const robotsTxtFound = data.robotsText !== null;
  const robotsBlocked = data.robotsText
    ? /User-agent:\s*\*/m.test(data.robotsText) && /Disallow:\s*\/\s*$/m.test(data.robotsText)
    : false;

  // --- Indexability ---
  const metaRobots = $('meta[name="robots"]').attr("content") ?? "";
  const noindex = metaRobots.toLowerCase().includes("noindex");
  const hasNosnippet = metaRobots.toLowerCase().includes("nosnippet");
  const maxSnippetMatch = metaRobots.match(/max-snippet:\s*(-?\d+)/i);
  const maxSnippet = maxSnippetMatch ? parseInt(maxSnippetMatch[1]) : null;

  const hasHreflang = $('link[rel="alternate"][hreflang]').length > 0;

  // --- Metadata ---
  const title = $("title").first().text().trim() || null;
  const titleLength = title ? title.length : null;
  const description = $('meta[name="description"]').attr("content")?.trim() ?? null;
  const descLength = description ? description.length : null;
  const hasOgTitle = !!$('meta[property="og:title"]').attr("content");
  const hasOgDesc = !!$('meta[property="og:description"]').attr("content");
  const hasOgImage = !!$('meta[property="og:image"]').attr("content");

  // --- SEO'ya özgü schema türleri ---
  const hasBreadcrumbSchema = detectSchemaType(data.schemaScripts, "BreadcrumbList");
  const hasHowToSchema = detectSchemaType(data.schemaScripts, "HowTo");
  const hasProductSchema = detectSchemaType(data.schemaScripts, "Product");

  // --- İç bağlantılar ---
  let internalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    try {
      if (new URL(href, siteUrl).origin === origin) internalLinks++;
    } catch {
      internalLinks++;
    }
  });

  const hasIndexNow = indexNow;

  // --- Issues ---
  if (!robotsTxtFound) issues.push({ type: "robots", message: "robots.txt bulunamadı", severity: "warning" });
  if (robotsBlocked) issues.push({ type: "robots", message: "robots.txt tüm botları engelliyor", severity: "error" });
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
  if (!hasBreadcrumbSchema) issues.push({ type: "breadcrumb", message: "BreadcrumbList schema eksik", severity: "info" });
  if (internalLinks < 3) issues.push({ type: "links", message: "Yetersiz iç bağlantı (en az 3 önerilir)", severity: "info" });
  if (!hasIndexNow) issues.push({ type: "indexnow", message: "IndexNow desteği yok — içerik değişikliklerinde anlık bildirim gönderilemiyor", severity: "info" });

  // --- Score ---
  const deductions: Record<string, number> = {
    fetch: 100, robots: 5, index: 20, snippet: 10,
    title: 15, desc: 10, og: 5, breadcrumb: 3, links: 5, indexnow: 0,
  };
  let score = 100;
  for (const issue of issues) score -= deductions[issue.type] ?? 0;
  score = Math.max(0, score);

  return {
    robotsTxtFound, robotsBlocked, hasHreflang,
    noindex, hasNosnippet, maxSnippet,
    title, titleLength, description, descLength,
    hasOgTitle, hasOgDesc, hasOgImage,
    hasBreadcrumbSchema, hasHowToSchema, hasProductSchema,
    internalLinks, hasIndexNow,
    score, issues,
  };
}
