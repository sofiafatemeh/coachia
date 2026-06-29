-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyScoreId" TEXT,
    "bodyScoreData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hevyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "calories" INTEGER,
    "volume" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiFeedback" JSONB,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "rpe" DOUBLE PRECISION,
    "duration" INTEGER,
    "formScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journalId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "poseData" JSONB,
    "repCount" INTEGER,
    "formScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "keypoints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Measurement_userId_idx" ON "Measurement"("userId");

-- CreateIndex
CREATE INDEX "Measurement_createdAt_idx" ON "Measurement"("createdAt");

-- CreateIndex
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");

-- CreateIndex
CREATE INDEX "Workout_completedAt_idx" ON "Workout"("completedAt");

-- CreateIndex
CREATE INDEX "Exercise_workoutId_idx" ON "Exercise"("workoutId");

-- CreateIndex
CREATE INDEX "ExerciseSet_exerciseId_idx" ON "ExerciseSet"("exerciseId");

-- CreateIndex
CREATE INDEX "Meal_userId_idx" ON "Meal"("userId");

-- CreateIndex
CREATE INDEX "Meal_time_idx" ON "Meal"("time");

-- CreateIndex
CREATE INDEX "Video_userId_idx" ON "Video"("userId");

-- CreateIndex
CREATE INDEX "Video_exercise_idx" ON "Video"("exercise");

-- CreateIndex
CREATE INDEX "ProgressPhoto_userId_idx" ON "ProgressPhoto"("userId");

-- CreateIndex
CREATE INDEX "ProgressPhoto_createdAt_idx" ON "ProgressPhoto"("createdAt");

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
