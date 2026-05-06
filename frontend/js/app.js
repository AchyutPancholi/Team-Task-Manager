// Basic utility CSS classes added dynamically
const style = document.createElement('style');
style.textContent = `
  .mb-0 { margin-bottom: 0; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-3 { margin-bottom: 0.75rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-6 { margin-top: 1.5rem; }
  .pt-4 { padding-top: 1rem; }
  .p-4 { padding: 1rem; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .gap-2 { gap: 0.5rem; }
  .gap-3 { gap: 0.75rem; }
  .gap-4 { gap: 1rem; }
  .flex-wrap { flex-wrap: wrap; }
  .flex-1 { flex: 1; }
  .w-full { width: 100%; }
  .text-sm { font-size: 0.875rem; }
  .text-xs { font-size: 0.75rem; }
  .text-lg { font-size: 1.125rem; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .text-secondary { color: var(--text-secondary); }
  .text-muted { color: var(--text-muted); }
  .text-primary { color: var(--primary); }
  .text-danger { color: var(--danger); }
  .border-t { border-top-width: 1px; border-top-style: solid; }
  .border-border { border-color: var(--border); }
  .bg-dark { background-color: var(--bg-dark); }
  .rounded { border-radius: 8px; }
  .block { display: block; }
  .italic { font-style: italic; }
`;
document.head.appendChild(style);

function navigate(pageId, navItem) {
  // Update nav state
  if (navItem) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    navItem.classList.add('active');
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) toggleSidebar();
  } else {
    // If navigated via code, update sidebar nav
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.dataset.page === pageId) el.classList.add('active');
      else el.classList.remove('active');
    });
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  
  // Show target
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');
  
  // Load data
  if (pageId === 'dashboard') loadDashboard();
  else if (pageId === 'projects') loadProjects();
  else if (pageId === 'tasks') loadTasks();
  else if (pageId === 'team') loadTeam();
}

function initApp() {
  navigate('dashboard');
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
