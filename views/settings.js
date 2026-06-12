/**
 * SmartNet Monitor - Settings View
 */

const { layout } = require('./layout');

function renderSettings({ settings, session, message, pwError }) {
    const content = `
    ${message ? `<div class="alert alert-success">✓ ${message}</div>` : ''}

    <div class="settings-grid">

      <!-- System Settings -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">System Settings</h3>
        </div>
        <form method="POST" action="/settings" class="device-form">
          <div class="form-group">
            <label>Organization Name</label>
            <input type="text" name="org_name" value="${settings.org_name || 'SmartNet Monitor'}">
          </div>
          <div class="form-group">
            <label>Alert Email</label>
            <input type="email" name="alert_email" value="${settings.alert_email || ''}"
              placeholder="admin@example.com">
            <small class="form-hint">Email notifications (future feature)</small>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>

      <!-- Change Password -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Change Password</h3>
        </div>
        ${pwError ? `<div class="alert alert-error">✗ ${pwError}</div>` : ''}
        <form method="POST" action="/change-password" class="device-form">
          <div class="form-group">
            <label>Current Password</label>
            <input type="password" name="current_password" required autocomplete="current-password">
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" name="new_password" minlength="6" required autocomplete="new-password">
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" name="confirm_password" minlength="6" required autocomplete="new-password">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Update Password</button>
          </div>
        </form>
      </div>

      <!-- System Info -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">System Information</h3>
        </div>
        <div class="info-list">
          <div class="info-row">
            <span class="info-label">Version</span>
            <span class="info-value">SmartNet Monitor v1.0</span>
          </div>
          <div class="info-row">
            <span class="info-label">Runtime</span>
            <span class="info-value">Node.js ${process.version}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Platform</span>
            <span class="info-value">${process.platform}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Uptime</span>
            <span class="info-value" id="serverUptime">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Memory</span>
            <span class="info-value" id="memUsage">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Monitor Interval</span>
            <span class="info-value">60 seconds</span>
          </div>
        </div>
      </div>

    </div>
  `;

    const scripts = `<script>
const started = Date.now() - (${process.uptime()} * 1000);
function updateUptime() {
  const secs = Math.floor((Date.now() - started) / 1000);
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  document.getElementById('serverUptime').textContent =
    String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
document.getElementById('memUsage').textContent = '${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used';
updateUptime();
setInterval(updateUptime, 1000);
</script>`;

    return layout({ title: 'Settings', content, session, scripts });
}

module.exports = { renderSettings };