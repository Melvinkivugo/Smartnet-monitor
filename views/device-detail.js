/**
 * SmartNet Monitor - Device Detail View
 */

const { layout } = require('./layout');

function statusBadge(status) {
    const map = {
        online: '<span class="badge badge-online badge-lg">● Online</span>',
        offline: '<span class="badge badge-offline badge-lg">● Offline</span>',
        unknown: '<span class="badge badge-unknown badge-lg">● Unknown</span>',
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

function renderDeviceDetail({ device, logs, chartData, session }) {
    const content = `
    <!-- Device header -->
    <div class="card device-header-card">
      <div class="device-header-info">
        <div class="device-type-icon">${getDeviceIcon(device.device_type)}</div>
        <div>
          <h2>${device.name}</h2>
          <p class="text-muted"><code>${device.ip_address}</code> · ${device.device_type} · ${device.location || 'No location'}</p>
          ${device.description ? `<p class="text-muted">${device.description}</p>` : ''}
        </div>
      </div>
      <div class="device-header-stats">
        ${statusBadge(device.status)}
        <div class="stat-mini">
          <div class="stat-mini-val">${device.uptime_percent || 0}%</div>
          <div class="stat-mini-label">24h Uptime</div>
        </div>
        <div class="stat-mini">
          <div class="stat-mini-val">${device.response_time_ms ? device.response_time_ms + 'ms' : '—'}</div>
          <div class="stat-mini-label">Response</div>
        </div>
        <div class="stat-mini">
          <div class="stat-mini-val">${timeAgo(device.last_seen)}</div>
          <div class="stat-mini-label">Last Seen</div>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="charts-row">
      <div class="card chart-card">
        <div class="card-header">
          <h3 class="card-title">Uptime (24h)</h3>
          <div class="chart-range-btns">
            <button class="btn btn-xs btn-active" onclick="loadChart('${device.id}', 24, this)">24h</button>
            <button class="btn btn-xs btn-ghost" onclick="loadChart('${device.id}', 48, this)">48h</button>
            <button class="btn btn-xs btn-ghost" onclick="loadChart('${device.id}', 168, this)">7d</button>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="uptimeChart"></canvas>
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <h3 class="card-title">Response Time (ms)</h3>
        </div>
        <div class="chart-container">
          <canvas id="responseChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Monitoring log -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Monitoring Log</h3>
        <span class="card-subtitle">${logs.length} recent checks</span>
      </div>
      ${logs.length === 0 ? `
        <div class="empty-state"><p>No monitoring data yet. First check will run shortly.</p></div>
      ` : `
        <div class="table-wrapper">
          <table class="data-table log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Response Time</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td class="text-muted">${new Date(log.checked_at).toLocaleString()}</td>
                  <td>${log.status === 'online'
            ? '<span class="badge badge-online">● Online</span>'
            : '<span class="badge badge-offline">● Offline</span>'}</td>
                  <td>${log.response_time_ms ? `${log.response_time_ms}ms` : '—'}</td>
                  <td class="text-muted">${log.message || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

    const scripts = `
<script>
const initialData = ${JSON.stringify(chartData)};
let uptimeChart, responseChart;

function buildCharts(data) {
  const labels = data.labels;
  const chartDefaults = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#64748b', maxTicksLimit: 8 }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
    }
  };

  if (uptimeChart) uptimeChart.destroy();
  const uCtx = document.getElementById('uptimeChart').getContext('2d');
  uptimeChart = new Chart(uCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Uptime %',
        data: data.uptime,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, min: 0, max: 100,
          ticks: { color: '#64748b', callback: v => v + '%' } }
      }
    }
  });

  if (responseChart) responseChart.destroy();
  const rCtx = document.getElementById('responseChart').getContext('2d');
  responseChart = new Chart(rCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Response ms',
        data: data.response,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true
      }]
    },
    options: { ...chartDefaults }
  });
}

buildCharts(initialData);

async function loadChart(deviceId, hours, btn) {
  document.querySelectorAll('.chart-range-btns button').forEach(b => {
    b.className = 'btn btn-xs btn-ghost';
  });
  btn.className = 'btn btn-xs btn-active';

  const res = await fetch('/api/devices/' + deviceId + '/chart?hours=' + hours);
  const data = await res.json();
  buildCharts(data);
}
</script>`;

    return layout({ title: device.name, content, session, scripts });
}

function getDeviceIcon(type) {
    const icons = {
        'Router': '🔀',
        'Switch': '🔌',
        'Server': '🖥',
        'Wireless AP': '📶',
        'Firewall': '🛡',
        'Printer': '🖨',
        'Camera': '📷',
        'Other': '⬡'
    };
    return icons[type] || '⬡';
}

module.exports = { renderDeviceDetail };