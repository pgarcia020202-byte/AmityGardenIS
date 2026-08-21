import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdminOrStaff } from '../middleware/auth.js';

const router = express.Router();

// Get all rooms
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, room_number, room_type, capacity, status, floor_number, created_at, updated_at FROM rooms ORDER BY room_number ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create room (admin or staff)
router.post('/', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { room_number, room_type, capacity, status, floor_number } = req.body;

    if (!room_number || !room_number.trim()) {
      return res.status(400).json({ error: 'Room number is required' });
    }
    if (!room_type || !room_type.trim()) {
      return res.status(400).json({ error: 'Room type is required' });
    }
    if (!['Standard', 'Family', 'Barkada'].includes(room_type)) {
      return res.status(400).json({ error: 'Room type must be Standard, Family, or Barkada' });
    }
    if (!capacity || capacity <= 0) {
      return res.status(400).json({ error: 'Capacity must be greater than 0' });
    }

    const trimmedRoomNumber = room_number.trim();
    const trimmedRoomType = room_type.trim();

    // Check if room number exists
    const existing = await pool.query(
      'SELECT id FROM rooms WHERE room_number = $1',
      [trimmedRoomNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Room number already exists' });
    }

    const result = await pool.query(
      'INSERT INTO rooms (room_number, room_type, capacity, status, floor_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, room_number, room_type, capacity, status, floor_number, created_at, updated_at',
      [trimmedRoomNumber, trimmedRoomType, capacity, status || 'Available', floor_number]
    );

    const newRoom = result.rows[0];

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('room:created', newRoom);

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Update room (admin or staff)
router.put('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, room_type, capacity, status, floor_number } = req.body;

    // Check if room exists
    const existing = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if room number exists for another room
    if (room_number && room_number.trim()) {
      const trimmedRoomNumber = room_number.trim();
      const numberCheck = await pool.query(
        'SELECT id FROM rooms WHERE room_number = $1 AND id != $2',
        [trimmedRoomNumber, id]
      );

      if (numberCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Room number already exists' });
      }
    }

    // Validate room type if provided
    if (room_type && !['Standard', 'Family', 'Barkada'].includes(room_type)) {
      return res.status(400).json({ error: 'Room type must be Standard, Family, or Barkada' });
    }

    const result = await pool.query(
      'UPDATE rooms SET room_number = COALESCE($1, room_number), room_type = COALESCE($2, room_type), capacity = COALESCE($3, capacity), status = COALESCE($4, status), floor_number = COALESCE($5, floor_number), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING id, room_number, room_type, capacity, status, floor_number, created_at, updated_at',
      [room_number?.trim(), room_type?.trim(), capacity, status, floor_number, id]
    );

    const updatedRoom = result.rows[0];

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('room:updated', updatedRoom);

    res.json(updatedRoom);
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Delete room (admin or staff)
router.delete('/:id', authenticate, requireAdminOrStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const existing = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Delete room
    await pool.query('DELETE FROM rooms WHERE id = $1', [id]);

    // Emit socket event for real-time update
    const debouncedEmit = req.app.get('debouncedEmit');
    debouncedEmit('room:deleted', id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

export default router;
