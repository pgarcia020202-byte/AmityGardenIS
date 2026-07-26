import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin, requireAdminOrStaff } from '../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category (admin or staff)
router.post('/', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Check if category exists
    const existing = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at',
      [trimmedName]
    );

    const newCategory = result.rows[0];

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('category:created', newCategory);

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin or staff)
router.put('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Check if category exists
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if name exists for another category
    const nameCheck = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, created_at',
      [trimmedName, id]
    );

    const updatedCategory = result.rows[0];

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('category:updated', updatedCategory);

    res.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin or staff)
router.delete('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has products
    const products = await pool.query('SELECT id FROM products WHERE category_id = $1', [id]);
    if (products.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products. Please reassign or delete the products first.' });
    }

    // Delete category
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('category:deleted', id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
