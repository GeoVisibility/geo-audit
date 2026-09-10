import * as cheerio from "cheerio";
import { URL } from "url";
import { crawlSite, detectSchemaType, isBotBlocked, type CrawlData } from "./crawler";

export interface GeoFinding {
  category: "discoverability" | "answerability" | "citation" | "entity" | "readability";
  message: string;
  severity: "good" | "warning" | "error";
}

/**
 * GEO, SEO ile çakışan tüm sinyallerin (sitemap, canonical, structured data,
 * Organization/Article/FAQ schema, kelime sayısı, başlık yapısı, dış link,
 * tarih sinyali, alt text) TEK SAHİBİDİR — bkz. lib/seo-checker.ts üstündeki not.
 */
export interface GeoResult {
  // Discoverability
  llmsTxtFound: boolean;
  aiTxtFound: boolean;
  gptBotAllowed: boolean;
  claudeBotAllowed: boolean;
  perplexityAllowed: boolean;
  googleExtAllowed: boolean;
  sitemapFound: boolean;
  sitemapUrlCount: number | null;
  hasStructuredData: boolean;
  hasCanonical: boolean;
  discoverScore: number;

  // Answerability
  hasFaq: boolean;
  wordCount: number;
  wordCountOk: boolean;
  avgParaWords: number;
  hasLists: boolean;
  headingCount: number;
  answerScore: number;

  // Citation Readiness
  hasAuthor: boolean;
  hasDateInfo: boolean;
  hasExtLinks: boolean;
  isHttps: boolean;
  hasOrgSchema: boolean;
  hasArticleSchema: boolean;
  hasTrustLinks: boolean;
  citationScore: number;

  // Entity Coverage
  hasOrgName: boolean;
  hasProductMention: boolean;
  hasLocation: boolean;
  hasContactInfo: boolean;
  entityScore: number;

  // AI Readability
  hasSemanticHtml: boolean;
  jsIndependent: boolean;
  hasTables: boolean;
  hasListsAi: boolean;
  hasAltTexts: boolean;
  imgWithoutAltCount: number;
  paraLengthOk: boolean;
  headingStructOk: boolean;
  readabilityScore: number;

  totalScore: number;
  findings: GeoFinding[];
}

function score(checks: boolean[], weights: number[]): number {
  let total = 0, max = 0;
  checks.forEach((c, i) => { max += weights[i]; if (c) total += weights[i]; });
  return Math.round((total / max) * 100);
}

function checkJsIndependent($: cheerio.CheerioAPI): boolean {
  const clone = $.root().clone();
  clone.find("script, style, noscript").remove();
  const staticText = clone.find("body").text().replace(/\s+/g, " ").trim();
  return staticText.split(" ").filter(Boolean).length > 100;
}

