const express = require('express');
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/users ────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_color, created_at FROM users ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar_color, created_at FROM users WHERE id=$1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/users/:id ────────────────────────────────────────────────────────
// User can only update own profile; admin can update any
router.put('/:id', auth, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (req.user.id !== targetId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot edit another user\'s profile' });
  }

  const { name, avatar_color, role } = req.body;

  // Only admin can change roles
  const newRole = (req.user.role === 'admin' && role) ? role : undefined;

  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         avatar_color = COALESCE($2, avatar_color),
         role = COALESCE($3, role),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, role, avatar_color`,
      [name, avatar_color, newRole, targetId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/users/:id (Admin only) ───────────────────────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
