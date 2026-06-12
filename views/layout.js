/**
 * SmartNet Monitor - Shared Layout
 */

function layout({ title, content, session, scripts = '' }) {
    const navItems = [
        { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
        { href: '/devices', icon: '⬡', label: 'Devices' },
        { href: '/alerts', icon: '⚠', label: 'Alerts' },
        { href: '/reports', icon: '📊', label: 'Reports' },
        ...(session.role === 'admin' ? [
            { href: '/users', icon: '👥', label: 'Users' },
            { href: '/settings', icon: '⚙', label: 'Settings' },
        ] : [])
    ];

    const path = '/' + (title.toLowerCase().includes('dashboard') ? 'dashboard'
        : title.toLowerCase().includes('device') ? 'devices'
            : title.toLowerCase().includes('alert') ? 'alerts'
                : title.toLowerCase().includes('report') ? 'reports'
                    : title.toLowerCase().includes('user') ? 'users'
                        : title.toLowerCase().includes('setting') ? 'settings' : '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SmartNet Monitor</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📡</text></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <link rel="stylesheet" href="/public/css/style.css">
</head>
<body>

<!-- Sidebar -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <span class="logo-icon">📡</span>
    <span class="logo-text">SmartNet</span>
  </div>

  <nav class="sidebar-nav">
    ${navItems.map(item => `
      <a href="${item.href}" class="nav-item ${item.href === path ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        ${item.label === 'Alerts' ? '<span class="alert-badge" id="alertBadge" style="display:none">0</span>' : ''}
      </a>
    `).join('')}
  </nav>

  <div class="sidebar-footer">
    <div class="user-info">
      <div class="user-avatar">${(session.username || 'A').charAt(0).toUpperCase()}</div>
      <div class="user-details">
        <span class="user-name">${session.username}</span>
        <span class="user-role">${session.role}</span>
      </div>
    </div>
    <a href="/logout" class="logout-btn" title="Logout">⏻</a>
  </div>
</aside>

<!-- Mobile overlay -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>

<!-- Main content -->
<main class="main-content">
  <header class="topbar">
    <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
    <div class="topbar-title">${title}</div>
    <div class="topbar-right">
      <span class="topbar-time" id="topbarTime"></span>
      <a href="/alerts" class="topbar-alert-btn" id="topbarAlertBtn" style="display:none">
        🔔 <span id="topbarAlertCount">0</span>
      </a>
    </div>
  </header>

  <div class="page-content">
    ${content}
  </div>
</main>

<script src="/public/js/app.js"></script>
${scripts}
</body>
</html>`;
}

module.exports = { layout };