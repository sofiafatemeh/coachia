-- CreateTable
CREATE TABLE "MorphoAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "photoIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "segments" JSONB,
    "advice" JSONB,
    "progression" JSONB,
    "summary" TEXT,
    "claudeModel" TEXT,
    "raw" JSONB,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MorphoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MorphoAnalysis_userId_idx" ON "MorphoAnalysis"("userId");

-- CreateIndex
CREATE INDEX "MorphoAnalysis_weekOf_idx" ON "MorphoAnalysis"("weekOf");

-- AddForeignKey
ALTER TABLE "MorphoAnalysis" ADD CONSTRAINT "MorphoAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
