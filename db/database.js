/**
 * SmartNet Monitor - Database Layer
 * Uses JSON file for zero-dependency storage
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'smartnet.json');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'smartnet_salt_2024').digest('hex');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
        return null;
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function initDB() {
    if (fs.existsSync(DB_PATH)) {
        console.log('\x1b[32m✓\x1b[0m Database loaded from disk');
        return;
    }

    const adminId = generateId();
    const db = {
        users: [
            {
                id: adminId,
                username: 'admin',
                password: hashPassword('admin123'),
                role: 'admin',
                email: 'admin@smartnet.local',
                created_at: new Date().toISOString()
            }
        ],
        devices: [],
        monitoring_logs: [],
        alerts: [],
        settings: {
            monitor_interval_seconds: 60,
            alert_email: '',
            org_name: 'SmartNet Monitor'
        }
    };

    writeDB(db);
    console.log('\x1b[32m✓\x1b[0m Fresh database initialized');
}

// ─── Users ───────────────────────────────────────────────────────────────────

function getUserByUsername(username) {
    const db = readDB();
    return db.users.find(u => u.username === username) || null;
}

function getUserById(id) {
    const db = readDB();
    return db.users.find(u => u.id === id) || null;
}

function createUser(username, password, email, role = 'viewer') {
    const db = readDB();
    if (db.users.find(u => u.username === username)) {
        throw new Error('Username already exists');
    }
    const user = {
        id: generateId(),
        username,
        password: hashPassword(password),
        email,
        role,
        created_at: new Date().toISOString()
    };
    db.users.push(user);
    writeDB(db);
    return user;
}

function getAllUsers() {
    const db = readDB();
    return db.users.map(u => ({ ...u, password: undefined }));
}

function deleteUser(id) {
    const db = readDB();
    db.users = db.users.filter(u => u.id !== id);
    writeDB(db);
}

function updateUserPassword(id, newPassword) {
    const db = readDB();
    const user = db.users.find(u => u.id === id);
    if (user) {
        user.password = hashPassword(newPassword);
        writeDB(db);
        return true;
    }
    return false;
}

function verifyPassword(inputPassword, storedHash) {
    return hashPassword(inputPassword) === storedHash;
}

// ─── Devices ─────────────────────────────────────────────────────────────────

function getAllDevices() {
    const db = readDB();
    return db.devices;
}

function getDeviceById(id) {
    const db = readDB();
    return db.devices.find(d => d.id === id) || null;
}

function createDevice(name, ip_address, device_type, location, description) {
    const db = readDB();
    const device = {
        id: generateId(),
        name,
        ip_address,
        device_type,
        location: location || '',
        description: description || '',
        status: 'unknown',
        last_seen: null,
        uptime_percent: 0,
        response_time_ms: null,
        created_at: new Date().toISOString()
    };
    db.devices.push(device);
    writeDB(db);
    return device;
}

function updateDevice(id, fields) {
    const db = readDB();
    const idx = db.devices.findIndex(d => d.id === id);
    if (idx === -1) return null;
    db.devices[idx] = { ...db.devices[idx], ...fields };
    writeDB(db);
    return db.devices[idx];
}

function deleteDevice(id) {
    const db = readDB();
    db.devices = db.devices.filter(d => d.id !== id);
    // Also remove logs for this device
    db.monitoring_logs = db.monitoring_logs.filter(l => l.device_id !== id);
    db.alerts = db.alerts.filter(a => a.device_id !== id);
    writeDB(db);
}

// ─── Monitoring Logs ─────────────────────────────────────────────────────────

function addMonitoringLog(device_id, status, response_time_ms, message) {
    const db = readDB();
    const log = {
        id: generateId(),
        device_id,
        status,
        response_time_ms: response_time_ms || null,
        message: message || '',
        checked_at: new Date().toISOString()
    };
    db.monitoring_logs.push(log);

    // Keep only last 10,000 logs total
    if (db.monitoring_logs.length > 10000) {
        db.monitoring_logs = db.monitoring_logs.slice(-10000);
    }

    writeDB(db);
    return log;
}

function getLogsForDevice(device_id, limit = 50) {
    const db = readDB();
    return db.monitoring_logs
        .filter(l => l.device_id === device_id)
        .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))
        .slice(0, limit);
}

function getRecentLogs(limit = 100) {
    const db = readDB();
    const devices = db.devices;
    return db.monitoring_logs
        .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))
        .slice(0, limit)
        .map(log => {
            const device = devices.find(d => d.id === log.device_id);
            return { ...log, device_name: device ? device.name : 'Unknown', device_ip: device ? device.ip_address : '' };
        });
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

function addAlert(device_id, type, message) {
    const db = readDB();
    const device = db.devices.find(d => d.id === device_id);
    const alert = {
        id: generateId(),
        device_id,
        device_name: device ? device.name : 'Unknown',
        device_ip: device ? device.ip_address : '',
        type,
        message,
        acknowledged: false,
        created_at: new Date().toISOString()
    };
    db.alerts.push(alert);

    // Keep only last 1000 alerts
    if (db.alerts.length > 1000) {
        db.alerts = db.alerts.slice(-1000);
    }

    writeDB(db);
    return alert;
}

function getAlerts(limit = 50, unacknowledgedOnly = false) {
    const db = readDB();
    let alerts = db.alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (unacknowledgedOnly) alerts = alerts.filter(a => !a.acknowledged);
    return alerts.slice(0, limit);
}

function acknowledgeAlert(id) {
    const db = readDB();
    const alert = db.alerts.find(a => a.id === id);
    if (alert) {
        alert.acknowledged = true;
        alert.acknowledged_at = new Date().toISOString();
        writeDB(db);
        return true;
    }
    return false;
}

function acknowledgeAllAlerts() {
    const db = readDB();
    const now = new Date().toISOString();
    db.alerts.forEach(a => {
        if (!a.acknowledged) {
            a.acknowledged = true;
            a.acknowledged_at = now;
        }
    });
    writeDB(db);
}

// ─── Analytics ───────────────────────────────────────────────────────────────

function getDashboardStats() {
    const db = readDB();
    const devices = db.devices;
    const total = devices.length;
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const unknown = devices.filter(d => d.status === 'unknown').length;
    const unacked_alerts = db.alerts.filter(a => !a.acknowledged).length;

    // Uptime over last 24h per device
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent_logs = db.monitoring_logs.filter(l => l.checked_at >= since);

    return { total, online, offline, unknown, unacked_alerts, recent_log_count: recent_logs.length };
}

function getUptimeChart(device_id, hours = 24) {
    const db = readDB();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const logs = db.monitoring_logs
        .filter(l => l.device_id === device_id && new Date(l.checked_at) >= since)
        .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));

    // Group into hourly buckets
    const buckets = {};
    for (let i = hours - 1; i >= 0; i--) {
        const t = new Date(Date.now() - i * 60 * 60 * 1000);
        const key = `${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:00`;
        buckets[key] = { online: 0, total: 0, avg_response: [] };
    }

    logs.forEach(log => {
        const t = new Date(log.checked_at);
        const key = `${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:00`;
        if (buckets[key]) {
            buckets[key].total++;
            if (log.status === 'online') {
                buckets[key].online++;
                if (log.response_time_ms) buckets[key].avg_response.push(log.response_time_ms);
            }
        }
    });

    const labels = Object.keys(buckets);
    const uptime = labels.map(k => buckets[k].total > 0 ? Math.round((buckets[k].online / buckets[k].total) * 100) : null);
    const response = labels.map(k => buckets[k].avg_response.length > 0
        ? Math.round(buckets[k].avg_response.reduce((a, b) => a + b, 0) / buckets[k].avg_response.length)
        : null);

    return { labels, uptime, response };
}

function getDeviceUptimePercent(device_id, hours = 24) {
    const db = readDB();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const logs = db.monitoring_logs.filter(l => l.device_id === device_id && l.checked_at >= since);
    if (logs.length === 0) return null;
    const online = logs.filter(l => l.status === 'online').length;
    return Math.round((online / logs.length) * 100);
}

function getSettings() {
    const db = readDB();
    return db.settings;
}

function updateSettings(fields) {
    const db = readDB();
    db.settings = { ...db.settings, ...fields };
    writeDB(db);
    return db.settings;
}

module.exports = {
    initDB, readDB, generateId,
    hashPassword, verifyPassword,
    getUserByUsername, getUserById, createUser, getAllUsers, deleteUser, updateUserPassword,
    getAllDevices, getDeviceById, createDevice, updateDevice, deleteDevice,
    addMonitoringLog, getLogsForDevice, getRecentLogs,
    addAlert, getAlerts, acknowledgeAlert, acknowledgeAllAlerts,
    getDashboardStats, getUptimeChart, getDeviceUptimePercent,
    getSettings, updateSettings
};