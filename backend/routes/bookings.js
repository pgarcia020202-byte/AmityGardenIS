import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdminOrStaff } from '../middleware/auth.js';

const router = express.Router();

// Helper function to process menu item stock and sales
async function processMenuItemStockAndSales(items, req) {
  if (!items || !Array.isArray(items) || items.length === 0) return;

  for (const item of items) {
    if (!item.id || !item.quantity || item.quantity <= 0) continue;

    try {
      // Get current menu item data
      const menuItem = await pool.query(
        'SELECT id, stock, sold FROM menu_items WHERE id = $1',
        [item.id]
      );

      if (menuItem.rows.length === 0) continue;

      const currentStock = menuItem.rows[0].stock || 0;
      const currentSold = menuItem.rows[0].sold || 0;
      const quantity = parseInt(item.quantity);

      // Deduct stock and increment sales
      const newStock = Math.max(0, currentStock - quantity);
      const newSold = currentSold + quantity;

      await pool.query(
        'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
        [newStock, newSold, item.id]
      );

      // Emit socket event for real-time update
      const debouncedEmit = req.app.get('debouncedEmit');
      const updatedMenuItem = {
        id: item.id,
        stock: newStock,
        sold: newSold
      };
      debouncedEmit('menuItem:updated', updatedMenuItem);
    } catch (error) {
      console.error(`Error processing menu item ${item.id}:`, error);
    }
  }
}

// Helper function to revert menu item stock and sales (for removals)
async function revertMenuItemStockAndSales(items, req) {
  if (!items || !Array.isArray(items) || items.length === 0) return;

  for (const item of items) {
    if (!item.id || !item.quantity || item.quantity <= 0) continue;

    try {
      // Get current menu item data
      const menuItem = await pool.query(
        'SELECT id, stock, sold FROM menu_items WHERE id = $1',
        [item.id]
      );

      if (menuItem.rows.length === 0) continue;

      const currentStock = menuItem.rows[0].stock || 0;
      const currentSold = menuItem.rows[0].sold || 0;
      const quantity = parseInt(item.quantity);

      // Add back stock and decrement sales
      const newStock = currentStock + quantity;
      const newSold = Math.max(0, currentSold - quantity);

      await pool.query(
        'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
        [newStock, newSold, item.id]
      );

      // Emit socket event for real-time update
      const debouncedEmit = req.app.get('debouncedEmit');
      const updatedMenuItem = {
        id: item.id,
        stock: newStock,
        sold: newSold
      };
      debouncedEmit('menuItem:updated', updatedMenuItem);
    } catch (error) {
      console.error(`Error reverting menu item ${item.id}:`, error);
    }
  }
}

