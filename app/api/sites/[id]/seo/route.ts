import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSeo } from "@/lib/seo-checker";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = await checkSeo(site.url);

  const seoCheck = await prisma.seoCheck.create({
    data: {
      siteId: id,
      robotsTxtFound: r.robotsTxtFound,
      robotsBlocked: r.robotsBlocked,
      hasHreflang: r.hasHreflang,
      noindex: r.noindex,
      hasNosnippet: r.hasNosnippet,
      maxSnippet: r.maxSnippet,
      title: r.title,
      titleLength: r.titleLength,
      description: r.description,
      descLength: r.descLength,
      hasOgTitle: r.hasOgTitle,
      hasOgDesc: r.hasOgDesc,
      hasOgImage: r.hasOgImage,
      hasBreadcrumbSchema: r.hasBreadcrumbSchema,
      hasHowToSchema: r.hasHowToSchema,
      hasProductSchema: r.hasProductSchema,
      internalLinks: r.internalLinks,
      hasIndexNow: r.hasIndexNow,
      score: r.score,
      issues: JSON.stringify(r.issues),
    },
  });

  return NextResponse.json({ ...seoCheck, issues: r.issues });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const latest = await prisma.seoCheck.findFirst({
    where: { siteId: id },
    orderBy: { checkedAt: "desc" },
  });
  if (!latest) return NextResponse.json(null);
  return NextResponse.json({ ...latest, issues: latest.issues ? JSON.parse(latest.issues) : [] });
}
