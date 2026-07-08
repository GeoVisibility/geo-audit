-- CreateTable
CREATE TABLE "SeoCheck" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "robotsTxtFound" BOOLEAN,
    "robotsBlocked" BOOLEAN,
    "sitemapFound" BOOLEAN,
    "sitemapUrlCount" INTEGER,
    "canonicalUrl" TEXT,
    "hasHreflang" BOOLEAN,
    "noindex" BOOLEAN,
    "title" TEXT,
    "titleLength" INTEGER,
    "description" TEXT,
    "descLength" INTEGER,
    "hasOgTitle" BOOLEAN,
    "hasOgDesc" BOOLEAN,
    "hasOgImage" BOOLEAN,
    "hasSchema" BOOLEAN,
    "h1Count" INTEGER,
    "h2Count" INTEGER,
    "h3Count" INTEGER,
    "internalLinks" INTEGER,
    "externalLinks" INTEGER,
    "imgWithoutAlt" INTEGER,
    "score" INTEGER,
    "issues" TEXT,

    CONSTRAINT "SeoCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SeoCheck" ADD CONSTRAINT "SeoCheck_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
