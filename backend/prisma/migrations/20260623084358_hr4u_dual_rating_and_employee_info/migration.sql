-- AlterTable
ALTER TABLE "CompetencyScore" ADD COLUMN     "expectedRating" DOUBLE PRECISION DEFAULT 1,
ADD COLUMN     "selfScore" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "buGroup" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "jobGrade" TEXT;
