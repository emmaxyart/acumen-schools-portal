BEGIN;

CREATE TYPE "Gender" AS ENUM ('M', 'F');

ALTER TABLE "Student"
ALTER COLUMN "gender" TYPE "Gender"
USING "gender"::"Gender";

COMMIT;
