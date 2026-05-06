async function loadTasks() {
  const container = document.getElementById('page-tasks');
  container.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';
  
  try {
    // Admins see all tasks, members see their tasks/project tasks.
    const tasks = await api.get('/tasks');
    
    let html = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Tasks List</h2>
          <p class="page-subtitle">All tasks you have access to across projects.</p>
        </div>
      </div>
      
      ${tasks.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>No tasks found.</p>
        </div>
      ` : `
        <div class="panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(t => `
                <tr style="cursor: pointer;" onclick="viewTask(${t.id})">
                  <td class="font-medium">${t.title}</td>
                  <td class="text-secondary">${t.project_name}</td>
                  <td>${getBadge('status', t.status)}</td>
                  <td>${getBadge('priority', t.priority)}</td>
                  <td>
                    ${t.assignee_id ? `
                      <div class="flex items-center gap-2">
                        ${getAvatarHtml(t.assignee_name, t.assignee_color, 'sm')}
                        <span class="text-sm">${t.assignee_name.split(' ')[0]}</span>
                      </div>
                    ` : '<span class="text-muted text-sm">Unassigned</span>'}
                  </td>
                  <td class="text-sm">${formatDate(t.due_date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load tasks: ${err.message}</div>`;
  }
}

async function viewTask(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const container = document.getElementById('page-task-detail');
  container.classList.add('active');
  container.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';
  
  try {
    const t = await api.get(`/tasks/${id}`);
    
    let html = `
      <div class="mb-4 flex justify-between items-center">
        <button class="btn-ghost" onclick="window.history.back() || navigate('tasks')">← Back</button>
        ${(currentUser.role === 'admin' || t.created_by === currentUser.id || t.assignee_id === currentUser.id) ? `
          <button class="btn-danger" onclick="deleteTask(${t.id})">Delete Task</button>
        ` : ''}
      </div>
      
      <div class="detail-content">
        <div class="main-col">
          <div class="detail-header mb-4">
            <div class="flex items-center gap-2 mb-2 text-sm text-secondary">
              📁 <a href="#" onclick="viewProject(${t.project_id})">${t.project_name}</a>
              <span>•</span>
              <span>Created by ${t.created_by_name}</span>
            </div>
            <h2 class="page-title mb-4">${t.title}</h2>
            
            <div class="flex gap-4 mb-6">
              ${getBadge('status', t.status)}
              ${getBadge('priority', t.priority)}
            </div>
            
            <div class="p-4 bg-dark rounded border border-border">
              <h4 class="text-sm font-semibold mb-2 text-secondary">Description</h4>
              <p style="white-space: pre-wrap">${t.description || '<span class="text-muted italic">No description provided.</span>'}</p>
            </div>
          </div>
          
          <div class="comments-section">
            <h3 class="text-lg font-semibold mb-4">Activity</h3>
            
            <div class="comments-list">
              ${t.comments.length ? t.comments.map(c => `
                <div class="comment">
                  ${getAvatarHtml(c.user_name, c.avatar_color)}
                  <div class="comment-body">
                    <div class="comment-meta">
                      <span class="font-medium text-primary">${c.user_name}</span>
                      <span class="ml-2">${formatRelativeTime(c.created_at)}</span>
                    </div>
                    <div>${c.content}</div>
                  </div>
                </div>
              `).join('') : '<p class="text-muted text-sm mb-4">No comments yet.</p>'}
            </div>
            
            <div class="comment-form mt-4 pt-4 border-t border-border">
              ${getAvatarHtml(currentUser.name, currentUser.avatar_color)}
              <div class="flex-1">
                <textarea id="comment-input" placeholder="Add a comment..."></textarea>
                <div class="flex justify-end mt-2">
                  <button class="btn-primary" onclick="addComment(${t.id})">Post</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="side-col">
          <div class="panel">
            <h3 class="panel-title mb-4">Details</h3>
            
            <div class="form-group mb-4">
              <label>Status</label>
              <select id="update-status" onchange="updateTask(${t.id})">
                <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
                <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="review" ${t.status === 'review' ? 'selected' : ''}>Review</option>
                <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
              </select>
            </div>
            
            <div class="form-group mb-4">
              <label>Priority</label>
              <select id="update-priority" onchange="updateTask(${t.id})">
                <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${t.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="urgent" ${t.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>
            
            <div class="mt-4 pt-4 border-t border-border">
              <label class="text-sm text-secondary block mb-2">Assignee</label>
              ${t.assignee_id ? `
                <div class="flex items-center gap-2">
                  ${getAvatarHtml(t.assignee_name, t.assignee_color, 'sm')}
                  <span class="font-medium">${t.assignee_name}</span>
                </div>
              ` : '<span class="text-muted">Unassigned</span>'}
            </div>
            
            <div class="mt-4 pt-4 border-t border-border">
              <label class="text-sm text-secondary block mb-1">Due Date</label>
              <div>${formatDate(t.due_date)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load task: ${err.message}</div>`;
  }
}

async function updateTask(id) {
  const data = {
    status: document.getElementById('update-status').value,
    priority: document.getElementById('update-priority').value
  };
  
  try {
    await api.put(`/tasks/${id}`, data);
    showToast('Task updated', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await api.delete(`/tasks/${id}`);
    showToast('Task deleted', 'success');
    navigate('tasks');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function addComment(taskId) {
  const content = document.getElementById('comment-input').value;
  if (!content.trim()) return;
  
  try {
    await api.post(`/tasks/${taskId}/comments`, { content });
    viewTask(taskId); // Refresh task view
  } catch (err) {
    showToast(err.message, 'error');
  }
}
