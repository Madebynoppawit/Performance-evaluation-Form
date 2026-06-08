-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('OSE_LEVEL');

-- CreateEnum
CREATE TYPE "EvaluationReason" AS ENUM ('PROBATION', 'ANNUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PerformanceGrade" AS ENUM ('EXCELLENT', 'ABOVE_STANDARD', 'MEETS_STANDARD', 'ALMOST_STANDARD', 'BELOW_STANDARD');

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "evaluationReason" "EvaluationReason",
ADD COLUMN     "evaluationReasonOther" TEXT,
ADD COLUMN     "evaluatorTitle" TEXT,
ADD COLUMN     "formType" "FormType" NOT NULL DEFAULT 'OSE_LEVEL',
ADD COLUMN     "performanceGrade" "PerformanceGrade";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "jobTitle" TEXT;
