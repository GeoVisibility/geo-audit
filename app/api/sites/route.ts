import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 20,
      },
    },
  });
  return NextResponse.json(sites);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, url, checkFreq } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "name and url required" }, { status: 400 });
  }

  const site = await prisma.site.create({
    data: { name, url, checkFreq: checkFreq ?? 5 },
  });

  return NextResponse.json(site, { status: 201 });
}
