import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdminOrStaff } from '../middleware/auth.js';

const router = express.Router();

// Get all menu items
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mi.*,
             mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      ORDER BY mc.name ASC, mi.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get menu items by category
router.get('/category/:categoryId', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await pool.query(`
      SELECT mi.*,
             mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.category_id = $1
      ORDER BY mi.name ASC
    `, [categoryId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get menu items by category error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get menu item by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT mi.*,
             mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create menu item (admin or staff)
router.post('/', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { category_id, name, price, stock, min_stock, sold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Menu item name is required' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!price || price < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({ error: 'Valid stock quantity is required' });
    }

    if (min_stock !== undefined && (isNaN(min_stock) || min_stock < 0)) {
      return res.status(400).json({ error: 'Valid minimum stock is required' });
    }

    // Check if category exists
    const categoryCheck = await pool.query('SELECT id FROM menu_categories WHERE id = $1', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const trimmedName = name.trim();

    // Check if menu item name already exists
    const existing = await pool.query(
      'SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Menu item with this name already exists' });
    }

    const stockValue = stock !== undefined ? stock : 0;
    const minStockValue = min_stock !== undefined ? min_stock : 0;
    const soldValue = sold !== undefined ? sold : 0;

    const result = await pool.query(
      `INSERT INTO menu_items (category_id, name, price, stock, min_stock, sold)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, category_id, name, price, stock, min_stock, sold, created_at, updated_at`,
      [category_id, trimmedName, price, stockValue, minStockValue, soldValue]
    );

    const menuItem = result.rows[0];

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('menuItem:created', menuItem);

    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item (admin or staff)
router.put('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, stock, min_stock, sold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Menu item name is required' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!price || price < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({ error: 'Valid stock quantity is required' });
    }

    if (min_stock !== undefined && (isNaN(min_stock) || min_stock < 0)) {
      return res.status(400).json({ error: 'Valid minimum stock is required' });
    }

    // Check if menu item exists
    const existing = await pool.query('SELECT id FROM menu_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if category exists
    const categoryCheck = await pool.query('SELECT id FROM menu_categories WHERE id = $1', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const trimmedName = name.trim();

    // Check if name exists for another menu item
    const nameCheck = await pool.query(
      'SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Menu item name already exists' });
    }

    const stockValue = stock !== undefined ? stock : 0;
    const minStockValue = min_stock !== undefined ? min_stock : 0;
    const soldValue = sold !== undefined ? sold : 0;

    const result = await pool.query(
      `UPDATE menu_items
       SET category_id = $1,
           name = $2,
           price = $3,
           stock = $4,
           min_stock = $5,
           sold = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, category_id, name, price, stock, min_stock, sold, created_at, updated_at`,
      [category_id, trimmedName, price, stockValue, minStockValue, soldValue, id]
    );

    const updatedMenuItem = result.rows[0];

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('menuItem:updated', updatedMenuItem);

    res.json(updatedMenuItem);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item (admin or staff)
router.delete('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if menu item exists
    const existing = await pool.query('SELECT id, name, stock FROM menu_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItem = existing.rows[0];

    // Check if menu item has remaining stock
    if (menuItem.stock > 0) {
      return res.status(400).json({ error: `Cannot delete menu item "${menuItem.name}" with ${menuItem.stock} remaining stock. Please reduce stock to 0 first.` });
    }

    await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('menuItem:deleted', id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;
