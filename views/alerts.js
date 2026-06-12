/**
 * SmartNet Monitor - Alerts View
 */

const { layout } = require('./layout');

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

function renderAlerts({ alerts, session }) {
    const unacked = alerts.filter(a => !a.acknowledged);
    const acked = alerts.filter(a => a.acknowledged);

    const alertRow = (a) => `
    <tr class="${a.acknowledged ? 'row-acked' : ''}">
      <td>
        <span class="alert-type-badge alert-type-${a.type}">
          ${a.type === 'device_down' ? '🔴 Down' : a.type === 'device_up' ? '🟢 Up' : '🟡 Latency'}
        </span>
      </td>
      <td><strong>${a.device_name}</strong></td>
      <td><code>${a.device_ip}</code></td>
      <td>${a.message}</td>
      <td class="text-muted">${timeAgo(a.created_at)}</td>
      <td class="text-muted">${new Date(a.created_at).toLocaleString()}</td>
      <td>
        ${!a.acknowledged ? `
          <form method="POST" action="/alerts/${a.id}/ack">
            <button type="submit" class="btn btn-xs btn-success">✓ Ack</button>
          </form>
        ` : '<span class="text-muted">Acknowledged</span>'}
      </td>
    </tr>
  `;

    const content = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          Active Alerts
          ${unacked.length > 0 ? `<span class="badge-count badge-count-red">${unacked.length}</span>` : ''}
        </h3>
        <div class="card-actions">
          ${unacked.length > 0 ? `
            <form method="POST" action="/alerts/ack-all" onsubmit="return confirm('Acknowledge all alerts?')">
              <button type="submit" class="btn btn-sm btn-success">✓ Acknowledge All</button>
            </form>
          ` : ''}
        </div>
      </div>

      ${unacked.length === 0 ? `
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <p>No active alerts — all clear!</p>
        </div>
      ` : `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th><th>Device</th><th>IP</th><th>Message</th><th>When</th><th>Time</th><th>Action</th>
              </tr>
            </thead>
            <tbody>${unacked.map(alertRow).join('')}</tbody>
          </table>
        </div>
      `}
    </div>

    ${acked.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Acknowledged Alerts</h3>
        <button class="btn btn-sm btn-ghost" onclick="toggleAcked()">Toggle</button>
      </div>
      <div id="ackedSection">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th><th>Device</th><th>IP</th><th>Message</th><th>When</th><th>Time</th><th></th>
              </tr>
            </thead>
            <tbody>${acked.slice(0, 50).map(alertRow).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
    ` : ''}
  `;

    const scripts = `<script>
function toggleAcked() {
  const s = document.getElementById('ackedSection');
  s.style.display = s.style.display === 'none' ? '' : 'none';
}
</script>`;

    return layout({ title: 'Alerts', content, session, scripts });
}

module.exports = { renderAlerts };