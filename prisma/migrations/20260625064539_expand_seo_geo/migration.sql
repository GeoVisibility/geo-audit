-- AlterTable
ALTER TABLE "GeoCheck" ADD COLUMN     "aiTxtFound" BOOLEAN,
ADD COLUMN     "claudeBotAllowed" BOOLEAN,
ADD COLUMN     "googleExtAllowed" BOOLEAN,
ADD COLUMN     "hasArticleSchema" BOOLEAN,
ADD COLUMN     "jsIndependent" BOOLEAN,
ADD COLUMN     "wordCountOk" BOOLEAN;

-- AlterTable
ALTER TABLE "SeoCheck" ADD COLUMN     "hasArticleSchema" BOOLEAN,
ADD COLUMN     "hasBreadcrumbSchema" BOOLEAN,
ADD COLUMN     "hasDateSignal" BOOLEAN,
ADD COLUMN     "hasFaqSchema" BOOLEAN,
ADD COLUMN     "hasHowToSchema" BOOLEAN,
ADD COLUMN     "hasIndexNow" BOOLEAN,
ADD COLUMN     "hasNosnippet" BOOLEAN,
ADD COLUMN     "hasOrgSchema" BOOLEAN,
ADD COLUMN     "hasProductSchema" BOOLEAN,
ADD COLUMN     "headingHierarchyOk" BOOLEAN,
ADD COLUMN     "maxSnippet" INTEGER,
ADD COLUMN     "wordCount" INTEGER,
ADD COLUMN     "wordCountOk" BOOLEAN;
