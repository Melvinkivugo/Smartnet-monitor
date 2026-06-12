/**
 * SmartNet Monitor - Main Router
 * Pure Node.js HTTP routing, no framework needed
 */

const url = require('url');
const { sessionMiddleware } = require('../middleware/session');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const db = require('../db/database');
const { runMonitoringCycle } = require('../scripts/monitor');

// ─── Helper: Parse body ──────────────────────────────────────────────────────

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                if (req.headers['content-type'] === 'application/json') {
                    resolve(JSON.parse(body));
                } else {
                    const params = new URLSearchParams(body);
                    const obj = {};
                    for (const [k, v] of params.entries()) obj[k] = v;
                    resolve(obj);
                }
            } catch { resolve({}); }
        });
    });
}

function json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function redirect(res, location) {
    res.writeHead(302, { Location: location });
    res.end();
}

function html(res, content, status = 200) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
}

// ─── Views ───────────────────────────────────────────────────────────────────
const { renderLogin } = require('../views/login');
const { renderDashboard } = require('../views/dashboard');
const { renderDevices } = require('../views/devices');
const { renderDeviceDetail } = require('../views/device-detail');
const { renderAlerts } = require('../views/alerts');
const { renderReports } = require('../views/reports');
const { renderUsers } = require('../views/users');
const { renderSettings } = require('../views/settings');

// ─── Router ──────────────────────────────────────────────────────────────────

