-- AlterEnum
ALTER TYPE "EvaluationStatus" ADD VALUE 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerComment" TEXT,
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "reviewerName" TEXT;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
