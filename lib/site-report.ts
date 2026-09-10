import { crawlSite } from "./crawler";
import { checkSite, type CheckResult } from "./checker";
import { checkSeo, type SeoResult } from "./seo-checker";
import { checkGeo, type GeoResult } from "./geo-checker";

export interface SiteReport {
  speedScore: number;
  seoScore: number;
  geoScore: number;
  overallScore: number;
  uptime: CheckResult;
  seo: SeoResult;
  geo: GeoResult;
}

// GEO'yu öne çıkarıyoruz: genel skorun en büyük payı GEO'dan geliyor.
const WEIGHTS = { speed: 0.25, seo: 0.30, geo: 0.45 };

export function speedScoreFrom(u: CheckResult): number {
  if (u.status === "critical") return 0;
  let s = 100;
  if (u.httpStatus != null && u.httpStatus >= 400) s -= 30;
  if (u.ttfb != null) {
    if (u.ttfb > 2000) s -= 30;
    else if (u.ttfb > 1000) s -= 15;
  }
  if (u.sslDaysLeft != null) {
    if (u.sslDaysLeft <= 0) s -= 100;
    else if (u.sslDaysLeft < 15) s -= 20;
    else if (u.sslDaysLeft < 30) s -= 10;
  }
  if (u.redirectCount > 2) s -= 5;
  return Math.max(0, Math.min(100, s));
}

export function overallScoreFrom(speedScore: number, seoScore: number, geoScore: number): number {
  return Math.round(speedScore * WEIGHTS.speed + seoScore * WEIGHTS.seo + geoScore * WEIGHTS.geo);
}

/**
 * Hız (uptime), SEO ve GEO kontrollerini tek bir crawl üzerinden çalıştırır.
 * Siteye tekrar tekrar istek atılmasını önler; tek pencerede tek skor üretir.
 */
export async function runSiteReport(siteUrl: string): Promise<SiteReport> {
  const crawl = await crawlSite(siteUrl);

  const [uptime, seo, geo] = await Promise.all([
    checkSite(siteUrl),
    checkSeo(siteUrl, crawl),
    checkGeo(siteUrl, crawl),
  ]);

  const speedScore = speedScoreFrom(uptime);
  const overallScore = overallScoreFrom(speedScore, seo.score, geo.totalScore);

  return { speedScore, seoScore: seo.score, geoScore: geo.totalScore, overallScore, uptime, seo, geo };
}
