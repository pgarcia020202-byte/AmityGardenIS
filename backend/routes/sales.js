import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all sales
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', si.product_id,
                 'productName', si.product_name,
                 'qty', si.qty,
                 'unitPrice', si.unit_price,
                 'subtotal', si.subtotal
               )
             ) FILTER (WHERE si.id IS NOT NULL), '[]') as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Create sale
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sale items are required' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'Valid total is required' });
    }

    await client.query('BEGIN');

    // Create sale record
    const saleResult = await client.query(
      `INSERT INTO sales (user_id, user_name, total, date) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       RETURNING id, user_id, user_name, total, date, created_at`,
      [req.user.id, req.user.name, total]
    );

    const sale = saleResult.rows[0];

    // Create sale items and update product stock
    for (const item of items) {
      // Insert sale item
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, subtotal) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sale.id, item.productId, item.productName, item.qty, item.unitPrice, item.subtotal]
      );

      // Update product stock and total sold
      await client.query(
        `UPDATE products 
         SET current_stock = current_stock - $1,
             total_sold = total_sold + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [item.qty, item.qty, item.productId]
      );

      // Get current product stock for log and emit updated product event
      const productResult = await client.query(
        'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
        [item.productId]
      );
      const updatedProduct = productResult.rows[0];
      const newStock = updatedProduct.current_stock;
      const prevStock = newStock + item.qty;

      const io = req.app.get('io');
      io.emit('product:updated', updatedProduct);

      // Create stock log
      const stockLogResult = await client.query(
        `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
        [item.productId, item.productName, 'Sale', prevStock, -item.qty, newStock, req.user.id, req.user.name, `Sale #${sale.id}`]
      );
      io.emit('stockLog:created', stockLogResult.rows[0]);
    }

    await client.query('COMMIT');

    // Fetch complete sale with items
    const completeResult = await client.query(`
      SELECT s.*, 
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', si.product_id,
                 'productName', si.product_name,
                 'qty', si.qty,
                 'unitPrice', si.unit_price,
                 'subtotal', si.subtotal
               )
             ) FILTER (WHERE si.id IS NOT NULL), '[]') as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.id = $1
      GROUP BY s.id
    `, [sale.id]);

    const newSale = completeResult.rows[0];

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('sale:created', newSale);

    res.status(201).json(newSale);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  } finally {
    client.release();
  }
});

// Delete sale (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get sale items to restore stock
    const itemsResult = await client.query(
      'SELECT product_id, product_name, qty FROM sale_items WHERE sale_id = $1',
      [id]
    );

    // Restore product stock and total sold
    for (const item of itemsResult.rows) {
      // Skip if product_id is NULL (product was deleted)
      if (!item.product_id) {
        console.warn(`Product ID is NULL for sale item, skipping stock restoration for sale ${id}`);
        continue;
      }

      await client.query(
        `UPDATE products 
         SET current_stock = current_stock + $1,
             total_sold = GREATEST(total_sold - $2, 0),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [item.qty, item.qty, item.product_id]
      );

      // Get current product stock for log and emit product update
      const productResult = await client.query(
        'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
        [item.product_id]
      );
       
      // Skip if product no longer exists
      if (productResult.rows.length === 0) {
        console.warn(`Product ${item.product_id} not found, skipping stock log for sale ${id}`);
        continue;
      }
       
      const updatedProduct = productResult.rows[0];
      const newStock = updatedProduct.current_stock;
      const prevStock = newStock - item.qty;

      const io = req.app.get('io');
      io.emit('product:updated', updatedProduct);

      // Create stock log for reversal
      const stockLogResult = await client.query(
        `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
        [item.product_id, item.product_name, 'Adjustment', prevStock, item.qty, newStock, req.user.id, req.user.name, `Sale reversal #${id}`]
      );
      io.emit('stockLog:created', stockLogResult.rows[0]);
    }

    // Delete sale (cascade will delete sale items)
    await client.query('DELETE FROM sales WHERE id = $1', [id]);

    await client.query('COMMIT');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('sale:deleted', id);

    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Failed to delete sale' });
  } finally {
    client.release();
  }
});

export default router;
