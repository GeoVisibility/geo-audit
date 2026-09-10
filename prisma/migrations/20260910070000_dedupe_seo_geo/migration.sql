-- AlterTable
-- SEO/GEO dedup: these signals are now owned exclusively by GeoCheck
-- (sitemap, canonical, schema.org detection, word count, heading structure,
-- external links, date signal, alt text) — see lib/seo-checker.ts.
ALTER TABLE "SeoCheck" DROP COLUMN "canonicalUrl",
DROP COLUMN "externalLinks",
DROP COLUMN "h1Count",
DROP COLUMN "h2Count",
DROP COLUMN "h3Count",
DROP COLUMN "hasArticleSchema",
DROP COLUMN "hasDateSignal",
DROP COLUMN "hasFaqSchema",
DROP COLUMN "hasOrgSchema",
DROP COLUMN "hasSchema",
DROP COLUMN "headingHierarchyOk",
DROP COLUMN "imgWithoutAlt",
DROP COLUMN "sitemapFound",
DROP COLUMN "sitemapUrlCount",
DROP COLUMN "wordCount",
DROP COLUMN "wordCountOk";

-- AlterTable
ALTER TABLE "GeoCheck" ADD COLUMN     "sitemapUrlCount" INTEGER,
ADD COLUMN     "imgWithoutAltCount" INTEGER;
