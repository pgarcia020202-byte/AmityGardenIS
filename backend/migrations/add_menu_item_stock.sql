-- Add stock, min_stock, and sold columns to menu_items table
-- This migration adds stock management functionality to menu items

-- Add stock column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Add min_stock column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;

-- Add sold column
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sold INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN menu_items.stock IS 'Current stock quantity of the menu item';
COMMENT ON COLUMN menu_items.min_stock IS 'Minimum stock threshold for low stock alerts';
COMMENT ON COLUMN menu_items.sold IS 'Total number of items sold';
