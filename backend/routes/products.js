import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create product (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, category_id, price, current_stock, min_stock, total_sold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    const trimmedName = name.trim();
    const stock = current_stock || 0;
    const minStock = min_stock || 10;
    const sold = total_sold || 0;

    await client.query('BEGIN');

    // Check if product name exists
    const existing = await client.query(
      'SELECT id FROM products WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Product with this name already exists' });
    }

    const result = await client.query(
      `INSERT INTO products (name, category_id, price, current_stock, min_stock, total_sold) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, category_id, price, current_stock, min_stock, total_sold, created_at`,
      [trimmedName, category_id, price, stock, minStock, sold]
    );

    const product = result.rows[0];

    // Create stock log if initial stock > 0
    if (stock > 0) {
      await client.query(
        `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [product.id, product.name, 'Stock In', 0, stock, stock, req.user.id, req.user.name, 'Initial stock']
      );
    }

    await client.query('COMMIT');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('product:created', product);

    res.status(201).json(product);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

// Update product (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { name, category_id, price, current_stock, min_stock, total_sold } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    const trimmedName = name.trim();

    await client.query('BEGIN');

    // Check if product exists and get current stock
    const existing = await client.query('SELECT id, name, current_stock FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentProduct = existing.rows[0];
    const oldStock = currentProduct.current_stock;
    const newStock = current_stock || 0;

    // Check if name exists for another product
    const nameCheck = await client.query(
      'SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, id]
    );

    if (nameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Product name already exists' });
    }

    const result = await client.query(
      `UPDATE products 
       SET name = $1, category_id = $2, price = $3, current_stock = $4, min_stock = $5, total_sold = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING id, name, category_id, price, current_stock, min_stock, total_sold, created_at`,
      [trimmedName, category_id, price, newStock, min_stock || 10, total_sold || 0, id]
    );

    const updatedProduct = result.rows[0];

    // Create stock log if stock changed
    if (oldStock !== newStock) {
      const qtyChanged = newStock - oldStock;
      const logType = qtyChanged > 0 ? 'Stock In' : 'Adjustment';
      
      await client.query(
        `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [updatedProduct.id, updatedProduct.name, logType, oldStock, qtyChanged, newStock, req.user.id, req.user.name, 'Stock adjustment']
      );
    }

    await client.query('COMMIT');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('product:updated', updatedProduct);

    res.json(updatedProduct);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  } finally {
    client.release();
  }
});

// Delete product (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existing = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('product:deleted', id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
