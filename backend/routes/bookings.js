import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdminOrStaff } from '../middleware/auth.js';

const router = express.Router();

// Get all bookings
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.room_id, r.room_number, r.room_type, b.guest_name, b.guest_contact,
              b.number_of_guests, b.price, b.check_in_date, b.check_out_date, b.status, b.notes,
              b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_addons, b.addons_items, b.created_at, b.updated_at
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       ORDER BY b.check_in_date DESC`
    ).catch(err => {
      // Fallback if addons_items column doesn't exist yet
      if (err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
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
              b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_addons, b.addons_items, b.created_at, b.updated_at
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.status = 'Checked In'
       ORDER BY b.check_in_date DESC`
    ).catch(err => {
      // Fallback if addons_items column doesn't exist yet
      if (err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
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
              b.timer_duration, b.is_complimentary, b.complimentary_item_1, b.complimentary_item_2, b.is_addons, b.addons_items, b.created_at, b.updated_at
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`,
      [id]
    ).catch(err => {
      // Fallback if addons_items column doesn't exist yet
      if (err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
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
    const { room_id, guest_name, guest_contact, number_of_guests, price, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, addons_items } = req.body;

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

    // Try with addons_items column first, fall back to without it
    let result;
    try {
      result = await pool.query(
        `INSERT INTO bookings (room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, addons_items)
         VALUES ($1, $2, $3, $4, $5, NOW(), 'Checked In', $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, addons_items, created_at, updated_at`,
        [room_id, trimmedGuestName, guest_contact, number_of_guests, price, notes, timerDurationValue, is_complimentary || false, complimentary_item_1 || null, complimentary_item_2 || null, is_addons || false, JSON.stringify(addons_items || [])]
      );
    } catch (err) {
      // Fallback if addons_items column doesn't exist yet
      if (err.message.includes('column "addons_items" of relation "bookings" does not exist') || 
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
      room_type: roomDetails.rows[0]?.room_type
    };

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('booking:created', bookingWithRoom);
    if (roomDetails.rows.length > 0) {
      io.emit('room:updated', roomDetails.rows[0]);
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
       RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, addons_items, created_at, updated_at`,
      [id]
    ).catch(err => {
      // Fallback if addons_items column doesn't exist yet
      if (err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
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
      room_type: roomDetails.rows[0]?.room_type
    };

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('booking:updated', bookingWithRoom);
    if (roomDetails.rows.length > 0) {
      io.emit('room:updated', roomDetails.rows[0]);
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
    const { room_id, guest_name, guest_contact, number_of_guests, price, notes, status, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, addons_items } = req.body;

    // Check if booking exists
    const existing = await pool.query('SELECT id, room_id FROM bookings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const oldRoomId = existing.rows[0].room_id;

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
           is_addons = COALESCE($11, is_addons),
           addons_items = COALESCE($12::jsonb, addons_items),
           updated_at = NOW()
       WHERE id = $13
       RETURNING id, room_id, guest_name, guest_contact, number_of_guests, price, check_in_date, check_out_date, status, notes, timer_duration, is_complimentary, complimentary_item_1, complimentary_item_2, is_addons, addons_items, created_at, updated_at`,
      [room_id, guest_name?.trim(), guest_contact, number_of_guests, notes, status, price, is_complimentary, compItem1, compItem2, is_addons, JSON.stringify(addons_items || []), id]
    ).catch(err => {
      // Fallback if addons_items column doesn't exist yet
      if (err.message.includes('column "addons_items" of relation "bookings" does not exist')) {
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
      const io = req.app.get('io');
      updatedRooms.rows.forEach(room => {
        io.emit('room:updated', room);
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
      room_type: roomDetails.rows[0]?.room_type
    };

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('booking:updated', bookingWithRoom);

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

    // Check if booking exists
    const booking = await pool.query('SELECT id, room_id, status FROM bookings WHERE id = $1', [id]);
    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const roomId = booking.rows[0].room_id;
    const bookingStatus = booking.rows[0].status;

    await pool.query('DELETE FROM bookings WHERE id = $1', [id]);

    // If booking was checked in, update room status back to Available
    if (bookingStatus === 'Checked In') {
      await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['Available', roomId]);
      
      // Emit room update event
      const io = req.app.get('io');
      const updatedRoom = await pool.query(
        'SELECT id, room_number, room_type, capacity, status, floor_number FROM rooms WHERE id = $1',
        [roomId]
      );
      if (updatedRoom.rows.length > 0) {
        io.emit('room:updated', updatedRoom.rows[0]);
      }
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('booking:deleted', id);

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
    const io = req.app.get('io');
    io.emit('booking:updated', bookingWithRoom);

    res.json(bookingWithRoom);
  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({ error: 'Failed to extend booking' });
  }
});

export default router;