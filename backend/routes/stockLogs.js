import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all stock logs
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at
      FROM stock_logs
      ORDER BY date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get stock logs error:', error);
    res.status(500).json({ error: 'Failed to fetch stock logs' });
  }
});

// Create stock log (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { product_id, type, qty_changed, new_stock, remarks } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!type || !['Stock In', 'Sale', 'Adjustment'].includes(type)) {
      return res.status(400).json({ error: 'Valid type is required (Stock In, Sale, or Adjustment)' });
    }

    // Get current product info
    const productResult = await pool.query(
      'SELECT id, name, current_stock FROM products WHERE id = $1',
      [product_id]
    );

    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const prevStock = product.current_stock;
    const qtyChanged = qty_changed || 0;
    const finalNewStock = new_stock !== undefined ? new_stock : (prevStock + qtyChanged);

    // Update product stock
    await pool.query(
      'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [finalNewStock, product_id]
    );

    // Create stock log
    const result = await pool.query(
      `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
      [product_id, product.name, type, prevStock, qtyChanged, finalNewStock, req.user.id, req.user.name, remarks || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create stock log error:', error);
    res.status(500).json({ error: 'Failed to create stock log' });
  }
});

export default router;
