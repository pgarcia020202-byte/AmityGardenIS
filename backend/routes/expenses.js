import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', ei.product_id,
                 'productName', ei.product_name,
                 'qty', ei.qty,
                 'unitPrice', ei.unit_price,
                 'subtotal', ei.subtotal
               )
             ) FILTER (WHERE ei.id IS NOT NULL), '[]') as items
      FROM expenses e
      LEFT JOIN expense_items ei ON e.id = ei.expense_id
      GROUP BY e.id
      ORDER BY e.date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Create expense (similar to sales - reduces stock)
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Expense items are required' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'Valid total is required' });
    }

    await client.query('BEGIN');

    const debouncedEmit = req.app.get('debouncedEmit');

    // Create expense record
    const expenseResult = await client.query(
      `INSERT INTO expenses (user_id, user_name, total, date) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       RETURNING id, user_id, user_name, total, date, created_at`,
      [req.user.id, req.user.name, total]
    );

    const expense = expenseResult.rows[0];

    // Create expense items and update product stock
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

      debouncedEmit('product:updated', updatedProduct);

      // Create stock log - show cumulative negative change
      const stockLogResult = await client.query(
        `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
        [item.productId, item.productName, 'Expenses', prevStock, -item.qty, newStock, req.user.id, req.user.name, `Staff Expense #${expense.id}`]
      );
      debouncedEmit('stockLog:created', stockLogResult.rows[0]);

      // Insert expense item with stock_log_id reference
      await client.query(
        `INSERT INTO expense_items (expense_id, product_id, product_name, qty, unit_price, subtotal, stock_log_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [expense.id, item.productId, item.productName, item.qty, item.unitPrice, item.subtotal, stockLogResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    // Fetch the complete expense with items
    const completeExpense = await client.query(`
      SELECT e.*, 
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', ei.product_id,
                 'productName', ei.product_name,
                 'qty', ei.qty,
                 'unitPrice', ei.unit_price,
                 'subtotal', ei.subtotal
               )
             ) FILTER (WHERE ei.id IS NOT NULL), '[]') as items
      FROM expenses e
      LEFT JOIN expense_items ei ON e.id = ei.expense_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [expense.id]);

    debouncedEmit('expense:created', completeExpense.rows[0]);

    res.status(201).json(completeExpense.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  } finally {
    client.release();
  }
});

