-- Menu Categories Table
CREATE TABLE IF NOT EXISTS menu_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories (simplified - only name required)
INSERT INTO menu_categories (name) VALUES
('Appetizers'),
('Main Course'),
('Desserts'),
('Beverages'),
('Specials')
ON CONFLICT (name) DO NOTHING;
