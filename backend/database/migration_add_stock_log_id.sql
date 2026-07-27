-- Migration to add stock_log_id column to sale_items table
-- Run this to update existing database

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS stock_log_id UUID REFERENCES stock_logs(id) ON DELETE SET NULL;
