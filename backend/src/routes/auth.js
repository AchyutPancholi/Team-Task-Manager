const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');

const router = express.Router();

const AVATAR_COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#22c55e','#3b82f6','#ef4444','#8b5cf6'];

// ─── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role = 'member' } = req.body;

    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      const result = await pool.query(
        `INSERT INTO users (name, email, password, role, avatar_color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, avatar_color, created_at`,
        [name, email, hashed, role, color]
      );

      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({ user, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      if (!result.rows.length) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
const { auth } = require('../middleware/auth');
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
