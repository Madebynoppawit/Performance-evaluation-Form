-- Split "Director and up" into Director (DIRECTOR_UP) and Managing Director.
ALTER TYPE "Position" ADD VALUE IF NOT EXISTS 'MANAGING_DIRECTOR' BEFORE 'DIRECTOR_UP';