// Get all bookings
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
              b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
              b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_order, b.order_items, b.is_addons, b.addons_items, b.created_at, b.updated_at
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       ORDER BY b.check_in_date DESC`
    ).catch(err => {
      // Fallback if order_items or addons_items column doesn't exist yet
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
    });
    res.json(result.rows);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get active bookings (checked in)
router.get('/active', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
              b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
              b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_order, b.order_items, b.is_addons, b.addons_items, b.created_at, b.updated_at
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.status = 'Checked In'
       ORDER BY b.check_in_date DESC`
    ).catch(err => {
      // Fallback if order_items or addons_items column doesn't exist yet
      if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
          err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
        return pool.query(
          `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
                  b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
                  b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_addons, b.created_at, b.updated_at
           FROM bookings b
           JOIN rooms r ON b.room_id = r.id
           WHERE b.status = 'Checked In'
           ORDER BY b.check_in_date DESC`
        );
      }
      throw err;
    });
    res.json(result.rows);
  } catch (error) {
    console.error('Get active bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch active bookings' });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
              b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
              b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_order, b.order_items, b.is_addons, b.addons_items, b.created_at, b.updated_at
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`,
      [id]
    ).catch(err => {
      // Fallback if order_items or addons_items column doesn't exist yet
      if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
          err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
        return pool.query(
          `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
                  b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
                  b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_addons, b.created_at, b.updated_at
           FROM bookings b
           JOIN rooms r ON b.room_id = r.id
           WHERE b.id = $1`,
          [id]
        );
      }
      throw err;
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create booking (check-in) (admin or staff)
router.post('/', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { room_id, guest_name, guest_contact, number_of_guests, price, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items } = req.body;

    if (!room_id) {
      return res.status(400).json({ error: 'Room is required' });
    }
    if (!number_of_guests || number_of_guests <= 0) {
      return res.status(400).json({ error: 'Number of guests must be greater than 0' });
    }
    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    // Check if room exists and is available
    const room = await pool.query('SELECT id, status FROM rooms WHERE id = $1', [room_id]);
    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.rows[0].status !== 'Available') {
      return res.status(400).json({ error: 'Room is not available' });
    }

    const trimmedGuestName = guest_name ? guest_name.trim() : null;
    const timerDurationValue = timer_duration || 30; // Default to 30 minutes if not provided

    // Try with order_items and addons_items columns first, fall back to without them
    let result;
    try {
      result = await pool.query(
        `INSERT INTO bookings (room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'Checked In', $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items, created_at, updated_at`,
        [room_id, trimmedGuestName, guest_contact, number_of_guests, price, notes, timerDurationValue, is_complimentary || false, complimentary_item_1 || null, complimentary_item_2 || null, is_order || false, JSON.stringify(order_items || []), is_addons || false, JSON.stringify(addons_items || [])]
      );
    } catch (err) {
      // Fallback if order_items or addons_items column doesn't exist yet
      if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
          err.message.includes('column "addons_items" of relation "bookings" does not exist') ||
          err.message.includes('INSERT has more expressions than target columns')) {
        result = await pool.query(
          `INSERT INTO bookings (room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons)
           VALUES ($1, $2, $3, $4, $5, NOW(), 'Checked In', $6, $7, $8, $9, $10, $11)
           RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, created_at, updated_at`,
          [room_id, trimmedGuestName, guest_contact, number_of_guests, price, notes, timerDurationValue, is_complimentary || false, complimentary_item_1 || null, complimentary_item_2 || null, is_addons || false]
        );
      } else {
        throw err;
      }
    }

    const newBooking = result.rows[0];

    // If the fallback was used, fetch the booking again to get all fields
    if (!newBooking.order_items && !newBooking.addons_items) {
      const freshBooking = await pool.query(
        'SELECT id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items, created_at, updated_at FROM bookings WHERE id = $1',
        [newBooking.id]
      );
      Object.assign(newBooking, freshBooking.rows[0]);
    }

    // Process menu item stock and sales for order items
    if (order_items && Array.isArray(order_items)) {
      await processMenuItemStockAndSales(order_items, req);
    }

    // Process menu item stock and sales for add-ons
    if (addons_items && Array.isArray(addons_items)) {
      await processMenuItemStockAndSales(addons_items, req);
    }

    // Process complimentary items (deduct stock and increment sales count)
    if (complimentary_item_1) {
      try {
        const compItem = await pool.query(
          'SELECT id, stock, sold FROM menu_items WHERE id = $1',
          [complimentary_item_1]
        );
        if (compItem.rows.length > 0) {
          const currentStock = compItem.rows[0].stock || 0;
          const currentSold = compItem.rows[0].sold || 0;
          const newStock = Math.max(0, currentStock - 1);
          const newSold = currentSold + 1;
          await pool.query(
            'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
            [newStock, newSold, complimentary_item_1]
          );
          const debouncedEmit = req.app.get('debouncedEmit');
          debouncedEmit('menuItem:updated', { id: complimentary_item_1, stock: newStock, sold: newSold });
        }
      } catch (error) {
        console.error(`Error processing complimentary item 1:`, error);
      }
    }

    if (complimentary_item_2) {
      try {
        const compItem = await pool.query(
          'SELECT id, stock, sold FROM menu_items WHERE id = $1',
          [complimentary_item_2]
        );
        if (compItem.rows.length > 0) {
          const currentStock = compItem.rows[0].stock || 0;
          const currentSold = compItem.rows[0].sold || 0;
          const newStock = Math.max(0, currentStock - 1);
          const newSold = currentSold + 1;
          await pool.query(
            'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
            [newStock, newSold, complimentary_item_2]
          );
          const debouncedEmit = req.app.get('debouncedEmit');
          debouncedEmit('menuItem:updated', { id: complimentary_item_2, stock: newStock, sold: newSold });
        }
      } catch (error) {
        console.error(`Error processing complimentary item 2:`, error);
      }
    }

    // Update room status to Occupied
    await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['Occupied', room_id]);

    // Fetch room details to include in response
    const roomDetails = await pool.query(
      'SELECT id, room_number, room_type, capacity, status, floor_number FROM rooms WHERE id = $1',
      [newBooking.room_id]
    );

    const bookingWithRoom = {
      ...newBooking,
      room_number: roomDetails.rows[0]?.room_number,
      room_type: roomDetails.rows[0]?.room_type,
      order_items: (newBooking.order_items) ? (typeof newBooking.order_items === 'string' ? JSON.parse(newBooking.order_items) : newBooking.order_items) : [],
      addons_items: (newBooking.addons_items) ? (typeof newBooking.addons_items === 'string' ? JSON.parse(newBooking.addons_items) : newBooking.addons_items) : []
    };

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('booking:created', bookingWithRoom);
    if (roomDetails.rows.length > 0) {
      debouncedEmit('room:updated', roomDetails.rows[0]);
    }

    res.status(201).json(bookingWithRoom);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Check out booking (admin or staff)
router.put('/:id/checkout', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists and is checked in
    const booking = await pool.query('SELECT id, room_id, status FROM bookings WHERE id = $1', [id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.rows[0].status !== 'Checked In') {
      return res.status(400).json({ error: 'Booking is not checked in' });
    }

    const roomId = booking.rows[0].room_id;

    const result = await pool.query(
      `UPDATE bookings
       SET check_out_date = NOW(), status = 'Checked Out', updated_at = NOW()
       WHERE id = $1
       RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items, created_at, updated_at`,
      [id]
    ).catch(err => {
      // Fallback if order_items or addons_items column doesn't exist yet
      if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
          err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
        return pool.query(
          `UPDATE bookings
           SET check_out_date = NOW(), status = 'Checked Out', updated_at = NOW()
           WHERE id = $1
           RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, created_at, updated_at`,
          [id]
        );
      }
      throw err;
    });

    const updatedBooking = result.rows[0];

    // Update room status to Cleaning
    await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['Cleaning', roomId]);

    // Fetch room details to include in response
    const roomDetails = await pool.query(
      'SELECT id, room_number, room_type, capacity, status, floor_number FROM rooms WHERE id = $1',
      [roomId]
    );

    const bookingWithRoom = {
      ...updatedBooking,
      room_number: roomDetails.rows[0]?.room_number,
      room_type: roomDetails.rows[0]?.room_type,
      order_items: updatedBooking.order_items ? (typeof updatedBooking.order_items === 'string' ? JSON.parse(updatedBooking.order_items) : updatedBooking.order_items) : [],
      addons_items: updatedBooking.addons_items ? (typeof updatedBooking.addons_items === 'string' ? JSON.parse(updatedBooking.addons_items) : updatedBooking.addons_items) : []
    };

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('booking:updated', bookingWithRoom);
    if (roomDetails.rows.length > 0) {
      debouncedEmit('room:updated', roomDetails.rows[0]);
    }

    res.json(bookingWithRoom);
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// Update booking (admin or staff)
router.put('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, guest_name, guest_contact, number_of_guests, price, notes, status, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items } = req.body;

    // Check if booking exists and get old data
    const existing = await pool.query(
      'SELECT id, room_id, complimentary_item_1, complimentary_item_2, order_items, addons_items FROM bookings WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const oldBooking = existing.rows[0];
    const oldRoomId = oldBooking.room_id;
    const oldCompItem1 = oldBooking.complimentary_item_1;
    const oldCompItem2 = oldBooking.complimentary_item_2;
    const oldOrderItems = oldBooking.order_items || [];
    const oldAddonsItems = oldBooking.addons_items || [];

    // If room_id is being changed, check if new room is available
    if (room_id && room_id !== oldRoomId) {
      const newRoom = await pool.query('SELECT id, status FROM rooms WHERE id = $1', [room_id]);
      if (newRoom.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }
      if (newRoom.rows[0].status !== 'Available') {
        return res.status(400).json({ error: 'New room is not available' });
      }
    }

    // Convert empty strings to null for integer fields
    const compItem1 = complimentary_item_1 && complimentary_item_1 !== '' ? parseInt(complimentary_item_1) : null;
    const compItem2 = complimentary_item_2 && complimentary_item_2 !== '' ? parseInt(complimentary_item_2) : null;

    const result = await pool.query(
      `UPDATE bookings
       SET room_id = COALESCE($1, room_id),
           guest_name = COALESCE($2, guest_name),
           guest_contact = COALESCE($3, guest_contact),
           number_of_guests = COALESCE($4, number_of_guests),
           notes = COALESCE($5, notes),
           status = COALESCE($6, status),
           price = COALESCE($7, price),
           is_complimentary = COALESCE($8, is_complimentary),
           complimentary_item_1 = COALESCE($9, complimentary_item_1),
           complimentary_item_2 = COALESCE($10, complimentary_item_2),
           is_order = COALESCE($11, is_order),
           order_items = COALESCE($12::jsonb, order_items),
           is_addons = COALESCE($13, is_addons),
           addons_items = COALESCE($14::jsonb, addons_items),
           updated_at = NOW()
       WHERE id = $15
       RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items, created_at, updated_at`,
      [room_id, guest_name?.trim(), guest_contact, number_of_guests, notes, status, price, is_complimentary, compItem1, compItem2, is_order, JSON.stringify(order_items || []), is_addons, JSON.stringify(addons_items || []), id]
    ).catch(err => {
      // Fallback if order_items or addons_items column doesn't exist yet
      if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
          err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
        return pool.query(
          `UPDATE bookings
           SET room_id = COALESCE($1, room_id),
               guest_name = COALESCE($2, guest_name),
               guest_contact = COALESCE($3, guest_contact),
               number_of_guests = COALESCE($4, number_of_guests),
               notes = COALESCE($5, notes),
               status = COALESCE($6, status),
               price = COALESCE($7, price),
               is_complimentary = COALESCE($8, is_complimentary),
               complimentary_item_1 = COALESCE($9, complimentary_item_1),
               complimentary_item_2 = COALESCE($10, complimentary_item_2),
               is_addons = COALESCE($11, is_addons),
               updated_at = NOW()
           WHERE id = $12
           RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, created_at, updated_at`,
          [room_id, guest_name?.trim(), guest_contact, number_of_guests, notes, status, price, is_complimentary, complimentary_item_1 || null, complimentary_item_2 || null, is_addons, id]
        );
      }
      throw err;
    });

    const updatedBooking = result.rows[0];

    // If the fallback was used, fetch the booking again to get all fields
    if (!updatedBooking.order_items && !updatedBooking.addons_items) {
      const freshBooking = await pool.query(
        'SELECT id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_order, order_items, is_addons, addons_items, created_at, updated_at FROM bookings WHERE id = $1',
        [updatedBooking.id]
      );
      Object.assign(updatedBooking, freshBooking.rows[0]);
    }

    // Handle order items changes
    if (order_items !== undefined) {
      const newOrderItems = order_items || [];
      
      // Find items that were removed or reduced
      for (const oldItem of oldOrderItems) {
        const newItem = newOrderItems.find(n => n.id === oldItem.id);
        if (!newItem) {
          // Item was completely removed
          await revertMenuItemStockAndSales([oldItem], req);
        } else if (newItem.quantity < oldItem.quantity) {
          // Item quantity was reduced
          const diff = oldItem.quantity - newItem.quantity;
          await revertMenuItemStockAndSales([{ id: oldItem.id, quantity: diff }], req);
        }
      }

      // Find items that were added or increased
      for (const newItem of newOrderItems) {
        const oldItem = oldOrderItems.find(o => o.id === newItem.id);
        if (!oldItem) {
          // Item was added
          await processMenuItemStockAndSales([newItem], req);
        } else if (newItem.quantity > oldItem.quantity) {
          // Item quantity was increased
          const diff = newItem.quantity - oldItem.quantity;
          await processMenuItemStockAndSales([{ id: newItem.id, quantity: diff }], req);
        }
      }
    }

    // Handle add-ons items changes
    if (addons_items !== undefined) {
      const newAddonsItems = addons_items || [];
      
      // Find items that were removed or reduced
      for (const oldItem of oldAddonsItems) {
        const newItem = newAddonsItems.find(n => n.id === oldItem.id);
        if (!newItem) {
          // Item was completely removed
          await revertMenuItemStockAndSales([oldItem], req);
        } else if (newItem.quantity < oldItem.quantity) {
          // Item quantity was reduced
          const diff = oldItem.quantity - newItem.quantity;
          await revertMenuItemStockAndSales([{ id: oldItem.id, quantity: diff }], req);
        }
      }

      // Find items that were added or increased
      for (const newItem of newAddonsItems) {
        const oldItem = oldAddonsItems.find(o => o.id === newItem.id);
        if (!oldItem) {
          // Item was added
          await processMenuItemStockAndSales([newItem], req);
        } else if (newItem.quantity > oldItem.quantity) {
          // Item quantity was increased
          const diff = newItem.quantity - oldItem.quantity;
          await processMenuItemStockAndSales([{ id: newItem.id, quantity: diff }], req);
        }
      }
    }

    // Handle complimentary item 1 change
    if (complimentary_item_1 !== undefined && complimentary_item_1 !== oldCompItem1) {
      // Revert old item (stock and sold count)
      if (oldCompItem1) {
        try {
          const compItem = await pool.query(
            'SELECT id, stock, sold FROM menu_items WHERE id = $1',
            [oldCompItem1]
          );
          if (compItem.rows.length > 0) {
            const currentStock = compItem.rows[0].stock || 0;
            const currentSold = compItem.rows[0].sold || 0;
            const newStock = currentStock + 1;
            const newSold = Math.max(0, currentSold - 1);
            await pool.query(
              'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
              [newStock, newSold, oldCompItem1]
            );
            const debouncedEmit = req.app.get('debouncedEmit');
            debouncedEmit('menuItem:updated', { id: oldCompItem1, stock: newStock, sold: newSold });
          }
        } catch (error) {
          console.error(`Error reverting complimentary item 1:`, error);
        }
      }
      // Deduct new item (stock and sold count)
      if (compItem1) {
        try {
          const compItem = await pool.query(
            'SELECT id, stock, sold FROM menu_items WHERE id = $1',
            [compItem1]
          );
          if (compItem.rows.length > 0) {
            const currentStock = compItem.rows[0].stock || 0;
            const currentSold = compItem.rows[0].sold || 0;
            const newStock = Math.max(0, currentStock - 1);
            const newSold = currentSold + 1;
            await pool.query(
              'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
              [newStock, newSold, compItem1]
            );
            const debouncedEmit = req.app.get('debouncedEmit');
            debouncedEmit('menuItem:updated', { id: compItem1, stock: newStock, sold: newSold });
          }
        } catch (error) {
          console.error(`Error processing complimentary item 1:`, error);
        }
      }
    }

    // Handle complimentary item 2 change
    if (complimentary_item_2 !== undefined && complimentary_item_2 !== oldCompItem2) {
      // Revert old item (stock and sold count)
      if (oldCompItem2) {
        try {
          const compItem = await pool.query(
            'SELECT id, stock, sold FROM menu_items WHERE id = $1',
            [oldCompItem2]
          );
          if (compItem.rows.length > 0) {
            const currentStock = compItem.rows[0].stock || 0;
            const currentSold = compItem.rows[0].sold || 0;
            const newStock = currentStock + 1;
            const newSold = Math.max(0, currentSold - 1);
            await pool.query(
              'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
              [newStock, newSold, oldCompItem2]
            );
            const debouncedEmit = req.app.get('debouncedEmit');
            debouncedEmit('menuItem:updated', { id: oldCompItem2, stock: newStock, sold: newSold });
          }
        } catch (error) {
          console.error(`Error reverting complimentary item 2:`, error);
        }
      }
      // Deduct new item (stock and sold count)
      if (compItem2) {
        try {
          const compItem = await pool.query(
            'SELECT id, stock, sold FROM menu_items WHERE id = $1',
            [compItem2]
          );
          if (compItem.rows.length > 0) {
            const currentStock = compItem.rows[0].stock || 0;
            const currentSold = compItem.rows[0].sold || 0;
            const newStock = Math.max(0, currentStock - 1);
            const newSold = currentSold + 1;
            await pool.query(
              'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
              [newStock, newSold, compItem2]
            );
            const debouncedEmit = req.app.get('debouncedEmit');
            debouncedEmit('menuItem:updated', { id: compItem2, stock: newStock, sold: newSold });
          }
        } catch (error) {
          console.error(`Error processing complimentary item 2:`, error);
        }
      }
    }

    // Update room statuses if room was changed
    if (room_id && room_id !== oldRoomId) {
      // Set old room back to Available
      await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['Available', oldRoomId]);
      // Set new room to Occupied
      await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['Occupied', room_id]);

      // Fetch updated rooms to emit
      const updatedRooms = await pool.query(
        'SELECT id, room_number, room_type, capacity, status, floor_number FROM rooms WHERE id = $1 OR id = $2',
        [oldRoomId, room_id]
      );

      // Emit room update event
      const debouncedEmit = req.app.get('debouncedEmit');
      updatedRooms.rows.forEach(room => {
        debouncedEmit('room:updated', room);
      });
    }

    // Fetch room details to include in response
    const roomDetails = await pool.query(
      'SELECT room_number, room_type FROM rooms WHERE id = $1',
      [updatedBooking.room_id]
    );

    const bookingWithRoom = {
      ...updatedBooking,
      room_number: roomDetails.rows[0]?.room_number,
      room_type: roomDetails.rows[0]?.room_type,
      order_items: (updatedBooking.order_items) ? (typeof updatedBooking.order_items === 'string' ? JSON.parse(updatedBooking.order_items) : updatedBooking.order_items) : [],
      addons_items: (updatedBooking.addons_items) ? (typeof updatedBooking.addons_items === 'string' ? JSON.parse(updatedBooking.addons_items) : updatedBooking.addons_items) : []
    };

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('booking:updated', bookingWithRoom);

    res.json(bookingWithRoom);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking (admin or staff)
router.delete('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists (also pull menu-item related fields so we can
    // return their stock if the booking being deleted was Checked In)
    const booking = await pool.query(
      'SELECT id, room_id, status, order_items, addons_items, complimentary_item_1, complimentary_item_2 FROM bookings WHERE id = $1',
      [id]
    ).catch(err => {
      // Fallback if order_items/addons_items columns don't exist yet
      if (err.message.includes('column "order_items" of relation "bookings" does not exist') ||
          err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
        return pool.query(
          'SELECT id, room_id, status, complimentary_item_1, complimentary_item_2 FROM bookings WHERE id = $1',
          [id]
        );
      }
      throw err;
    });
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const roomId = booking.rows[0].room_id;
    const bookingStatus = booking.rows[0].status;
    const rawOrderItems = booking.rows[0].order_items;
    const rawAddonsItems = booking.rows[0].addons_items;
    const compItem1 = booking.rows[0].complimentary_item_1;
    const compItem2 = booking.rows[0].complimentary_item_2;

    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);

    // If booking was checked in, return any Menu Item stock it was holding
    // (ordered items, add-ons, and complimentary items) and free up the room
    if (bookingStatus === 'Checked In') {
      const orderItems = rawOrderItems ? (typeof rawOrderItems === 'string' ? JSON.parse(rawOrderItems) : rawOrderItems) : [];
      const addonsItems = rawAddonsItems ? (typeof rawAddonsItems === 'string' ? JSON.parse(rawAddonsItems) : rawAddonsItems) : [];

      // Revert stock/sold for ordered items and add-ons
      await revertMenuItemStockAndSales(orderItems, req);
      await revertMenuItemStockAndSales(addonsItems, req);

      // Revert complimentary items (stock and sold count)
      const debouncedEmit = req.app.get('debouncedEmit');
      for (const compItem of [compItem1, compItem2]) {
        if (!compItem) continue;
        try {
          const menuItem = await pool.query('SELECT id, stock, sold FROM menu_items WHERE id = $1', [compItem]);
          if (menuItem.rows.length > 0) {
            const currentStock = menuItem.rows[0].stock || 0;
            const currentSold = menuItem.rows[0].sold || 0;
            const newStock = currentStock + 1;
            const newSold = Math.max(0, currentSold - 1);
            await pool.query(
              'UPDATE menu_items SET stock = $1, sold = $2, updated_at = NOW() WHERE id = $3',
              [newStock, newSold, compItem]
            );
            debouncedEmit('menuItem:updated', { id: compItem, stock: newStock, sold: newSold });
          }
        } catch (error) {
          console.error(`Error reverting complimentary item ${compItem}:`, error);
        }
      }

      // Update room status back to Available
      await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['Available', roomId]);

      // Emit room update event
      const updatedRoom = await pool.query(
        'SELECT id, room_number, room_type, capacity, status, floor_number FROM rooms WHERE id = $1',
        [roomId]
      );
      if (updatedRoom.rows.length > 0) {
        debouncedEmit('room:updated', updatedRoom.rows[0]);
      }
    }

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('booking:deleted', id);

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Extend booking time (admin or staff)
router.put('/:id/extend', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { extend_hours, extra_price } = req.body;

    if (!extend_hours || extend_hours <= 0) {
      return res.status(400).json({ error: 'Extension hours must be greater than 0' });
    }
    if (extra_price < 0) {
      return res.status(400).json({ error: 'Extra price cannot be negative' });
    }

    // Check if booking exists and is checked in
    const booking = await pool.query('SELECT id, room_id, status, price, check_out_date, timer_duration FROM bookings WHERE id = $1', [id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.rows[0].status !== 'Checked In') {
      return res.status(400).json({ error: 'Booking is not checked in' });
    }

    const currentPrice = Number(booking.rows[0].price) || 0;
    const currentTimerDuration = Number(booking.rows[0].timer_duration) || 30;

    const result = await pool.query(
      `UPDATE bookings
       SET price = $1,
           timer_duration = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, created_at, updated_at`,
      [currentPrice + Number(extra_price), currentTimerDuration + (extend_hours * 60), id]
    );

    const updatedBooking = result.rows[0];

    // Fetch room details to include in response
    const roomDetails = await pool.query(
      'SELECT id, room_number, room_type, capacity, status, floor_number FROM rooms WHERE id = $1',
      [updatedBooking.room_id]
    );

    const bookingWithRoom = {
      ...updatedBooking,
      room_number: roomDetails.rows[0]?.room_number,
      room_type: roomDetails.rows[0]?.room_type
    };

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('booking:updated', bookingWithRoom);

    res.json(bookingWithRoom);
  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({ error: 'Failed to extend booking' });
  }
});

export default router;