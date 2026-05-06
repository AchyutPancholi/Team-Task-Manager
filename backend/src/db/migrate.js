require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

const SCHEMA = `
-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  avatar_color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Project Members ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Task Comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
`;

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initDB };

// Run directly
if (require.main === module) {
  initDB()
    .then(() => { console.log('Migration complete'); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
}
