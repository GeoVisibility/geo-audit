import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkGeo } from "@/lib/geo-checker";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = await checkGeo(site.url);

  const geoCheck = await prisma.geoCheck.create({
    data: {
      siteId: id,
      llmsTxtFound: r.llmsTxtFound,
      aiTxtFound: r.aiTxtFound,
      gptBotAllowed: r.gptBotAllowed,
      claudeBotAllowed: r.claudeBotAllowed,
      perplexityAllowed: r.perplexityAllowed,
      googleExtAllowed: r.googleExtAllowed,
      sitemapFound: r.sitemapFound,
      hasStructuredData: r.hasStructuredData,
      hasCanonical: r.hasCanonical,
      discoverScore: r.discoverScore,
      hasFaq: r.hasFaq,
      wordCount: r.wordCount,
      wordCountOk: r.wordCountOk,
      avgParaWords: r.avgParaWords,
      hasLists: r.hasLists,
      headingCount: r.headingCount,
      answerScore: r.answerScore,
      hasAuthor: r.hasAuthor,
      hasDateInfo: r.hasDateInfo,
      hasExtLinks: r.hasExtLinks,
      isHttps: r.isHttps,
      hasOrgSchema: r.hasOrgSchema,
      hasArticleSchema: r.hasArticleSchema,
      hasTrustLinks: r.hasTrustLinks,
      citationScore: r.citationScore,
      hasOrgName: r.hasOrgName,
      hasProductMention: r.hasProductMention,
      hasLocation: r.hasLocation,
      hasContactInfo: r.hasContactInfo,
      entityScore: r.entityScore,
      hasSemanticHtml: r.hasSemanticHtml,
      jsIndependent: r.jsIndependent,
      hasTables: r.hasTables,
      hasListsAi: r.hasListsAi,
      hasAltTexts: r.hasAltTexts,
      paraLengthOk: r.paraLengthOk,
      headingStructOk: r.headingStructOk,
      readabilityScore: r.readabilityScore,
      totalScore: r.totalScore,
      findings: JSON.stringify(r.findings),
    },
  });

  return NextResponse.json({ ...geoCheck, findings: r.findings });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const latest = await prisma.geoCheck.findFirst({
    where: { siteId: id },
    orderBy: { checkedAt: "desc" },
  });
  if (!latest) return NextResponse.json(null);
  return NextResponse.json({ ...latest, findings: latest.findings ? JSON.parse(latest.findings) : [] });
}
