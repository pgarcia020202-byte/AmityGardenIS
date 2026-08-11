-- Drop existing tables if they exist
DROP TABLE IF EXISTS expense_items CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;

-- Create expenses table for tracking staff expenses (similar to sales)
CREATE TABLE expenses (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NULL,
  user_name VARCHAR(255) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('Asia/Manila'::text, now()),
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT expenses_total_check CHECK (total >= (0)::numeric)
) TABLESPACE pg_default;

-- Create expense_items table to store individual product items in an expense
CREATE TABLE expense_items (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  expense_id UUID NULL,
  product_id UUID NULL,
  product_name VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
  stock_log_id UUID NULL,
  CONSTRAINT expense_items_pkey PRIMARY KEY (id),
  CONSTRAINT expense_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT expense_items_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  CONSTRAINT expense_items_stock_log_id_fkey FOREIGN KEY (stock_log_id) REFERENCES stock_logs(id) ON DELETE SET NULL,
  CONSTRAINT expense_items_unit_price_check CHECK (unit_price > (0)::numeric),
  CONSTRAINT expense_items_subtotal_check CHECK (subtotal >= (0)::numeric),
  CONSTRAINT expense_items_qty_check CHECK (qty > 0)
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses USING btree (date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items USING btree (expense_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_expense_items_product_id ON expense_items USING btree (product_id) TABLESPACE pg_default;

-- Add comments
COMMENT ON TABLE expenses IS 'Stores staff expense records similar to sales, tracking products taken by staff';
COMMENT ON TABLE expense_items IS 'Stores individual product items in each expense record';
