-- Replace single OSE_LEVEL form type with five position-specific form types.
-- Existing rows are remapped to the new form type based on the evaluatee's
-- position so no appraisal loses its form.

-- 1. New enum
CREATE TYPE "FormType_new" AS ENUM ('DIRECTOR_LEVEL', 'MANAGER_LEVEL', 'OFFICER_LEVEL', 'SUPERVISOR_LEVEL', 'PRODUCTION_LEVEL');

-- 2. Detach the column from the old enum so we can remap freely
ALTER TABLE "Evaluation" ALTER COLUMN "formType" DROP DEFAULT;
ALTER TABLE "Evaluation" ALTER COLUMN "formType" TYPE TEXT USING "formType"::text;

-- 3. Remap every row by the evaluatee's position (defaults to OFFICER_LEVEL)
UPDATE "Evaluation" e SET "formType" = CASE u."position"
    WHEN 'DIRECTOR_UP'      THEN 'DIRECTOR_LEVEL'
    WHEN 'MANAGER'          THEN 'MANAGER_LEVEL'
    WHEN 'OFFICER'          THEN 'OFFICER_LEVEL'
    WHEN 'SUPERVISOR'       THEN 'SUPERVISOR_LEVEL'
    WHEN 'PRODUCTION_STAFF' THEN 'PRODUCTION_LEVEL'
    ELSE 'OFFICER_LEVEL'
  END
  FROM "User" u
  WHERE u."id" = e."evaluateeId";

-- 4. Swap to the new enum
ALTER TABLE "Evaluation" ALTER COLUMN "formType" TYPE "FormType_new" USING "formType"::"FormType_new";
ALTER TABLE "Evaluation" ALTER COLUMN "formType" SET DEFAULT 'OFFICER_LEVEL';

-- 5. Retire the old enum
DROP TYPE "FormType";
ALTER TYPE "FormType_new" RENAME TO "FormType";
