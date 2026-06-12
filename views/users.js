/**
 * SmartNet Monitor - Users View
 */

const { layout } = require('./layout');

function renderUsers({ users, session, message, error }) {
    const content = `
    ${message ? `<div class="alert alert-success">✓ ${message}</div>` : ''}
    ${error ? `<div class="alert alert-error">✗ ${error}</div>` : ''}

    <div class="page-layout">
      <!-- Add User -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Create User</h3>
        </div>
        <form method="POST" action="/users/add" class="device-form">
          <div class="form-row">
            <div class="form-group">
              <label>Username *</label>
              <input type="text" name="username" required autocomplete="off">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Password *</label>
              <input type="password" name="password" minlength="6" required autocomplete="new-password">
            </div>
            <div class="form-group">
              <label>Role *</label>
              <select name="role">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">+ Create User</button>
          </div>
        </form>
      </div>

      <!-- Users list -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">System Users <span class="badge-count">${users.length}</span></h3>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>
                    <div class="user-row">
                      <div class="user-avatar-sm">${u.username.charAt(0).toUpperCase()}</div>
                      <strong>${u.username}</strong>
                      ${u.id === session.userId ? '<span class="badge badge-unknown">You</span>' : ''}
                    </div>
                  </td>
                  <td class="text-muted">${u.email || '—'}</td>
                  <td>
                    <span class="badge badge-${u.role === 'admin' ? 'online' : 'unknown'}">${u.role}</span>
                  </td>
                  <td class="text-muted">${new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    ${u.id !== session.userId ? `
                      <form method="POST" action="/users/${u.id}/delete"
                        onsubmit="return confirm('Delete user ${u.username}?')">
                        <button type="submit" class="btn btn-xs btn-danger">Delete</button>
                      </form>
                    ` : '<span class="text-muted">—</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

    return layout({ title: 'Users', content, session });
}

module.exports = { renderUsers };