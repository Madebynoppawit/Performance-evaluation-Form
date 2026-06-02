-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('DIRECTOR_UP', 'MANAGER', 'OFFICER', 'SUPERVISOR', 'PRODUCTION_STAFF');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('SELF', 'MANAGER', 'PEER', 'THREE_SIXTY');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "position" "Position",
    "department" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "EvaluationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "evaluateeId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "goalWeight" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "competencyWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "attendanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "goalScore" DOUBLE PRECISION,
    "competencyScore" DOUBLE PRECISION,
    "attendanceScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalEntry" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "goalDescription" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "targetRating5" TEXT,
    "targetRating4" TEXT,
    "targetRating3" TEXT,
    "targetRating2" TEXT,
    "targetRating1" TEXT,
    "result" TEXT,
    "evaluationScore" INTEGER,
    "employeeComment" TEXT,
    "superiorComment" TEXT,
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "score" INTEGER,

    CONSTRAINT "CompetencyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "leaveActualDays" INTEGER,
    "lateActualTimes" INTEGER,
    "disciplinaryLevel" TEXT DEFAULT 'NONE',
    "leaveScore" INTEGER,
    "lateScore" INTEGER,
    "disciplinaryScore" INTEGER,
    "attendanceAvgScore" DOUBLE PRECISION,

    CONSTRAINT "AttendanceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationComment" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "strengths" TEXT,
    "improvements" TEXT,
    "requiredSkills" TEXT,

    CONSTRAINT "EvaluationComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalarySummary" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "oldSalary" DOUBLE PRECISION,
    "newSalary" DOUBLE PRECISION,
    "bonus" DOUBLE PRECISION,
    "bonusDeduction" DOUBLE PRECISION,
    "bonusPolicy" TEXT,
    "effectiveDate" TIMESTAMP(3),

    CONSTRAINT "SalarySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAcknowledgement" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "employeeSignedAt" TIMESTAMP(3),
    "evaluatorSignedAt" TIMESTAMP(3),
    "directorSignedAt" TIMESTAMP(3),

    CONSTRAINT "EvaluationAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_cycleId_evaluateeId_evaluatorId_type_key" ON "Evaluation"("cycleId", "evaluateeId", "evaluatorId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_evaluationId_questionId_key" ON "Answer"("evaluationId", "questionId");

-- CreateIndex
CREATE INDEX "GoalEntry_evaluationId_idx" ON "GoalEntry"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyScore_evaluationId_competencyId_key" ON "CompetencyScore"("evaluationId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceScore_evaluationId_key" ON "AttendanceScore"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationComment_evaluationId_key" ON "EvaluationComment"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "SalarySummary_evaluationId_key" ON "SalarySummary"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationAcknowledgement_evaluationId_key" ON "EvaluationAcknowledgement"("evaluationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluateeId_fkey" FOREIGN KEY ("evaluateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalEntry" ADD CONSTRAINT "GoalEntry_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyScore" ADD CONSTRAINT "CompetencyScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceScore" ADD CONSTRAINT "AttendanceScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationComment" ADD CONSTRAINT "EvaluationComment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySummary" ADD CONSTRAINT "SalarySummary_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAcknowledgement" ADD CONSTRAINT "EvaluationAcknowledgement_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

