-- Soft-delete support for HR records and evaluations.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Evaluation" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Import logs keep integrity metadata without storing future uploads in full.
ALTER TABLE "EmployeeImport" ADD COLUMN "rawSha256" TEXT;
ALTER TABLE "EmployeeImport" ADD COLUMN "rawBytes" INTEGER;
