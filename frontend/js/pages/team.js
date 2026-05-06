async function loadTeam() {
  const container = document.getElementById('page-team');
  container.innerHTML = '<div class="page-loader"><div class="loader"></div></div>';
  
  try {
    const users = await api.get('/users');
    
    let html = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Team Directory</h2>
          <p class="page-subtitle">Manage workspace members and roles.</p>
        </div>
      </div>
      
      <div class="panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    ${getAvatarHtml(u.name, u.avatar_color)}
                    <div>
                      <div class="font-medium">${u.name} ${u.id === currentUser.id ? '(You)' : ''}</div>
                      <div class="text-sm text-secondary">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <select onchange="updateUserRole(${u.id}, this.value)" ${u.id === currentUser.id ? 'disabled' : ''} style="background:var(--bg-dark); border:1px solid var(--border); color:var(--text-primary); padding:0.25rem; border-radius:4px;">
                    <option value="member" ${u.role === 'member' ? 'selected' : ''}>Member</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
                <td class="text-sm">${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  ${u.id !== currentUser.id ? `
                    <button class="btn-ghost" onclick="deleteUser(${u.id})">
                      <span class="text-danger">Remove</span>
                    </button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load team: ${err.message}</div>`;
  }
}

async function updateUserRole(id, role) {
  try {
    await api.put(`/users/${id}`, { role });
    showToast('Role updated successfully', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    loadTeam(); // reload to revert select
  }
}

async function deleteUser(id) {
  if (!confirm('Remove this user from the workspace? This cannot be undone.')) return;
  try {
    await api.delete(`/users/${id}`);
    showToast('User removed', 'success');
    loadTeam();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
