-- Drop the existing check constraint on stock_logs.type
ALTER TABLE stock_logs DROP CONSTRAINT IF EXISTS stock_logs_type_check;

-- Add a new check constraint that includes Expenses
ALTER TABLE stock_logs ADD CONSTRAINT stock_logs_type_check 
  CHECK (type IN ('Stock In', 'Sale', 'Adjustment', 'Expenses'));
