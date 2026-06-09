-- Add DEVELOPER super-role (treated as admin-or-higher everywhere).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DEVELOPER' BEFORE 'ADMIN';
