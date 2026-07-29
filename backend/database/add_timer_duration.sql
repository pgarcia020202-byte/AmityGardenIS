-- Add timer_duration column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 30;

-- Add comment to document the column
COMMENT ON COLUMN bookings.timer_duration IS 'Countdown timer duration in minutes for check-in notification';
