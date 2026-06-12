/**
 * SmartNet Monitor - Frontend JS
 * Clock, alert badge polling, sidebar, toast notifications
 */

// ── Clock ────────────────────────────────────────────────────────────────────
function updateClock() {
    const el = document.getElementById('topbarTime');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}
updateClock();
setInterval(updateClock, 1000);

// ── Alert badge ──────────────────────────────────────────────────────────────
async function pollAlerts() {
    try {
        const res = await fetch('/api/alerts/count');
        if (!res.ok) return;
        const data = await res.json();
        const count = data.count || 0;

        const badge = document.getElementById('alertBadge');
        const topBtn = document.getElementById('topbarAlertBtn');
        const topCount = document.getElementById('topbarAlertCount');

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        if (topBtn) {
            if (count > 0) {
                topBtn.style.display = 'inline-flex';
                if (topCount) topCount.textContent = count;
            } else {
                topBtn.style.display = 'none';
            }
        }
    } catch (e) {
        // silently fail
    }
}
pollAlerts();
setInterval(pollAlerts, 15000);

// ── Sidebar toggle (mobile) ───────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? 'var(--red)' : 'var(--green)';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── Auto-dismiss flash messages ───────────────────────────────────────────────
document.querySelectorAll('.alert').forEach(el => {
    setTimeout(() => {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 4000);
});