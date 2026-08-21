import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Combined "initial load" endpoint.
//
// Bundles the 9 separate GET-all queries that the frontend used to fire
// individually on every session restore / page load (categories, products,
// sales, stock logs, rooms, bookings, expenses, menu categories, menu items)
// into a single request. This cuts session-restore time significantly,
// especially right after a Render cold start, since it replaces 9 sequential
// HTTP round trips (each with their own connection/TLS overhead) with 1.
//
// Each query below is copied EXACTLY from its original route file
// (categories.js, products.js, sales.js, stockLogs.js, rooms.js, bookings.js,
// expenses.js, menuCategories.js, menuItems.js) so the shape of the data
// returned here is identical to what each individual endpoint already
// returns. If any of those original queries change, this file must be
// updated to match.
router.get('/', authenticate, async (req, res) => {
  try {
    const [
      categoriesResult,
      productsResult,
      salesResult,
      stockLogsResult,
      roomsResult,
      bookingsResult,
      expensesResult,
      menuCategoriesResult,
      menuItemsResult
    ] = await Promise.all([
      // categories.js
      pool.query(
        'SELECT id, name, created_at FROM categories ORDER BY name ASC'
      ),

      // products.js
      pool.query(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.name ASC
      `),

      // sales.js
      pool.query(`
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
      `),

      // stockLogs.js
      pool.query(`
        SELECT id, date, product_id, product_name, type, prev_stock, qty_changed, new_stock, user_id, user_name, remarks, created_at
        FROM stock_logs
        ORDER BY date DESC
      `),

      // rooms.js
      pool.query(
        'SELECT id, room_number, room_type, capacity, status, floor_number, created_at, updated_at FROM rooms ORDER BY room_number ASC'
      ),

      // bookings.js — includes the same fallback for older schemas missing
      // order_items/addons_items columns that the original endpoint has.
      pool.query(
        `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
                b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
                b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_order, b.order_items, b.is_addons, b.addons_items, b.created_at, b.updated_at
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id
         ORDER BY b.check_in_date DESC`
      ).catch(err => {
        if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
            err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
          return pool.query(
            `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
                    b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
                    b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_addons, b.created_at, b.updated_at
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             ORDER BY b.check_in_date DESC`
          );
        }
        throw err;
      }),

      // expenses.js
      pool.query(`
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
      `),

      // menuCategories.js
      pool.query(`
        SELECT id, name, created_at, updated_at 
        FROM menu_categories 
        ORDER BY name ASC
      `),

      // menuItems.js
      pool.query(`
        SELECT mi.*,
               mc.name as category_name
        FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        ORDER BY mc.name ASC, mi.name ASC
      `)
    ]);

    res.json({
      categories: categoriesResult.rows,
      products: productsResult.rows,
      sales: salesResult.rows,
      stockLogs: stockLogsResult.rows,
      rooms: roomsResult.rows,
      bookings: bookingsResult.rows,
      expenses: expensesResult.rows,
      menuCategories: menuCategoriesResult.rows,
      menuItems: menuItemsResult.rows
    });
  } catch (error) {
    console.error('Bootstrap load error:', error);
    res.status(500).json({ error: 'Failed to load initial data' });
  }
});

export default router;
