-- Fix database schema issues from incorrect timezone change

-- Reset bookings table column defaults
ALTER TABLE bookings 
ALTER COLUMN check_in_date 
DROP DEFAULT;

ALTER TABLE bookings 
ALTER COLUMN check_in_date 
SET DEFAULT NOW();

ALTER TABLE bookings 
ALTER COLUMN check_out_date 
DROP DEFAULT;

ALTER TABLE bookings 
ALTER COLUMN updated_at 
DROP DEFAULT;

ALTER TABLE bookings 
ALTER COLUMN updated_at 
SET DEFAULT NOW();

-- Reset users table column defaults (in case they were affected)
ALTER TABLE users 
ALTER COLUMN created_at 
DROP DEFAULT;

ALTER TABLE users 
ALTER COLUMN created_at 
SET DEFAULT NOW();

ALTER TABLE users 
ALTER COLUMN updated_at 
DROP DEFAULT;

ALTER TABLE users 
ALTER COLUMN updated_at 
SET DEFAULT NOW();

-- Verify the bookings table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;
