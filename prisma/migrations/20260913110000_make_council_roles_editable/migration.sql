-- Make the 7 non-leadership council roles editable via the Admin UI.
-- Remaining system roles (not renamable/deletable): Admin, President,
-- Vice President, Treasurer, Head of Quizzing, Member.
UPDATE "roles" SET "is_system" = false
WHERE "name" IN (
    'PR Head',
    'Creative Head',
    'FE Representative',
    'SE Representative',
    'TE Representative',
    'BE Representative',
    'ME Representative'
);