export async function checkGeo(siteUrl: string, crawl?: CrawlData): Promise<GeoResult> {
  const base = new URL(siteUrl);
  const origin = base.origin;
  const findings: GeoFinding[] = [];

  const data = crawl ?? (await crawlSite(siteUrl));
  const { robotsText, llmsText, aiTxtText, schemaScripts, sitemapFound, sitemapUrlCount } = data;

  // ---------- DISCOVERABILITY ----------
  const llmsTxtFound = llmsText !== null;
  const aiTxtFound = aiTxtText !== null;

  let gptBotAllowed = true;
  let claudeBotAllowed = true;
  let perplexityAllowed = true;
  let googleExtAllowed = true;

  if (robotsText) {
    gptBotAllowed = !isBotBlocked(robotsText, "GPTBot");
    claudeBotAllowed = !isBotBlocked(robotsText, "ClaudeBot") && !isBotBlocked(robotsText, "anthropic-ai");
    perplexityAllowed = !isBotBlocked(robotsText, "PerplexityBot");
    googleExtAllowed = !isBotBlocked(robotsText, "Google-Extended");
  }

  const $ = data.$;
  const hasStructuredData = schemaScripts.length > 0 || ($?.("[itemtype]").length ?? 0) > 0;
  const hasCanonical = $ ? !!$('link[rel="canonical"]').attr("href") : false;

  const discoverScore = score(
    [llmsTxtFound, aiTxtFound, gptBotAllowed, claudeBotAllowed, perplexityAllowed, googleExtAllowed, sitemapFound, hasStructuredData, hasCanonical],
    [20, 10, 15, 15, 10, 10, 10, 15, 5]
  );

  if (llmsTxtFound) findings.push({ category: "discoverability", message: "llms.txt mevcut — AI sistemleri için optimize edilmiş", severity: "good" });
  else findings.push({ category: "discoverability", message: "llms.txt yok — AI crawlerlar için içerik özeti dosyası önerilir", severity: "warning" });
  if (aiTxtFound) findings.push({ category: "discoverability", message: "ai.txt mevcut", severity: "good" });
  else findings.push({ category: "discoverability", message: "ai.txt yok — AI eğitim tercihlerini belirtmiyor", severity: "warning" });
  if (!gptBotAllowed) findings.push({ category: "discoverability", message: "GPTBot engellenmiş — ChatGPT siteyi tarayamıyor", severity: "error" });
  else findings.push({ category: "discoverability", message: "GPTBot erişimine izin veriliyor", severity: "good" });
  if (!claudeBotAllowed) findings.push({ category: "discoverability", message: "ClaudeBot/Anthropic-AI engellenmiş", severity: "error" });
  else findings.push({ category: "discoverability", message: "ClaudeBot erişimine izin veriliyor", severity: "good" });
  if (!perplexityAllowed) findings.push({ category: "discoverability", message: "PerplexityBot engellenmiş", severity: "error" });
  if (!googleExtAllowed) findings.push({ category: "discoverability", message: "Google-Extended engellenmiş — AI Overviews'a giremeyebilir", severity: "error" });
  else findings.push({ category: "discoverability", message: "Google-Extended erişimine izin veriliyor", severity: "good" });
  if (!sitemapFound) findings.push({ category: "discoverability", message: "Sitemap yok — AI taraması için sitemap.xml ekleyin", severity: "warning" });
  else findings.push({ category: "discoverability", message: `Sitemap mevcut${sitemapUrlCount ? ` (${sitemapUrlCount} URL)` : ""}`, severity: "good" });
  if (!hasStructuredData) findings.push({ category: "discoverability", message: "Structured data yok — AI içeriği zor anlıyor", severity: "error" });
  else findings.push({ category: "discoverability", message: "Structured data (schema.org) mevcut", severity: "good" });
  if (!hasCanonical) findings.push({ category: "discoverability", message: "Canonical tag eksik", severity: "warning" });

  // ---------- ANSWERABILITY ----------
  let hasFaq = false, wordCount = 0, avgParaWords = 0, hasLists = false, headingCount = 0;

  if ($) {
    const faqSchema = schemaScripts.some((s) => /FAQPage/i.test(s));
    const faqHeadings = $("h2,h3").toArray().some((el) => $(el).text().trim().endsWith("?"));
    hasFaq = faqSchema || faqHeadings;

    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    wordCount = bodyText.split(" ").filter(Boolean).length;

    const paras = $("p").toArray();
    if (paras.length > 0) {
      const total = paras.reduce((s, el) => s + $(el).text().split(/\s+/).filter(Boolean).length, 0);
      avgParaWords = Math.round(total / paras.length);
    }

    hasLists = $("ul,ol").length > 0;
    headingCount = $("h1,h2,h3,h4").length;
  }

  const wordCountOk = wordCount >= 500 && wordCount <= 2000;

  const answerScore = score(
    [hasFaq, wordCountOk, wordCount > 300, avgParaWords > 0 && avgParaWords < 120, hasLists, headingCount >= 3],
    [25, 20, 10, 20, 15, 10]
  );

  if (hasFaq) findings.push({ category: "answerability", message: "FAQ yapısı tespit edildi — AI soru-cevap formatını sever", severity: "good" });
  else findings.push({ category: "answerability", message: "FAQ içeriği yok — soru-cevap bölümleri AI alıntılanabilirliği artırır", severity: "warning" });
  if (wordCount < 500) findings.push({ category: "answerability", message: `İçerik çok kısa (${wordCount} kelime) — önerilen: 500–2000`, severity: "error" });
  else if (wordCount > 2000) findings.push({ category: "answerability", message: `İçerik çok uzun (${wordCount} kelime) — 5000+ kelime daha az atıf alıyor`, severity: "warning" });
  else findings.push({ category: "answerability", message: `Kelime sayısı ideal aralıkta (${wordCount})`, severity: "good" });
  if (avgParaWords > 120) findings.push({ category: "answerability", message: `Paragraflar çok uzun (ort. ${avgParaWords} kelime) — ideal: 50–100`, severity: "warning" });
  if (!hasLists) findings.push({ category: "answerability", message: "Liste formatı yok — madde yapısı AI tarafından daha iyi işlenir", severity: "warning" });
  if (headingCount < 3) findings.push({ category: "answerability", message: `Başlık sayısı az (${headingCount}) — içerik AI için bölümlenmemiş`, severity: "warning" });

  // ---------- CITATION READINESS ----------
  let hasAuthor = false, hasDateInfo = false, hasExtLinks = false;
  let hasOrgSchema = false, hasArticleSchema = false, hasTrustLinks = false;
  const isHttps = base.protocol === "https:";

  const isContentPage = schemaScripts.some((s) =>
    /"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/i.test(s)
  ) || (base.pathname !== "/" && /\/(blog|makale|article|post|news|yazi)\//i.test(base.pathname));

  if ($) {
    const htmlAuthor = $('[rel="author"],.author,[itemprop="author"],meta[name="author"]').length > 0;
    const schemaAuthor = schemaScripts.some((s) => /"author"\s*:/i.test(s));
    const orgAsAuthor = detectSchemaType(schemaScripts, ["Organization", "LocalBusiness", "Corporation"]);
    hasAuthor = htmlAuthor || schemaAuthor || (!isContentPage && orgAsAuthor);

    hasDateInfo = $("time,[itemprop='datePublished'],[itemprop='dateModified'],meta[property='article:published_time']").length > 0
      || schemaScripts.some((s) => /"dateModified"|"datePublished"/i.test(s));
    hasExtLinks = $("a[href]").toArray().some((el) => {
      try { return new URL($(el).attr("href")!, siteUrl).origin !== origin; } catch { return false; }
    });
    hasOrgSchema = detectSchemaType(schemaScripts, ["Organization", "LocalBusiness", "Corporation"]);
    hasArticleSchema = detectSchemaType(schemaScripts, ["Article", "NewsArticle", "BlogPosting"]);
    hasTrustLinks = $("a[href]").toArray().some((el) => {
      const href = ($(el).attr("href") ?? "").toLowerCase();
      return href.includes("/about") || href.includes("/hakkimizda") || href.includes("/privacy") || href.includes("/contact") || href.includes("/iletisim");
    });
  }

  const citationScore = score(
    [hasAuthor, hasDateInfo, hasExtLinks, isHttps, hasOrgSchema, hasArticleSchema, hasTrustLinks],
    [15, 15, 15, 15, 20, 15, 5]
  );

  if (!hasAuthor) {
    const msg = isContentPage
      ? "Yazar bilgisi yok — içerik sayfalarında Author schema ekleyin (E-E-A-T sinyali)"
      : "Yazar/kuruluş bilgisi schema'da tanımlı değil — Organization schema ekleyin";
    findings.push({ category: "citation", message: msg, severity: "warning" });
  } else {
    findings.push({ category: "citation", message: "Yazar/kuruluş bilgisi schema'da mevcut", severity: "good" });
  }
  if (!hasDateInfo) findings.push({ category: "citation", message: "Tarih sinyali yok — AI güncelliği değerlendiremiyor (atıflar 13 haftada çürüyor)", severity: "warning" });
  else findings.push({ category: "citation", message: "Tarih/güncelleme sinyali mevcut", severity: "good" });
  if (!hasOrgSchema) findings.push({ category: "citation", message: "Organization schema yok — marka kimliği AI'a belirsiz", severity: "error" });
  else findings.push({ category: "citation", message: "Organization schema mevcut", severity: "good" });
  if (!hasArticleSchema && isContentPage) findings.push({ category: "citation", message: "Article schema yok — içerik türü AI'a belirsiz", severity: "warning" });
  else if (hasArticleSchema) findings.push({ category: "citation", message: "Article/BlogPosting schema mevcut", severity: "good" });
  if (hasExtLinks) findings.push({ category: "citation", message: "Dış kaynaklara bağlantı var — otorite sinyali iyi", severity: "good" });
  else findings.push({ category: "citation", message: "Dış kaynak bağlantısı yok — birincil kaynaklara atıf ekleyin", severity: "warning" });

  // ---------- ENTITY COVERAGE ----------
  let hasOrgName = false, hasProductMention = false, hasLocation = false, hasContactInfo = false;

  if ($) {
    const text = $("body").text().toLowerCase();
    const schemaAll = schemaScripts.join(" ").toLowerCase();
    hasOrgName = $('[itemprop="name"],[itemprop="legalName"]').length > 0 || /organization|corporation|localbusiness/i.test(schemaAll);
    hasProductMention = detectSchemaType(schemaScripts, [
      "Product", "Service", "ClothingStore", "Store", "ItemList",
      "Offer", "SoftwareApplication", "Course", "Event", "FoodEstablishment"
    ]) || $('[class*="product"],[class*="service"],[class*="hizmet"],[itemprop="offers"],[itemprop="serviceType"]').length > 0;
    hasLocation = /[itemprop="address"]/.test($.html()) || /postaladdress/i.test(schemaAll) || /istanbul|ankara|izmir|turkey|türkiye|\d{5}/.test(text);
    hasContactInfo = $('[itemprop="telephone"],[href^="tel:"],[href^="mailto:"]').length > 0 || /\+\d{10,}/.test(text);
  }

  const entityScore = score(
    [hasOrgName, hasProductMention, hasLocation, hasContactInfo],
    [30, 25, 25, 20]
  );

  if (!hasOrgName) findings.push({ category: "entity", message: "Organizasyon adı schema ile tanımlanmamış", severity: "error" });
  if (!hasProductMention) findings.push({ category: "entity", message: "Ürün/hizmet entity'si yok — ne sunduğunuz AI'a belirsiz", severity: "warning" });
  if (!hasLocation) findings.push({ category: "entity", message: "Konum bilgisi yok — yerel AI görünürlüğü düşük", severity: "warning" });
  else findings.push({ category: "entity", message: "Konum/adres bilgisi mevcut", severity: "good" });
  if (!hasContactInfo) findings.push({ category: "entity", message: "İletişim bilgisi bulunamadı", severity: "warning" });
  else findings.push({ category: "entity", message: "İletişim bilgisi mevcut", severity: "good" });

  // ---------- AI READABILITY ----------
  let hasSemanticHtml = false, jsIndependent = false, hasTables = false;
  let hasListsAi = false, hasAltTexts = false, imgWithoutAltCount = 0, paraLengthOk = false, headingStructOk = false;

  if ($) {
    hasSemanticHtml = $("article,main,section,aside,header,footer,nav").length >= 2;
    jsIndependent = checkJsIndependent($);
    hasTables = $("table").length > 0;
    hasListsAi = $("ul,ol").length > 0;
    const imgs = $("img").toArray();
    imgWithoutAltCount = imgs.filter((el) => { const a = $(el).attr("alt"); return a === undefined || a === ""; }).length;
    hasAltTexts = imgWithoutAltCount === 0;
    paraLengthOk = avgParaWords > 0 && avgParaWords <= 120;
    headingStructOk = $("h1").length === 1 && $("h2").length >= 2;
  }

  const readabilityScore = score(
    [hasSemanticHtml, jsIndependent, hasTables || hasListsAi, hasAltTexts, paraLengthOk, headingStructOk],
    [20, 25, 15, 15, 15, 10]
  );

  if (jsIndependent) findings.push({ category: "readability", message: "İçerik statik HTML'de mevcut — LLM botları JS çalıştırmadan okuyabiliyor", severity: "good" });
  else findings.push({ category: "readability", message: "İçerik büyük ölçüde JS'e bağımlı görünüyor — LLM botları göremeyebilir", severity: "error" });
  if (hasSemanticHtml) findings.push({ category: "readability", message: "Semantik HTML kullanılıyor — içerik bölümleri AI'a net", severity: "good" });
  else findings.push({ category: "readability", message: "Semantik HTML eksik (article/main/section)", severity: "warning" });
  if (!hasAltTexts) findings.push({ category: "readability", message: `${imgWithoutAltCount} görselde alt text eksik`, severity: "warning" });
  else findings.push({ category: "readability", message: "Tüm görsellerde alt text mevcut", severity: "good" });
  if (!headingStructOk) findings.push({ category: "readability", message: "Başlık hiyerarşisi zayıf — tek H1 ve en az 2 H2 olmalı", severity: "warning" });
  else findings.push({ category: "readability", message: "Başlık hiyerarşisi doğru", severity: "good" });

  // ---------- TOTAL ----------
  const totalScore = Math.round(
    discoverScore * 0.25 + answerScore * 0.25 + citationScore * 0.20 + entityScore * 0.15 + readabilityScore * 0.15
  );

  return {
    llmsTxtFound, aiTxtFound, gptBotAllowed, claudeBotAllowed, perplexityAllowed, googleExtAllowed,
    sitemapFound, sitemapUrlCount, hasStructuredData, hasCanonical, discoverScore,
    hasFaq, wordCount, wordCountOk, avgParaWords, hasLists, headingCount, answerScore,
    hasAuthor, hasDateInfo, hasExtLinks, isHttps, hasOrgSchema, hasArticleSchema, hasTrustLinks, citationScore,
    hasOrgName, hasProductMention, hasLocation, hasContactInfo, entityScore,
    hasSemanticHtml, jsIndependent, hasTables, hasListsAi, hasAltTexts, imgWithoutAltCount, paraLengthOk, headingStructOk, readabilityScore,
    totalScore, findings,
  };
}
