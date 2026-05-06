const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper: check if user has access to a project
async function hasProjectAccess(userId, userRole, projectId) {
  if (userRole === 'admin') return true;
  const r = await pool.query(
    'SELECT id FROM project_members WHERE project_id=$1 AND user_id=$2',
    [projectId, userId]
  );
  return r.rows.length > 0;
}

// ─── GET /api/tasks ────────────────────────────────────────────────────────────
// My tasks (assigned to me) or all if admin
router.get('/', auth, async (req, res) => {
  try {
    const { project_id, status, priority, assignee_id } = req.query;

    let conditions = [];
    let params = [];
    let i = 1;

    if (req.user.role !== 'admin') {
      // Members see tasks in their projects OR assigned to them
      conditions.push(`(t.assignee_id = $${i} OR EXISTS (
        SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $${i}
      ))`);
      params.push(req.user.id);
      i++;
    }

    if (project_id) { conditions.push(`t.project_id = $${i++}`); params.push(project_id); }
    if (status)     { conditions.push(`t.status = $${i++}`);      params.push(status); }
    if (priority)   { conditions.push(`t.priority = $${i++}`);    params.push(priority); }
    if (assignee_id){ conditions.push(`t.assignee_id = $${i++}`); params.push(assignee_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT t.*,
              p.name AS project_name,
              u.name AS assignee_name,
              u.avatar_color AS assignee_color,
              cb.name AS created_by_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users cb ON cb.id = t.created_by
       ${where}
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/tasks ───────────────────────────────────────────────────────────
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Task title required'),
  body('project_id').isInt().withMessage('project_id required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status = 'todo', priority = 'medium', project_id, assignee_id, due_date } = req.body;

  try {
    if (!await hasProjectAccess(req.user.id, req.user.role, project_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [title, description, status, priority, project_id, assignee_id || null, req.user.id, due_date || null]
    );

    // Fetch with joins
    const full = await pool.query(
      `SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_color AS assignee_color
       FROM tasks t
       LEFT JOIN projects p ON p.id=t.project_id
       LEFT JOIN users u ON u.id=t.assignee_id
       WHERE t.id=$1`,
      [result.rows[0].id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/tasks/:id ────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_color AS assignee_color,
              cb.name AS created_by_name
       FROM tasks t
       LEFT JOIN projects p ON p.id=t.project_id
       LEFT JOIN users u ON u.id=t.assignee_id
       LEFT JOIN users cb ON cb.id=t.created_by
       WHERE t.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });

    const task = result.rows[0];
    if (!await hasProjectAccess(req.user.id, req.user.role, task.project_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Comments
    const comments = await pool.query(
      `SELECT tc.*, u.name AS user_name, u.avatar_color
       FROM task_comments tc
       JOIN users u ON u.id=tc.user_id
       WHERE tc.task_id=$1 ORDER BY tc.created_at ASC`,
      [task.id]
    );

    res.json({ ...task, comments: comments.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/tasks/:id ────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Task not found' });

    const task = taskRes.rows[0];
    if (!await hasProjectAccess(req.user.id, req.user.role, task.project_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, status, priority, assignee_id, due_date } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         assignee_id = COALESCE($5, assignee_id),
         due_date = COALESCE($6, due_date),
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, status, priority, assignee_id, due_date, task.id]
    );

    const full = await pool.query(
      `SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_color AS assignee_color
       FROM tasks t LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN users u ON u.id=t.assignee_id
       WHERE t.id=$1`,
      [result.rows[0].id]
    );
    res.json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/tasks/:id ─────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Task not found' });

    const task = taskRes.rows[0];
    if (!await hasProjectAccess(req.user.id, req.user.role, task.project_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only creator, assignee, or project admin can delete
    if (req.user.role !== 'admin' && task.created_by !== req.user.id && task.assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    await pool.query('DELETE FROM tasks WHERE id=$1', [task.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/tasks/:id/comments ─────────────────────────────────────────────
router.post('/:id/comments', auth, [
  body('content').trim().notEmpty().withMessage('Comment content required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Task not found' });

    if (!await hasProjectAccess(req.user.id, req.user.role, taskRes.rows[0].project_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1,$2,$3)
       RETURNING *, (SELECT name FROM users WHERE id=$2) AS user_name,
                    (SELECT avatar_color FROM users WHERE id=$2) AS avatar_color`,
      [req.params.id, req.user.id, req.body.content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
