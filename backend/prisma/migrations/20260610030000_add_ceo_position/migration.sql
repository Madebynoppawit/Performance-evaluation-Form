-- Add CEO as a distinct top-level position (above DIRECTOR_UP).
ALTER TYPE "Position" ADD VALUE IF NOT EXISTS 'CEO' BEFORE 'DIRECTOR_UP';