async function router(req, res) {
    sessionMiddleware(req, res);

    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const method = req.method;
    const query = parsed.query;

    // Static files
    if (pathname.startsWith('/public/')) {
        serveStatic(req, res, pathname);
        return;
    }

    // ── Auth routes ──────────────────────────────────────────────────────────
    if (pathname === '/login' && method === 'GET') {
        if (req.session.userId) return redirect(res, '/dashboard');
        html(res, renderLogin({ error: null, redirect: query.redirect || '' }));
        return;
    }

    if (pathname === '/login' && method === 'POST') {
        const body = await parseBody(req);
        const user = db.getUserByUsername(body.username);
        if (user && db.verifyPassword(body.password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.save();
            redirect(res, body.redirect || '/dashboard');
        } else {
            html(res, renderLogin({ error: 'Invalid username or password', redirect: body.redirect || '' }));
        }
        return;
    }

    if (pathname === '/logout') {
        req.session.destroy();
        redirect(res, '/login');
        return;
    }

    // ── Root redirect ────────────────────────────────────────────────────────
    if (pathname === '/') {
        redirect(res, req.session.userId ? '/dashboard' : '/login');
        return;
    }

    // ── Dashboard ────────────────────────────────────────────────────────────
    if (pathname === '/dashboard' && method === 'GET') {
        if (!requireAuth(req, res)) return;
        const stats = db.getDashboardStats();
        const devices = db.getAllDevices();
        const alerts = db.getAlerts(10, true);
        const recentLogs = db.getRecentLogs(20);
        html(res, renderDashboard({ stats, devices, alerts, recentLogs, session: req.session }));
        return;
    }

    // ── Devices ──────────────────────────────────────────────────────────────
    if (pathname === '/devices' && method === 'GET') {
        if (!requireAuth(req, res)) return;
        const devices = db.getAllDevices();
        html(res, renderDevices({ devices, session: req.session, message: query.message || null }));
        return;
    }

    if (pathname === '/devices/add' && method === 'POST') {
        if (!requireAuth(req, res)) return;
        const body = await parseBody(req);
        try {
            db.createDevice(body.name, body.ip_address, body.device_type, body.location, body.description);
            redirect(res, '/devices?message=Device+added+successfully');
        } catch (e) {
            const devices = db.getAllDevices();
            html(res, renderDevices({ devices, session: req.session, error: e.message }));
        }
        return;
    }

    if (pathname.startsWith('/devices/') && method === 'GET') {
        if (!requireAuth(req, res)) return;
        const id = pathname.split('/')[2];
        if (id === 'add') { redirect(res, '/devices'); return; }
        const device = db.getDeviceById(id);
        if (!device) { html(res, '<h1>Device not found</h1>', 404); return; }
        const logs = db.getLogsForDevice(id, 100);
        const chartData = db.getUptimeChart(id, 24);
        html(res, renderDeviceDetail({ device, logs, chartData, session: req.session }));
        return;
    }

    if (pathname.startsWith('/devices/') && pathname.endsWith('/delete') && method === 'POST') {
        if (!requireAdmin(req, res)) return;
        const id = pathname.split('/')[2];
        db.deleteDevice(id);
        redirect(res, '/devices?message=Device+deleted');
        return;
    }

    if (pathname.startsWith('/devices/') && pathname.endsWith('/edit') && method === 'POST') {
        if (!requireAuth(req, res)) return;
        const id = pathname.split('/')[2];
        const body = await parseBody(req);
        db.updateDevice(id, {
            name: body.name,
            ip_address: body.ip_address,
            device_type: body.device_type,
            location: body.location,
            description: body.description
        });
        redirect(res, '/devices/' + id + '?message=Updated');
        return;
    }

    // ── Alerts ───────────────────────────────────────────────────────────────
    if (pathname === '/alerts' && method === 'GET') {
        if (!requireAuth(req, res)) return;
        const alerts = db.getAlerts(100);
        html(res, renderAlerts({ alerts, session: req.session }));
        return;
    }

    if (pathname.startsWith('/alerts/') && pathname.endsWith('/ack') && method === 'POST') {
        if (!requireAuth(req, res)) return;
        const id = pathname.split('/')[2];
        db.acknowledgeAlert(id);
        redirect(res, '/alerts');
        return;
    }

    if (pathname === '/alerts/ack-all' && method === 'POST') {
        if (!requireAuth(req, res)) return;
        db.acknowledgeAllAlerts();
        redirect(res, '/alerts');
        return;
    }

    // ── Reports ──────────────────────────────────────────────────────────────
    if (pathname === '/reports' && method === 'GET') {
        if (!requireAuth(req, res)) return;
        const devices = db.getAllDevices();
        const stats = db.getDashboardStats();
        html(res, renderReports({ devices, stats, session: req.session }));
        return;
    }

    // ── Users ────────────────────────────────────────────────────────────────
    if (pathname === '/users' && method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const users = db.getAllUsers();
        html(res, renderUsers({ users, session: req.session, message: query.message || null }));
        return;
    }

    if (pathname === '/users/add' && method === 'POST') {
        if (!requireAdmin(req, res)) return;
        const body = await parseBody(req);
        try {
            db.createUser(body.username, body.password, body.email, body.role);
            redirect(res, '/users?message=User+created');
        } catch (e) {
            const users = db.getAllUsers();
            html(res, renderUsers({ users, session: req.session, error: e.message }));
        }
        return;
    }

    if (pathname.startsWith('/users/') && pathname.endsWith('/delete') && method === 'POST') {
        if (!requireAdmin(req, res)) return;
        const id = pathname.split('/')[2];
        if (id === req.session.userId) {
            redirect(res, '/users?message=Cannot+delete+yourself');
            return;
        }
        db.deleteUser(id);
        redirect(res, '/users?message=User+deleted');
        return;
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    if (pathname === '/settings' && method === 'GET') {
        if (!requireAdmin(req, res)) return;
        const settings = db.getSettings();
        html(res, renderSettings({ settings, session: req.session }));
        return;
    }

    if (pathname === '/settings' && method === 'POST') {
        if (!requireAdmin(req, res)) return;
        const body = await parseBody(req);
        db.updateSettings({ org_name: body.org_name, alert_email: body.alert_email });
        html(res, renderSettings({ settings: db.getSettings(), session: req.session, message: 'Settings saved' }));
        return;
    }

    if (pathname === '/change-password' && method === 'POST') {
        if (!requireAuth(req, res)) return;
        const body = await parseBody(req);
        const user = db.getUserById(req.session.userId);
        if (user && db.verifyPassword(body.current_password, user.password)) {
            if (body.new_password === body.confirm_password && body.new_password.length >= 6) {
                db.updateUserPassword(user.id, body.new_password);
                redirect(res, '/settings?message=Password+changed');
            } else {
                html(res, renderSettings({ settings: db.getSettings(), session: req.session, pwError: 'Passwords do not match or too short (min 6)' }));
            }
        } else {
            html(res, renderSettings({ settings: db.getSettings(), session: req.session, pwError: 'Current password incorrect' }));
        }
        return;
    }

    // ── API endpoints (JSON) ──────────────────────────────────────────────────
    if (pathname === '/api/stats' && method === 'GET') {
        if (!req.session.userId) { json(res, { error: 'Unauthorized' }, 401); return; }
        json(res, db.getDashboardStats());
        return;
    }

    if (pathname === '/api/devices' && method === 'GET') {
        if (!req.session.userId) { json(res, { error: 'Unauthorized' }, 401); return; }
        json(res, db.getAllDevices());
        return;
    }

    if (pathname.match(/^\/api\/devices\/[^/]+\/chart$/) && method === 'GET') {
        if (!req.session.userId) { json(res, { error: 'Unauthorized' }, 401); return; }
        const id = pathname.split('/')[3];
        const hours = parseInt(query.hours) || 24;
        json(res, db.getUptimeChart(id, hours));
        return;
    }

    if (pathname === '/api/alerts/count' && method === 'GET') {
        if (!req.session.userId) { json(res, { error: 'Unauthorized' }, 401); return; }
        const unacked = db.getAlerts(1000, true);
        json(res, { count: unacked.length });
        return;
    }

    if (pathname === '/api/monitor/run' && method === 'POST') {
        if (!requireAuth(req, res)) return;
        runMonitoringCycle();
        json(res, { message: 'Monitoring cycle triggered' });
        return;
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    html(res, `
    <html><head><title>404 Not Found</title>
    <style>body{font-family:sans-serif;text-align:center;padding:80px;background:#0f172a;color:#94a3b8;}
    h1{color:#60a5fa;font-size:4rem;margin:0}a{color:#38bdf8;}</style></head>
    <body><h1>404</h1><p>Page not found</p><a href="/dashboard">← Dashboard</a></body></html>
  `, 404);
}

// ─── Static file server ───────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
    const filePath = path.join(__dirname, '..', pathname);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404); res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

module.exports = { router };