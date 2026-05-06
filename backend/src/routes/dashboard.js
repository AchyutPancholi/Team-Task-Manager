const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/dashboard ────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Project filter based on role
    const projectFilter = isAdmin
      ? ''
      : `JOIN project_members pm_filter ON pm_filter.project_id = p.id AND pm_filter.user_id = ${userId}`;

    const taskFilter = isAdmin
      ? ''
      : `AND (t.assignee_id = ${userId} OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = ${userId}))`;

    // Total projects
    const projectCount = await pool.query(
      isAdmin
        ? 'SELECT COUNT(*) FROM projects'
        : 'SELECT COUNT(*) FROM project_members WHERE user_id = $1',
      isAdmin ? [] : [userId]
    );

    // Task stats by status
    const taskStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'todo') AS todo,
        COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE t.status = 'review') AS review,
        COUNT(*) FILTER (WHERE t.status = 'done') AS done,
        COUNT(*) AS total
      FROM tasks t
      WHERE 1=1 ${taskFilter}
    `);

    // Overdue tasks (due_date < today AND status != done)
    const overdueTasks = await pool.query(`
      SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_color AS assignee_color
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.due_date < CURRENT_DATE AND t.status != 'done'
      ${taskFilter}
      ORDER BY t.due_date ASC
      LIMIT 10
    `);

    // My tasks / recent tasks
    const myTasks = await pool.query(`
      SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_color AS assignee_color
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.status != 'done' ${taskFilter}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        t.due_date ASC NULLS LAST
      LIMIT 8
    `);

    // Recent projects
    const recentProjects = await pool.query(`
      SELECT p.*,
             u.name AS owner_name,
             COUNT(DISTINCT pm.user_id) AS member_count,
             COUNT(DISTINCT t.id) AS task_count,
             COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS done_count
      FROM projects p
      ${projectFilter}
      LEFT JOIN users u ON u.id = p.owner_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id, u.name
      ORDER BY p.updated_at DESC
      LIMIT 5
    `);

    // Task priority breakdown
    const priorityStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE t.priority = 'urgent') AS urgent,
        COUNT(*) FILTER (WHERE t.priority = 'high') AS high,
        COUNT(*) FILTER (WHERE t.priority = 'medium') AS medium,
        COUNT(*) FILTER (WHERE t.priority = 'low') AS low
      FROM tasks t
      WHERE t.status != 'done' ${taskFilter}
    `);

    // Team members (for admin) or project members
    let teamStats = null;
    if (isAdmin) {
      const tm = await pool.query(`
        SELECT u.id, u.name, u.email, u.avatar_color, u.role,
               COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') AS active_tasks,
               COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') AS completed_tasks
        FROM users u
        LEFT JOIN tasks t ON t.assignee_id = u.id
        GROUP BY u.id
        ORDER BY u.name ASC
        LIMIT 8
      `);
      teamStats = tm.rows;
    }

    res.json({
      projects: { total: parseInt(projectCount.rows[0].count) },
      tasks: taskStats.rows[0],
      overdue_tasks: overdueTasks.rows,
      my_tasks: myTasks.rows,
      recent_projects: recentProjects.rows,
      priority_breakdown: priorityStats.rows[0],
      team: teamStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
