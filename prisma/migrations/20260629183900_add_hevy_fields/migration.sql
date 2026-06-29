/*
  Warnings:

  - Added the required column `workoutId` to the `ExerciseSet` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_workoutId_fkey";

-- DropForeignKey
ALTER TABLE "ExerciseSet" DROP CONSTRAINT "ExerciseSet_exerciseId_fkey";

-- Step 1: Add workoutId as nullable first
ALTER TABLE "ExerciseSet" ADD COLUMN "workoutId" TEXT;

-- Step 2: Update existing rows to set workoutId from Exercise
UPDATE "ExerciseSet" es
SET "workoutId" = (
  SELECT e."workoutId"
  FROM "Exercise" e
  WHERE e.id = es."exerciseId"
  LIMIT 1
);

-- Step 3: Make workoutId NOT NULL
ALTER TABLE "ExerciseSet" ALTER COLUMN "workoutId" SET NOT NULL;

-- Step 4: Add other Hevy fields
ALTER TABLE "ExerciseSet" ADD COLUMN     "isDropSet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isToFailure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWarmup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oneRm" DOUBLE PRECISION,
ADD COLUMN     "setIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "setType" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "supersetIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "ExerciseSet_workoutId_idx" ON "ExerciseSet"("workoutId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;