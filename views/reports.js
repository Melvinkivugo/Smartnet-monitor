/**
 * SmartNet Monitor - Reports View
 */

const { layout } = require('./layout');
const db = require('../db/database');

function renderReports({ devices, stats, session }) {

    // Calculate uptime for each device
    const deviceReports = devices.map(d => {
        const uptime24 = db.getDeviceUptimePercent(d.id, 24);
        const uptime7d = db.getDeviceUptimePercent(d.id, 168);
        const logs24 = db.getLogsForDevice(d.id, 1000).filter(l => {
            return new Date(l.checked_at) >= new Date(Date.now() - 24 * 60 * 60 * 1000);
        });
        const avgResponse = logs24.filter(l => l.response_time_ms).length > 0
            ? Math.round(logs24.filter(l => l.response_time_ms).reduce((a, b) => a + b.response_time_ms, 0) / logs24.filter(l => l.response_time_ms).length)
            : null;

        return { ...d, uptime24, uptime7d, avgResponse, checks24: logs24.length };
    });

    const avgUptime = deviceReports.length > 0
        ? Math.round(deviceReports.reduce((a, b) => a + (b.uptime24 || 0), 0) / deviceReports.length)
        : 0;

    const content = `
    <div class="report-header">
      <div>
        <h2>Network Health Report</h2>
        <p class="text-muted">Generated: ${new Date().toLocaleString()}</p>
      </div>
      <button class="btn btn-primary" onclick="window.print()">🖨 Print Report</button>
    </div>

    <!-- Summary stats -->
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
          <div class="stat-label">Currently Online</div>
        </div>
      </div>
      <div class="stat-card stat-offline">
        <div class="stat-icon">✗</div>
        <div class="stat-info">
          <div class="stat-value">${stats.offline}</div>
          <div class="stat-label">Currently Offline</div>
        </div>
      </div>
      <div class="stat-card stat-alerts">
        <div class="stat-icon">⊙</div>
        <div class="stat-info">
          <div class="stat-value">${avgUptime}%</div>
          <div class="stat-label">Avg 24h Uptime</div>
        </div>
      </div>
    </div>

    <!-- Per-device report table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Device Uptime Report</h3>
      </div>
      ${deviceReports.length === 0 ? `
        <div class="empty-state"><p>No devices to report on.</p></div>
      ` : `
        <div class="table-wrapper">
          <table class="data-table report-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>IP Address</th>
                <th>Type</th>
                <th>Location</th>
                <th>Current Status</th>
                <th>24h Uptime</th>
                <th>7d Uptime</th>
                <th>Avg Response</th>
                <th>Checks (24h)</th>
              </tr>
            </thead>
            <tbody>
              ${deviceReports.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td><code>${d.ip_address}</code></td>
                  <td>${d.device_type}</td>
                  <td>${d.location || '—'}</td>
                  <td>
                    <span class="badge badge-${d.status}">● ${d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                  </td>
                  <td>
                    <div class="uptime-bar-wrap">
                      <div class="uptime-bar">
                        <div class="uptime-fill" style="width:${d.uptime24 || 0}%"></div>
                      </div>
                      <span class="uptime-pct ${(d.uptime24 || 0) < 90 ? 'text-danger' : ''}">${d.uptime24 !== null ? d.uptime24 + '%' : 'N/A'}</span>
                    </div>
                  </td>
                  <td>
                    <span class="${(d.uptime7d || 0) < 90 ? 'text-danger' : ''}">${d.uptime7d !== null ? d.uptime7d + '%' : 'N/A'}</span>
                  </td>
                  <td>${d.avgResponse ? d.avgResponse + 'ms' : '—'}</td>
                  <td>${d.checks24}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Charts -->
    ${deviceReports.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">24h Uptime Comparison</h3>
      </div>
      <div class="chart-container">
        <canvas id="uptimeCompare"></canvas>
      </div>
    </div>
    ` : ''}
  `;

    const scripts = deviceReports.length > 0 ? `
<script>
const ctx = document.getElementById('uptimeCompare').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(deviceReports.map(d => d.name))},
    datasets: [{
      label: '24h Uptime %',
      data: ${JSON.stringify(deviceReports.map(d => d.uptime24 || 0))},
      backgroundColor: ${JSON.stringify(deviceReports.map(d => (d.uptime24 || 0) >= 90 ? '#22c55e' : (d.uptime24 || 0) >= 70 ? '#f59e0b' : '#ef4444'))},
      borderRadius: 6,
      borderSkipped: false
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0, max: 100,
        ticks: { color: '#64748b', callback: v => v + '%' },
        grid: { color: '#1e293b' }
      },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  }
});
</script>` : '';

    return layout({ title: 'Reports', content, session, scripts });
}

module.exports = { renderReports };