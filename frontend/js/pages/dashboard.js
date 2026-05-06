async function loadDashboard() {
  const container = document.getElementById('page-dashboard');
  container.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';
  
  try {
    const data = await api.get('/dashboard');
    
    let html = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Welcome back, ${currentUser.name.split(' ')[0]}! 👋</h2>
          <p class="page-subtitle">Here's what's happening in your workspace today.</p>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-label">Total Projects</div>
          <div class="stat-val">${data.projects.total}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-label">Tasks Done</div>
          <div class="stat-val">${data.tasks.done}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-label">In Progress</div>
          <div class="stat-val">${data.tasks.in_progress}</div>
        </div>
        <div class="stat-card" style="${data.tasks.review > 0 ? 'border-color: var(--warning)' : ''}">
          <div class="stat-icon">👀</div>
          <div class="stat-label">Needs Review</div>
          <div class="stat-val">${data.tasks.review}</div>
        </div>
      </div>
      
      <div class="dashboard-layout">
        <!-- Main Column -->
        <div class="dash-main">
          ${data.overdue_tasks.length > 0 ? `
            <div class="panel mb-4" style="border-color: rgba(239, 68, 68, 0.5)">
              <div class="panel-header">
                <h3 class="panel-title" style="color: var(--danger)">⚠️ Overdue Tasks</h3>
              </div>
              <div class="item-list">
                ${data.overdue_tasks.map(t => `
                  <div class="item-card" onclick="viewTask(${t.id})">
                    <div class="item-header">
                      <span class="item-title">${t.title}</span>
                      ${getBadge('priority', t.priority)}
                    </div>
                    <div class="item-meta">
                      <span class="item-meta-group">📁 ${t.project_name}</span>
                      <span class="item-meta-group" style="color: var(--danger)">📅 ${formatDate(t.due_date)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="panel">
            <div class="panel-header">
              <h3 class="panel-title">My Tasks</h3>
              <a href="#" onclick="navigate('tasks')">View all</a>
            </div>
            ${data.my_tasks.length === 0 ? `
              <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <p>You're all caught up!</p>
              </div>
            ` : `
              <div class="item-list">
                ${data.my_tasks.map(t => `
                  <div class="item-card" onclick="viewTask(${t.id})">
                    <div class="item-header">
                      <span class="item-title">${t.title}</span>
                      ${getBadge('status', t.status)}
                    </div>
                    <div class="item-meta">
                      <span class="item-meta-group">📁 ${t.project_name}</span>
                      <span class="item-meta-group">📅 ${formatDate(t.due_date)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
        
        <!-- Sidebar Column -->
        <div class="dash-side">
          <div class="panel mb-4">
            <div class="panel-header">
              <h3 class="panel-title">Recent Projects</h3>
            </div>
            <div class="item-list">
              ${data.recent_projects.map(p => `
                <div class="item-card" onclick="viewProject(${p.id})">
                  <div class="item-header">
                    <span class="item-title">${p.name}</span>
                  </div>
                  <div class="item-meta">
                    <span>${p.task_count} tasks</span>
                  </div>
                  <div class="progress-bar mt-2">
                    <div class="progress-fill" style="width: ${p.task_count ? (p.done_count/p.task_count*100) : 0}%; background: var(--success); height: 4px; border-radius: 2px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          ${data.team ? `
            <div class="panel">
              <div class="panel-header">
                <h3 class="panel-title">Team Workload</h3>
              </div>
              <div class="item-list">
                ${data.team.map(u => `
                  <div class="flex items-center gap-2 mb-2">
                    ${getAvatarHtml(u.name, u.avatar_color, 'sm')}
                    <div class="flex-1">
                      <div class="text-sm font-medium">${u.name}</div>
                      <div class="text-xs text-secondary">${u.active_tasks} active tasks</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load dashboard: ${err.message}</div>`;
  }
}
