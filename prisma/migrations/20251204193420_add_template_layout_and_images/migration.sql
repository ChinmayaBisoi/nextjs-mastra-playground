-- AlterTable
ALTER TABLE "Template" ADD COLUMN "images" JSONB;
ALTER TABLE "Template" ALTER COLUMN "slidesJson" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TemplateLayout" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "layoutName" TEXT NOT NULL,
    "layoutCode" TEXT NOT NULL,
    "html" TEXT,
    "fonts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateLayout_templateId_idx" ON "TemplateLayout"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateLayout_templateId_layoutId_key" ON "TemplateLayout"("templateId", "layoutId");

-- AddForeignKey
ALTER TABLE "TemplateLayout" ADD CONSTRAINT "TemplateLayout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
