/**
 * SmartNet Monitor - Dashboard View
 */

const { layout } = require('./layout');

function statusBadge(status) {
    const map = {
        online: '<span class="badge badge-online">● Online</span>',
        offline: '<span class="badge badge-offline">● Offline</span>',
        unknown: '<span class="badge badge-unknown">● Unknown</span>',
    };
    return map[status] || map.unknown;
}

function timeAgo(isoString) {
    if (!isoString) return 'Never';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function renderDashboard({ stats, devices, alerts, recentLogs, session }) {
    const uptimePct = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;

    const deviceTypeCount = {};
    devices.forEach(d => {
        deviceTypeCount[d.device_type] = (deviceTypeCount[d.device_type] || 0) + 1;
    });

    const content = `
    <!-- Stats row -->
    <div class="stats-grid">
      <div class="stat-card stat-total">
        <div class="stat-icon">⬡</div>
        <div class="stat-info">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Devices</div>
        </div>
      </div>
      <div class="stat-card stat-online">
        <div class="stat-icon">✓</div>
        <div class="stat-info">
          <div class="stat-value">${stats.online}</div>
          <div class="stat-label">Online</div>
        </div>
      </div>
      <div class="stat-card stat-offline">
        <div class="stat-icon">✗</div>
        <div class="stat-info">
          <div class="stat-value">${stats.offline}</div>
          <div class="stat-label">Offline</div>
        </div>
      </div>
      <div class="stat-card stat-alerts">
        <div class="stat-icon">⚠</div>
        <div class="stat-info">
          <div class="stat-value">${stats.unacked_alerts}</div>
          <div class="stat-label">Active Alerts</div>
        </div>
      </div>
    </div>

    <!-- Charts + Device list -->
    <div class="dashboard-grid">

      <!-- Network health donut -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Network Health</h3>
          <span class="card-subtitle">Overall uptime: <strong>${uptimePct}%</strong></span>
        </div>
        <div class="chart-container-sm">
          <canvas id="healthChart"></canvas>
        </div>
      </div>

      <!-- Device type breakdown -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Device Types</h3>
        </div>
        <div class="chart-container-sm">
          <canvas id="typeChart"></canvas>
        </div>
      </div>

      <!-- Active alerts -->
      <div class="card card-wide">
        <div class="card-header">
          <h3 class="card-title">Active Alerts</h3>
          ${alerts.length > 0 ? `<a href="/alerts" class="card-link">View all →</a>` : ''}
        </div>
        ${alerts.length === 0 ? `
          <div class="empty-state">
            <span class="empty-icon">✅</span>
            <p>No active alerts — all systems normal</p>
          </div>
        ` : `
          <div class="alert-list">
            ${alerts.slice(0, 5).map(a => `
              <div class="alert-item alert-item-${a.type === 'device_down' ? 'error' : a.type === 'device_up' ? 'success' : 'warning'}">
                <span class="alert-msg">${a.message}</span>
                <span class="alert-time">${timeAgo(a.created_at)}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

    </div>

    <!-- Device Status Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Device Status</h3>
        <div class="card-actions">
          <button class="btn btn-sm btn-secondary" onclick="triggerMonitoring()">🔄 Scan Now</button>
          <a href="/devices" class="btn btn-sm btn-primary">+ Add Device</a>
        </div>
      </div>
      ${devices.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon">📡</span>
          <p>No devices registered yet</p>
          <a href="/devices" class="btn btn-primary">Add your first device</a>
        </div>
      ` : `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>IP Address</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Response</th>
                <th>Uptime 24h</th>
                <th>Last Seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${devices.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td><code>${d.ip_address}</code></td>
                  <td>${d.device_type}</td>
                  <td>${d.location || '—'}</td>
                  <td>${statusBadge(d.status)}</td>
                  <td>${d.response_time_ms ? `${d.response_time_ms}ms` : '—'}</td>
                  <td>
                    <div class="uptime-bar-wrap">
                      <div class="uptime-bar">
                        <div class="uptime-fill" style="width:${d.uptime_percent || 0}%"></div>
                      </div>
                      <span class="uptime-pct">${d.uptime_percent || 0}%</span>
                    </div>
                  </td>
                  <td class="text-muted">${timeAgo(d.last_seen)}</td>
                  <td><a href="/devices/${d.id}" class="btn btn-xs btn-ghost">Details →</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Recent Activity -->
    ${recentLogs.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Recent Activity</h3>
      </div>
      <div class="activity-feed">
        ${recentLogs.map(log => `
          <div class="activity-item activity-${log.status}">
            <span class="activity-dot"></span>
            <span class="activity-msg">
              <strong>${log.device_name}</strong> (${log.device_ip}) —
              ${log.status === 'online' ? `Online` : `Offline`}
              ${log.response_time_ms ? `<span class="text-muted">${log.response_time_ms}ms</span>` : ''}
            </span>
            <span class="activity-time">${timeAgo(log.checked_at)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;

    const typeLabels = Object.keys(deviceTypeCount);
    const typeValues = Object.values(deviceTypeCount);

    const scripts = `
<script>
// Health donut chart
const hCtx = document.getElementById('healthChart').getContext('2d');
new Chart(hCtx, {
  type: 'doughnut',
  data: {
    labels: ['Online', 'Offline', 'Unknown'],
    datasets: [{
      data: [${stats.online}, ${stats.offline}, ${stats.unknown}],
      backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  },
  options: {
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', padding: 16, font: { family: 'Inter', size: 12 } }
      },
      tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + ctx.raw } }
    }
  }
});

// Device type bar chart
const tCtx = document.getElementById('typeChart').getContext('2d');
new Chart(tCtx, {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(typeLabels.length > 0 ? typeLabels : ['No devices'])},
    datasets: [{
      label: 'Count',
      data: ${JSON.stringify(typeValues.length > 0 ? typeValues : [0])},
      backgroundColor: ['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#10b981'],
      borderRadius: 6,
      borderSkipped: false
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', stepSize: 1 },
        grid: { color: '#1e293b' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { display: false }
      }
    }
  }
});

// Auto-refresh stats every 30s
setInterval(async () => {
  const r = await fetch('/api/stats');
  const data = await r.json();
  // Could update DOM here — kept simple
}, 30000);

function triggerMonitoring() {
  fetch('/api/monitor/run', { method: 'POST' })
    .then(() => {
      showToast('Monitoring scan triggered!');
      setTimeout(() => location.reload(), 5000);
    });
}
</script>`;

    return layout({ title: 'Dashboard', content, session, scripts });
}

module.exports = { renderDashboard };