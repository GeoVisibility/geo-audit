import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSite } from "@/lib/checker";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await checkSite(site.url);

  const check = await prisma.check.create({
    data: {
      siteId: id,
      status: result.status,
      httpStatus: result.httpStatus,
      ttfb: result.ttfb,
      responseTime: result.responseTime,
      sslDaysLeft: result.sslDaysLeft,
      dnsResolved: result.dnsResolved,
      redirectCount: result.redirectCount,
      error: result.error,
    },
  });

  return NextResponse.json(check);
}
