-- CreateTable
CREATE TABLE "ExerciseNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseName" TEXT,
    "note" TEXT NOT NULL,
    "activeFrom" TIMESTAMP(3),
    "activeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExerciseNote_userId_idx" ON "ExerciseNote"("userId");

-- CreateIndex
CREATE INDEX "ExerciseNote_exerciseName_idx" ON "ExerciseNote"("exerciseName");

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
