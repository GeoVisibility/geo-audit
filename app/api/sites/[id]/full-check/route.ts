import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSiteReport, speedScoreFrom, overallScoreFrom } from "@/lib/site-report";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const report = await runSiteReport(site.url);
  const { uptime, seo, geo } = report;

  const [check, seoCheck, geoCheck] = await Promise.all([
    prisma.check.create({
      data: {
        siteId: id,
        status: uptime.status,
        httpStatus: uptime.httpStatus,
        ttfb: uptime.ttfb,
        responseTime: uptime.responseTime,
        sslDaysLeft: uptime.sslDaysLeft,
        dnsResolved: uptime.dnsResolved,
        redirectCount: uptime.redirectCount,
        error: uptime.error,
      },
    }),
    prisma.seoCheck.create({
      data: {
        siteId: id,
        robotsTxtFound: seo.robotsTxtFound,
        robotsBlocked: seo.robotsBlocked,
        hasHreflang: seo.hasHreflang,
        noindex: seo.noindex,
        hasNosnippet: seo.hasNosnippet,
        maxSnippet: seo.maxSnippet,
        title: seo.title,
        titleLength: seo.titleLength,
        description: seo.description,
        descLength: seo.descLength,
        hasOgTitle: seo.hasOgTitle,
        hasOgDesc: seo.hasOgDesc,
        hasOgImage: seo.hasOgImage,
        hasBreadcrumbSchema: seo.hasBreadcrumbSchema,
        hasHowToSchema: seo.hasHowToSchema,
        hasProductSchema: seo.hasProductSchema,
        internalLinks: seo.internalLinks,
        hasIndexNow: seo.hasIndexNow,
        score: seo.score,
        issues: JSON.stringify(seo.issues),
      },
    }),
    prisma.geoCheck.create({
      data: {
        siteId: id,
        llmsTxtFound: geo.llmsTxtFound,
        aiTxtFound: geo.aiTxtFound,
        gptBotAllowed: geo.gptBotAllowed,
        claudeBotAllowed: geo.claudeBotAllowed,
        perplexityAllowed: geo.perplexityAllowed,
        googleExtAllowed: geo.googleExtAllowed,
        sitemapFound: geo.sitemapFound,
        sitemapUrlCount: geo.sitemapUrlCount,
        hasStructuredData: geo.hasStructuredData,
        hasCanonical: geo.hasCanonical,
        discoverScore: geo.discoverScore,
        hasFaq: geo.hasFaq,
        wordCount: geo.wordCount,
        wordCountOk: geo.wordCountOk,
        avgParaWords: geo.avgParaWords,
        hasLists: geo.hasLists,
        headingCount: geo.headingCount,
        answerScore: geo.answerScore,
        hasAuthor: geo.hasAuthor,
        hasDateInfo: geo.hasDateInfo,
        hasExtLinks: geo.hasExtLinks,
        isHttps: geo.isHttps,
        hasOrgSchema: geo.hasOrgSchema,
        hasArticleSchema: geo.hasArticleSchema,
        hasTrustLinks: geo.hasTrustLinks,
        citationScore: geo.citationScore,
        hasOrgName: geo.hasOrgName,
        hasProductMention: geo.hasProductMention,
        hasLocation: geo.hasLocation,
        hasContactInfo: geo.hasContactInfo,
        entityScore: geo.entityScore,
        hasSemanticHtml: geo.hasSemanticHtml,
        jsIndependent: geo.jsIndependent,
        hasTables: geo.hasTables,
        hasListsAi: geo.hasListsAi,
        hasAltTexts: geo.hasAltTexts,
        imgWithoutAltCount: geo.imgWithoutAltCount,
        paraLengthOk: geo.paraLengthOk,
        headingStructOk: geo.headingStructOk,
        readabilityScore: geo.readabilityScore,
        totalScore: geo.totalScore,
        findings: JSON.stringify(geo.findings),
      },
    }),
  ]);

  return NextResponse.json({
    overallScore: report.overallScore,
    speedScore: report.speedScore,
    seoScore: report.seoScore,
    geoScore: report.geoScore,
    uptime: check,
    seo: { ...seoCheck, issues: seo.issues },
    geo: { ...geoCheck, findings: geo.findings },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [check, seoCheck, geoCheck] = await Promise.all([
    prisma.check.findFirst({ where: { siteId: id }, orderBy: { checkedAt: "desc" } }),
    prisma.seoCheck.findFirst({ where: { siteId: id }, orderBy: { checkedAt: "desc" } }),
    prisma.geoCheck.findFirst({ where: { siteId: id }, orderBy: { checkedAt: "desc" } }),
  ]);

  if (!check || !seoCheck || !geoCheck) return NextResponse.json(null);

  const speedScore = speedScoreFrom({
    status: check.status as "healthy" | "warning" | "critical",
    httpStatus: check.httpStatus,
    ttfb: check.ttfb,
    responseTime: check.responseTime,
    sslDaysLeft: check.sslDaysLeft,
    dnsResolved: check.dnsResolved ?? false,
    redirectCount: check.redirectCount ?? 0,
    error: check.error,
  });
  const overallScore = overallScoreFrom(speedScore, seoCheck.score ?? 0, geoCheck.totalScore ?? 0);

  return NextResponse.json({
    overallScore,
    speedScore,
    seoScore: seoCheck.score ?? 0,
    geoScore: geoCheck.totalScore ?? 0,
    uptime: check,
    seo: { ...seoCheck, issues: seoCheck.issues ? JSON.parse(seoCheck.issues) : [] },
    geo: { ...geoCheck, findings: geoCheck.findings ? JSON.parse(geoCheck.findings) : [] },
  });
}
