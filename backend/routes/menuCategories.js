import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdminOrStaff } from '../middleware/auth.js';

const router = express.Router();

// Get all menu categories
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, created_at, updated_at 
      FROM menu_categories 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get menu categories error:', error);
    res.status(500).json({ error: 'Failed to fetch menu categories' });
  }
});

// Get menu category by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, created_at, updated_at FROM menu_categories WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get menu category error:', error);
    res.status(500).json({ error: 'Failed to fetch menu category' });
  }
});

// Create menu category (admin or staff)
router.post('/', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Check if category name exists
    const existing = await pool.query(
      'SELECT id FROM menu_categories WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO menu_categories (name) 
       VALUES ($1) 
       RETURNING id, name, created_at, updated_at`,
      [trimmedName]
    );

    const category = result.rows[0];

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('menuCategory:created', category);

    res.status(201).json(category);
  } catch (error) {
    console.error('Create menu category error:', error);
    res.status(500).json({ error: 'Failed to create menu category' });
  }
});

// Update menu category (admin or staff)
router.put('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Check if category exists
    const existing = await pool.query('SELECT id FROM menu_categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu category not found' });
    }

    // Check if name exists for another category
    const nameCheck = await pool.query(
      'SELECT id FROM menu_categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    const result = await pool.query(
      `UPDATE menu_categories 
       SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, created_at, updated_at`,
      [trimmedName, id]
    );

    const updatedCategory = result.rows[0];

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('menuCategory:updated', updatedCategory);

    res.json(updatedCategory);
  } catch (error) {
    console.error('Update menu category error:', error);
    res.status(500).json({ error: 'Failed to update menu category' });
  }
});

// Delete menu category (admin or staff)
router.delete('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await client.query('SELECT id, name FROM menu_categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu category not found' });
    }

    const category = existing.rows[0];

    // Check if category has menu items
    const itemsCheck = await client.query(
      'SELECT COUNT(*) as count FROM menu_items WHERE category_id = $1',
      [id]
    );

    if (parseInt(itemsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category "${category.name}" with ${itemsCheck.rows[0].count} menu items. Please reassign or delete the items first.` 
      });
    }

    await client.query('DELETE FROM menu_categories WHERE id = $1', [id]);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('menuCategory:deleted', id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete menu category error:', error);
    res.status(500).json({ error: 'Failed to delete menu category' });
  } finally {
    client.release();
  }
});

export default router;
