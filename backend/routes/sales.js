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

      // Create stock log - show cumulative negative change
      const stockLogResult = await client.query(
        `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
        [item.productId, item.productName, 'Sale', prevStock, -item.qty, newStock, req.user.id, req.user.name, `Sale #${sale.id}`]
      );
      io.emit('stockLog:created', stockLogResult.rows[0]);

      // Insert sale item with stock_log_id reference
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, subtotal, stock_log_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sale.id, item.productId, item.productName, item.qty, item.unitPrice, item.subtotal, stockLogResult.rows[0].id]
      );
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

// Update sale (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sale items are required' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'Valid total is required' });
    }

    await client.query('BEGIN');

    // Get original sale items with stock_log_id
    const originalItemsResult = await client.query(
      'SELECT id, product_id, product_name, qty, unit_price, stock_log_id FROM sale_items WHERE sale_id = $1',
      [id]
    );
    const originalItems = originalItemsResult.rows;

    // Create maps for easy comparison
    const originalMap = new Map();
    originalItems.forEach(item => {
      originalMap.set(item.product_id, item);
    });

    const newMap = new Map();
    items.forEach(item => {
      newMap.set(item.productId, item);
    });

    // Process each item in the updated sale
    for (const newItem of items) {
      const originalItem = originalMap.get(newItem.productId);
      
      if (originalItem) {
        // Item exists in both - check if quantity changed
        const qtyDiff = newItem.qty - originalItem.qty;
        
        if (qtyDiff !== 0) {
          // Update product stock
          await client.query(
            `UPDATE products 
             SET current_stock = current_stock - $1,
                 total_sold = total_sold + $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [qtyDiff, qtyDiff, newItem.productId]
          );

          // Get current product stock for log
          const productResult = await client.query(
            'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
            [newItem.productId]
          );
          const updatedProduct = productResult.rows[0];
          const newStock = updatedProduct.current_stock;
          const prevStock = newStock - qtyDiff;

          const io = req.app.get('io');
          io.emit('product:updated', updatedProduct);

          // Update existing stock log if it exists, otherwise create new one
          if (originalItem.stock_log_id) {
            // Calculate cumulative: prev_stock is stock before original sale, qty_changed is negative of new quantity
            const originalPrevStock = newStock + newItem.qty;
            await client.query(
              `UPDATE stock_logs 
               SET prev_stock = $1, qty_changed = $2, new_stock = $3, user_id = $4, user_name = $5, remarks = $6
               WHERE id = $7`,
              [originalPrevStock, -newItem.qty, newStock, req.user.id, req.user.name, `Sale edit #${id}`, originalItem.stock_log_id]
            );
            
            // Emit updated stock log event
            const updatedLogResult = await client.query(
              'SELECT id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at FROM stock_logs WHERE id = $1',
              [originalItem.stock_log_id]
            );
            io.emit('stockLog:created', updatedLogResult.rows[0]);
          } else {
            // Fallback: create new stock log for historical data without stock_log_id
            const originalPrevStock = newStock + newItem.qty;
            const stockLogResult = await client.query(
              `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
              [newItem.productId, newItem.productName, 'Sale', originalPrevStock, -newItem.qty, newStock, req.user.id, req.user.name, `Sale edit #${id}`]
            );
            io.emit('stockLog:created', stockLogResult.rows[0]);
            
            // Update sale item with new stock_log_id
            await client.query(
              `UPDATE sale_items SET stock_log_id = $1 WHERE id = $2`,
              [stockLogResult.rows[0].id, originalItem.id]
            );
          }
        }

        // Update sale item
        await client.query(
          `UPDATE sale_items 
           SET qty = $1, subtotal = $2
           WHERE sale_id = $3 AND product_id = $4`,
          [newItem.qty, newItem.unitPrice * newItem.qty, id, newItem.productId]
        );

        // Remove from original map to mark as processed
        originalMap.delete(newItem.productId);
      } else {
        // New item added - insert it and update stock
        await client.query(
          `INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, subtotal) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, newItem.productId, newItem.productName, newItem.qty, newItem.unitPrice, newItem.unitPrice * newItem.qty]
        );

        // Update product stock
        await client.query(
          `UPDATE products 
           SET current_stock = current_stock - $1,
               total_sold = total_sold + $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [newItem.qty, newItem.qty, newItem.productId]
        );

        // Get current product stock for log
        const productResult = await client.query(
          'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
          [newItem.productId]
        );
        const updatedProduct = productResult.rows[0];
        const newStock = updatedProduct.current_stock;
        const prevStock = newStock + newItem.qty;

        const io = req.app.get('io');
        io.emit('product:updated', updatedProduct);

        // Create stock log - show cumulative negative change
        const stockLogResult = await client.query(
          `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
          [newItem.productId, newItem.productName, 'Sale', prevStock, -newItem.qty, newStock, req.user.id, req.user.name, `Sale edit #${id}`]
        );
        io.emit('stockLog:created', stockLogResult.rows[0]);
      }
    }

    // Remove items that are no longer in the sale
    for (const [productId, originalItem] of originalMap) {
      // Delete sale item
      await client.query(
        'DELETE FROM sale_items WHERE sale_id = $1 AND product_id = $2',
        [id, productId]
      );

      // Restore product stock
      await client.query(
        `UPDATE products 
         SET current_stock = current_stock + $1,
             total_sold = GREATEST(total_sold - $2, 0),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [originalItem.qty, originalItem.qty, productId]
      );

      // Get current product stock for log
      const productResult = await client.query(
        'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
        [productId]
      );
      
      if (productResult.rows.length > 0) {
        const updatedProduct = productResult.rows[0];
        const newStock = updatedProduct.current_stock;
        const prevStock = newStock - originalItem.qty;

        const io = req.app.get('io');
        io.emit('product:updated', updatedProduct);

        // Delete the original stock log if it exists
        if (originalItem.stock_log_id) {
          await client.query('DELETE FROM stock_logs WHERE id = $1', [originalItem.stock_log_id]);
        }
      }
    }

    // Update sale total
    await client.query(
      'UPDATE sales SET total = $1 WHERE id = $2',
      [total, id]
    );

    await client.query('COMMIT');

    // Fetch complete updated sale with items
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
    `, [id]);

    const updatedSale = completeResult.rows[0];

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('sale:updated', updatedSale);

    res.json(updatedSale);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Failed to update sale' });
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

    // Get sale items to restore stock and delete associated stock logs
    const itemsResult = await client.query(
      'SELECT product_id, product_name, qty, stock_log_id FROM sale_items WHERE sale_id = $1',
      [id]
    );

    // Restore product stock and total sold
    for (const item of itemsResult.rows) {
      // Delete the associated stock log if it exists (do this first, before product checks)
      if (item.stock_log_id) {
        await client.query('DELETE FROM stock_logs WHERE id = $1', [item.stock_log_id]);
      }

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
