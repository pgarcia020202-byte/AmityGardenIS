-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- Insert sample menu items (simplified - only required fields)
INSERT INTO menu_items (category_id, name, price) VALUES
-- Appetizers
((SELECT id FROM menu_categories WHERE name = 'Appetizers'), 'Spring Rolls', 120.00),
((SELECT id FROM menu_categories WHERE name = 'Appetizers'), 'Garlic Bread', 85.00),
((SELECT id FROM menu_categories WHERE name = 'Appetizers'), 'Chicken Wings', 180.00),

-- Main Course
((SELECT id FROM menu_categories WHERE name = 'Main Course'), 'Grilled Chicken', 280.00),
((SELECT id FROM menu_categories WHERE name = 'Main Course'), 'Beef Steak', 350.00),
((SELECT id FROM menu_categories WHERE name = 'Main Course'), 'Vegetable Stir Fry', 220.00),
((SELECT id FROM menu_categories WHERE name = 'Main Course'), 'Seafood Pasta', 320.00),

-- Desserts
((SELECT id FROM menu_categories WHERE name = 'Desserts'), 'Chocolate Cake', 150.00),
((SELECT id FROM menu_categories WHERE name = 'Desserts'), 'Ice Cream Sundae', 120.00),
((SELECT id FROM menu_categories WHERE name = 'Desserts'), 'Fresh Fruit Platter', 180.00),

-- Beverages
((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Fresh Lemonade', 60.00),
((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Iced Tea', 50.00),
((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Coffee', 70.00),
((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Fresh Juice', 80.00),

-- Specials
((SELECT id FROM menu_categories WHERE name = 'Specials'), 'Chef\'s Special Platter', 550.00),
((SELECT id FROM menu_categories WHERE name = 'Specials'), 'Holiday Feast', 480.00)
ON CONFLICT DO NOTHING;
