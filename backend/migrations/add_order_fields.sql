-- Add order fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_order BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]';

-- Update existing bookings if needed
-- This will set is_order to false for existing bookings
UPDATE bookings 
SET is_order = FALSE 
WHERE is_order IS NULL;

UPDATE bookings 
SET order_items = '[]'::jsonb 
WHERE order_items IS NULL;
