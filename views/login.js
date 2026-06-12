/**
 * SmartNet Monitor - Login View
 */

function renderLogin({ error, redirect }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — SmartNet Monitor</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/public/css/style.css">
</head>
<body class="login-body">

<div class="login-container">
  <div class="login-card">
    <div class="login-logo">
      <span class="login-icon">📡</span>
      <h1>SmartNet Monitor</h1>
      <p>Network Device Monitoring System</p>
    </div>

    ${error ? `<div class="alert alert-error">${error}</div>` : ''}

    <form method="POST" action="/login" class="login-form">
      <input type="hidden" name="redirect" value="${redirect}">

      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" placeholder="Enter username"
          autocomplete="username" required autofocus>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <div class="input-wrapper">
          <input type="password" id="password" name="password" placeholder="Enter password"
            autocomplete="current-password" required>
          <button type="button" class="toggle-pw" onclick="togglePassword()">👁</button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-full">Sign In</button>
    </form>

    <p class="login-hint">Default: <code>admin</code> / <code>admin123</code></p>
  </div>

  <div class="login-bg">
    <div class="bg-grid"></div>
    <div class="bg-dots"></div>
  </div>
</div>

<script>
function togglePassword() {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
}
</script>
</body>
</html>`;
}

module.exports = { renderLogin };