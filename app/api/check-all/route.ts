import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSite } from "@/lib/checker";

export async function POST() {
  const sites = await prisma.site.findMany();

  const results = await Promise.allSettled(
    sites.map(async (site) => {
      const result = await checkSite(site.url);
      return prisma.check.create({
        data: {
          siteId: site.id,
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
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ checked: succeeded, total: sites.length });
}
