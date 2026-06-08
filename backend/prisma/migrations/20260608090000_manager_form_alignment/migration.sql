-- AlterTable
ALTER TABLE "GoalEntry" ADD COLUMN "wig" TEXT,
ADD COLUMN "kpiCategory" TEXT;

-- CreateTable
CREATE TABLE "TrainingScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "minimumHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "percentOfMinimum" DOUBLE PRECISION,
    "score" INTEGER,
    "behaviorNote" TEXT,

    CONSTRAINT "TrainingScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingScore_evaluationId_key" ON "TrainingScore"("evaluationId");

-- AddForeignKey
ALTER TABLE "TrainingScore" ADD CONSTRAINT "TrainingScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