// Update expense
router.put('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { items, total } = req.body;
    const { id } = req.params;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Expense items are required' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'Valid total is required' });
    }

    await client.query('BEGIN');

    const debouncedEmit = req.app.get('debouncedEmit');

    // Get existing expense items with stock_log_id
    const existingItemsResult = await client.query(
      'SELECT id, product_id, product_name, qty, unit_price, subtotal, stock_log_id FROM expense_items WHERE expense_id = $1',
      [id]
    );

    // Create a map of existing items by product_id for easy lookup
    const originalMap = new Map();
    for (const item of existingItemsResult.rows) {
      originalMap.set(item.product_id, item);
    }

    // Process new items
    for (const newItem of items) {
      const originalItem = originalMap.get(newItem.productId);

      if (originalItem) {
        // Item exists - calculate quantity difference
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

          const productResult = await client.query(
            'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
            [newItem.productId]
          );
          const updatedProduct = productResult.rows[0];
          const newStock = updatedProduct.current_stock;
          const prevStock = newStock - qtyDiff;

          debouncedEmit('product:updated', updatedProduct);

          // Update existing stock log if it exists, otherwise create new one
          if (originalItem.stock_log_id) {
            const originalPrevStock = newStock + newItem.qty;
            await client.query(
              `UPDATE stock_logs 
               SET prev_stock = $1, qty_changed = $2, new_stock = $3, user_id = $4, user_name = $5, remarks = $6
               WHERE id = $7`,
              [originalPrevStock, -newItem.qty, newStock, req.user.id, req.user.name, `Expense edit #${id}`, originalItem.stock_log_id]
            );
            
            const updatedLogResult = await client.query(
              'SELECT id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at FROM stock_logs WHERE id = $1',
              [originalItem.stock_log_id]
            );
            debouncedEmit('stockLog:created', updatedLogResult.rows[0]);
          } else {
            // Fallback: create new stock log for historical data without stock_log_id
            const originalPrevStock = newStock + newItem.qty;
            const stockLogResult = await client.query(
              `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
              [newItem.productId, newItem.productName, 'Expenses', originalPrevStock, -newItem.qty, newStock, req.user.id, req.user.name, `Expense edit #${id}`]
            );
            debouncedEmit('stockLog:created', stockLogResult.rows[0]);
            
            await client.query(
              `UPDATE expense_items SET stock_log_id = $1 WHERE id = $2`,
              [stockLogResult.rows[0].id, originalItem.id]
            );
          }
        }

        // Update expense item
        await client.query(
          `UPDATE expense_items 
           SET qty = $1, subtotal = $2
           WHERE expense_id = $3 AND product_id = $4`,
          [newItem.qty, newItem.unitPrice * newItem.qty, id, newItem.productId]
        );

        originalMap.delete(newItem.productId);
      } else {
        // New item added - insert it and update stock
        await client.query(
          `INSERT INTO expense_items (expense_id, product_id, product_name, qty, unit_price, subtotal) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, newItem.productId, newItem.productName, newItem.qty, newItem.unitPrice, newItem.unitPrice * newItem.qty]
        );

        await client.query(
          `UPDATE products 
           SET current_stock = current_stock - $1,
               total_sold = total_sold + $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [newItem.qty, newItem.qty, newItem.productId]
        );

        const productResult = await client.query(
          'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
          [newItem.productId]
        );
        const updatedProduct = productResult.rows[0];
        const newStock = updatedProduct.current_stock;
        const prevStock = newStock + newItem.qty;

        debouncedEmit('product:updated', updatedProduct);

        const stockLogResult = await client.query(
          `INSERT INTO stock_logs (product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at`,
          [newItem.productId, newItem.productName, 'Expenses', prevStock, -newItem.qty, newStock, req.user.id, req.user.name, `Expense edit #${id}`]
        );
        debouncedEmit('stockLog:created', stockLogResult.rows[0]);

        await client.query(
          `UPDATE expense_items SET stock_log_id = $1 WHERE expense_id = $2 AND product_id = $3`,
          [stockLogResult.rows[0].id, id, newItem.productId]
        );
      }
    }

    // Remove items that are no longer in the expense
    for (const [productId, originalItem] of originalMap) {
      // Revert stock
      await client.query(
        `UPDATE products 
         SET current_stock = current_stock + $1,
             total_sold = total_sold - $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [originalItem.qty, originalItem.qty, productId]
      );

      const productResult = await client.query(
        'SELECT id, name, category_id, price, current_stock, min_stock, total_sold, created_at, updated_at FROM products WHERE id = $1',
        [productId]
      );
      const updatedProduct = productResult.rows[0];
      debouncedEmit('product:updated', updatedProduct);

      // Delete the associated stock log if it exists
      if (originalItem.stock_log_id) {
        await client.query('DELETE FROM stock_logs WHERE id = $1', [originalItem.stock_log_id]);
        debouncedEmit('stockLog:deleted', originalItem.stock_log_id);
      }

      // Delete expense item
      await client.query('DELETE FROM expense_items WHERE id = $1', [originalItem.id]);
    }

    // Update expense total
    await client.query(
      'UPDATE expenses SET total = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [total, id]
    );

    await client.query('COMMIT');

    // Fetch the complete expense with items
    const completeExpense = await client.query(`
      SELECT e.*, 
             COALESCE(JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', ei.product_id,
                 'productName', ei.product_name,
                 'qty', ei.qty,
                 'unitPrice', ei.unit_price,
                 'subtotal', ei.subtotal
               )
             ) FILTER (WHERE ei.id IS NOT NULL), '[]') as items
      FROM expenses e
      LEFT JOIN expense_items ei ON e.id = ei.expense_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);

    if (completeExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    debouncedEmit('expense:updated', completeExpense.rows[0]);

    res.json(completeExpense.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  } finally {
    client.release();
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const debouncedEmit = req.app.get('debouncedEmit');

    // Get expense items to restore stock and delete associated stock logs
    const itemsResult = await client.query(
      'SELECT product_id, product_name, qty, stock_log_id FROM expense_items WHERE expense_id = $1',
      [id]
    );

    // Restore product stock and total sold
    for (const item of itemsResult.rows) {
      // Delete the associated stock log if it exists (do this first, before product checks)
      if (item.stock_log_id) {
        await client.query('DELETE FROM stock_logs WHERE id = $1', [item.stock_log_id]);
        debouncedEmit('stockLog:deleted', item.stock_log_id);
      }

      // Skip if product_id is NULL (product was deleted)
      if (!item.product_id) {
        console.warn(`Product ID is NULL for expense item, skipping stock restoration for expense ${id}`);
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
        console.warn(`Product ${item.product_id} not found, skipping stock log for expense ${id}`);
        continue;
      }
       
      const updatedProduct = productResult.rows[0];
      const newStock = updatedProduct.current_stock;
      const prevStock = newStock - item.qty;

      debouncedEmit('product:updated', updatedProduct);
    }

    // Delete expense (cascade will delete expense_items)
    await client.query('DELETE FROM expenses WHERE id = $1', [id]);

    await client.query('COMMIT');

    debouncedEmit('expense:deleted', id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  } finally {
    client.release();
  }
});

export default router;
