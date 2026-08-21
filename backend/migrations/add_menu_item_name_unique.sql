-- Add unique constraint on menu item name to prevent duplicates
-- This migration ensures menu item names are unique

-- First, remove any potential duplicates by keeping the first occurrence
DELETE FROM menu_items mi1
WHERE id NOT IN (
    SELECT MIN(id)
    FROM menu_items mi2
    WHERE mi2.name = mi1.name
);

-- Add unique constraint
ALTER TABLE menu_items ADD CONSTRAINT menu_items_name_unique UNIQUE (name);
