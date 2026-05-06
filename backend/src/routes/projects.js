const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/projects ─────────────────────────────────────────────────────────
// Returns projects where user is a member OR user is admin
router.get('/', auth, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT p.*,
               u.name AS owner_name,
               COUNT(DISTINCT pm.user_id) AS member_count,
               COUNT(DISTINCT t.id) AS task_count,
               COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS done_count
        FROM projects p
        LEFT JOIN users u ON u.id = p.owner_id
        LEFT JOIN project_members pm ON pm.project_id = p.id
        LEFT JOIN tasks t ON t.project_id = p.id
        GROUP BY p.id, u.name
        ORDER BY p.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT p.*,
               u.name AS owner_name,
               COUNT(DISTINCT pm2.user_id) AS member_count,
               COUNT(DISTINCT t.id) AS task_count,
               COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS done_count
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        LEFT JOIN users u ON u.id = p.owner_id
        LEFT JOIN project_members pm2 ON pm2.project_id = p.id
        LEFT JOIN tasks t ON t.project_id = p.id
        GROUP BY p.id, u.name
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/projects ────────────────────────────────────────────────────────
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('due_date').optional().isDate().withMessage('Invalid due date'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, status = 'active', due_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, description, status, owner_id, due_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description, status, req.user.id, due_date || null]
    );
    const project = result.rows[0];

    // Auto-add creator as project admin member
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,'admin') ON CONFLICT DO NOTHING`,
      [project.id, req.user.id]
    );

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/projects/:id ─────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const projectRes = await pool.query(
      `SELECT p.*, u.name AS owner_name
       FROM projects p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!projectRes.rows.length) return res.status(404).json({ error: 'Project not found' });

    const project = projectRes.rows[0];

    // Check access
    if (req.user.role !== 'admin') {
      const memberCheck = await pool.query(
        'SELECT id FROM project_members WHERE project_id=$1 AND user_id=$2',
        [project.id, req.user.id]
      );
      if (!memberCheck.rows.length) return res.status(403).json({ error: 'Access denied' });
    }

    // Get members
    const membersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_color, pm.role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [project.id]
    );

    // Get tasks
    const tasksRes = await pool.query(
      `SELECT t.*, u.name AS assignee_name, u.avatar_color AS assignee_color
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [project.id]
    );

    res.json({ ...project, members: membersRes.rows, tasks: tasksRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/projects/:id ─────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const projectRes = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!projectRes.rows.length) return res.status(404).json({ error: 'Project not found' });

    const project = projectRes.rows[0];

    // Only project admin or global admin can edit
    if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
      const memberCheck = await pool.query(
        `SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2`,
        [project.id, req.user.id]
      );
      if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Only project admins can edit the project' });
      }
    }

    const { name, description, status, due_date } = req.body;
    const result = await pool.query(
      `UPDATE projects SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         due_date = COALESCE($4, due_date),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, status, due_date, project.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/projects/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const projectRes = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!projectRes.rows.length) return res.status(404).json({ error: 'Project not found' });

    const project = projectRes.rows[0];
    if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the project owner or admin can delete' });
    }

    await pool.query('DELETE FROM projects WHERE id=$1', [project.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/projects/:id/members ───────────────────────────────────────────
router.post('/:id/members', auth, async (req, res) => {
  const { user_id, role = 'member' } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    // Check project exists & requester has admin access
    const projectRes = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!projectRes.rows.length) return res.status(404).json({ error: 'Project not found' });

    const project = projectRes.rows[0];
    if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
      const memberCheck = await pool.query(
        `SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2`,
        [project.id, req.user.id]
      );
      if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Only project admins can add members' });
      }
    }

    // Check user exists
    const userRes = await pool.query('SELECT id, name, email, avatar_color FROM users WHERE id=$1', [user_id]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1,$2,$3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role=$3`,
      [project.id, user_id, role]
    );

    res.json({ message: 'Member added', user: userRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/projects/:id/members/:userId ──────────────────────────────────
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const projectRes = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!projectRes.rows.length) return res.status(404).json({ error: 'Project not found' });

    const project = projectRes.rows[0];
    if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
      const memberCheck = await pool.query(
        `SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2`,
        [project.id, req.user.id]
      );
      if (!memberCheck.rows.length || memberCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Only project admins can remove members' });
      }
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id=$1 AND user_id=$2',
      [project.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
