require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    // Check if already seeded
    const existing = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Database already has data, skipping seed.');
      return;
    }

    // Create admin user
    const adminHash = await bcrypt.hash('admin123', 10);
    const adminRes = await client.query(
      `INSERT INTO users (name, email, password, role, avatar_color) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['Admin User', 'admin@demo.com', adminHash, 'admin', '#6366f1']
    );
    const adminId = adminRes.rows[0].id;

    // Create member users
    const memberHash = await bcrypt.hash('member123', 10);
    const colors = ['#ec4899', '#14b8a6', '#f59e0b', '#22c55e'];
    const members = [
      { name: 'Alice Johnson', email: 'alice@demo.com', color: colors[0] },
      { name: 'Bob Smith',     email: 'bob@demo.com',   color: colors[1] },
      { name: 'Carol White',   email: 'carol@demo.com', color: colors[2] },
    ];
    const memberIds = [];
    for (const m of members) {
      const r = await client.query(
        `INSERT INTO users (name, email, password, role, avatar_color) VALUES ($1,$2,$3,'member',$4) RETURNING id`,
        [m.name, m.email, memberHash, m.color]
      );
      memberIds.push(r.rows[0].id);
    }

    // Create projects
    const proj1 = await client.query(
      `INSERT INTO projects (name, description, status, owner_id, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['Website Redesign', 'Complete overhaul of company website with new design system', 'active', adminId, '2026-06-30']
    );
    const proj2 = await client.query(
      `INSERT INTO projects (name, description, status, owner_id, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['Mobile App MVP', 'Build iOS and Android app for our core product', 'active', adminId, '2026-07-15']
    );
    const proj3 = await client.query(
      `INSERT INTO projects (name, description, status, owner_id, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['API Integration', 'Integrate third-party payment and analytics APIs', 'on_hold', memberIds[0], '2026-05-31']
    );

    const p1 = proj1.rows[0].id;
    const p2 = proj2.rows[0].id;
    const p3 = proj3.rows[0].id;

    // Add members to projects
    for (const uid of [adminId, ...memberIds]) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [p1, uid, uid === adminId ? 'admin' : 'member']
      );
    }
    for (const uid of [adminId, memberIds[0], memberIds[1]]) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [p2, uid, uid === adminId ? 'admin' : 'member']
      );
    }
    for (const uid of [memberIds[0], memberIds[2]]) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [p3, uid, uid === memberIds[0] ? 'admin' : 'member']
      );
    }

    // Create tasks
    const tasks = [
      // Project 1
      { title: 'Design wireframes', desc: 'Create low-fi wireframes for all pages', status: 'done',        priority: 'high',   project_id: p1, assignee: memberIds[0], due: '2026-05-10' },
      { title: 'Set up design system', desc: 'Define colors, typography, and components', status: 'in_progress', priority: 'high', project_id: p1, assignee: memberIds[0], due: '2026-05-20' },
      { title: 'Build homepage',     desc: 'Implement the new homepage design',           status: 'todo',        priority: 'medium', project_id: p1, assignee: memberIds[1], due: '2026-06-01' },
      { title: 'SEO audit',          desc: 'Audit all pages for SEO improvements',        status: 'todo',        priority: 'low',    project_id: p1, assignee: memberIds[2], due: '2026-06-15' },
      { title: 'Performance testing',desc: 'Run Lighthouse and fix issues',               status: 'todo',        priority: 'medium', project_id: p1, assignee: adminId,      due: '2026-05-01' }, // overdue
      // Project 2
      { title: 'App architecture',   desc: 'Define folder structure and state management', status: 'done',       priority: 'urgent', project_id: p2, assignee: adminId,      due: '2026-05-05' },
      { title: 'Auth screens',       desc: 'Login, signup, forgot password screens',       status: 'in_progress',priority: 'high',   project_id: p2, assignee: memberIds[0], due: '2026-05-25' },
      { title: 'Dashboard screen',   desc: 'Home dashboard with stats',                    status: 'review',      priority: 'medium', project_id: p2, assignee: memberIds[1], due: '2026-06-05' },
      { title: 'Push notifications', desc: 'Implement FCM push notifications',             status: 'todo',        priority: 'medium', project_id: p2, assignee: memberIds[1], due: '2026-04-30' }, // overdue
      // Project 3
      { title: 'Stripe integration', desc: 'Integrate Stripe payment gateway',             status: 'todo',        priority: 'urgent', project_id: p3, assignee: memberIds[0], due: '2026-05-15' },
      { title: 'Analytics setup',    desc: 'Set up Mixpanel analytics',                    status: 'todo',        priority: 'low',    project_id: p3, assignee: memberIds[2], due: '2026-05-20' },
    ];

    for (const t of tasks) {
      await client.query(
        `INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [t.title, t.desc, t.status, t.priority, t.project_id, t.assignee, adminId, t.due]
      );
    }

    console.log('✅ Database seeded successfully');
    console.log('');
    console.log('Demo accounts:');
    console.log('  Admin:  admin@demo.com  / admin123');
    console.log('  Alice:  alice@demo.com  / member123');
    console.log('  Bob:    bob@demo.com    / member123');
    console.log('  Carol:  carol@demo.com  / member123');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
