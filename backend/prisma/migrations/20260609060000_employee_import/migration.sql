-- Employee master-file import: key + raw row on User, and an import log table.
ALTER TABLE "User" ADD COLUMN "employeeNo" TEXT;
ALTER TABLE "User" ADD COLUMN "sourceData" JSONB;
CREATE UNIQUE INDEX "User_employeeNo_key" ON "User"("employeeNo");

CREATE TABLE "EmployeeImport" (
    "id" TEXT NOT NULL,
    "filename" TEXT,
    "importedById" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "raw" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeImport_pkey" PRIMARY KEY ("id")
);
