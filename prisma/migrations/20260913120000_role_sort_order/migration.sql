-- Add a position column so the roles page can render the council hierarchy
-- in a deliberate order, with any custom (user-created) roles appended last.
ALTER TABLE "roles" ADD COLUMN "sort_order" INTEGER;

-- Seed the known council hierarchy (Admin at top, Member at bottom).
UPDATE "roles" SET "sort_order" = CASE "name"
    WHEN 'Admin' THEN 0
    WHEN 'President' THEN 1
    WHEN 'Vice President' THEN 2
    WHEN 'Treasurer' THEN 3
    WHEN 'Head of Quizzing' THEN 4
    WHEN 'PR Head' THEN 5
    WHEN 'Creative Head' THEN 6
    WHEN 'ME Representative' THEN 7
    WHEN 'BE Representative' THEN 8
    WHEN 'TE Representative' THEN 9
    WHEN 'SE Representative' THEN 10
    WHEN 'FE Representative' THEN 11
    WHEN 'Member' THEN 12
    ELSE 999
END;

ALTER TABLE "roles" ALTER COLUMN "sort_order" SET DEFAULT 999;
ALTER TABLE "roles" ALTER COLUMN "sort_order" SET NOT NULL;