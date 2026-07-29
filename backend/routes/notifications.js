import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, booking_id, message, room_number, read, created_at 
       FROM notifications 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create a new notification
router.post('/', authenticate, async (req, res) => {
  try {
    const { booking_id, message, room_number } = req.body;
    const id = Date.now().toString() + Math.random().toString(36).substring(2);

    const result = await pool.query(
      `INSERT INTO notifications (id, booking_id, message, room_number, read)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING *`,
      [id, booking_id, message, room_number]
    );

    // Return the inserted notification or null if it already existed
    if (result.rows.length > 0) {
      res.status(201).json(result.rows[0]);
    } else {
      res.status(200).json({ message: 'Notification already exists' });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark a notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', authenticate, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notifications`
    );

    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
});

// Delete notifications for a specific booking
router.delete('/booking/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    await pool.query(
      `DELETE FROM notifications 
       WHERE booking_id = $1`,
      [bookingId]
    );

    res.json({ message: 'Notifications for booking deleted' });
  } catch (error) {
    console.error('Error deleting booking notifications:', error);
    res.status(500).json({ error: 'Failed to delete booking notifications' });
  }
});

export default router;
