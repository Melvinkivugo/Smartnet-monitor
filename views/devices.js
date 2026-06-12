/**
 * SmartNet Monitor - Devices View
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

const DEVICE_TYPES = ['Router', 'Switch', 'Server', 'Wireless AP', 'Firewall', 'Printer', 'Camera', 'Other'];

function renderDevices({ devices, session, message, error }) {
    const content = `
    ${message ? `<div class="alert alert-success">✓ ${message}</div>` : ''}
    ${error ? `<div class="alert alert-error">✗ ${error}</div>` : ''}

    <div class="page-layout">

      <!-- Add Device Form -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Register New Device</h3>
        </div>
        <form method="POST" action="/devices/add" class="device-form">
          <div class="form-row">
            <div class="form-group">
              <label>Device Name *</label>
              <input type="text" name="name" placeholder="e.g. Main Router" required>
            </div>
            <div class="form-group">
              <label>IP Address *</label>
              <input type="text" name="ip_address"
                placeholder="e.g. 192.168.1.1"
                pattern="^(\\d{1,3}\\.){3}\\d{1,3}$"
                title="Valid IPv4 address" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Device Type *</label>
              <select name="device_type" required>
                <option value="">Select type...</option>
                ${DEVICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Location</label>
              <input type="text" name="location" placeholder="e.g. Server Room, Floor 2">
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" name="description" placeholder="Optional notes about this device">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">+ Register Device</button>
          </div>
        </form>
      </div>

      <!-- Device List -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Registered Devices <span class="badge-count">${devices.length}</span></h3>
          <input type="text" class="search-input" placeholder="🔍 Filter devices..."
            oninput="filterDevices(this.value)">
        </div>

        ${devices.length === 0 ? `
          <div class="empty-state">
            <span class="empty-icon">📡</span>
            <p>No devices registered yet. Add your first device above.</p>
          </div>
        ` : `
          <div class="table-wrapper">
            <table class="data-table" id="devicesTable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>IP Address</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Response</th>
                  <th>Uptime 24h</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
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
                    <td>
                      <div class="action-btns">
                        <a href="/devices/${d.id}" class="btn btn-xs btn-ghost">View</a>
                        <button class="btn btn-xs btn-secondary" onclick="openEditModal('${d.id}','${escapeJs(d.name)}','${d.ip_address}','${d.device_type}','${escapeJs(d.location)}','${escapeJs(d.description)}')">Edit</button>
                        ${session.role === 'admin' ? `
                          <form method="POST" action="/devices/${d.id}/delete" onsubmit="return confirm('Delete ${escapeJs(d.name)}?')">
                            <button type="submit" class="btn btn-xs btn-danger">Delete</button>
                          </form>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

    </div>

    <!-- Edit Modal -->
    <div class="modal" id="editModal">
      <div class="modal-backdrop" onclick="closeEditModal()"></div>
      <div class="modal-card">
        <div class="modal-header">
          <h3>Edit Device</h3>
          <button class="modal-close" onclick="closeEditModal()">✕</button>
        </div>
        <form method="POST" action="" id="editForm" class="device-form">
          <div class="form-row">
            <div class="form-group">
              <label>Device Name</label>
              <input type="text" name="name" id="editName" required>
            </div>
            <div class="form-group">
              <label>IP Address</label>
              <input type="text" name="ip_address" id="editIp" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Device Type</label>
              <select name="device_type" id="editType">
                ${DEVICE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Location</label>
              <input type="text" name="location" id="editLocation">
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" name="description" id="editDescription">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

    const scripts = `
<script>
function filterDevices(q) {
  const rows = document.querySelectorAll('#devicesTable tbody tr');
  q = q.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function openEditModal(id, name, ip, type, location, description) {
  document.getElementById('editForm').action = '/devices/' + id + '/edit';
  document.getElementById('editName').value = name;
  document.getElementById('editIp').value = ip;
  document.getElementById('editType').value = type;
  document.getElementById('editLocation').value = location;
  document.getElementById('editDescription').value = description;
  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}
</script>`;

    return layout({ title: 'Devices', content, session, scripts });
}

function escapeJs(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

module.exports = { renderDevices };