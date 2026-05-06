async function loadProjects() {
  const container = document.getElementById('page-projects');
  container.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';
  
  try {
    const projects = await api.get('/projects');
    
    let html = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Projects</h2>
          <p class="page-subtitle">Manage your team's projects and workspaces.</p>
        </div>
        ${currentUser.role === 'admin' ? `
          <button class="btn-primary" onclick="showNewProjectModal()">
            <span>+</span> New Project
          </button>
        ` : ''}
      </div>
      
      ${projects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <p>No projects found. ${currentUser.role === 'admin' ? 'Create one to get started!' : 'Ask your admin to add you to a project.'}</p>
        </div>
      ` : `
        <div class="projects-grid">
          ${projects.map(p => `
            <div class="project-card" onclick="viewProject(${p.id})">
              <div class="item-header">
                <h3 class="item-title">${p.name}</h3>
                ${getBadge('status', p.status)}
              </div>
              <p class="project-desc">${p.description || 'No description provided.'}</p>
              
              <div class="mb-3">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                  <span>Progress</span>
                  <span>${p.task_count ? Math.round((p.done_count/p.task_count)*100) : 0}%</span>
                </div>
                <div style="width: 100%; background: var(--bg-dark); height: 6px; border-radius: 3px; overflow: hidden;">
                  <div style="width: ${p.task_count ? (p.done_count/p.task_count*100) : 0}%; background: var(--primary); height: 100%;"></div>
                </div>
              </div>
              
              <div class="project-footer">
                <div>👥 ${p.member_count} members</div>
                <div>✅ ${p.done_count}/${p.task_count} tasks</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load projects: ${err.message}</div>`;
  }
}

async function viewProject(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const container = document.getElementById('page-project-detail');
  container.classList.add('active');
  container.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';
  
  try {
    const p = await api.get(`/projects/${id}`);
    const isAdmin = currentUser.role === 'admin' || p.owner_id === currentUser.id;
    
    let html = `
      <div class="mb-4">
        <a href="#" onclick="navigate('projects')" style="color: var(--text-secondary); font-size: 0.875rem;">← Back to Projects</a>
      </div>
      
      <div class="detail-header">
        <div class="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <h2 class="page-title mb-0">${p.name}</h2>
              ${getBadge('status', p.status)}
            </div>
            <p class="text-secondary">${p.description || ''}</p>
          </div>
          ${isAdmin ? `
            <div class="detail-actions">
              <button class="btn-primary" onclick="showNewTaskModal(${p.id})">+ New Task</button>
            </div>
          ` : ''}
        </div>
        
        <div class="flex gap-4 mt-6 pt-4 border-t border-border flex-wrap" style="border-top: 1px solid var(--border);">
          <div><span class="text-secondary text-sm">Owner:</span> ${p.owner_name}</div>
          <div><span class="text-secondary text-sm">Due:</span> ${formatDate(p.due_date)}</div>
          <div class="flex items-center gap-2">
            <span class="text-secondary text-sm">Members:</span>
            <div class="flex">
              ${p.members.map(m => getAvatarHtml(m.name, m.avatar_color, 'sm')).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Tasks</h3>
      </div>
      
      <!-- Kanban Board -->
      <div class="kanban-board">
        ${['todo', 'in_progress', 'review', 'done'].map(status => `
          <div class="kanban-column">
            <div class="kanban-header">
              <span>${status.replace('_', ' ').toUpperCase()}</span>
              <span class="kanban-count">${p.tasks.filter(t => t.status === status).length}</span>
            </div>
            <div class="kanban-items">
              ${p.tasks.filter(t => t.status === status).map(t => `
                <div class="kanban-card" onclick="viewTask(${t.id})">
                  <div class="flex justify-between items-start mb-2">
                    ${getBadge('priority', t.priority)}
                    ${t.assignee_id ? getAvatarHtml(t.assignee_name, t.assignee_color, 'sm') : '<div class="avatar sm" style="background:var(--bg-dark); border:1px dashed var(--text-muted)">?</div>'}
                  </div>
                  <div class="font-medium mb-2">${t.title}</div>
                  <div class="text-xs text-secondary flex justify-between">
                    <span>📅 ${formatDate(t.due_date)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load project: ${err.message}</div>`;
  }
}

// Modals
function showNewProjectModal() {
  const content = `
    <div class="form-group">
      <label>Project Name</label>
      <input type="text" id="np-name" placeholder="E.g. Website Redesign">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="np-desc" rows="3"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Due Date</label>
        <input type="date" id="np-due">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="createProject()">Create Project</button>
    </div>
  `;
  openModal('New Project', content);
}

async function createProject() {
  const name = document.getElementById('np-name').value;
  const description = document.getElementById('np-desc').value;
  const due_date = document.getElementById('np-due').value;
  
  if (!name) return showToast('Name is required', 'error');
  
  try {
    await api.post('/projects', { name, description, due_date: due_date || null });
    closeModal();
    showToast('Project created!', 'success');
    loadProjects();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Task forms injected here to avoid circular dep
function showNewTaskModal(projectId) {
  // We need users to assign
  api.get('/users').then(users => {
    const content = `
      <div class="form-group">
        <label>Task Title</label>
        <input type="text" id="nt-title">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="nt-desc" rows="3"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Assign To</label>
          <select id="nt-assignee">
            <option value="">Unassigned</option>
            ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="nt-priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Due Date</label>
        <input type="date" id="nt-due">
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="createTask(${projectId})">Create Task</button>
      </div>
    `;
    openModal('New Task', content);
  });
}

async function createTask(projectId) {
  const data = {
    project_id: projectId,
    title: document.getElementById('nt-title').value,
    description: document.getElementById('nt-desc').value,
    assignee_id: document.getElementById('nt-assignee').value || null,
    priority: document.getElementById('nt-priority').value,
    due_date: document.getElementById('nt-due').value || null
  };
  
  if (!data.title) return showToast('Title is required', 'error');
  
  try {
    await api.post('/tasks', data);
    closeModal();
    showToast('Task created!', 'success');
    viewProject(projectId); // Reload project view
  } catch (err) {
    showToast(err.message, 'error');
  }
}
