-- Revert the incorrect timezone change for check_in_date
ALTER TABLE bookings 
ALTER COLUMN check_in_date 
SET DEFAULT NOW();

-- Also revert check_out_date if it was changed
ALTER TABLE bookings 
ALTER COLUMN check_out_date 
DROP DEFAULT;

-- Revert updated_at if it was changed
ALTER TABLE bookings 
ALTER COLUMN updated_at 
SET DEFAULT NOW();
