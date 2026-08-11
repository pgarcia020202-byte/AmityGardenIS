-- Add complimentary fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS complimentary_item_1 INTEGER,
ADD COLUMN IF NOT EXISTS complimentary_item_2 INTEGER,
ADD COLUMN IF NOT EXISTS is_addons BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS addons_items JSONB DEFAULT '[]'::jsonb;

-- Add foreign key constraints to menu items table (if menu items table exists)
-- These will only work if the menu_items table already exists
-- Note: PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT, so we ignore errors
DO $$
BEGIN
    ALTER TABLE bookings 
    ADD CONSTRAINT fk_complimentary_item_1 
    FOREIGN KEY (complimentary_item_1) REFERENCES menu_items(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TABLE bookings 
    ADD CONSTRAINT fk_complimentary_item_2 
    FOREIGN KEY (complimentary_item_2) REFERENCES menu_items(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;