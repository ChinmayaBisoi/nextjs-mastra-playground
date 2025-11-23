-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Slide_presentationId_idx" ON "Slide"("presentationId");

-- CreateIndex
CREATE UNIQUE INDEX "Slide_presentationId_order_key" ON "Slide"("presentationId", "order");

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
