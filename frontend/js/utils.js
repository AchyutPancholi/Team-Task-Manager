// Toast Notifications
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Modal handling
function openModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay') && !e.target.classList.contains('modal-close')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Sidebar toggle for mobile
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Formatters
function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  const isOverdue = d < new Date() && d.toDateString() !== new Date().toDateString();
  const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `<span class="${isOverdue ? 'text-danger font-medium' : ''}">${formatted}</span>`;
}

function formatRelativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

function getAvatarHtml(name, color, size = '') {
  if (!name) return `<div class="avatar ${size}" style="background: #334155">?</div>`;
  return `<div class="avatar ${size}" style="background: ${color || 'var(--primary)'}" title="${name}">${name.charAt(0).toUpperCase()}</div>`;
}

function getBadge(type, value) {
  const map = {
    status: {
      todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
      active: 'Active', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived'
    },
    priority: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
  };
  const label = map[type][value] || value;
  return `<span class="badge badge-${value}">${label}</span>`;
}
